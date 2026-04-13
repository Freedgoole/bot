require('dotenv').config();
const axios = require('axios');

const STRAVA_ACCESS_TOKEN = process.env.STRAVA_ACCESS_TOKEN;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

const strava = {
  baseUrl: 'https://www.strava.com/api/v3',
  lastRequest: 0,
  minDelay: 2000,
  tokens: {
    accessToken: STRAVA_ACCESS_TOKEN,
    refreshToken: STRAVA_REFRESH_TOKEN,
    clientId: STRAVA_CLIENT_ID,
    clientSecret: STRAVA_CLIENT_SECRET
  },

  async waitForRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.minDelay) {
      await new Promise(r => setTimeout(r, this.minDelay - elapsed));
    }
    this.lastRequest = Date.now();
  },

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
  },

  async request(endpoint, params = {}, retry = true) {
    await this.waitForRateLimit();
    try {
      const res = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
        params
      });
      return res.data;
    } catch (err) {
      if (err.response?.status === 401 && retry) {
        await this.refreshToken();
        return this.request(endpoint, params, false);
      }
      throw err;
    }
  },

  async getActivities(limit = 10) {
    return this.request('/athlete/activities', { per_page: limit });
  },

  async getActivity(id) {
    return this.request(`/activities/${id}`);
  },

  async getActivityLaps(id) {
    return this.request(`/activities/${id}/laps`);
  },

  async getRecentActivities(count = 5) {
    const activities = await this.getActivities(count);
    const enriched = [];
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      try {
        const [details, laps] = await Promise.all([
          this.getActivity(activity.id),
          this.getActivityLaps(activity.id)
        ]);
        enriched.push(this.formatActivity(activity, details, laps));
      } catch {
        enriched.push(this.formatActivity(activity));
      }
    }
    return enriched;
  },

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
      elevation: activity.total_elevation_gain,
      splits: details?.splits_metric?.map(s => ({
        km: s.split,
        pace: this.calculatePace(s.moving_time, s.distance),
        heartrate: Math.round(s.average_heartrate) || null
      })) || []
    };
  },

  calculatePace(seconds, meters) {
    if (!meters || meters === 0) return '0:00';
    const pace = seconds / (meters / 1000);
    const mins = Math.floor(pace / 60);
    const secs = Math.round(pace % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  },

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':');
  }
};

module.exports = strava;
