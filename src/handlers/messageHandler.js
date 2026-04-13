const ProgressTracker = require('../services/ProgressTracker');
const Charts = require('../services/Charts');
const Comparison = require('../services/Comparison');
const { parsePace, formatPace, getPaceZone, getPaceBar, withTimeout } = require('../utils');

class MessageHandler {
  constructor(services) {
    this.strava = services.strava;
    this._trainer = services.trainer;
    this.bot = services.bot;
    this.progress = new ProgressTracker();
    this.charts = new Charts();
    this.comparison = new Comparison();
  }

  get trainer() {
    return this._trainer;
  }

  registerCommands() {
    // Commands registered via API, not needed here
    console.log('MessageHandler ready (webhook mode)');
  }

  async cmdStart(msg) {
    const chatId = msg.chat?.id;
    const text = `🏃 <b>Привіт, атлет!</b>

Я твій персональний AI-тренер.
Підключений до Strava.

Вибери що хочеш зробити:

📊 /stats - статистика
⚡ /analyze - аналіз
📈 /progress - прогрес`;
    
    await this.bot.send(chatId, text, { parse_mode: 'HTML' });
  }

  async cmdHelp(msg) {
    const chatId = msg.chat.id;
    await this.bot.send(chatId, `
📖 <b>Доступні команди:</b>

📊 <b>/stats</b> — статистика за місяць
📈 <b>/progress</b> — прогрес та графіки
🔄 <b>/compare</b> — порівняння тижнів
📅 <b>/week</b> — тижневий звіт
⚡ <b>/analyze</b> — аналіз останнього
💡 <b>/advice</b> — персональні поради
📉 <b>/chart</b> — графіки
🏆 <b>/pb</b> — особисті рекорди
🔥 <b>/streak</b> — аналіз серії
    `);
  }

  async cmdAnalyze(msg) {
    const chatId = msg.chat.id;
    await this.bot.send(chatId, '⚡ Аналізую останнє тренування...');

    try {
      const activities = await this.strava.getRecentActivities(1);
      if (activities.length === 0) {
        return this.bot.send(chatId, '📭 Немає тренувань для аналізу.');
      }

      const activity = activities[0];
      await this.progress.trackActivity(activity);
      const analysis = await this.withTimeout(this.trainer.analyzeActivity(activity), 15000)
        .catch(() => '🏃 Аналіз тимчасово недоступний. Спробуй пізніше!');

      const zone = this.trainer.getPaceZone(activity.pace);
      
      let splitsText = '';
      if (activity.splits && activity.splits.length > 0) {
        const isKmSplits = activity.splits[0].km !== undefined;
        
        const splitsLines = activity.splits.map((s, i) => {
          const sZone = this.trainer.getPaceZone(s.pace);
          const label = isKmSplits ? `км ${s.km}` : `частина ${i + 1}`;
          const bar = this.getPaceBar(s.pace);
          return `🏃 ${label}: <b>${s.pace}</b> ${sZone} ${bar}`;
        }).join('\n');

        const paces = activity.splits.map(s => this.parsePace(s.pace));
        const minPace = this.formatPace(Math.min(...paces));
        const maxPace = this.formatPace(Math.max(...paces));
        
        splitsText = `\n\n⚡ <b>ТЕМПИ:</b>\n${splitsLines}\n\n📊 мін: ${minPace} | макс: ${maxPace}`;
      }

      const text = `🏃 <b>${activity.name}</b>
📅 ${new Date(activity.date).toLocaleDateString('uk-UA')}
📏 ${activity.distance} км | ⏱️ ${activity.durationFormatted} | 🏃 ${activity.pace}/км
⚡ Зона: ${zone}${splitsText}

━━━━━━━━━━━━━━━
${analysis}`;

      await this.bot.send(chatId, text);
    } catch (err) {
      console.error('Analyze error:', err);
      this.bot.send(chatId, '❌ Помилка аналізу.');
    }
  }

