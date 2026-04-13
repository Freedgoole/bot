const systemConfig = require('./config.system');
const userConfig = require('./config.user');

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
  const zones = systemConfig.zones;
  
  if (sec >= zones.Z1.min) return `Z1 ${zones.Z1.color}`;
  if (sec >= zones.Z2.min) return `Z2 ${zones.Z2.color}`;
  if (sec >= zones.Z3.min) return `Z3 ${zones.Z3.color}`;
  if (sec >= zones.Z4.min) return `Z4 ${zones.Z4.color}`;
  return `Z5 ${zones.Z5.color}`;
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

function withTimeout(promise, ms = systemConfig.bot.timeout) {
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
  const maxHr = userConfig.user.maxHeartRate;
  const hr = heartrate;
  const ratio = hr / maxHr;
  const zones = userConfig.hrZones;
  
  if (ratio >= zones.Z5.min) return 'Z5';
  if (ratio >= zones.Z4.min) return 'Z4';
  if (ratio >= zones.Z3.min) return 'Z3';
  if (ratio >= zones.Z2.min) return 'Z2';
  return 'Z1';
}

function formatHrZone(heartrate) {
  if (!heartrate) return '';
  const zone = getHrZone(heartrate);
  const maxHr = userConfig.user.maxHeartRate;
  const zones = userConfig.hrZones;
  const hrZone = zones[zone];
  const min = Math.round(hrZone.min * maxHr);
  const max = Math.round(hrZone.max * maxHr);
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
