require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const STRAVA_ACCESS_TOKEN = process.env.STRAVA_ACCESS_TOKEN;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

const PACE_ZONES = {
  Z1: { min: 360, max: Infinity, name: 'відновлення', color: '🟢' },
  Z2: { min: 330, max: 360, name: 'база', color: '🟢' },
  Z3: { min: 300, max: 330, name: 'темп', color: '🟡' },
  Z4: { min: 270, max: 300, name: 'поріг', color: '🟠' },
  Z5: { min: 0, max: 270, name: 'VO2max', color: '🔴' }
};

const MOTIVATION = {
  daily: ["🏃‍♂️ Кожен крок наближає тебе до мети!", "⚡ Сьогоднішній пробіг - завтрашня перемога!", "🔥 Немає поганого погода - є непоганий одяг!", "🏅 Краще бігти, ніж шкодувати!", "💪 Твоє тіло здатне на більше, ніж ти думаєш!"],
  afterRun: ["💪 Відмінний біг! Продовжуй!", "🔥 Чудова робота! Тіло дякує!", "⚡ Ти зробив це!", "🏃 Після бігу - найкращий сон!"]
};

function parsePace(pace) {
  if (!pace || typeof pace !== 'string') return 0;
  const parts = pace.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function formatPace(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getPaceZone(pace) {
  const sec = parsePace(pace);
  if (sec >= 360) return `Z1 ${PACE_ZONES.Z1.color}`;
  if (sec >= 330) return `Z2 ${PACE_ZONES.Z2.color}`;
  if (sec >= 300) return `Z3 ${PACE_ZONES.Z3.color}`;
  if (sec >= 270) return `Z4 ${PACE_ZONES.Z4.color}`;
  return `Z5 ${PACE_ZONES.Z5.color}`;
}

function calculatePace(seconds, meters) {
  if (!meters || meters === 0) return '0:00';
  const pace = seconds / (meters / 1000);
  const mins = Math.floor(pace / 60);
  const secs = Math.round(pace % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':');
}

function calculateAvgPace(activities) {
  const totalSec = activities.reduce((s, a) => s + a.duration, 0);
  const totalM = activities.reduce((s, a) => s + a.distance * 1000, 0);
  return formatPace(totalSec / (totalM / 1000));
}

function getMotivationAfterAnalyze(activity) {
  const distance = activity.distance || 0;
  const paceSec = parsePace(activity.pace || '0:00');
  if (distance >= 21) return "🏆 Марафонець! Шалений результат!";
  if (distance >= 10) return "💪 Десятка! Чудова робота!";
  if (paceSec < 270) return "⚡ Шалений темп! Ти швидкий!";
  if (paceSec >= 360) return "🧘 Легкий темп - основа!";
  return MOTIVATION.afterRun[Math.floor(Math.random() * MOTIVATION.afterRun.length)];
}

function getDailyMotivation() {
  return MOTIVATION.daily[Math.floor(Math.random() * MOTIVATION.daily.length)];
}

function getStatsMotivation(runsCount, totalKm) {
  if (runsCount >= 10 && totalKm >= 50) return "🔥 Ти справжній атлет!";
  if (runsCount >= 5 && totalKm >= 20) return "💪 Чудовий темп!";
  if (runsCount >= 3) return "⚡ Початок є!";
  return "🏃 Перший крок - найважчий.";
}

const strava = {
  baseUrl: 'https://www.strava.com/api/v3',
  lastRequest: 0,
  minDelay: 2000,
  tokens: { accessToken: STRAVA_ACCESS_TOKEN, refreshToken: STRAVA_REFRESH_TOKEN, clientId: STRAVA_CLIENT_ID, clientSecret: STRAVA_CLIENT_SECRET },

  async waitForRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.minDelay) await new Promise(r => setTimeout(r, this.minDelay - elapsed));
    this.lastRequest = Date.now();
  },

  async refreshToken() {
    const res = await axios.post('https://www.strava.com/oauth/token', { client_id: this.tokens.clientId, client_secret: this.tokens.clientSecret, grant_type: 'refresh_token', refresh_token: this.tokens.refreshToken });
    this.tokens.accessToken = res.data.access_token;
    this.tokens.refreshToken = res.data.refresh_token;
    return this.tokens.accessToken;
  },

  async request(endpoint, params = {}, retry = true) {
    await this.waitForRateLimit();
    try {
      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers: { Authorization: `Bearer ${this.tokens.accessToken}` }, params });
      return res.data;
    } catch (err) {
      if (err.response?.status === 401 && retry) { await this.refreshToken(); return this.request(endpoint, params, false); }
      throw err;
    }
  },

  async getActivities(limit = 10) { return this.request('/athlete/activities', { per_page: limit }); },
  async getActivity(id) { return this.request(`/activities/${id}`); },
  async getActivityLaps(id) { return this.request(`/activities/${id}/laps`); },

  async getRecentActivities(count = 5) {
    const activities = await this.getActivities(count);
    const enriched = [];
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      try {
        const [details, laps] = await Promise.all([this.getActivity(activity.id), this.getActivityLaps(activity.id)]);
        enriched.push(this.formatActivity(activity, details, laps));
      } catch { enriched.push(this.formatActivity(activity)); }
    }
    return enriched;
  },

  formatActivity(activity, details = null) {
    return {
      id: activity.id, name: activity.name, type: activity.type, date: activity.start_date,
      distance: parseFloat((activity.distance / 1000).toFixed(2)),
      duration: activity.moving_time, durationFormatted: this.formatTime(activity.moving_time),
      pace: this.calculatePace(activity.moving_time, activity.distance),
      avgHeartrate: Math.round(activity.average_heartrate) || null,
      elevation: activity.total_elevation_gain,
      splits: details?.splits_metric?.map(s => ({ km: s.split, pace: this.calculatePace(s.moving_time, s.distance), heartrate: Math.round(s.average_heartrate) || null })) || []
    };
  },

  calculatePace, formatTime
};

