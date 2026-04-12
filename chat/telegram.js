const TelegramBotApi = require('node-telegram-bot-api');
const AbstractChat = require('./abstractChat'); // якщо є твій абстрактний клас

class TelegramBot extends AbstractChat {
  constructor(token) {
    super();
    this.token = token || process.env.TELEGRAM_TOKEN;
    this.bot = new TelegramBotApi(this.token);
  }

  start(webhookUrl) {
    this.bot.setWebHook(webhookUrl);
    console.log('Webhook встановлено ✅', webhookUrl);
  }

 sendMessage(chatId, text, options = {}) {
  return this.bot.sendMessage(chatId, text, options);
}

  onMessage(callback) {
    this.bot.on('message', callback);
  }

  editMessageText(text, options = {}) {
    return this.bot.editMessageText(text, options);
  }

  onCommand(command, callback) {
    this.bot.onText(new RegExp(`/${command}`), (msg) => callback(msg));
  }

  answerCallbackQuery(callbackQueryId, options = {}) {
    return this.bot.answerCallbackQuery(callbackQueryId, options);
  }
  
}

module.exports = TelegramBot;