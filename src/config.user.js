require('dotenv').config();

const MAX_HR = process.env.USER_MAX_HR || 185;

module.exports = {
  user: {
    maxHeartRate: parseInt(MAX_HR)
  },
  hrZones: {
    Z1: { min: 0.50, max: 0.60, name: 'відновлення' },
    Z2: { min: 0.60, max: 0.70, name: 'база' },
    Z3: { min: 0.70, max: 0.80, name: 'аеробна' },
    Z4: { min: 0.80, max: 0.90, name: 'поріг' },
    Z5: { min: 0.90, max: 1.00, name: 'максимум' }
  },
  paceZones: {
    Z1: { min: 360, max: Infinity, name: 'відновлення', color: '🟢' },
    Z2: { min: 330, max: 360, name: 'база', color: '🟢' },
    Z3: { min: 300, max: 330, name: 'темп', color: '🟡' },
    Z4: { min: 270, max: 300, name: 'поріг', color: '🟠' },
    Z5: { min: 0, max: 270, name: 'VO2max', color: '🔴' }
  }
};