const bot = {
  client: TELEGRAM_TOKEN ? new TelegramBot(TELEGRAM_TOKEN, { polling: false }) : null,
  send(chatId, text, options = {}) {
    if (!this.client) return Promise.resolve();
    return this.client.sendMessage(chatId, text, { parse_mode: 'HTML', ...options });
  }
};

async function cmdStart(chatId) {
  await bot.send(chatId, `🏃 <b>Привіт, атлет!</b>\n\nЯ твій персональний AI-тренер.\nПідключений до Strava.\n\n${getDailyMotivation()}\n\n📊 /stats\n⚡ /analyze\n📈 /progress\n💡 /motivate`);
}

async function cmdAnalyze(chatId) {
  await bot.send(chatId, '⚡ Аналізую останнє тренування...');
  try {
    const activities = await strava.getRecentActivities(1);
    if (activities.length === 0) return bot.send(chatId, '📭 Немає тренувань.');
    const activity = activities[0];
    const zone = getPaceZone(activity.pace);
    const elevation = activity.elevation || 0;
    
    let splitsText = '';
    if (activity.splits?.length > 0) {
      splitsText = '\n\n⚡ <b>ТЕМПИ:</b>\n' + activity.splits.map(s => `км ${s.km}: <b>${s.pace}</b> ${getPaceZone(s.pace)}`).join('\n');
    }

    let aiAnalysis = '';
    if (GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        const prompt = `<b>🏃 АНАЛІЗ ТРЕНУВАННЯ</b>\n\n<b>📍 ${activity.name}</b>\n${new Date(activity.date).toLocaleDateString('uk-UA')}\n\n<b>📊 Показники:</b>\n• Дистанція: <b>${activity.distance} км</b>\n• Час: ${activity.durationFormatted}\n• Темп: <b>${activity.pace}</b> хв/км\n• Зона: <b>${zone}</b>\n• Набір висоти: <b>${elevation} м</b>\n\n━━━━━━━━━━━━━━━\n\nПРОАНАЛІЗУЙ та відповідь:\n<b>💡 Аналіз:</b> [2-3 речення]\n<b>🎯 Порада:</b> [1-2 рекомендації]\n<b>🔥 Мотивація:</b> [1 речення]`;
        const result = await model.generateContent(prompt);
        aiAnalysis = '\n' + (await result.response).text();
      } catch (aiErr) {
        console.error('AI Error:', aiErr.message);
        aiAnalysis = '\n' + getMotivationAfterAnalyze(activity);
      }
    } else {
      aiAnalysis = '\n' + getMotivationAfterAnalyze(activity);
    }

    const text = `🏃 <b>${activity.name}</b>\n📅 ${new Date(activity.date).toLocaleDateString('uk-UA')}\n📏 ${activity.distance} км | ⏱️ ${activity.durationFormatted} | 🏃 ${activity.pace}/км\n⛰️ Набір висоти: ${elevation} м\n⚡ Зона: ${zone}${splitsText}\n\n━━━━━━━━━━━━━━━\n${aiAnalysis}`;
    await bot.send(chatId, text);
  } catch (err) {
    console.error('Analyze error:', err);
    bot.send(chatId, '❌ Помилка аналізу.');
  }
}