  async cmdAnalyzeCallback(q) {
    const chatId = q.message.chat.id;
    const messageId = q.message.message_id;

    await this.bot.answerCallback(q.id, 'Аналізую...');

    try {
      const activities = await this.strava.getRecentActivities(1);
      if (activities.length === 0) {
        return this.bot.edit(chatId, messageId, '📭 Немає тренувань');
      }

      const activity = activities[0];
      await this.progress.trackActivity(activity);
      const analysis = await this.trainer.analyzeActivity(activity);

      const zone = this.trainer.getPaceZone(activity.pace);
      
      let splitsText = '';
      if (activity.splits && activity.splits.length > 0) {
        const isKmSplits = activity.splits[0].km !== undefined;
        
        const splitsLines = activity.splits.map((s, i) => {
          const sZone = this.trainer.getPaceZone(s.pace);
          const label = isKmSplits ? `км ${s.km}` : `частина ${i + 1}`;
          const bar = this.getPaceBar(s.pace);
          return `🏃 ${label}: <b>${s.pace}</b> ${sZone} ${bar}`;
        }).join('\n');

        const paces = activity.splits.map(s => this.parsePace(s.pace));
        const minPace = this.formatPace(Math.min(...paces));
        const maxPace = this.formatPace(Math.max(...paces));
        
        splitsText = `\n\n⚡ <b>ТЕМПИ:</b>\n${splitsLines}\n\n📊 мін: ${minPace} | макс: ${maxPace}`;
      }

      const text = `🏃 <b>${activity.name}</b>
📅 ${new Date(activity.date).toLocaleDateString('uk-UA')}
📏 ${activity.distance} км | ⏱️ ${activity.durationFormatted} | 🏃 ${activity.pace}/км
⚡ Зона: ${zone}${splitsText}

━━━━━━━━━━━━━━━
${analysis}`;

      await this.bot.edit(chatId, messageId, text);
    } catch (err) {
      console.error('Analyze error:', err);
      await this.bot.answerCallback(q.id, '❌ Помилка');
    }
  }

  async showKmAnalysis(q) {
    const chatId = q.message.chat.id;
    const messageId = q.message.message_id;
    await this.bot.answerCallback(q.id);

    try {
      const activities = await this.strava.getRecentActivities(1);
      const lastActivity = activities[0];

      if (!lastActivity?.splits || lastActivity.splits.length === 0) {
        return this.bot.editWithButtons(chatId, messageId, '⚡ <b>Аналіз кілометрів</b>\n\nНемає даних про спліти.', [
          this.bot._buildRow({ text: '◀️ Назад', data: 'analyze' })
        ]);
      }

      const splits = lastActivity.splits;
      const zoneDist = this.trainer.getZoneDistribution(splits);

      let splitsText = splits.map(s => {
        const zone = this.trainer.getPaceZone(s.pace);
        return `км ${s.km}: <b>${s.pace}</b> ${zone}`;
      }).join('\n');

      const text = `⚡ <b>РОЗБИВКА ПО КІЛОМЕТРАХ</b>

<b>${lastActivity.distance} км @ ${lastActivity.pace}/км</b>

${splitsText}

━━━━━━━━━━━━━━━

<b>📊 РОЗПОДІЛ ЗОН:</b>
${zoneDist}

━━━━━━━━━━━━━━━
🟢 Z1: > 6:00 | 🟢 Z2: 5:30-6:00
🟡 Z3: 5:00-5:30 | 🟠 Z4: 4:30-5:00 | 🔴 Z5: < 4:30`;

      await this.bot.editWithButtons(chatId, messageId, text, [
        this.bot._buildRow(
          { text: '⚡ Темп', data: 'analysis_pace' },
          { text: '◀️ Назад', data: 'analyze' }
        )
      ]);
    } catch (err) {
      console.error('Km analysis error:', err);
    }
  }

