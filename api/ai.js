const { GoogleGenerativeAI } = require("@google/generative-ai");

class AITrainer {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
  }

  async analyzeRunningActivity(activityData) {
    const prompt = this._buildPrompt(activityData);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (e) {
      console.error("❌ Gemini Class Error:", e.message);
      return "На жаль, тренер зараз зайнятий іншим атлетом. Спробуйте пізніше! 🏃‍♂️";
    }
  }

_buildPrompt(data) {
    const driftInfo = data.hr_drift 
      ? `${data.hr_drift}% (різниця пульсу між 1-ю та 2-ю половиною)` 
      : "дані відсутні";

    const splitsInfo = data.laps && data.laps.length > 0
      ? data.laps.map(l => l.pace).join(' -> ')
      : "відсутні";

    return `
      ДІЙ ЯК: Експерт із фізіології бігу та тренер (Running Science AI). Твоє завдання — аналізувати дані тренувань, використовуючи принципи біомеханіки та теорії спортивного тренування.

      ДАНІ ТРЕНУВАННЯ:
      - Назва: ${data.name}
      - Дистанція: ${data.distance_km} км
      - Темп (середній): ${data.average_pace} хв/км
      - Пульс (сер/макс): ${data.average_heartrate} / ${data.max_heartrate} bpm
      - Серцевий дрейф (Aerobic Decoupling): ${driftInfo}
      - Потужність: ${data.watts} W
      - Спліти (темп по км): ${splitsInfo}

      ЛОГІКА АНАЛІЗУ:
      1. КЛАСИФІКАЦІЯ: Визнач тип (Recovery, Base, Long Run, Intervals, Tempo, Race) на основі пульсу та стабільності темпу.
      2. ОЦІНКА (1-5 ⭐): 
         - 5: Дрейф <3%, стабільний темп/пульс.
         - 4: Дрейф 3-7%, якісна робота.
         - 3: Дрейф 8-10% або просідання темпу.
         - 1-2: Дрейф >10% або пульс у "червоній" зоні на низькій швидкості.
      3. ДРЕЙФ: <5% — ідеальна база; 5-10% — норма; >10% — втома/дефіцит аеробної підготовки.
      4. ПОТУЖНІСТЬ: Якщо ${data.watts}W стабільні відносно темпу — це позитивний маркер механічної ефективності.

      ФОРМАТ ВІДПОВІДІ (СУВОРО: БЕЗ Markdown-розмітки **, БЕЗ заголовків #):
      [Відповідний Емодзі]
      Статус: [Кількість зірок ⭐]
      Тип: [Назва типу] | [Вердикт: коротка фраза на кшталт "Красава!", "Потужно!", "Не халяв!"]
      Ефективність: [Лаконічний висновок про дрейф та аеробну базу]
      Аналіз: [2-3 речення: зв'язок пульсу, потужності ${data.watts}W та темпу. Поясни фізіологічну причину результату]
      Порада: [Конкретна науково обґрунтована рекомендація для наступного кроку]

      Мова: Українська. Стиль: Професійний, лаконічний, експертний.
    `;
}
} 

module.exports = AITrainer;