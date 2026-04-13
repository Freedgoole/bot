const { calculateAvgPace, getDailyMotivation } = require('../utils');

async function cmdStats(bot, strava) {
  return async (chatId) => {
    await bot.send(chatId, '📊 Збираю статистику...');
    try {
      const activities = await strava.getRecentActivities(30);
      const running = activities.filter(a => a.type === 'Run');
      
      if (running.length === 0) {
        return bot.send(chatId, '📭 Немає даних за цей період.');
      }

      const totalKm = running.reduce((s, a) => s + a.distance, 0);
      const totalTime = Math.round(running.reduce((s, a) => s + a.duration, 0) / 60);
      const avgPace = calculateAvgPace(running);

      const response = `📊 <b>Статистика за 30 днів</b>

🏃 ${running.length} тренувань
📏 ${totalKm.toFixed(1)} км
⏱️ ${totalTime} хв
🏃 Середній темп: ${avgPace}/км

---
${getDailyMotivation()}`;

      await bot.send(chatId, response);
    } catch (err) {
      console.error('Stats error:', err);
      bot.send(chatId, '❌ Помилка отримання статистики.');
    }
  };
}

module.exports = cmdStats;
