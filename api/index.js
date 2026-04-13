require('dotenv').config();
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const TelegramBot = require('node-telegram-bot-api');

const MAX_HR = parseInt(process.env.USER_MAX_HR || 185);
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

const HR_ZONES = {
  Z1: { min: 0.50, max: 0.60, name: 'відновлення' },
  Z2: { min: 0.60, max: 0.70, name: 'база' },
  Z3: { min: 0.70, max: 0.80, name: 'аеробна' },
  Z4: { min: 0.80, max: 0.90, name: 'поріг' },
  Z5: { min: 0.90, max: 1.00, name: 'максимум' }
};

const MOTIVATION = {
  daily: [
    "🏃‍♂️ Кожен крок наближає тебе до мети!",
    "⚡ Сьогоднішній пробіг - завтрашня перемога!",
    "🔥 Немає поганого погода - є непоганий одяг!",
    "🏅 Краще бігти, ніж шкодувати!",
    "💪 Твоє тіло здатне на більше, ніж ти думаєш!"
  ],
  afterRun: [
    "💪 Відмінний біг! Продовжуй!",
    "🔥 Чудова робота! Тіло дякує!",
    "⚡ Ти зробив це!",
    "🏃 Після бігу - найкращий сон!"
  ]
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

const strava = {
  baseUrl: 'https://www.strava.com/api/v3',
  lastRequest: 0,
  minDelay: 2000,
  cache: new Map(),
  cacheTtl: 300000,
  tokens: {
    accessToken: STRAVA_ACCESS_TOKEN,
    refreshToken: STRAVA_REFRESH_TOKEN,
    clientId: STRAVA_CLIENT_ID,
    clientSecret: STRAVA_CLIENT_SECRET
  },

  async waitForRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.minDelay) {
      await new Promise(r => setTimeout(r, this.minDelay - elapsed));
    }
    this.lastRequest = Date.now();
  },

  async refreshToken() {
    const res = await axios.post('https://www.strava.com/oauth/token', {
      client_id: this.tokens.clientId,
      client_secret: this.tokens.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: this.tokens.refreshToken
    });
    this.tokens.accessToken = res.data.access_token;
    this.tokens.refreshToken = res.data.refresh_token;
    return this.tokens.accessToken;
  },

  async request(endpoint, params = {}, retry = true) {
    await this.waitForRateLimit();
    try {
      const res = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
        params
      });
      return res.data;
    } catch (err) {
      if (err.response?.status === 401 && retry) {
        await this.refreshToken();
        return this.request(endpoint, params, false);
      }
      throw err;
    }
  },

  async getActivities(limit = 10) {
    return this.request('/athlete/activities', { per_page: limit });
  },

  async getActivity(id) {
    return this.request(`/activities/${id}`);
  },

  async getActivityLaps(id) {
    return this.request(`/activities/${id}/laps`);
  },

  async getRecentActivities(count = 5) {
    const activities = await this.getActivities(count);
    const enriched = [];
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      try {
        const [details, laps] = await Promise.all([
          this.getActivity(activity.id),
          this.getActivityLaps(activity.id)
        ]);
        enriched.push(this.formatActivity(activity, details, laps));
      } catch {
        enriched.push(this.formatActivity(activity));
      }
    }
    return enriched;
  },

  formatActivity(activity, details = null, laps = []) {
    return {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      date: activity.start_date,
      distance: parseFloat((activity.distance / 1000).toFixed(2)),
      duration: activity.moving_time,
      durationFormatted: this.formatTime(activity.moving_time),
      pace: this.calculatePace(activity.moving_time, activity.distance),
      avgHeartrate: Math.round(activity.average_heartrate) || null,
      elevation: activity.total_elevation_gain,
      splits: details?.splits_metric?.map(s => ({
        km: s.split,
        pace: this.calculatePace(s.moving_time, s.distance),
        heartrate: Math.round(s.average_heartrate) || null
      })) || []
    };
  },

  calculatePace(seconds, meters) {
    if (!meters || meters === 0) return '0:00';
    const pace = seconds / (meters / 1000);
    const mins = Math.floor(pace / 60);
    const secs = Math.round(pace % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  },

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':');
  }
};

const bot = {
  client: TELEGRAM_TOKEN ? new TelegramBot(TELEGRAM_TOKEN, { polling: false }) : null,

  send(chatId, text, options = {}) {
    if (!this.client) return Promise.resolve();
    return this.client.sendMessage(chatId, text, { parse_mode: 'HTML', ...options });
  },

  sendWithButtons(chatId, text, buttons) {
    if (!this.client) return Promise.resolve();
    return this.client.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: JSON.stringify({ inline_keyboard: buttons })
    });
  },

  answerCallback(queryId, text = '') {
    if (!this.client) return Promise.resolve();
    return this.client.answerCallbackQuery(queryId, { text });
  },

  buildRow(...buttons) {
    return buttons.map(btn => ({
      text: btn.text,
      callback_data: btn.data || btn.text
    }));
  },

  mainMenu() {
    return [
      this.buildRow({ text: '📊 Статистика', data: 'stats' }, { text: '📈 Прогрес', data: 'progress' }),
      this.buildRow({ text: '🔄 Порівняти', data: 'compare' }, { text: '📅 Тиждень', data: 'week' }),
      this.buildRow({ text: '💡 Поради', data: 'advice' }, { text: '⚡ Аналіз', data: 'analyze' })
    ];
  }
};

async function cmdStart(chatId) {
  const text = `🏃 <b>Привіт, атлет!</b>

Я твій персональний AI-тренер.
Підключений до Strava.

${MOTIVATION.daily[Math.floor(Math.random() * MOTIVATION.daily.length)]}

Вибери що хочеш зробити:

📊 /stats - статистика
⚡ /analyze - аналіз
📈 /progress - прогрес
💡 /motivate - мотивація`;
  await bot.send(chatId, text);
}

