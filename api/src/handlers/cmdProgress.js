async function cmdProgress(bot, strava) {
  return async (chatId) => {
    try {
      const activities = await strava.getRecentActivities(20);
      const running = activities.filter(a => a.type === 'Run');
      const totalKm = running.reduce((s, a) => s + a.distance, 0);

      const response = `<b>📈 Прогрес за 30 днів:</b>

🏃 ${running.length} тренувань
📏 ${totalKm.toFixed(1)} км

---
💪 Продовжуй! Ти на правильному шляху!`;

      await bot.send(chatId, response);
    } catch (err) {
      console.error('Progress error:', err);
      bot.send(chatId, '❌ Помилка');
    }
  };
}

module.exports = cmdProgress;
