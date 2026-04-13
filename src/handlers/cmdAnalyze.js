const { GoogleGenerativeAI } = require('@google/generative-ai');

const PACE_ZONES = {
  Z1: { min: 360, max: Infinity, name: 'відновлення', color: '🟢' },
  Z2: { min: 330, max: 360, name: 'база', color: '🟢' },
  Z3: { min: 300, max: 330, name: 'темп', color: '🟡' },
  Z4: { min: 270, max: 300, name: 'поріг', color: '🟠' },
  Z5: { min: 0, max: 270, name: 'VO2max', color: '🔴' }
};

const MOTIVATION = {
  afterRun: [
    "💪 Відмінний біг! Продовжуй!",
    "🔥 Чудова робота! Тіло дякує!",
    "⚡ Ти зробив це!",
    "🏃 Після бігу - найкращий сон!"
  ]
};

function parsePace(pace) {
  if (!pace || typeof pace !== 'string') return 0;
  const parts = pace.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function getPaceZone(pace) {
  const sec = parsePace(pace);
  if (sec >= 360) return `Z1 ${PACE_ZONES.Z1.color}`;
  if (sec >= 330) return `Z2 ${PACE_ZONES.Z2.color}`;
  if (sec >= 300) return `Z3 ${PACE_ZONES.Z3.color}`;
  if (sec >= 270) return `Z4 ${PACE_ZONES.Z4.color}`;
  return `Z5 ${PACE_ZONES.Z5.color}`;
}

function getMotivationAfterAnalyze(activity) {
  const distance = activity.distance || 0;
  const paceSec = parsePace(activity.pace || '0:00');
  
  if (distance >= 21) return "🏆 Марафонець! Шалений результат!";
  if (distance >= 10) return "💪 Десятка! Чудова робота!";
  if (paceSec < 270) return "⚡ Шалений темп! Ти швидкий!";
  if (paceSec >= 360) return "🧘 Легкий темп - основа!";
  return MOTIVATION.afterRun[Math.floor(Math.random() * MOTIVATION.afterRun.length)];
}

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