async function cmdStats(chatId) {
  await bot.send(chatId, '📊 Збираю статистику...');
  try {
    const activities = await strava.getRecentActivities(30);
    const running = activities.filter(a => a.type === 'Run');
    if (running.length === 0) return bot.send(chatId, '📭 Немає даних.');
    const totalKm = running.reduce((s, a) => s + a.distance, 0);
    const totalTime = Math.round(running.reduce((s, a) => s + a.duration, 0) / 60);
    const avgPace = calculateAvgPace(running);
    const response = `📊 <b>Статистика за 30 днів</b>\n\n🏃 ${running.length} тренувань\n📏 ${totalKm.toFixed(1)} км\n⏱️ ${totalTime} хв\n🏃 Середній темп: ${avgPace}/км\n\n---\n${getDailyMotivation()}`;
    await bot.send(chatId, response);
  } catch (err) {
    console.error('Stats error:', err);
    bot.send(chatId, '❌ Помилка.');
  }
}

async function cmdProgress(chatId) {
  try {
    const activities = await strava.getRecentActivities(20);
    const running = activities.filter(a => a.type === 'Run');
    const totalKm = running.reduce((s, a) => s + a.distance, 0);
    await bot.send(chatId, `<b>📈 Прогрес за 30 днів:</b>\n\n🏃 ${running.length} тренувань\n📏 ${totalKm.toFixed(1)} км\n\n---\n💪 Продовжуй!`);
  } catch (err) {
    bot.send(chatId, '❌ Помилка');
  }
}

async function cmdMotivate(chatId) {
  try {
    const activities = await strava.getRecentActivities(30);
    const runs = activities.filter(a => a.type === 'Run');
    const totalKm = runs.reduce((s, a) => s + a.distance, 0);
    const text = `🎯 <b>Мотивація для тебе:</b>\n\n${getDailyMotivation()}\n\n---\n${getStatsMotivation(runs.length, totalKm)}`;
    await bot.send(chatId, text, { parse_mode: 'HTML' });
  } catch (err) {
    await bot.send(chatId, getDailyMotivation());
  }
}

const handlers = { start: cmdStart, analyze: cmdAnalyze, stats: cmdStats, progress: cmdProgress, motivate: cmdMotivate };

module.exports = async (req, res) => {
  if (req.method === 'GET') return res.status(200).send('🏃 Strava Trainer Bot is running!');
  if (req.method === 'POST') {
    const { message } = req.body;
    if (message?.text?.startsWith('/')) {
      const chatId = message.chat.id;
      const command = message.text.slice(1).split(' ')[0];
      try {
        if (handlers[command]) await handlers[command](chatId);
        else if (command === 'help') await bot.send(chatId, '📖 /stats, /analyze, /progress, /motivate');
      } catch (err) { console.error('Command error:', err); }
      return res.status(200).send('OK');
    }
    return res.status(200).send('OK');
  }
  return res.status(405).send('Method not allowed');
};
