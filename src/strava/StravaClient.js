require('dotenv').config();
const axios = require('axios');

const STRAVA_CONFIG = {
  baseUrl: 'https://www.strava.com/api/v3',
  rateLimit: { minDelay: 2000 },
  enrichBatchSize: 3,
  cacheTtl: 300000
};

class StravaClient {
  constructor() {
    this.tokens = {
      accessToken: process.env.STRAVA_ACCESS_TOKEN,
      refreshToken: process.env.STRAVA_REFRESH_TOKEN,
      clientId: process.env.STRAVA_CLIENT_ID,
      clientSecret: process.env.STRAVA_CLIENT_SECRET
    };
    this.baseUrl = STRAVA_CONFIG.baseUrl;
    this.lastRequest = 0;
    this.minDelay = STRAVA_CONFIG.rateLimit.minDelay;
    this.cache = new Map();
  }

  async waitForRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.minDelay) {
      await new Promise(r => setTimeout(r, this.minDelay - elapsed));
    }
    this.lastRequest = Date.now();
  }

  async refreshToken() {
    const res = await axios.post('https://www.strava.com/oauth/token', {
      client_id: this.tokens.clientId,
      client_secret: this.tokens.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: this.tokens.refreshToken
    });
    this.tokens.accessToken = res.data.access_token;
    this.tokens.refreshToken = res.data.refresh_token;
    return this.tokens.accessToken;
  }

  getCacheKey(endpoint, params) {
    return `${endpoint}?${new URLSearchParams(params).toString()}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < STRAVA_CONFIG.cacheTtl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async request(endpoint, params = {}, retry = true) {
    await this.waitForRateLimit();
    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const res = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
        params
      });
      this.setCache(cacheKey, res.data);
      return res.data;
    } catch (err) {
      if (err.response?.status === 401 && retry) {
        await this.refreshToken();
        return this.request(endpoint, params, false);
      }
      if (err.response?.status === 429) {
        throw new Error('Strava rate limit. Почекай хвилину і спробуй знову.');
      }
      throw err;
    }
  }

  async getAthlete() {
    return this.request('/athlete');
  }

  async getActivities(limit = 10) {
    return this.request('/athlete/activities', { per_page: limit });
  }

  async getActivity(id) {
    return this.request(`/activities/${id}`);
  }

  async getActivityLaps(id) {
    return this.request(`/activities/${id}/laps`);
  }

  async getActivityZones(id) {
    return this.request(`/activities/${id}/zones`);
  }

  async getRecentActivities(count = 5) {
    const activities = await this.getActivities(count);
    return this.enrichActivities(activities);
  }

  async enrichActivities(activities) {
    const batchSize = STRAVA_CONFIG.enrichBatchSize;
    const enriched = [];

    for (let i = 0; i < activities.length; i += batchSize) {
      const batch = activities.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (activity) => {
          try {
            const [details, laps] = await Promise.all([
              this.getActivity(activity.id),
              this.getActivityLaps(activity.id)
            ]);
            return this.formatActivity(activity, details, laps);
          } catch (err) {
            console.error(`Failed to enrich activity ${activity.id}:`, err.message);
            return this.formatActivity(activity);
          }
        })
      );
      
      results.forEach(r => {
        if (r.status === 'fulfilled') enriched.push(r.value);
      });
    }

    return enriched;
  }

  formatActivity(activity, details = null, laps = []) {
    return {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      date: activity.start_date,
      distance: parseFloat((activity.distance / 1000).toFixed(2)),
      duration: activity.moving_time,
      durationFormatted: this.formatTime(activity.moving_time),
      pace: this.calculatePace(activity.moving_time, activity.distance),
      avgHeartrate: Math.round(activity.average_heartrate) || null,
      maxHeartrate: Math.round(activity.max_heartrate) || null,
      elevation: activity.total_elevation_gain,
      watts: Math.round(activity.average_watts) || null,
      hrDrift: this.calculateHRDrift(laps),
      laps: laps.map((l, i) => ({
        number: i + 1,
        distance: l.distance,
        pace: this.calculatePace(l.moving_time, l.distance),
        heartrate: Math.round(l.average_heartrate) || null
      })),
      splits: details?.splits_metric?.map(s => ({
        km: s.split,
        pace: this.calculatePace(s.moving_time, s.distance),
        heartrate: Math.round(s.average_heartrate) || null,
        elevation: s.elevation_difference
      })) || []
    };
  }

  calculateHRDrift(laps) {
    if (!laps || laps.length < 4) return null;
    const mid = Math.floor(laps.length / 2);
    const first = laps.slice(0, mid).filter(l => l.average_heartrate);
    const second = laps.slice(mid).filter(l => l.average_heartrate);
    if (first.length < 2 || second.length < 2) return null;
    const avg1 = first.reduce((s, l) => s + l.average_heartrate, 0) / first.length;
    const avg2 = second.reduce((s, l) => s + l.average_heartrate, 0) / second.length;
    return parseFloat((((avg2 - avg1) / avg1) * 100).toFixed(1));
  }

  calculatePace(seconds, meters) {
    if (!meters || meters === 0) return '0:00';
    const pace = seconds / (meters / 1000);
    const mins = Math.floor(pace / 60);
    const secs = Math.round(pace % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':');
  }
}

module.exports = StravaClient;
