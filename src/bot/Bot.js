require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

class Bot {
  constructor() {
    this.token = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    if (this.token) {
      this.client = new TelegramBot(this.token, { polling: false });
    }
  }

  setWebhook(url) {
    if (this.client) {
      this.client.setWebHook(url);
    }
  }

  send(chatId, text, options = {}) {
    if (!this.client) return Promise.resolve();
    return this.client.sendMessage(chatId, text, { parse_mode: 'HTML', ...options });
  }

  sendWithButtons(chatId, text, buttons, options = {}) {
    if (!this.client) return Promise.resolve();
    const keyboard = this._buildKeyboard(buttons);
    return this.client.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: JSON.stringify({ inline_keyboard: keyboard }),
      ...options
    });
  }

  editWithButtons(chatId, messageId, text, buttons, options = {}) {
    if (!this.client) return Promise.resolve();
    const keyboard = this._buildKeyboard(buttons);
    return this.client.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: JSON.stringify({ inline_keyboard: keyboard })
    });
  }

  answerCallback(queryId, text = '') {
    if (!this.client) return Promise.resolve();
    return this.client.answerCallbackQuery(queryId, { text });
  }

  onCommand(command, callback) {
    if (!this.client) return;
    this.client.onText(new RegExp(`^/(${command})`), callback);
  }

  onText(pattern, callback) {
    if (!this.client) return;
    this.client.onText(pattern, callback);
  }

  _buildKeyboard(buttons) {
    if (!Array.isArray(buttons)) return [];
    return buttons.map(row => 
      row.map(btn => ({
        text: btn.text,
        callback_data: btn.data || btn.text
      }))
    );
  }

  _buildRow(...buttons) {
    return buttons.map(btn => ({
      text: btn.text,
      callback_data: btn.data || btn.text
    }));
  }

  mainMenu() {
    return [
      this._buildRow(
        { text: '📊 Статистика', data: 'stats' },
        { text: '📈 Прогрес', data: 'progress' }
      ),
      this._buildRow(
        { text: '🔄 Порівняти', data: 'compare' },
        { text: '📅 Тиждень', data: 'week' }
      ),
      this._buildRow(
        { text: '💡 Поради', data: 'advice' },
        { text: '⚡ Аналіз', data: 'analyze' }
      )
    ];
  }

  analysisMenu() {
    return [
      this._buildRow(
        { text: '💓 Дрейф', data: 'analysis_drift' },
        { text: '⚡ Темп', data: 'analysis_pace' }
      ),
      this._buildRow(
        { text: '◀️ Меню', data: 'menu' }
      )
    ];
  }
}

module.exports = Bot;
