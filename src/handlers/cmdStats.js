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
🏃‍♂️ Кожен крок наближає тебе до мети!`;

      await bot.send(chatId, response);
    } catch (err) {
      console.error('Stats error:', err);
      bot.send(chatId, '❌ Помилка отримання статистики.');
    }
  };
}

function calculateAvgPace(activities) {
  const totalSec = activities.reduce((s, a) => s + a.duration, 0);
  const totalM = activities.reduce((s, a) => s + a.distance * 1000, 0);
  const pace = totalSec / (totalM / 1000);
  const m = Math.floor(pace / 60);
  const s = Math.round(pace % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

module.exports = cmdStats;
