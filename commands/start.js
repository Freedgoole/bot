module.exports = async (chatId, { bot }) => {
  await bot.sendMessage(chatId, `Привіт! Я твій Champion 🐈‍⬛🥗`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🏃‍♂️ Проаналізуй мій біг", callback_data: "analyze_run" }],
        [{ text: "📅 Що по плану?", callback_data: "get_plan" }]
      ]
    }
  });
};