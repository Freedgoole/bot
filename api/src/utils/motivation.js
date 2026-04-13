const { MOTIVATION } = require('./constants');
const { parsePace } = require('./pace');

function getMotivationAfterAnalyze(activity) {
  const distance = activity.distance || 0;
  const paceSec = parsePace(activity.pace || '0:00');
  
  if (distance >= 21) return "🏆 Марафонець! Шалений результат!";
  if (distance >= 10) return "💪 Десятка! Чудова робота!";
  if (paceSec < 270) return "⚡ Шалений темп! Ти швидкий!";
  if (paceSec >= 360) return "🧘 Легкий темп - основа!";
  return MOTIVATION.afterRun[Math.floor(Math.random() * MOTIVATION.afterRun.length)];
}

function getDailyMotivation() {
  return MOTIVATION.daily[Math.floor(Math.random() * MOTIVATION.daily.length)];
}

function getStatsMotivation(runsCount, totalKm) {
  if (runsCount >= 10 && totalKm >= 50) {
    return "🔥 Ти справжній атлет! Продовжуй рівень!";
  }
  if (runsCount >= 5 && totalKm >= 20) {
    return "💪 Чудовий темп! Ти на правильному шляху!";
  }
  if (runsCount >= 3) {
    return "⚡ Початок є! Додай ще трохи!";
  }
  return "🏃 Перший крок - найважчий. Ти вже біжиш!";
}

module.exports = {
  getMotivationAfterAnalyze,
  getDailyMotivation,
  getStatsMotivation
};
