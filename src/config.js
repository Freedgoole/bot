require('dotenv').config();

module.exports = {
  strava: {
    baseUrl: 'https://www.strava.com/api/v3',
    rateLimit: {
      minDelay: 2000,
      maxRetries: 3,
      retryDelay: 5000
    },
    enrichBatchSize: 3,
    cacheTtl: 300000
  },
  ai: {
    model: 'gemini-3-flash-preview',
    rateLimit: {
      minDelay: 2000
    },
    timeout: 15000
  },
  bot: {
    timeout: 10000
  },
  user: {
    maxHeartRate: 185
  },
  hrZones: {
    Z1: { min: 0.50, max: 0.60, name: 'відновлення' },
    Z2: { min: 0.60, max: 0.70, name: 'база' },
    Z3: { min: 0.70, max: 0.80, name: 'аеробна' },
    Z4: { min: 0.80, max: 0.90, name: 'поріг' },
    Z5: { min: 0.90, max: 1.00, name: 'максимум' }
  },
  zones: {
    Z1: { min: 360, max: Infinity, name: 'відновлення', color: '🟢' },
    Z2: { min: 330, max: 360, name: 'база', color: '🟢' },
    Z3: { min: 300, max: 330, name: 'темп', color: '🟡' },
    Z4: { min: 270, max: 300, name: 'поріг', color: '🟠' },
    Z5: { min: 0, max: 270, name: 'VO2max', color: '🔴' }
  }
};
