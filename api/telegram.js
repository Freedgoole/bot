const Bot = require('../src/bot/Bot');
const StravaClient = require('../src/strava/StravaClient');
const Trainer = require('../src/ai/Trainer');
const MessageHandler = require('../src/handlers/messageHandler');

let bot, strava, trainer, handler;

function init() {
  if (handler) return;
  
  console.log('Initializing bot...');
  console.log('Token:', process.env.TELEGRAM_TOKEN ? 'present' : 'missing');
  
  bot = new Bot();
  strava = new StravaClient();
  trainer = new Trainer();
  handler = new MessageHandler({ bot, strava, trainer, progress: null, charts: null, comparison: null });
  handler.registerCommands();
  
  console.log('Bot initialized');
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      return res.status(200).send('🏃 Strava Trainer Bot is running!');
    }

    if (req.method === 'POST') {
      init();

      const { message, callback_query } = req.body;
      console.log('Received:', callback_query ? 'callback_query' : 'message', message?.text || callback_query?.data);

      if (callback_query) {
        const chatId = callback_query.message.chat.id;
        const messageId = callback_query.message.message_id;
        const data = callback_query.data;

        try {
          if (data === 'menu') await handler.showMenu({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          else if (data === 'stats') await handler.cmdStatsCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          else if (data === 'progress') await handler.cmdProgressCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          else if (data === 'compare') await handler.cmdCompareCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          else if (data === 'week') await handler.cmdWeekCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          else if (data === 'advice') await handler.cmdAdviceCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          else if (data === 'analyze') await handler.cmdAnalyzeCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          else if (data === 'analysis_drift') await handler.showDriftAnalysis({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          else if (data === 'analysis_pace') await handler.showPaceAnalysis({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          else if (data === 'chart_week') await handler.showWeeklyChart({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          else if (data === 'chart_pace') await handler.showPaceChart({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          else if (data === 'chart_hr') await handler.showHrChart({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
        } catch (err) {
          console.error('Callback error:', err);
          await bot.answerCallback(callback_query.id, 'Помилка');
        }

        return res.status(200).send('OK');
      }

      if (message?.text?.startsWith('/')) {
        const chatId = message.chat.id;
        const command = message.text.slice(1).split(' ')[0];
        console.log('Command:', command);

        try {
          if (command === 'start') await handler.cmdStart({ chat: { id: chatId } });
          else if (command === 'help') await handler.cmdHelp({ chat: { id: chatId } });
          else if (command === 'analyze') await handler.cmdAnalyze({ chat: { id: chatId } });
          else if (command === 'today') await handler.cmdToday({ chat: { id: chatId } });
          else if (command === 'stats') await handler.cmdStats({ chat: { id: chatId } });
          else if (command === 'week') await handler.cmdWeek({ chat: { id: chatId } });
          else if (command === 'advice') await handler.cmdAdvice({ chat: { id: chatId } });
          else if (command === 'progress') await handler.cmdProgress({ chat: { id: chatId } });
          else if (command === 'compare') await handler.cmdCompare({ chat: { id: chatId } });
          else if (command === 'chart') await handler.cmdChart({ chat: { id: chatId } });
          else if (command === 'pb') await handler.cmdPersonalBest({ chat: { id: chatId } });
          else if (command === 'streak') await handler.cmdStreak({ chat: { id: chatId } });
        } catch (err) {
          console.error('Command error:', err);
          await bot.send(chatId, '❌ Помилка: ' + err.message);
        }
      }

      return res.status(200).send('OK');
    }

    return res.status(405).send('Method not allowed');
  } catch (err) {
    console.error('Request error:', err);
    return res.status(500).send('Error: ' + err.message);
  }
};
