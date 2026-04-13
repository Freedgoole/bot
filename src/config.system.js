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
  }
};
