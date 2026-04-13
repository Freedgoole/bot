async function cmdStart(bot, chatId) {
  const MOTIVATION = {
    daily: [
      "🏃‍♂️ Кожен крок наближає тебе до мети!",
      "⚡ Сьогоднішній пробіг - завтрашня перемога!",
      "🔥 Немає поганого погода - є непоганий одяг!",
      "🏅 Краще бігти, ніж шкодувати!",
      "💪 Твоє тіло здатне на більше, ніж ти думаєш!"
    ]
  };
  
  const text = `🏃 <b>Привіт, атлет!</b>

Я твій персональний AI-тренер.
Підключений до Strava.

${MOTIVATION.daily[Math.floor(Math.random() * MOTIVATION.daily.length)]}

Вибери що хочеш зробити:

📊 /stats - статистика
⚡ /analyze - аналіз
📈 /progress - прогрес
💡 /motivate - мотивація`;
  await bot.send(chatId, text);
}

module.exports = cmdStart;
