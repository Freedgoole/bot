require('dotenv').config();

const Bot = require('./bot/Bot');
const StravaClient = require('./strava/StravaClient');
const Trainer = require('./ai/Trainer');
const MessageHandler = require('./handlers/messageHandler');

const bot = new Bot();
const strava = new StravaClient();
const trainer = new Trainer();
const handler = new MessageHandler({ bot, strava, trainer });

  if (!process.env.WEBHOOK_URL) {
    bot.client.on('message', async (msg) => {
      if (!msg.text || !msg.text.startsWith('/')) return;
      
      const parts = msg.text.slice(1).split(' ');
      const cmd = parts[0];
      const args = parts.slice(1);
      console.log('Command:', cmd, 'Args:', args);
      
      try {
        if (cmd === 'start') await handler.cmdStart(msg);
        else if (cmd === 'help') await handler.cmdHelp(msg);
        else if (cmd === 'analyze') await handler.cmdAnalyze(msg);
        else if (cmd === 'today') await handler.cmdToday(msg);
        else if (cmd === 'stats') await handler.cmdStats(msg);
        else if (cmd === 'week') await handler.cmdWeek(msg);
        else if (cmd === 'advice') await handler.cmdAdvice(msg);
        else if (cmd === 'progress') await handler.cmdProgress(msg);
        else if (cmd === 'compare') await handler.cmdCompare(msg);
        else if (cmd === 'chart') await handler.cmdChart(msg);
        else if (cmd === 'pb') await handler.cmdPersonalBest(msg);
        else if (cmd === 'streak') await handler.cmdStreak(msg);
        else if (cmd === 'motivate') await handler.cmdMotivate(msg);
      } catch (err) {
        console.error('Error:', err);
        bot.send(msg.chat.id, '❌ Помилка: ' + err.message);
      }
    });

  bot.client.on('callback_query', async (query) => {
    const { data, message } = query;
    bot.answerCallback(query.id).catch(() => {});
    
    const chatId = message.chat.id;
    const msg = { chat: { id: chatId } };
    
    try {
      if (data === 'menu') await handler.cmdStart(msg);
      else if (data === 'stats') await handler.cmdStats(msg);
      else if (data === 'progress') await handler.cmdProgress(msg);
      else if (data === 'compare') await handler.cmdCompare(msg);
      else if (data === 'week') await handler.cmdWeek(msg);
      else if (data === 'advice') await handler.cmdAdvice(msg);
      else if (data === 'analyze') await handler.cmdAnalyze(msg);
    } catch (err) {
      console.error('Callback error:', err);
      bot.send(chatId, '❌ Помилка: ' + err.message);
    }
  });

  bot.client.startPolling();
  console.log('Bot started!');
}