  async showPaceAnalysis(q) {
    const chatId = q.message.chat.id;
    const messageId = q.message.message_id;
    await this.bot.answerCallback(q.id);

    try {
      const activities = await this.strava.getRecentActivities(10);
      const lastActivity = activities[0];

      if (!lastActivity) {
        return this.bot.editWithButtons(chatId, messageId, '⚡ <b>Аналіз темпу</b>\n\nНемає даних.', [
          this.bot._buildRow({ text: '◀️ Назад', data: 'analyze' })
        ]);
      }

      const splits = lastActivity.splits || [];
      let splitsAnalysis = '';
      
      if (splits.length > 0) {
        const paces = splits.map(s => this.parsePace(s.pace));
        const avgPace = paces.reduce((s, p) => s + p, 0) / paces.length;
        const fastest = Math.min(...paces);
        const slowest = Math.max(...paces);
        
        splitsAnalysis = `⚡ Середній темп: <b>${this.formatPace(avgPace)}</b>/км
🏃 Найшвидший км: <b>${this.formatPace(fastest)}</b>/км
🐌 Найповільніший км: <b>${this.formatPace(slowest)}</b>/км
📊 Різниця: <b>+${this.formatPace(slowest - fastest)}</b>`;
      }

      let consistency = '';
      if (splits.length >= 3) {
        const paces = splits.map(s => this.parsePace(s.pace));
        const avg = paces.reduce((s, p) => s + p, 0) / paces.length;
        const variance = Math.sqrt(paces.reduce((s, p) => s + Math.pow(p - avg, 2), 0) / paces.length);
        
        if (variance < 5) consistency = '🎯 Стабільний темп!';
        else if (variance < 10) consistency = '📊 Нормальна стабільність';
        else consistency = '⚠️ Великі коливання темпу';
      }

      const text = `⚡ <b>АНАЛІЗ ТЕМПУ</b>

📊 Темп: <b>${lastActivity.pace}</b>/км

${splitsAnalysis}

━━━━━━━━━━━━━━━

${consistency}`;

      await this.bot.editWithButtons(chatId, messageId, text, [
        this.bot._buildRow(
          { text: '💓 Дрейф', data: 'analysis_drift' },
          { text: '◀️ Назад', data: 'analyze' }
        )
      ]);
    } catch (err) {
      console.error('Pace error:', err);
    }
  }

  async cmdToday(msg) {
    const chatId = msg.chat.id;
    await this.bot.send(chatId, '🔍 Шукаю сьогоднішні тренування...');

    try {
      const activities = await this.strava.getRecentActivities(3);
      const today = new Date().toDateString();
      const todayActivities = activities.filter(a => new Date(a.date).toDateString() === today);

      if (todayActivities.length === 0) {
        return this.bot.send(chatId, '📭 Сьогодні ще не було тренувань.\n\n⏰ Саме час для пробіжки!');
      }

      let response = `🏃 Сьогодні: ${todayActivities.length} тренування\n\n`;
      
      for (const a of todayActivities) {
        const zone = this.trainer.getPaceZone(a.pace);
        response += `• ${a.name}\n`;
        response += `  📏 ${a.distance} км | 🏃 ${a.pace}/км | ${zone}\n`;
        
        if (a.splits && a.splits.length > 0) {
          const isKmSplits = a.splits[0].km !== undefined;
          const splitsText = a.splits.map((s, i) => {
            const sZone = this.trainer.getPaceZone(s.pace);
            const label = isKmSplits ? `км ${s.km}` : `ч ${i + 1}`;
            return `${label}: <b>${s.pace}</b> ${sZone}`;
          }).join(' | ');
          response += `  ⚡ ${splitsText}\n`;
        }
        response += '\n';
      }

      const analysis = await this.trainer.analyzeActivity(todayActivities[0]);
      response += `━━━━━━━━━━━━━━━\n${analysis}`;

      await this.bot.send(chatId, response);
    } catch (err) {
      console.error('Today error:', err);
      this.bot.send(chatId, '❌ Помилка отримання даних.');
    }
  }