async function cmdAnalyze(chatId) {
  await bot.send(chatId, '⚡ Аналізую останнє тренування...');
  try {
    const activities = await strava.getRecentActivities(1);
    if (activities.length === 0) {
      return bot.send(chatId, '📭 Немає тренувань для аналізу.');
    }
    const activity = activities[0];
    const zone = getPaceZone(activity.pace);
    
    let splitsText = '';
    if (activity.splits?.length > 0) {
      splitsText = '\n\n⚡ <b>ТЕМПИ:</b>\n' + activity.splits.map(s => 
        `км ${s.km}: <b>${s.pace}</b> ${getPaceZone(s.pace)}`
      ).join('\n');
    }

    const motivation = getMotivationAfterAnalyze(activity);

    const text = `🏃 <b>${activity.name}</b>
📅 ${new Date(activity.date).toLocaleDateString('uk-UA')}
📏 ${activity.distance} км | ⏱️ ${activity.durationFormatted} | 🏃 ${activity.pace}/км
⚡ Зона: ${zone}${splitsText}

━━━━━━━━━━━━━━━

${motivation}`;

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
    
    if (running.length === 0) {
      return bot.send(chatId, '📭 Немає даних за цей період.');
    }

    const totalKm = running.reduce((s, a) => s + a.distance, 0);
    const totalTime = Math.round(running.reduce((s, a) => s + a.duration, 0) / 60);
    const avgPace = calculateAvgPace(running);

    const response = `📊 <b>Статистика за 30 днів</b>

🏃 ${running.length} тренувань
📏 ${totalKm.toFixed(1)} км
⏱️ ${totalTime} хв
🏃 Середній темп: ${avgPace}/км

---
${MOTIVATION.daily[Math.floor(Math.random() * MOTIVATION.daily.length)]}`;

    await bot.send(chatId, response);
  } catch (err) {
    console.error('Stats error:', err);
    bot.send(chatId, '❌ Помилка отримання статистики.');
  }
}

async function cmdProgress(chatId) {
  try {
    const activities = await strava.getRecentActivities(20);
    const running = activities.filter(a => a.type === 'Run');
    const totalKm = running.reduce((s, a) => s + a.distance, 0);

    const response = `<b>📈 Прогрес за 30 днів:</b>

🏃 ${running.length} тренувань
📏 ${totalKm.toFixed(1)} км

---
${MOTIVATION.daily[Math.floor(Math.random() * MOTIVATION.daily.length)]}`;

    await bot.send(chatId, response);
  } catch (err) {
    bot.send(chatId, '❌ Помилка');
  }
}

async function cmdMotivate(chatId) {
  try {
    const activities = await strava.getRecentActivities(30);
    const runs = activities.filter(a => a.type === 'Run');
    const totalKm = runs.reduce((s, a) => s + a.distance, 0);
    
    let statsMsg = '';
    if (runs.length >= 10 && totalKm >= 50) {
      statsMsg = "🔥 Ти справжній атлет! Продовжуй рівень!";
    } else if (runs.length >= 5 && totalKm >= 20) {
      statsMsg = "💪 Чудовий темп! Ти на правильному шляху!";
    } else if (runs.length >= 3) {
      statsMsg = "⚡ Початок є! Додай ще трохи!";
    } else {
      statsMsg = "🏃 Перший крок - найважчий. Ти вже біжиш!";
    }
    
    const text = `🎯 <b>Мотивація для тебе:</b>

${MOTIVATION.daily[Math.floor(Math.random() * MOTIVATION.daily.length)]}

---
${statsMsg}`;
    
    await bot.send(chatId, text, { parse_mode: 'HTML' });
  } catch (err) {
    await bot.send(chatId, MOTIVATION.daily[Math.floor(Math.random() * MOTIVATION.daily.length)]);
  }
}

function calculateAvgPace(activities) {
  const totalSec = activities.reduce((s, a) => s + a.duration, 0);
  const totalM = activities.reduce((s, a) => s + a.distance * 1000, 0);
  return formatPace(totalSec / (totalM / 1000));
}

function getMotivationAfterAnalyze(activity) {
  const distance = activity.distance || 0;
  const paceSec = parsePace(activity.pace || '0:00');
  
  if (distance >= 21) {
    return "🏆 Марафонець! Шалений результат!";
  }
  if (distance >= 10) {
    return "💪 Десятка! Чудова робота!";
  }
  if (paceSec < 270) {
    return "⚡ Шалений темп! Ти швидкий!";
  }
  if (paceSec >= 360) {
    return "🧘 Легкий темп - основа!";
  }
  return MOTIVATION.afterRun[Math.floor(Math.random() * MOTIVATION.afterRun.length)];
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).send('🏃 Strava Trainer Bot is running!');
  }

  if (req.method === 'POST') {
    const { message } = req.body;

    if (message?.text?.startsWith('/')) {
      const chatId = message.chat.id;
      const command = message.text.slice(1).split(' ')[0];

      try {
        if (command === 'start') await cmdStart(chatId);
        else if (command === 'help') await bot.send(chatId, '📖 /stats, /analyze, /progress, /motivate');
        else if (command === 'analyze') await cmdAnalyze(chatId);
        else if (command === 'stats') await cmdStats(chatId);
        else if (command === 'progress') await cmdProgress(chatId);
        else if (command === 'motivate') await cmdMotivate(chatId);
      } catch (err) {
        console.error('Command error:', err);
      }
      return res.status(200).send('OK');
    }

    return res.status(200).send('OK');
  }

  return res.status(405).send('Method not allowed');
};
