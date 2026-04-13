async function cmdMotivate(bot, strava) {
  return async (chatId) => {
    const MOTIVATION = {
      daily: [
        "🏃‍♂️ Кожен крок наближає тебе до мети!",
        "⚡ Сьогоднішній пробіг - завтрашня перемога!",
        "🔥 Немає поганого погода - є непоганий одяг!",
        "🏅 Краще бігти, ніж шкодувати!",
        "💪 Твоє тіло здатне на більше, ніж ти думаєш!"
      ]
    };
    
    try {
      const activities = await strava.getRecentActivities(30);
      const runs = activities.filter(a => a.type === 'Run');
      const totalKm = runs.reduce((s, a) => s + a.distance, 0);
      
      let statsMsg = '';
      if (runs.length >= 10 && totalKm >= 50) {
        statsMsg = "🔥 Ти справжній атлет! Продовжуй рівень!";
      } else if (runs.length >= 5 && totalKm >= 20) {
        statsMsg = "💪 Чудовий темп! Ти на правильному шляху!";
      } else if (runs.length >= 3) {
        statsMsg = "⚡ Початок є! Додай ще трохи!";
      } else {
        statsMsg = "🏃 Перший крок - найважчий. Ти вже біжиш!";
      }
      
      const text = `🎯 <b>Мотивація для тебе:</b>

${MOTIVATION.daily[Math.floor(Math.random() * MOTIVATION.daily.length)]}

---
${statsMsg}`;
      
      await bot.send(chatId, text, { parse_mode: 'HTML' });
    } catch (err) {
      await bot.send(chatId, MOTIVATION.daily[Math.floor(Math.random() * MOTIVATION.daily.length)]);
    }
  };
}

module.exports = cmdMotivate;
