const { getDailyMotivation } = require('../utils');

async function cmdStart(bot, chatId) {
  const text = `🏃 <b>Привіт, атлет!</b>

Я твій персональний AI-тренер.
Підключений до Strava.

${getDailyMotivation()}

Вибери що хочеш зробити:

📊 /stats - статистика
⚡ /analyze - аналіз
📈 /progress - прогрес
💡 /motivate - мотивація`;
  await bot.send(chatId, text);
}

module.exports = cmdStart;
