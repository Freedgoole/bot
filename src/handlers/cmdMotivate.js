const { getDailyMotivation, getStatsMotivation } = require('../utils');

async function cmdMotivate(bot, strava) {
  return async (chatId) => {
    try {
      const activities = await strava.getRecentActivities(30);
      const runs = activities.filter(a => a.type === 'Run');
      const totalKm = runs.reduce((s, a) => s + a.distance, 0);
      
      const text = `🎯 <b>Мотивація для тебе:</b>

${getDailyMotivation()}

---
${getStatsMotivation(runs.length, totalKm)}`;
      
      await bot.send(chatId, text, { parse_mode: 'HTML' });
    } catch (err) {
      await bot.send(chatId, getDailyMotivation());
    }
  };
}

module.exports = cmdMotivate;
