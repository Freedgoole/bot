require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

class Trainer {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: this.getSystemPrompt()
    });
  }

  getSystemPrompt() {
    return `Ти — експерт із фізіології бігу та спортивного тренування. Твоє ім'я — Coach AI.

ТИ ПОВИНЕН:
- Аналізувати дані тренувань з погляду науки
- Давати практичні, конкретні поради
- Буopencodeти чесним у оцінках
- Відповідати українською мовою
- Використовувати емодзі для візуалізації

СТИЛЬ:
- Професійний, але дружній
- Лаконічний (до 300 слів)
- Без Markdown заголовків (#, **)
- Формат: емодзі + текст`;
  }

  async analyzeActivity(activity, history = []) {
    const prompt = this.buildActivityPrompt(activity, history);
    try {
      const result = await this.model.generateContent(prompt);
      return (await result.response).text();
    } catch (err) {
      console.error('AI Error:', err.message);
      return 'На жаль, тренер зараз зайнятий. Спробуйте пізніше! 🏃';
    }
  }

  async generateAdvice(athleteData, recentActivities) {
    const prompt = this.buildAdvicePrompt(athleteData, recentActivities);
    try {
      const result = await this.model.generateContent(prompt);
      return (await result.response).text();
    } catch (err) {
      console.error('AI Error:', err.message);
      return 'Помилка генерації порад';
    }
  }

  async generateWeeklySummary(activities) {
    const prompt = this.buildWeeklyPrompt(activities);
    try {
      const result = await this.model.generateContent(prompt);
      return (await result.response).text();
    } catch (err) {
      console.error('AI Error:', err.message);
      return 'Помилка генерації звіту';
    }
  }

  buildActivityPrompt(activity, history = []) {
    const drift = activity.hrDrift ? `${activity.hrDrift}%` : 'немає даних';
    const splits = activity.splits?.map(s => `${s.km}км: ${s.pace}/км`).join(' | ') || 'немає';
    const paceStability = this.analyzePaceStability(activity.splits);

    let historySection = '';
    if (history.length > 0) {
      const avgPace = (history.reduce((s, a) => s + this.parsePace(a.pace), 0) / history.length).toFixed(2);
      historySection = `\nІСТОРІЯ (останні ${history.length} тренувань):
- Середній темп: ${avgPace} хв/км
- Тренд: ${activity.pace < avgPace ? '📈 швидше' : '📉 повільніше'} за середній`;
    }

    return `Проаналізуй тренування:

📊 ДАНІ:
- Назва: ${activity.name}
- Дата: ${new Date(activity.date).toLocaleDateString('uk-UA')}
- Дистанція: ${activity.distance} км
- Час: ${activity.durationFormatted}
- Темп: ${activity.pace} хв/км
- Пульс: ${activity.avgHeartrate || '?'}/${activity.maxHeartrate || '?'} bpm
- Дрейф пульсу: ${drift}
- Висота: ${activity.elevation?.toFixed(0) || 0} м${historySection}

СПЛІТИ (темп по км): ${splits}

ЗАВДАННЯ:
1. Визнач тип тренування (відновлення/база/ довга/інтервали/темпова/змагання)
2. Оціни якість (1-5⭐)
3. Поясни що показує дрейф пульсу
4. Дай 1-2 конкретні поради для наступного тренування

Формат:
[Емодзі]
⭐[Оцінка] | [Тип]
[Короткий вердикт]
[Аналіз дрейфу]
[Порада]`;
  }

  buildAdvicePrompt(athleteData, recentActivities) {
    const stats = this.calculateStats(recentActivities);

    return `Ти — персональний тренер. Склади план на наступний тиждень.

📈 СТАТИСТИКА ЗА МІСЯЦЬ:
- Тренувань: ${stats.count}
- км всього: ${stats.totalKm}
- Середній темп: ${stats.avgPace} хв/км
- Дрейф пульсу (середній): ${stats.avgDrift}%
- Найкращий темп: ${stats.bestPace}

🗓️ ОСТАННІ ТРЕНУВАННЯ:
${recentActivities.slice(0, 5).map(a => 
  `- ${a.date.slice(0,10)}: ${a.distance}км @ ${a.pace} (пульс: ${a.avgHeartrate || '?'})`
).join('\n')}

ЗАПИТ:
Склади короткий план на тиждень з урахуванням:
- Поточного рівня (${stats.avgPace} хв/км)
- Дрейфу пульсу (${stats.avgDrift}%)
- Баланс навантаження

Формат:
📋 ПЛАН НА ТИЖДЕНЬ:
[День]: [Тип] - [км] - [короткий опис]
...

💡 КЛЮЧОВА ПОРАДА:
[1-2 речення]`;
  }

  buildWeeklyPrompt(activities) {
    const stats = this.calculateStats(activities);

    return `Підсумуй тиждень тренувань:

📊 АКТИВНІСТЬ:
- Тренувань: ${activities.length}
- км всього: ${stats.totalKm}
- Час: ${stats.totalTime} хв
- Середній темп: ${stats.avgPace}

🏃 ТРЕНУВАННЯ:
${activities.map(a => 
  `- ${a.date.slice(0,10)}: ${a.distance}км ${a.pace}/км | 💓${a.avgHeartrate || '?'}`
).join('\n')}

ЗАВДАННЯ:
1. Підсумуй тиждень
2. Відзнач що добре
3. Що покращити
4. Загальна оцінка тижня

Формат:
📅 ТИЖНЕВИЙ ЗВІТ:
[Текст]

🌟 ДОСЯГНЕННЯ:
[1-2 речення]

🎯 НА НАСТУПНИЙ ТИЖДЕНЬ:
[Поради]`;
  }

  analyzePaceStability(splits) {
    if (!splits || splits.length < 3) return null;
    const paces = splits.map(s => this.parsePace(s.pace));
    const avg = paces.reduce((a, b) => a + b, 0) / paces.length;
    const variance = paces.reduce((s, p) => s + Math.pow(p - avg, 2), 0) / paces.length;
    return Math.sqrt(variance).toFixed(2);
  }

  parsePace(pace) {
    const [m, s] = pace.split(':').map(Number);
    return m * 60 + s;
  }

  calculateStats(activities) {
    const count = activities.length;
    const totalKm = activities.reduce((s, a) => s + a.distance, 0).toFixed(1);
    const totalTime = Math.round(activities.reduce((s, a) => s + a.duration, 0) / 60);
    const avgPace = count > 0 
      ? this.calculatePace(
          activities.reduce((s, a) => s + a.duration, 0),
          activities.reduce((s, a) => s + (a.distance * 1000), 0)
        )
      : '0:00';
    const avgDrift = activities.filter(a => a.hrDrift).length > 0
      ? (activities.filter(a => a.hrDrift).reduce((s, a) => s + a.hrDrift, 0) / activities.filter(a => a.hrDrift).length).toFixed(1)
      : 0;
    const bestPace = count > 0 
      ? [...activities].sort((a, b) => this.parsePace(a.pace) - this.parsePace(b.pace))[0]?.pace 
      : '0:00';

    return { count, totalKm, totalTime, avgPace, avgDrift, bestPace };
  }

  calculatePace(seconds, meters) {
    if (!meters || meters === 0) return '0:00';
    const pace = seconds / (meters / 1000);
    const mins = Math.floor(pace / 60);
    const secs = Math.round(pace % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}

module.exports = Trainer;
