const TelegramClient = require('../chat/telegram.js');
const StravaClient = require('../strava/index.js');
const AITrainer = require('../api/ai.js');
const commands = require('../commands/index.js'); // Імпортуємо наш словник

const bot = new TelegramClient();
const strava = new StravaClient();
const aiTrainer = new AITrainer();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('OK');

  const { message, callback_query } = req.body;
  const chatId = message ? message.chat.id : callback_query.message.chat.id;
  const action = message ? message.text?.toLowerCase() : callback_query.data;

  // Сервіси, які ми прокидаємо в команди
  const services = { bot, strava, aiTrainer };

  try {
    if (commands[action]) {
      await commands[action](chatId, services);
    }

    if (callback_query) {
      await bot.answerCallbackQuery(callback_query.id).catch(() => {});
    }
  } catch (err) {
    console.error('🔥 Error in router:', err);
    await bot.sendMessage(chatId, "❌ Помилка виконання команди.");
  }

  return res.status(200).send('OK');
};