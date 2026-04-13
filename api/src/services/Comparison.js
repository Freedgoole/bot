class Comparison {
  compareWeeks(current, previous) {
    if (!current || !previous) {
      return this.noDataResponse();
    }

    const stats = this.calculateComparison(current, previous);
    
    return `<b>📊 ПОРОВНЯННЯ ТИЖНІВ</b>

<b>${stats.weekCurrent}</b> vs <b>${stats.weekPrevious}</b>

━━━━━━━━━━━━━━━

<b>📏 Відстань:</b>
${stats.current.km.toFixed(1)} km → ${stats.previous.km.toFixed(1)} km
${stats.changeKm.emoji} ${stats.changeKm.text}

<b>⏱️ Час:</b>
${Math.round(stats.current.time)} хв → ${Math.round(stats.previous.time)} хв
${stats.changeTime.emoji} ${stats.changeTime.text}

<b>🏃 Темп:</b>
${stats.current.pace} → ${stats.previous.pace}
${stats.changePace.emoji} ${stats.changePace.text}

<b>💓 Дрейф:</b>
${stats.current.drift}% → ${stats.previous.drift}%
${stats.changeDrift.emoji} ${stats.changeDrift.text}

━━━━━━━━━━━━━━━

<b>${stats.overall.emoji} Вердикт:</b>
${stats.overall.text}

<b>${stats.winner.text}</b>`;
  }

  compareMonths(current, previous) {
    if (!current || !previous) {
      return this.noDataResponse();
    }

    const changeKm = this.calcChange(current.totalKm, previous.totalKm);
    const changeRuns = this.calcChange(current.runs, previous.runs);
    const changeTime = this.calcChange(current.totalTime, previous.totalTime);

    let trend = '📊';
    let trendText = 'Стабільний прогрес';

    if (changeKm.pct > 20) {
      trend = '🚀';
      trendText = 'Відмінний прогрес! Обсяги зростають.';
    } else if (changeKm.pct > 10) {
      trend = '📈';
      trendText = 'Гарне зростання!';
    } else if (changeKm.pct < -20) {
      trend = '⚠️';
      trendText = 'Зниження активності. Можливо потрібно активуватись.';
    } else if (changeKm.pct < -10) {
      trend = '📉';
      trendText = 'Трохи менше, ніж минулого місяця.';
    }

    return `<b>📅 ПОРОВНЯННЯ МІСЯЦІВ</b>

<b>${current.month}</b> vs <b>${previous.month}</b>

━━━━━━━━━━━━━━━

<b>📏 km:</b>
${previous.totalKm.toFixed(1)} → ${current.totalKm.toFixed(1)} km
${changeKm.emoji} ${changeKm.text}

<b>🏃 Тренувань:</b>
${previous.runs} → ${current.runs}
${changeRuns.emoji} ${changeRuns.text}

<b>⏱️ Час:</b>
${Math.round(previous.totalTime)} → ${Math.round(current.totalTime)} хв
${changeTime.emoji} ${changeTime.text}

━━━━━━━━━━━━━━━

<b>${trend} ${trendText}</b>`;
  }

  comparePersonalBest(activities) {
    const runs = activities.filter(a => a.type === 'Run' && a.pace);
    if (runs.length < 2) return null;

    const sorted = [...runs].sort((a, b) => 
      this.parsePace(a.pace) - this.parsePace(b.pace)
    );

    const pb = sorted[0];
    const recent = runs[runs.length - 1];

    const paceDiff = this.parsePace(recent.pace) - this.parsePace(pb.pace);
    const daysSince = Math.floor((Date.now() - new Date(pb.date).getTime()) / (1000 * 60 * 60 * 24));

    let status = '';
    let emoji = '';

    if (paceDiff <= 0) {
      emoji = '🎯';
      status = 'Ти біжиш на рівні свого PB!';
    } else if (paceDiff < 30) {
      emoji = '🔥';
      status = `${Math.round(paceDiff)} сек повільніше за PB`;
    } else if (paceDiff < 60) {
      emoji = '💪';
      status = `${Math.round(paceDiff)} сек повільніше за PB`;
    } else {
      emoji = '🐢';
      status = `${Math.round(paceDiff)} сек повільніше за PB`;
    }

    return `<b>🏆 ОСОБИСТИЙ РЕКОРД</b>

<b>PB:</b> ${pb.pace} хв/км
${pb.date ? `📅 ${new Date(pb.date).toLocaleDateString('uk-UA')} (${daysSince} днів тому)` : ''}

<b>Останнє:</b> ${recent.pace} хв/км

━━━━━━━━━━━━━━━

<b>${emoji} ${status}</b>

${paceDiff <= 0 ? 'Черговий PB близько! 💪' : ''}`;
  }

  streakAnalysis(activities) {
    if (!activities || activities.length === 0) return null;

    const dates = [...new Set(activities.map(a => a.date.slice(0, 10)))].sort();
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = dates.length - 1; i > 1; i--) {
      const curr = new Date(dates[i]);
      const prev = new Date(dates[i - 1]);
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);

      if (diff === 1) {
        tempStreak++;
        currentStreak = tempStreak;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    let status = '';
    let emoji = '';

    if (currentStreak >= 7) {
      emoji = '🔥🔥🔥';
      status = 'ЛЕГЕНДАРНА СЕРІЯ!';
    } else if (currentStreak >= 5) {
      emoji = '🔥🔥';
      status = 'Крута серія!';
    } else if (currentStreak >= 3) {
      emoji = '🔥';
      status = 'Гарна серія!';
    } else if (currentStreak >= 1) {
      emoji = '💪';
      status = 'Початок серії';
    } else {
      emoji = '🐢';
      status = 'Пора починати серію';
    }

    return `<b>📅 АНАЛІЗ СЕРІЇ</b>

<b>Поточна:</b> ${currentStreak} днів ${emoji}
<b>Найкраща:</b> ${longestStreak} днів

━━━━━━━━━━━━━━━

<b>${emoji} ${status}</b>`;
  }

  calculateComparison(current, previous) {
    const stats = {
      current: this.summarizeWeek(current),
      previous: this.summarizeWeek(previous),
      weekCurrent: this.getWeekLabel(current),
      weekPrevious: this.getWeekLabel(previous)
    };

    stats.changeKm = this.calcChange(stats.current.km, stats.previous.km);
    stats.changeTime = this.calcChange(stats.current.time, stats.previous.time);
    stats.changePace = this.calcPaceChange(stats.current.avgPace, stats.previous.avgPace);
    stats.changeDrift = this.calcChange(stats.current.drift, stats.previous.drift, true);

    let score = 0;
    if (stats.changeKm.pct > 0) score++;
    if (stats.changePace.pct < 0) score++;
    if (stats.changeDrift.pct < 0) score++;

    if (score >= 2) {
      stats.overall = { emoji: '🚀', text: 'Відмінний тиждень! Прогрес є.' };
      stats.winner = { emoji: '🏆', text: 'Цей тиждень кращий!' };
    } else if (score === 1) {
      stats.overall = { emoji: '👍', text: 'Нормальний тиждень.' };
      stats.winner = { emoji: '🤝', text: 'Тижні приблизно рівні.' };
    } else {
      stats.overall = { emoji: '💪', text: 'Відновлювальний тиждень.' };
      stats.winner = { emoji: '🔄', text: 'Минулий тиждень був кращим.' };
    }

    return stats;
  }

  summarizeWeek(activities) {
    if (!activities || activities.length === 0) {
      return { km: 0, time: 0, runs: 0, avgPace: '0:00', drift: 0 };
    }

    const runs = activities.filter(a => a.type === 'Run');
    
    return {
      km: runs.reduce((s, a) => s + (a.distance || 0), 0),
      time: runs.reduce((s, a) => s + (a.duration || 0), 0) / 60,
      runs: runs.length,
      avgPace: this.calcAvgPace(runs),
      drift: this.calcAvgDrift(runs)
    };
  }

  getWeekLabel(activities) {
    if (!activities || activities.length === 0) return 'Немає даних';
    const dates = activities.map(a => new Date(a.date));
    const max = new Date(Math.max(...dates));
    const min = new Date(Math.min(...dates));
    return `${min.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })} - ${max.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}`;
  }

  calcChange(current, previous, inverse = false) {
    if (!previous || previous === 0) {
      return { pct: 0, emoji: '📊', text: 'немає даних для порівняння' };
    }
    
    const pct = ((current - previous) / previous) * 100;
    const sign = pct >= 0 ? '+' : '';
    
    let emoji = '📊';
    let text = '';

    if (inverse) {
      emoji = pct < 0 ? '👍' : pct > 5 ? '⚠️' : '📊';
      text = pct < 0 ? `Краще (${sign}${pct.toFixed(1)}%)` : `${sign}${pct.toFixed(1)}%`;
    } else {
      emoji = pct > 0 ? '📈' : pct < 0 ? '📉' : '📊';
      text = `${sign}${pct.toFixed(1)}%`;
    }

    return { pct, emoji, text };
  }

  calcPaceChange(current, previous) {
    const curr = this.parsePace(current);
    const prev = this.parsePace(previous);
    
    if (!prev) {
      return { pct: 0, emoji: '📊', text: 'немає даних' };
    }

    const pct = ((curr - prev) / prev) * 100;
    const sign = pct >= 0 ? '+' : '';

    return {
      pct,
      emoji: pct <= 0 ? '⚡' : '🐢',
      text: `${sign}${pct.toFixed(1)}% (швидше = краще)`
    };
  }

  calcAvgPace(activities) {
    if (!activities || activities.length === 0) return '0:00';
    const totalTime = activities.reduce((s, a) => s + (a.duration || 0), 0);
    const totalDist = activities.reduce((s, a) => s + ((a.distance || 0) * 1000), 0);
    if (totalDist === 0) return '0:00';
    const pace = totalTime / (totalDist / 1000);
    const mins = Math.floor(pace / 60);
    const secs = Math.round(pace % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  calcAvgDrift(activities) {
    const withDrift = activities.filter(a => a.hrDrift);
    if (withDrift.length === 0) return 0;
    return withDrift.reduce((s, a) => s + a.hrDrift, 0) / withDrift.length;
  }

  parsePace(pace) {
    if (!pace || typeof pace !== 'string') return 0;
    const [m, s] = pace.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
  }

  noDataResponse() {
    return '<b>📊 Немає даних для порівняння.</b>\n\nПотрібно принаймні 2 тижні тренувань.';
  }
}

module.exports = Comparison;
