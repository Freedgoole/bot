require('dotenv').config();

const Bot = require('../src/bot/Bot');
const StravaClient = require('../src/strava/StravaClient');
const Trainer = require('../src/ai/Trainer');
const MessageHandler = require('../src/handlers/messageHandler');

const bot = new Bot();
const strava = new StravaClient();
const trainer = new Trainer();

const services = { bot, strava, trainer };
const handler = new MessageHandler(services);

let initialized = false;

function init() {
  if (initialized) return;
  handler.registerCommands();
  initialized = true;
  console.log('Bot initialized');
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

      for (const [pattern, callback] of Object.entries(getCallbacks())) {
        if (data === pattern || data.startsWith(pattern)) {
          await callback({ 
            id: callback_query.id,
            data,
            message: { 
              chat: { id: chatId }, 
              message_id: messageId 
            }
          });
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
      }
    }

    return res.status(200).send('OK');
  }

  return res.status(405).send('Method not allowed');
};

function getCallbacks() {
  return {
    menu: (q) => handler.showMenu(q),
    stats: (q) => handler.cmdStatsCallback(q),
    progress: (q) => handler.cmdProgressCallback(q),
    compare: (q) => handler.cmdCompareCallback(q),
    week: (q) => handler.cmdWeekCallback(q),
    advice: (q) => handler.cmdAdviceCallback(q),
    analyze: (q) => handler.cmdAnalyzeCallback(q),
    analysis_drift: (q) => handler.showDriftAnalysis(q),
    analysis_pace: (q) => handler.showPaceAnalysis(q),
    analysis_full: (q) => handler.cmdAnalyzeCallback(q),
    chart_week: (q) => handler.showWeeklyChart(q),
    chart_pace: (q) => handler.showPaceChart(q),
    chart_hr: (q) => handler.showHrChart(q),
  };
}
