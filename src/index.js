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
}

handler.registerCommands();

if (!process.env.WEBHOOK_URL) {
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
