const Bot = require('../src/bot/Bot');
const StravaClient = require('../src/strava/StravaClient');
const Trainer = require('../src/ai/Trainer');
const MessageHandler = require('../src/handlers/messageHandler');

let bot, strava, trainer, handler;

function init() {
  if (handler) return;
  
  console.log('======== INIT ========');
  console.log('TELEGRAM_TOKEN:', process.env.TELEGRAM_TOKEN ? 'SET' : 'MISSING');
  console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET' : 'MISSING');
  console.log('STRAVA_ACCESS_TOKEN:', process.env.STRAVA_ACCESS_TOKEN ? 'SET' : 'MISSING');
  console.log('========================');
  
  bot = new Bot();
  console.log('Bot created, token:', bot.token ? 'OK' : 'MISSING');
  
  strava = new StravaClient();
  trainer = new Trainer();
  
  const progress = require('../src/services/ProgressTracker');
  const charts = require('../src/services/Charts');
  const comparison = require('../src/services/Comparison');
  
  handler = new MessageHandler({ 
    bot, 
    strava, 
    trainer, 
    progress: new progress(),
    charts: new charts(),
    comparison: new comparison()
  });
  
  console.log('Handler created');
  handler.registerCommands();
  console.log('Commands registered');
  console.log('======== INIT DONE ========');
}

module.exports = async (req, res) => {
  console.log('======== REQUEST ========');
  console.log('Method:', req.method);
  console.log('Body:', JSON.stringify(req.body).slice(0, 200));
  
  try {
    if (req.method === 'GET') {
      return res.status(200).send('🏃 Strava Trainer Bot is running!');
    }

    if (req.method === 'POST') {
      init();

      const { message, callback_query } = req.body;

      if (callback_query) {
        console.log('CALLBACK_QUERY:', callback_query.data);
        const chatId = callback_query.message.chat.id;
        const messageId = callback_query.message.message_id;
        const data = callback_query.data;

        const callbackMap = {
          'menu': 'menu',
          'stats': 'stats',
          'progress': 'progress',
          'compare': 'compare',
          'week': 'week',
          'advice': 'advice',
          'analyze': 'analyze',
          'analysis_km': 'analysis_km',
          'analysis_pace': 'analysis_pace',
          'analysis_full': 'analysis_full',
          'chart_week': 'chart_week',
          'chart_pace': 'chart_pace',
          'chart_hr': 'chart_hr',
          '⚡ Аналіз': 'analyze',
          '📊 Статистика': 'stats',
          '📈 Прогрес': 'progress',
          '🔄 Порівняти': 'compare',
          '📅 Тиждень': 'week',
          '💡 Поради': 'advice',
          '💓 Дрейф': 'analysis_drift',
          '⚡ Темп': 'analysis_pace',
          '📊 Деталі': 'analysis_full',
          '◀️ Меню': 'menu',
          '📏 km/тиж': 'chart_week',
          '⚡ Темп': 'chart_pace',
          '💓 Пульс': 'chart_hr'
        };

        const action = callbackMap[data] || data;
        console.log('Mapped action:', action);

        try {
          console.log('Executing callback:', action);
          if (action === 'menu') {
            await handler.showMenu({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          } else if (action === 'stats') {
            await handler.cmdStatsCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          } else if (action === 'progress') {
            await handler.cmdProgressCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          } else if (action === 'compare') {
            await handler.cmdCompareCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          } else if (action === 'week') {
            await handler.cmdWeekCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          } else if (action === 'advice') {
            await handler.cmdAdviceCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          } else if (action === 'analyze') {
            await handler.cmdAnalyzeCallback({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          } else if (action === 'analysis_drift') {
            await handler.showDriftAnalysis({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          } else if (action === 'analysis_pace') {
            await handler.showPaceAnalysis({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          } else if (action === 'analysis_km') {
            await handler.showKmAnalysis({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          } else if (action === 'chart_week') {
            await handler.showWeeklyChart({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          } else if (action === 'chart_pace') {
            await handler.showPaceChart({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          } else if (action === 'chart_hr') {
            await handler.showHrChart({ id: callback_query.id, data, message: { chat: { id: chatId }, message_id: messageId } });
          } else {
            console.log('Unknown callback:', data);
          }
          console.log('Callback done:', action);
        } catch (err) {
          console.error('Callback error:', err.message, err.stack);
          try {
            await bot.answerCallback(callback_query.id, 'Помилка: ' + err.message);
          } catch (e) {
            console.error('Failed to send error:', e.message);
          }
        }

        return res.status(200).send('OK');
      }

      if (message?.text?.startsWith('/')) {
        const chatId = message.chat.id;
        const command = message.text.slice(1).split(' ')[0];
        console.log('COMMAND:', command, 'chatId:', chatId);

        try {
          console.log('Executing command:', command);
          if (command === 'start') {
            await handler.cmdStart({ chat: { id: chatId } });
          } else if (command === 'help') {
            await handler.cmdHelp({ chat: { id: chatId } });
          } else if (command === 'analyze') {
            await handler.cmdAnalyze({ chat: { id: chatId } });
          } else if (command === 'today') {
            await handler.cmdToday({ chat: { id: chatId } });
          } else if (command === 'stats') {
            await handler.cmdStats({ chat: { id: chatId } });
          } else if (command === 'week') {
            await handler.cmdWeek({ chat: { id: chatId } });
          } else if (command === 'advice') {
            await handler.cmdAdvice({ chat: { id: chatId } });
          } else if (command === 'progress') {
            await handler.cmdProgress({ chat: { id: chatId } });
          } else if (command === 'compare') {
            await handler.cmdCompare({ chat: { id: chatId } });
          } else if (command === 'chart') {
            await handler.cmdChart({ chat: { id: chatId } });
          } else if (command === 'pb') {
            await handler.cmdPersonalBest({ chat: { id: chatId } });
          } else if (command === 'streak') {
            await handler.cmdStreak({ chat: { id: chatId } });
          }
          console.log('Command done:', command);
        } catch (err) {
          console.error('Command error:', err.message, err.stack);
          try {
            await bot.send(chatId, '❌ Помилка: ' + err.message);
          } catch (e) {
            console.error('Failed to send error:', e.message);
          }
        }
      }

      return res.status(200).send('OK');
    }

    return res.status(405).send('Method not allowed');
  } catch (err) {
    console.error('Request error:', err.message, err.stack);
    return res.status(500).send('Error: ' + err.message);
  }
};
