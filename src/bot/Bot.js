require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

class Bot {
  constructor() {
    this.token = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    this.client = new TelegramBot(this.token, { polling: false });
    this.callbackHandlers = new Map();
    this._setupCallbacks();
  }

  setWebhook(url) {
    this.client.setWebHook(url);
    console.log('Webhook:', url);
  }

  send(chatId, text, options = {}) {
    return this.client.sendMessage(chatId, text, { parse_mode: 'HTML', ...options });
  }

  sendWithButtons(chatId, text, buttons, options = {}) {
    const keyboard = this._buildKeyboard(buttons);
    return this.client.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: JSON.stringify({ inline_keyboard: keyboard }),
      ...options
    });
  }

  editWithButtons(chatId, messageId, text, buttons, options = {}) {
    const keyboard = this._buildKeyboard(buttons);
    return this.client.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: JSON.stringify({ inline_keyboard: keyboard })
    });
  }

  reply(chatId, text) {
    return this.send(chatId, text);
  }

  onText(pattern, callback) {
    this.client.onText(pattern, async (msg, match) => {
      try {
        await callback(msg, match);
      } catch (err) {
        console.error('Handler error:', err);
        this.send(msg.chat.id, 'Помилка обробки команди');
      }
    });
  }

  onCommand(command, callback) {
    this.onText(new RegExp(`^/(${command})`), callback);
  }

  onCallback(pattern, callback) {
    this.callbackHandlers.set(pattern, callback);
  }

  answerCallback(queryId, text = '') {
    return this.client.answerCallbackQuery(queryId, { text });
  }

  _setupCallbacks() {
    this.client.on('callback_query', async (query) => {
      const data = query.data;
      
      for (const [pattern, callback] of this.callbackHandlers) {
        if (data.startsWith(pattern)) {
          try {
            await callback(query);
          } catch (err) {
            console.error('Callback error:', err);
            this.answerCallback(query.id, 'Помилка');
          }
          return;
        }
      }
    });
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
        { text: '🏔️ Висота', data: 'analysis_elevation' },
        { text: '📊 Повний', data: 'analysis_full' }
      ),
      this._buildRow(
        { text: '◀️ Назад', data: 'menu' }
      )
    ];
  }
}

module.exports = Bot;