  async cmdStats(msg) {
    const chatId = msg.chat.id;
    await this.bot.send(chatId, '📊 Збираю статистику...');

    try {
      const activities = await this.strava.getRecentActivities(30);
      const running = activities.filter(a => a.type === 'Run');
      
      if (running.length === 0) {
        return this.bot.send(chatId, '📭 Немає даних за цей період.');
      }

      const stats = await this.progress.getStats(30);
      const achievements = await this.progress.getAchievements(running);

      let response = `📊 <b>Статистика за 30 днів</b>\n\n`;
      response += `🏃 ${stats.activities} тренувань\n`;
      response += `📏 ${stats.totalKm} км\n`;
      response += `⏱️ ${stats.totalTime} хв\n`;
      response += `🏃 Середній темп: ${stats.avgPace}/км\n`;
      response += `⚡ Найкращий темп: ${stats.bestPace}/км\n`;
      response += `\n📅 Регулярність: ${stats.consistency}%\n`;

      if (achievements.length > 0) {
        response += `\n🏆 <b>Досягнення:</b>\n`;
        achievements.forEach(a => response += `${a.title}\n`);
      }

      await this.bot.send(chatId, response);
    } catch (err) {
      console.error('Stats error:', err);
      this.bot.send(chatId, '❌ Помилка отримання статистики.');
    }
  }

  async cmdStatsCallback(q) {
    await this.cmdStats({ chat: { id: q.message.chat.id } });
    await this.bot.answerCallback(q.id);
  }

  async cmdWeek(msg) {
    const chatId = msg.chat.id;
    await this.bot.send(chatId, '📅 Генерую тижневий звіт...');

    try {
      const activities = await this.strava.getRecentActivities(10);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const weekActivities = activities.filter(a => new Date(a.date) >= weekAgo && a.type === 'Run');

      if (weekActivities.length === 0) {
        return this.bot.send(chatId, '📭 Немає тренувань цього тижня.');
      }

      const summary = await this.trainer.generateWeeklySummary(weekActivities);
      await this.bot.send(chatId, summary);
    } catch (err) {
      console.error('Week error:', err);
      this.bot.send(chatId, '❌ Помилка генерації звіту.');
    }
  }

  async cmdWeekCallback(q) {
    await this.cmdWeek({ chat: { id: q.message.chat.id } });
    await this.bot.answerCallback(q.id);
  }

  async cmdAdvice(msg) {
    const chatId = msg.chat.id;
    await this.bot.send(chatId, '💡 Генерую персональні поради...');

    try {
      const activities = await this.strava.getRecentActivities(10);
      const running = activities.filter(a => a.type === 'Run');
      const stats = await this.progress.getStats(30);

      const advice = await this.trainer.generateAdvice(stats, running);
      await this.bot.send(chatId, advice);
    } catch (err) {
      console.error('Advice error:', err);
      this.bot.send(chatId, '❌ Помилка генерації порад.');
    }
  }

  async cmdAdviceCallback(q) {
    await this.cmdAdvice({ chat: { id: q.message.chat.id } });
    await this.bot.answerCallback(q.id);
  }

  async cmdProgress(msg) {
    const chatId = msg.chat.id;
    await this.showProgress(chatId);
  }

  async cmdProgressCallback(q) {
    await this.showProgress(q.message.chat.id, q.message.message_id, q.id);
  }

