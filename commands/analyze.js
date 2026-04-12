const { formatRunReport } = require('../utils/formatter.js');

module.exports = async (chatId, { bot, strava, aiTrainer }) => {
  const runs = await strava.getTodayActivities();
  if (!runs?.length) return bot.sendMessage(chatId, "📭 Сьогодні забігів не було.");

  for (const run of runs) {
    const loader = await bot.sendMessage(chatId, `⏳ Аналізую "${run.name}"...`);
    try {
      const analysis = await aiTrainer.analyzeRunningActivity(run);
      const report = formatRunReport(run, analysis);
      await bot.editMessageText(report, {
        chat_id: chatId,
        message_id: loader.message_id,
        parse_mode: 'Markdown'
      });
    } catch (e) {
      console.error(e);
      await bot.editMessageText(`❌ Помилка аналізу ${run.name}`, {
        chat_id: chatId, message_id: loader.message_id
      });
    }
  }
};