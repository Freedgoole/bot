const Bot = require('../src/bot/Bot');
const StravaClient = require('../src/strava/StravaClient');
const Trainer = require('../src/ai/Trainer');
const MessageHandler = require('../src/handlers/messageHandler');

let bot, strava, trainer, handler, services;

function init() {
  if (handler) return;
  
  try {
    bot = new Bot();
    strava = new StravaClient();
    trainer = new Trainer();
    services = { bot, strava, trainer };
    handler = new MessageHandler(services);
    handler.registerCommands();
  } catch (err) {
    console.error('Init error:', err);
  }
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).send('🏃 Strava Trainer Bot is running!');
  }

  if (req.method === 'POST') {
    init();

    const { message, callback_query } = req.body;

    if (callback_query) {
      const chatId = callback_query.message.chat.id;
      const messageId = callback_query.message.message_id;
      const data = callback_query.data;

      const callbacks = {
        menu: () => handler.showMenu({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } }),
        stats: () => handler.cmdStatsCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } }),
        progress: () => handler.cmdProgressCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } }),
        compare: () => handler.cmdCompareCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } }),
        week: () => handler.cmdWeekCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } }),
        advice: () => handler.cmdAdviceCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } }),
        analyze: () => handler.cmdAnalyzeCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } }),
        analysis_drift: () => handler.showDriftAnalysis({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } }),
        analysis_pace: () => handler.showPaceAnalysis({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } }),
        chart_week: () => handler.showWeeklyChart({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } }),
        chart_pace: () => handler.showPaceChart({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } }),
        chart_hr: () => handler.showHrChart({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } }),
      };

      for (const [key, callback] of Object.entries(callbacks)) {
        if (data === key) {
          await callback();
          return res.status(200).send('OK');
        }
      }
    }

    if (message?.text?.startsWith('/')) {
      const chatId = message.chat.id;
      const command = message.text.slice(1).split(' ')[0];

      const commands = {
        start: () => handler.cmdStart({ chat: { id: chatId } }),
        help: () => handler.cmdHelp({ chat: { id: chatId } }),
        analyze: () => handler.cmdAnalyze({ chat: { id: chatId } }),
        today: () => handler.cmdToday({ chat: { id: chatId } }),
        stats: () => handler.cmdStats({ chat: { id: chatId } }),
        week: () => handler.cmdWeek({ chat: { id: chatId } }),
        advice: () => handler.cmdAdvice({ chat: { id: chatId } }),
        progress: () => handler.cmdProgress({ chat: { id: chatId } }),
        compare: () => handler.cmdCompare({ chat: { id: chatId } }),
        chart: () => handler.cmdChart({ chat: { id: chatId } }),
        pb: () => handler.cmdPersonalBest({ chat: { id: chatId } }),
        streak: () => handler.cmdStreak({ chat: { id: chatId } }),
      };

      if (commands[command]) {
        await commands[command]();
        return res.status(200).send('OK');
      }
    }

    return res.status(200).send('OK');
  }

  return res.status(405).send('Method not allowed');
};
