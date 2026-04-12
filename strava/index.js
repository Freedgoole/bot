require('dotenv').config();
const axios = require('axios');

class StravaClient {
  constructor() {
    // Всі секрети підтягуються автоматично
    this.config = {
      accessToken: process.env.STRAVA_ACCESS_TOKEN,
      refreshToken: process.env.STRAVA_REFRESH_TOKEN,
      clientId: process.env.STRAVA_CLIENT_ID,
      clientSecret: process.env.STRAVA_CLIENT_SECRET
    };

    this.baseURL = 'https://www.strava.com/api/v3';
  }

  async refreshAccessToken() {
    try {
      console.log('🔄 Оновлення токена Strava...');
      const res = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken
      });

      this.config.accessToken = res.data.access_token;
      this.config.refreshToken = res.data.refresh_token;
      
      console.log('✅ Токен успішно оновлено');
      return this.config.accessToken;
    } catch (err) {
      console.error('❌ Помилка оновлення токена:', err.response?.data || err.message);
      throw err;
    }
  }

  async request(endpoint, params = {}, retry = true) {
    try {
      const res = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: { Authorization: `Bearer ${this.config.accessToken}` },
        params
      });
      return res.data;
    } catch (err) {
      if (err.response?.status === 401 && retry) {
        await this.refreshAccessToken();
        return this.request(endpoint, params, false);
      }
      throw err;
    }
  }
  async getRecentActivities(limit = 1) {
    const activities = await this.request('/athlete/activities', { per_page: limit });

    return Promise.all(
      activities.map(async (activity) => {
        console.log(activity);
        try {
          const [fullData, lapsData] = await Promise.all([
            this.request(`/activities/${activity.id}`),
            this.request(`/activities/${activity.id}/laps`)
          ]);

          return {
            id: activity.id,
            name: activity.name,
            type: activity.type,
            distance_km: (activity.distance / 1000).toFixed(2),
            duration: this._formatTime(activity.moving_time),
            average_pace: this._calculatePace(activity.moving_time, activity.distance),
            average_heartrate: Math.round(activity.average_heartrate) || 'N/A',
            max_heartrate: Math.round(activity.max_heartrate) || 'N/A',
            elevation_gain: activity.total_elevation_gain,
            watts: Math.round(activity.average_watts),
            hr_drift: this.calculateHeartRateDrift(lapsData),
            // Круги (від годинника)
            laps: lapsData.map((l, i) => ({
              lap: i + 1,
              distance_m: l.distance.toFixed(0),
              pace: this._calculatePace(l.moving_time, l.distance),
              heartrate: Math.round(l.average_heartrate) || 'N/A'
            })),

            // Відрізки по 1 км (автоматичні)
            splits: fullData.splits_metric?.map(s => ({
              km: s.split,
              pace: this._calculatePace(s.moving_time, s.distance),
              heartrate: Math.round(s.average_heartrate) || 'N/A',
              elevation: s.elevation_difference
            })) || []
          };
        } catch (err) {
          console.error(`Помилка обробки активності ${activity.id}:`, err.message);
          return activity;
        }
      })
    );
  }

  async getTodayActivities() {
    return this.getRecentActivities(1);
  }

  calculateHeartRateDrift(laps) {
    if (!laps || laps.length < 4) return null; 

    const mid = Math.floor(laps.length / 2);
    const firstHalf = laps.slice(0, mid);
    const secondHalf = laps.slice(mid);

    const avgHr1 = firstHalf.reduce((sum, l) => sum + l.heartrate, 0) / firstHalf.length;
    const avgHr2 = secondHalf.reduce((sum, l) => sum + l.heartrate, 0) / secondHalf.length;

    // Рахуємо відсоток зростання пульсу
    const drift = ((avgHr2 - avgHr1) / avgHr1) * 100;
    return drift.toFixed(1);
}

  _formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s]
      .map(v => v < 10 ? "0" + v : v)
      .filter((v, i) => v !== "00" || i > 0)
      .join(":");
  }

  _calculatePace(seconds, meters) {
    if (!meters || meters === 0) return "0:00";
    const totalSecondsPerKm = seconds / (meters / 1000);
    const mins = Math.floor(totalSecondsPerKm / 60);
    const secs = Math.round(totalSecondsPerKm % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}

module.exports = StravaClient;