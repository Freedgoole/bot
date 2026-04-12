const start = require('./start');
const analyze = require('./analyze');
const plan = require('./plan');

module.exports = {
  '/start': start,
  'hello': start,
  'analyze_run': analyze,
  'my run today': analyze,
  'get_plan': plan,
  'аня':  async (chatId, { bot }) => bot.sendMessage(chatId, "как рука? 🐱"),
  'болит':  async (chatId, { bot }) => bot.sendMessage(chatId, "піздєц 🐱"),
  'ping': async (chatId, { bot }) => bot.sendMessage(chatId, "Pong! ✅")
};