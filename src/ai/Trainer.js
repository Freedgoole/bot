require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

class Trainer {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: this.getSystemPrompt()
    });
    this.lastRequest = 0;
    this.minDelay = 2000;
  }

  async waitForRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.minDelay) {
      await new Promise(r => setTimeout(r, this.minDelay - elapsed));
    }
    this.lastRequest = Date.now();
  }

  getSystemPrompt() {
    return "Ти — Coach AI, експерт із фізіології бігу та спортивного тренування.\n\n" +
      "ВИХІДНИЙ ФОРМАТ: HTML для Telegram!\n" +
      "Дозволені теги: <b>, <i>\n" +
      "Заборонено: Markdown (#, **, code blocks)\n\n" +
      "АНАЛІЗ ЗОН ТЕМПУ:\n" +
      "- Z1 (відновлення): > 6:00 хв/км — легкий темп\n" +
      "- Z2 (база): 5:30 - 6:00 хв/км — аеробна зона\n" +
      "- Z3 (темп): 5:00 - 5:30 хв/км — комфортний темп\n" +
      "- Z4 (поріг): 4:30 - 5:00 хв/км — інтенсивний\n" +
      "- Z5 (VO2max): < 4:30 хв/км — максимум\n\n" +
      "СТИЛЬ: українською, до 250 слів, конкретно, без води";
  }

  async analyzeActivity(activity, history = []) {
    await this.waitForRateLimit();
    const prompt = this.buildActivityPrompt(activity, history);
    try {
      const result = await this.model.generateContent(prompt);
      return (await result.response).text();
    } catch (err) {
      console.error('AI Error:', err.message);
      return '🏃 Тренер зараз зайнятий. Спробуй пізніше!';
    }
  }

  async generateAdvice(athleteData, recentActivities) {
    await this.waitForRateLimit();
    const prompt = this.buildAdvicePrompt(athleteData, recentActivities);
    try {
      const result = await this.model.generateContent(prompt);
      return (await result.response).text();
    } catch (err) {
      console.error('AI Error:', err.message);
      return '❌ Помилка генерації порад';
    }
  }

  async generateWeeklySummary(activities) {
    await this.waitForRateLimit();
    const prompt = this.buildWeeklyPrompt(activities);
    try {
      const result = await this.model.generateContent(prompt);
      return (await result.response).text();
    } catch (err) {
      console.error('AI Error:', err.message);
      return '❌ Помилка генерації звіту';
    }
  }

  buildActivityPrompt(activity, history = []) {
    const splits = activity.splits?.map(s => ({
      km: s.km,
      pace: s.pace,
      zone: this.getPaceZone(s.pace)
    })) || [];

    const splitsText = splits.map(s => `${s.km}км: <b>${s.pace}</b> (${s.zone})`).join('\n') || 'немає';

    const avgPaceSec = this.parsePace(activity.pace);
    const mainZone = this.getPaceZone(activity.pace);

    const zoneDistribution = this.getZoneDistribution(splits);

    let historySection = '';
    if (history.length > 0) {
      const avgPace = (history.reduce((s, a) => s + this.parsePace(a.pace || '0:00'), 0) / history.length);
      const trend = avgPaceSec < avgPace ? '📈 швидше' : '📉 повільніше';
      historySection = `\n📈 Історія (${history.length} тренувань): ${this.formatPace(avgPace)} хв/км — ${trend}`;
    }

    return `<b>🏃 АНАЛІЗ ТРЕНУВАННЯ</b>

<b>📍 ${activity.name}</b>
${new Date(activity.date).toLocaleDateString('uk-UA')}

<b>📊 Основні показники:</b>
• Дистанція: <b>${activity.distance} км</b>
• Час: ${activity.durationFormatted}
• Темп: <b>${activity.pace}</b> хв/км
• Зона: <b>${mainZone}</b>
• Висота: ${activity.elevation?.toFixed(0) || 0} м${historySection}

<b>⚡ РОЗБИВКА ПО КІЛОМЕТРАХ:</b>
${splitsText}

<b>📊 РОЗПОДІЛ ЗОН:</b>
${zoneDistribution}

━━━━━━━━━━━━━━━

ПРОАНАЛІЗУЙ та відповідь:

<b>[Емодзі] Вердикт</b>
<b>⭐ Оцінка</b> | <b>[Тип тренування]</b>

<b>💡 Аналіз:</b>
[2-3 речення про темп, зону, стабільність]

<b>🎯 Порада:</b>
[1-2 конкретні рекомендації]`;
  }

  buildAdvicePrompt(athleteData, recentActivities) {
    const stats = this.calculateStats(recentActivities);
    const avgZone = this.getPaceZone(stats.avgPace);

    const recent = recentActivities.slice(0, 7).map(a => {
      const date = new Date(a.date).toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric' });
      const zone = this.getPaceZone(a.pace || '0:00');
      return `${date}: ${a.distance}км <b>${a.pace}</b> (${zone})`;
    }).join('\n');

    return `<b>💡 ПЕРСОНАЛЬНІ ПОРАДИ</b>

<b>📈 Твій профіль:</b>
• km/місяць: <b>${stats.totalKm}</b>
• Середній темп: <b>${stats.avgPace}</b> хв/км
• Зона: <b>${avgZone}</b>
• Кращий темп: <b>${stats.bestPace}</b>

<b>🗓️ Останні тренування:</b>
${recent}

━━━━━━━━━━━━━━━

<b>🎯 Головна порада:</b>
[1-2 речення про пріоритет]

<b>📋 План на тиждень:</b>
• Пн: [тип] — [км] — [опис]
• Ср: ...
• Пт: ...
• Нд: ...

<b>⚠️ На що звернути увагу:</b>
[2-3 конкретні пункти]

<b>🔥 Мотивація:</b>
[1 мотиваційне речення]`;
  }

  buildWeeklyPrompt(activities) {
    const stats = this.calculateStats(activities);
    const totalKm = activities.reduce((s, a) => s + (a.distance || 0), 0);
    const avgZone = this.getPaceZone(stats.avgPace);

    const zoneDist = this.calculateZoneDistribution(activities);

    const activitiesList = activities.map(a => {
      const date = new Date(a.date).toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric' });
      const zone = this.getPaceZone(a.pace || '0:00');
      return `${date}: ${a.distance}км <b>${a.pace}</b> (${zone})`;
    }).join('\n');

    return `<b>📅 ТИЖНЕВИЙ ЗВІТ</b>

<b>📊 Підсумок:</b>
• Тренувань: <b>${activities.length}</b>
• km: <b>${totalKm.toFixed(1)}</b>
• Темп: <b>${stats.avgPace}</b> хв/км
• Зона: <b>${avgZone}</b>

<b>📊 Розподіл зон за тиждень:</b>
${zoneDist}

<b>🏃 Тренування:</b>
${activitiesList}

━━━━━━━━━━━━━━━

<b>✅ Що добре:</b>
[1-2 речення]

<b>⚠️ Що покращити:</b>
[1-2 речення]

<b>🎯 План на наступний тиждень:</b>
• Обсяг: ~${Math.round(totalKm * 1.1)}км
• Акцент на: [зона]
• Увага на: [пункт]`;
  }

  getPaceZone(pace) {
    const sec = this.parsePace(pace);
    if (sec >= 360) return 'Z1 🟢'; // > 6:00
    if (sec >= 330) return 'Z2 🟢'; // 5:30-6:00
    if (sec >= 300) return 'Z3 🟡'; // 5:00-5:30
    if (sec >= 270) return 'Z4 🟠'; // 4:30-5:00
    return 'Z5 🔴'; // < 4:30
  }

  getZoneDistribution(splits) {
    const zones = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
    
    splits.forEach(s => {
      const sec = this.parsePace(s.pace);
      if (sec >= 360) zones.Z1++;
      else if (sec >= 330) zones.Z2++;
      else if (sec >= 300) zones.Z3++;
      else if (sec >= 270) zones.Z4++;
      else zones.Z5++;
    });

    const total = splits.length || 1;
    return Object.entries(zones)
      .map(([zone, count]) => `${zone}: ${'█'.repeat(count)}${'░'.repeat(Math.max(0, 5-count))} ${Math.round(count/total*100)}%`)
      .join('\n');
  }

  calculateZoneDistribution(activities) {
    const zones = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
    
    activities.forEach(a => {
      const sec = this.parsePace(a.pace || '0:00');
      if (sec >= 360) zones.Z1 += a.distance || 0;
      else if (sec >= 330) zones.Z2 += a.distance || 0;
      else if (sec >= 300) zones.Z3 += a.distance || 0;
      else if (sec >= 270) zones.Z4 += a.distance || 0;
      else zones.Z5 += a.distance || 0;
    });

    const total = Object.values(zones).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(zones)
      .map(([zone, km]) => `${zone}: ${km.toFixed(1)}км (${Math.round(km/total*100)}%)`)
      .join('\n');
  }

  parsePace(pace) {
    if (!pace || typeof pace !== 'string') return 0;
    const parts = pace.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0;
    return parts[0] * 60 + parts[1];
  }

  formatPace(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  calculateStats(activities) {
    if (!activities || activities.length === 0) {
      return { count: 0, totalKm: '0', totalTime: 0, avgPace: '0:00', avgDrift: '0', bestPace: '0:00' };
    }

    const count = activities.length;
    const totalKm = activities.reduce((s, a) => s + (a.distance || 0), 0).toFixed(1);
    const totalTime = Math.round(activities.reduce((s, a) => s + (a.duration || 0), 0) / 60);
    const totalSec = activities.reduce((s, a) => s + (a.duration || 0), 0);
    const totalM = activities.reduce((s, a) => s + ((a.distance || 0) * 1000), 0);
    const avgPace = count > 0 && totalM > 0 ? this.formatPace(totalSec / (totalM / 1000)) : '0:00';
    const withDrift = activities.filter(a => a.hrDrift);
    const avgDrift = withDrift.length > 0
      ? (withDrift.reduce((s, a) => s + a.hrDrift, 0) / withDrift.length).toFixed(1)
      : '0';
    const bestPace = count > 0 
      ? [...activities].sort((a, b) => this.parsePace(a.pace) - this.parsePace(b.pace))[0]?.pace || '0:00'
      : '0:00';

    return { count, totalKm, totalTime, avgPace, avgDrift, bestPace };
  }
}

module.exports = Trainer;
