require('dotenv').config();

const StravaClient = require('./strava/index.js');
const AITrainer = require('./api/ai.js');

const aiTrainer = new AITrainer();

const strava = new StravaClient();

async function checkToday() {
  try {
    const todayRuns = await strava.getTodayActivities();

    if (todayRuns.length === 0) {
      console.log("📭 Сьогодні тренувань ще не було.");
    } else {
      console.log(`✅ Знайдено тренувань: ${todayRuns.length}`);

      for (const run of todayRuns) {
        console.log(`--- Аналіз для: ${run} ---`, run);
        
        // Викликаємо наш AI 🤖
        // const analysis = await aiTrainer.analyzeRunningActivity(run);
        
        // console.log("Статистика:", {
        //   dist: run.distance_km,
        //   pace: run.average_pace,
        //   laps: run.laps?.length
        // });
        
        // console.log("\n🤖 ВЕРДИКТ AI:");
        // console.log(analysis);
        // console.log("----------------------------\n");
      }
    }
  } catch (error) {
    console.error("❌ Помилка під час тесту:", error.message);
  }
}

checkToday();