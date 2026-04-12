require('dotenv').config();

const Bot = require('./bot/Bot');
const StravaClient = require('./strava/StravaClient');
const Trainer = require('./ai/Trainer');
const MessageHandler = require('./handlers/messageHandler');

const bot = new Bot();
const strava = new StravaClient();
const trainer = new Trainer();

const services = { bot, strava, trainer };
const handler = new MessageHandler(services);

if (process.env.WEBHOOK_URL) {
  bot.setWebhook(process.env.WEBHOOK_URL);
  console.log('Webhook mode:', process.env.WEBHOOK_URL);
} else {
  bot.client.on('message', async (msg) => {
    if (!msg.text || !msg.text.startsWith('/')) return;
    const command = msg.text.slice(1).split(' ')[0];
    console.log('Command:', command);
    
    try {
      if (command === 'start') await handler.cmdStart(msg.chat);
      else if (command === 'help') await handler.cmdHelp(msg.chat);
      else if (command === 'analyze') await handler.cmdAnalyze(msg.chat);
      else if (command === 'today') await handler.cmdToday(msg.chat);
      else if (command === 'stats') await handler.cmdStats(msg.chat);
      else if (command === 'week') await handler.cmdWeek(msg.chat);
      else if (command === 'advice') await handler.cmdAdvice(msg.chat);
      else if (command === 'progress') await handler.cmdProgress(msg.chat);
      else if (command === 'compare') await handler.cmdCompare(msg.chat);
      else if (command === 'chart') await handler.cmdChart(msg.chat);
      else if (command === 'pb') await handler.cmdPersonalBest(msg.chat);
      else if (command === 'streak') await handler.cmdStreak(msg.chat);
    } catch (err) {
      console.error('Command error:', err);
      bot.send(msg.chat.id, '❌ Помилка: ' + err.message);
    }
  });

  bot.client.on('callback_query', async (query) => {
    const { data, message } = query;
    const chatId = message.chat.id;
    const messageId = message.message_id;
    
    try {
      await handler.bot.answerCallback(query.id);
      if (data === 'menu') await handler.showMenu(query);
      else if (data === 'stats') await handler.cmdStatsCallback(query);
      else if (data === 'progress') await handler.cmdProgressCallback(query);
      else if (data === 'compare') await handler.cmdCompareCallback(query);
      else if (data === 'week') await handler.cmdWeekCallback(query);
      else if (data === 'advice') await handler.cmdAdviceCallback(query);
      else if (data === 'analyze') await handler.cmdAnalyzeCallback(query);
      else if (data === 'analysis_pace') await handler.showPaceAnalysis(query);
      else if (data === 'analysis_km') await handler.showKmAnalysis(query);
      else if (data === 'chart_week') await handler.showWeeklyChart(query);
      else if (data === 'chart_pace') await handler.showPaceChart(query);
      else if (data === 'chart_hr') await handler.showHrChart(query);
    } catch (err) {
      console.error('Callback error:', err);
    }
  });

  bot.client.startPolling();
  console.log('Polling mode started...');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  const { message } = req.body;
  if (!message?.text) {
    return res.status(200).send('OK');
  }

  return res.status(200).send('OK');
};
