module.exports = async (chatId, { bot, strava }) => {
  try {
    const loader = await bot.sendMessage(chatId, "⏳ Заглядаю у твій журнал тренувань...");
    
    // Беремо активності за останній тиждень
    const recentActivities = await strava.getRecentActivities(7); 
    
    const dayOfWeek = new Date().getDay(); // 0 - Нд, 1 - Пн...
    let recommendation = "";

    if (!recentActivities || recentActivities.length === 0) {
      recommendation = "Ти давно не бігав! 🐈‍⬛ Почни з легкої прогулянки на 20-30 хв (Z1), щоб розбудити організм.";
    } else {
      // Проста логіка на основі дня тижня
      switch (dayOfWeek) {
        case 1: // Понеділок
          recommendation = "Сьогодні понеділок — день відновлення. Краще зробити розтяжку або повний відпочинок. Тілу треба час на адаптацію.";
          break;
        case 2: // Вівторок
          recommendation = "Час для швидкості! ⚡️ Спробуй інтервали: 5 разів по 400 метрів у темпі, де важко розмовляти. Між ними — 2 хв підтюпцем.";
          break;
        case 4: // Четвер
          recommendation = "Темпове тренування. 🏃‍♂️ Пробіжи 5-7 км у 'комфортно-важкому' темпі. Це розвиває твій поріг лактату.";
          break;
        case 0: // Неділя
          recommendation = "День Long Run! 🌳 Твоя ціль — тривалість, а не швидкість. Біжи на 20-30% довше, ніж зазвичай, але на низькому пульсі.";
          break;
        default:
          recommendation = "Сьогодні день легкого аеробного бігу (Z2). Пульс не має перевищувати 140-145 уд/хв. Розвиваємо капіляри!";
      }
    }

    await bot.editMessageText(`📅 **Твій персональний орієнтир на сьогодні:**\n\n${recommendation}\n\n_Порада: Коли завершиш, натисни "Аналіз забігу", і я перевірю результат!_`, {
      chat_id: chatId,
      message_id: loader.message_id,
      parse_mode: 'Markdown'
    });

  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, "❌ Не вдалося сформувати пораду. Просто біжи в задоволення!");
  }
};