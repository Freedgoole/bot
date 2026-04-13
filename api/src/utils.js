require('dotenv').config();

const MAX_HR = process.env.USER_MAX_HR || 185;
const BOT_TIMEOUT = 10000;

const PACE_ZONES = {
  Z1: { min: 360, max: Infinity, name: 'відновлення', color: '🟢' },
  Z2: { min: 330, max: 360, name: 'база', color: '🟢' },
  Z3: { min: 300, max: 330, name: 'темп', color: '🟡' },
  Z4: { min: 270, max: 300, name: 'поріг', color: '🟠' },
  Z5: { min: 0, max: 270, name: 'VO2max', color: '🔴' }
};

const HR_ZONES = {
  Z1: { min: 0.50, max: 0.60, name: 'відновлення' },
  Z2: { min: 0.60, max: 0.70, name: 'база' },
  Z3: { min: 0.70, max: 0.80, name: 'аеробна' },
  Z4: { min: 0.80, max: 0.90, name: 'поріг' },
  Z5: { min: 0.90, max: 1.00, name: 'максимум' }
};

function parsePace(pace) {
  if (!pace || typeof pace !== 'string') return 0;
  const parts = pace.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0;
  return parts[0] * 60 + parts[1];
}

function formatPace(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getPaceZone(pace) {
  const sec = parsePace(pace);
  if (sec >= 360) return `Z1 ${PACE_ZONES.Z1.color}`;
  if (sec >= 330) return `Z2 ${PACE_ZONES.Z2.color}`;
  if (sec >= 300) return `Z3 ${PACE_ZONES.Z3.color}`;
  if (sec >= 270) return `Z4 ${PACE_ZONES.Z4.color}`;
  return `Z5 ${PACE_ZONES.Z5.color}`;
}

function getZoneDistribution(splits) {
  const zones = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
  
  splits.forEach(s => {
    const sec = parsePace(s.pace);
    if (sec >= 360) zones.Z1++;
    else if (sec >= 330) zones.Z2++;
    else if (sec >= 300) zones.Z3++;
    else if (sec >= 270) zones.Z4++;
    else zones.Z5++;
  });

  const total = splits.length || 1;
  return Object.entries(zones)
    .map(([zone, count]) => `${zone}: ${'█'.repeat(count)}${'░'.repeat(Math.max(0, 5-count))} ${Math.round(count/total*100)}%`)
    .join('\n');
}

function getPaceBar(pace) {
  const sec = parsePace(pace);
  let bars = '';
  if (sec >= 360) bars = '░░░░░';
  else if (sec >= 330) bars = '▓░░░░';
  else if (sec >= 300) bars = '▓▓░░░';
  else if (sec >= 270) bars = '▓▓▓░░';
  else bars = '▓▓▓▓▓';
  return `\`${bars}\``;
}

function withTimeout(promise, ms = BOT_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('⏱️ Час очікування вичерпано')), ms)
    )
  ]);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':');
}

function calculatePace(seconds, meters) {
  if (!meters || meters === 0) return '0:00';
  const pace = seconds / (meters / 1000);
  const mins = Math.floor(pace / 60);
  const secs = Math.round(pace % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function getHrZone(heartrate) {
  if (!heartrate) return null;
  const hr = heartrate;
  const ratio = hr / MAX_HR;
  
  if (ratio >= HR_ZONES.Z5.min) return 'Z5';
  if (ratio >= HR_ZONES.Z4.min) return 'Z4';
  if (ratio >= HR_ZONES.Z3.min) return 'Z3';
  if (ratio >= HR_ZONES.Z2.min) return 'Z2';
  return 'Z1';
}

function formatHrZone(heartrate) {
  if (!heartrate) return '';
  const zone = getHrZone(heartrate);
  const hrZone = HR_ZONES[zone];
  const min = Math.round(hrZone.min * MAX_HR);
  const max = Math.round(hrZone.max * MAX_HR);
  return `${zone} (${min}-${max})`;
}

module.exports = {
  parsePace,
  formatPace,
  getPaceZone,
  getZoneDistribution,
  getPaceBar,
  withTimeout,
  formatTime,
  calculatePace,
  getHrZone,
  formatHrZone
};
