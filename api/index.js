require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const STRAVA_ACCESS_TOKEN = process.env.STRAVA_ACCESS_TOKEN;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

const strava = require('./src/strava');

const bot = {
  client: TELEGRAM_TOKEN ? new TelegramBot(TELEGRAM_TOKEN, { polling: false }) : null,

  send(chatId, text, options = {}) {
    if (!this.client) return Promise.resolve();
    return this.client.sendMessage(chatId, text, { parse_mode: 'HTML', ...options });
  }
};

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
