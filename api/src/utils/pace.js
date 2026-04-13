const { PACE_ZONES } = require('./constants');

function parsePace(pace) {
  if (!pace || typeof pace !== 'string') return 0;
  const parts = pace.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
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

function calculatePace(seconds, meters) {
  if (!meters || meters === 0) return '0:00';
  const pace = seconds / (meters / 1000);
  const mins = Math.floor(pace / 60);
  const secs = Math.round(pace % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':');
}

function calculateAvgPace(activities) {
  const totalSec = activities.reduce((s, a) => s + a.duration, 0);
  const totalM = activities.reduce((s, a) => s + a.distance * 1000, 0);
  return formatPace(totalSec / (totalM / 1000));
}

module.exports = {
  parsePace,
  formatPace,
  getPaceZone,
  getZoneDistribution,
  calculatePace,
  formatTime,
  calculateAvgPace
};