  async showProgress(chatId, messageId = null, queryId = null) {
    if (queryId) await this.bot.answerCallback(queryId);

    try {
      const activities = await this.strava.getRecentActivities(20);
      const running = activities.filter(a => a.type === 'Run');
      
      const stats = await this.progress.getStats(30);
      const weeklyKm = this.getWeeklyData(activities);

      const chart = this.charts.weeklyKmChart(weeklyKm);

      let response = `<b>📈 Прогрес за ${stats.period} днів:</b>\n\n`;
      response += `${chart}\n\n`;
      response += `📏 Всього: ${stats.totalKm} км\n`;
      response += `🏃 Тренувань: ${stats.activities}\n`;
      response += `📅 Регулярність: ${stats.consistency}%\n`;

      const streak = this.comparison.streakAnalysis(running);
      if (streak) {
        response += `\n${streak}`;
      }

      const buttons = [
        this.bot._buildRow(
          { text: '📊 km/тиж', data: 'chart_week' },
          { text: '⚡ Темп', data: 'chart_pace' }
        ),
        this.bot._buildRow(
          { text: '💓 Пульс', data: 'chart_hr' },
          { text: '◀️ Меню', data: 'menu' }
        )
      ];

      if (messageId) {
        await this.bot.editWithButtons(chatId, messageId, response, buttons);
      } else {
        await this.bot.sendWithButtons(chatId, response, buttons);
      }
    } catch (err) {
      console.error('Progress error:', err);
      await this.bot.answerCallback(queryId, '❌ Помилка');
    }
  }

  async cmdCompare(msg) {
    const chatId = msg.chat.id;
    await this.showComparison(chatId);
  }

  async cmdCompareCallback(q) {
    await this.showComparison(q.message.chat.id, q.message.message_id, q.id);
  }

  async showComparison(chatId, messageId = null, queryId = null) {
    if (queryId) await this.bot.answerCallback(queryId);

    try {
      const activities = await this.strava.getRecentActivities(20);
      const runs = activities.filter(a => a.type === 'Run');

      const { currentWeek, prevWeek } = this.getTwoWeeks(runs);

      const comparison = this.comparison.compareWeeks(currentWeek, prevWeek);

      const buttons = [
        this.bot._buildRow(
          { text: '⚡ Кілометри', data: 'analysis_km' },
          { text: '⚡ Темп', data: 'analysis_pace' }
        ),
        this.bot._buildRow(
          { text: '◀️ Меню', data: 'menu' }
        )
      ];

      if (messageId) {
        await this.bot.editWithButtons(chatId, messageId, comparison, buttons);
      } else {
        await this.bot.sendWithButtons(chatId, comparison, buttons);
      }
    } catch (err) {
      console.error('Compare error:', err);
      await this.bot.answerCallback(queryId, '❌ Помилка');
    }
  }

  async cmdChart(msg) {
    const chatId = msg.chat.id;
    await this.bot.sendWithButtons(chatId, '📊 <b>Графіки</b>\n\nЩо показати?', [
      this.bot._buildRow(
        { text: '📏 km/тиждень', data: 'chart_week' },
        { text: '⚡ Темп', data: 'chart_pace' }
      ),
      this.bot._buildRow(
        { text: '💓 Пульс', data: 'chart_hr' },
        { text: '◀️ Меню', data: 'menu' }
      )
    ]);
  }

  async showWeeklyChart(q) {
    const chatId = q.message.chat.id;
    const messageId = q.message.message_id;
    await this.bot.answerCallback(q.id);

    try {
      const activities = await this.strava.getRecentActivities(20);
      const weeklyKm = this.getWeeklyData(activities);
      const chart = this.charts.weeklyKmChart(weeklyKm);

      await this.bot.editWithButtons(chatId, messageId, chart, [
        this.bot._buildRow(
          { text: '⚡ Темп', data: 'chart_pace' },
          { text: '◀️ Назад', data: 'progress' }
        )
      ]);
    } catch (err) {
      console.error('Chart error:', err);
    }
  }

  async showPaceChart(q) {
    const chatId = q.message.chat.id;
    const messageId = q.message.message_id;
    await this.bot.answerCallback(q.id);

    try {
      const activities = await this.strava.getRecentActivities(10);
      const runs = activities.filter(a => a.type === 'Run');
      const chart = this.charts.paceChart(runs);

      await this.bot.editWithButtons(chatId, messageId, `⚡ <b>Динаміка темпу</b>\n\n${chart}`, [
        this.bot._buildRow(
          { text: '📏 km/тиждень', data: 'chart_week' },
          { text: '◀️ Назад', data: 'progress' }
        )
      ]);
    } catch (err) {
      console.error('Pace chart error:', err);
    }
  }

