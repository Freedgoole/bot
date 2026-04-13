require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

function createBot() {
  const client = TELEGRAM_TOKEN ? new TelegramBot(TELEGRAM_TOKEN, { polling: false }) : null;

  return {
    client,

    send(chatId, text, options = {}) {
      if (!client) return Promise.resolve();
      return client.sendMessage(chatId, text, { parse_mode: 'HTML', ...options });
    },

    sendWithButtons(chatId, text, buttons, options = {}) {
      if (!client) return Promise.resolve();
      return client.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: JSON.stringify({ inline_keyboard: buttons }),
        ...options
      });
    },

    answerCallback(queryId, text = '') {
      if (!client) return Promise.resolve();
      return client.answerCallbackQuery(queryId, { text });
    },

    buildRow(...buttons) {
      return buttons.map(btn => ({
        text: btn.text,
        callback_data: btn.data || btn.text
      }));
    },

    mainMenu() {
      return [
        this.buildRow({ text: '📊 Статистика', data: 'stats' }, { text: '📈 Прогрес', data: 'progress' }),
        this.buildRow({ text: '🔄 Порівняти', data: 'compare' }, { text: '📅 Тиждень', data: 'week' }),
        this.buildRow({ text: '💡 Поради', data: 'advice' }, { text: '⚡ Аналіз', data: 'analyze' })
      ];
    }
  };
}

module.exports = { createBot };
