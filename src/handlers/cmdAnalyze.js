const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getPaceZone, getMotivationAfterAnalyze } = require('../utils');

async function cmdAnalyze(bot, strava, GEMINI_API_KEY) {
  return async (chatId) => {
    await bot.send(chatId, '⚡ Аналізую останнє тренування...');
    try {
      const activities = await strava.getRecentActivities(1);
      if (activities.length === 0) {
        return bot.send(chatId, '📭 Немає тренувань для аналізу.');
      }
      const activity = activities[0];
      const zone = getPaceZone(activity.pace);
      const elevation = activity.elevation || 0;
      
      let splitsText = '';
      if (activity.splits?.length > 0) {
        splitsText = '\n\n⚡ <b>ТЕМПИ:</b>\n' + activity.splits.map(s => 
          `км ${s.km}: <b>${s.pace}</b> ${getPaceZone(s.pace)}`
        ).join('\n');
      }

      let aiAnalysis = '';
      if (GEMINI_API_KEY) {
        try {
          const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
          
          const prompt = `<b>🏃 АНАЛІЗ ТРЕНУВАННЯ</b>

<b>📍 ${activity.name}</b>
${new Date(activity.date).toLocaleDateString('uk-UA')}

<b>📊 Показники:</b>
• Дистанція: <b>${activity.distance} км</b>
• Час: ${activity.durationFormatted}
• Темп: <b>${activity.pace}</b> хв/км
• Зона: <b>${zone}</b>
• Набір висоти: <b>${elevation} м</b>

━━━━━━━━━━━━━━━

ПРОАНАЛІЗУЙ та відповідь:
<b>💡 Аналіз:</b> [2-3 речення про темп, зону, рельєф]
<b>🎯 Порада:</b> [1-2 конкретні рекомендації]
<b>🔥 Мотивація:</b> [1 мотиваційне речення]</b>`;

          const result = await model.generateContent(prompt);
          aiAnalysis = '\n' + (await result.response).text();
        } catch (aiErr) {
          console.error('AI Error:', aiErr.message);
          aiAnalysis = '\n' + getMotivationAfterAnalyze(activity);
        }
      } else {
        aiAnalysis = '\n' + getMotivationAfterAnalyze(activity);
      }

      const text = `🏃 <b>${activity.name}</b>
📅 ${new Date(activity.date).toLocaleDateString('uk-UA')}
📏 ${activity.distance} км | ⏱️ ${activity.durationFormatted} | 🏃 ${activity.pace}/км
⛰️ Набір висоти: ${elevation} м
⚡ Зона: ${zone}${splitsText}

━━━━━━━━━━━━━━━
${aiAnalysis}`;

      await bot.send(chatId, text);
    } catch (err) {
      console.error('Analyze error:', err);
      bot.send(chatId, '❌ Помилка аналізу.');
    }
  };
}

module.exports = cmdAnalyze;