  async showHrChart(q) {
    const chatId = q.message.chat.id;
    const messageId = q.message.message_id;
    await this.bot.answerCallback(q.id);

    try {
      const activities = await this.strava.getRecentActivities(10);
      const runs = activities.filter(a => a.type === 'Run');

      const zones = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
      runs.forEach(a => {
        const pace = a.pace || '0:00';
        const sec = this.parsePace(pace);
        if (sec >= 360) zones.Z1 += a.distance;
        else if (sec >= 330) zones.Z2 += a.distance;
        else if (sec >= 300) zones.Z3 += a.distance;
        else if (sec >= 270) zones.Z4 += a.distance;
        else zones.Z5 += a.distance;
      });

      const chart = this.charts.paceZonesChart(zones);

      await this.bot.editWithButtons(chatId, messageId, chart, [
        this.bot._buildRow(
          { text: '⚡ Темп', data: 'chart_pace' },
          { text: '◀️ Назад', data: 'progress' }
        )
      ]);
    } catch (err) {
      console.error('Pace zones chart error:', err);
    }
  }

  async cmdPersonalBest(msg) {
    const chatId = msg.chat.id;
    await this.bot.send(chatId, '🏆 Шукаю особисті рекорди...');

    try {
      const activities = await this.strava.getRecentActivities(30);
      const runs = activities.filter(a => a.type === 'Run');

      const pb = this.comparison.comparePersonalBest(runs);

      if (pb) {
        await this.bot.send(chatId, pb);
      } else {
        await this.bot.send(chatId, '🏆 Потрібно більше даних для аналізу PB.');
      }
    } catch (err) {
      console.error('PB error:', err);
      this.bot.send(chatId, '❌ Помилка');
    }
  }

  async cmdStreak(msg) {
    const chatId = msg.chat.id;
    await this.bot.send(chatId, '🔥 Аналізую серію...');

    try {
      const activities = await this.strava.getRecentActivities(30);
      const runs = activities.filter(a => a.type === 'Run');

      const streak = this.comparison.streakAnalysis(runs);

      if (streak) {
        await this.bot.send(chatId, streak);
      } else {
        await this.bot.send(chatId, '🔥 Потрібно більше даних.');
      }
    } catch (err) {
      console.error('Streak error:', err);
      this.bot.send(chatId, '❌ Помилка');
    }
  }

  async showMenu(q) {
    await this.cmdStart({ chat: { id: q.message.chat.id } });
    await this.bot.answerCallback(q.id);
  }

  async handleText(msg) {
    const chatId = msg.chat.id;
    const text = msg.text?.toLowerCase() || '';

    if (text.startsWith('/')) return;

    if (['привіт', 'hi', 'hello', 'hey'].includes(text)) {
      return this.cmdStart(msg);
    }

    if (['допомога', 'help'].includes(text)) {
      return this.cmdHelp(msg);
    }
  }

  getWeeklyData(activities) {
    const weeks = {};
    const now = new Date();

    activities.forEach(a => {
      const date = new Date(a.date);
      const daysAgo = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      const weekNum = Math.floor(daysAgo / 7);

      if (!weeks[weekNum]) {
        weeks[weekNum] = { km: 0, label: `Тиж ${4 - weekNum}` };
      }
      weeks[weekNum].km += a.distance || 0;
    });

    return Object.values(weeks).reverse().slice(-6);
  }

  getTwoWeeks(activities) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentWeek = activities.filter(a => new Date(a.date) >= oneWeekAgo);
    const prevWeek = activities.filter(a => new Date(a.date) >= twoWeeksAgo && new Date(a.date) < oneWeekAgo);

    return { currentWeek, prevWeek };
  }

}

module.exports = MessageHandler;
