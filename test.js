require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_TOKEN;
console.log('Token:', token ? 'OK' : 'MISSING');

const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
  console.log('MSG:', msg.text);
  if (msg.text === '/start') {
    bot.sendMessage(msg.chat.id, '✅ Бот працює!').then(() => console.log('Sent!'));
  }
});

bot.on('polling_error', (err) => console.log('Polling error:', err.message));
