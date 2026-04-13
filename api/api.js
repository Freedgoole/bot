require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const strava = require('./src/strava');
const { createBot } = require('./src/bot');

const bot = createBot();

const cmdStart = require('./src/handlers/cmdStart');
const cmdAnalyze = require('./src/handlers/cmdAnalyze');
const cmdStats = require('./src/handlers/cmdStats');
const cmdProgress = require('./src/handlers/cmdProgress');
const cmdMotivate = require('./src/handlers/cmdMotivate');

const handlers = {
  start: cmdStart,
  analyze: cmdAnalyze(bot, strava, GEMINI_API_KEY),
  stats: cmdStats(bot, strava),
  progress: cmdProgress(bot, strava),
  motivate: cmdMotivate(bot, strava)
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).send('🏃 Strava Trainer Bot is running!');
  }

  if (req.method === 'POST') {
    const { message } = req.body;

    if (message?.text?.startsWith('/')) {
      const chatId = message.chat.id;
      const command = message.text.slice(1).split(' ')[0];

      try {
        if (handlers[command]) {
          await handlers[command](chatId);
        } else if (command === 'help') {
          await bot.send(chatId, '📖 /stats, /analyze, /progress, /motivate');
        }
      } catch (err) {
        console.error('Command error:', err);
      }
      return res.status(200).send('OK');
    }

    return res.status(200).send('OK');
  }

  return res.status(405).send('Method not allowed');
};
