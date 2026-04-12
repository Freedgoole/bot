// utils/formatter.js

function formatRunReport(run, aiAnalysis) {
  // Очищення тексту від зірочок для стабільності
  const cleanAnalysis = aiAnalysis ? aiAnalysis.replace(/\*/g, '') : "Аналіз недоступний";

  // 1. Основні метрики (додаємо пульс та набір висоти)
  let report = `🏃‍♂️ *${run.name}* \n`;

  report += `📏 Дистанція: ${run.distance_km} км\n`;
  report += `⏱ Час: ${run.duration}\n`;
  report += `⚡️ Темп: ${run.average_pace} хв/км\n`;
  report += `⚡️ Потужність: ${run.watts} W\n`;
  
  // Виводимо пульс, якщо він є в даних Strava
  if (run.average_heartrate && run.average_heartrate !== 'N/A') {
    report += `💓 Пульс: ${run.average_heartrate} bpm (макс: ${run.max_heartrate})\n`;
  }
  
  if (run.elevation_gain > 0) {
    report += `⛰ Набір висоти: ${run.elevation_gain} м\n`;
  }

  report += `\n`;

  // 2. Інтервали (додаємо пульс для кожного круга)
  if (run.laps && run.laps.length > 0) {
    report += `⭕️ *Інтервали:*\n`;
    run.laps.forEach((l) => {
      const hr = l.heartrate && l.heartrate !== 'N/A' ? ` | 💓 ${l.heartrate}` : '';
      report += `${l.lap}. ${l.distance_m}м — ${l.pace} хв/км${hr}\n`;
    });
  }

  // 3. Аналіз від ШІ
  report += `\n🤖 *Аналіз тренера:*\n${cleanAnalysis}`;

  return report;
}

module.exports = { formatRunReport };
