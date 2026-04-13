class WeeklySummary {
  constructor() {
    this.zoneNames = {
      Z1: 'Відновлення (50-60% ЧСС)',
      Z2: 'База (60-70% ЧСС)',
      Z3: 'Витривалість (70-80% ЧСС)',
      Z4: 'Поріг (80-90% ЧСС)',
      Z5: 'VO2max (90-100% ЧСС)'
    };
  }

  generate(activities, trainer = null) {
    const running = activities.filter(a => a.type === 'Run');
    const totalKm = running.reduce((s, a) => s + a.distance, 0);
    const totalTime = Math.round(running.reduce((s, a) => s + a.duration, 0) / 60);
    
    const zones = this.calculateZones(running);
    const best = this.getBestActivity(running);
    const streak = this.calculateStreak(running);

    return {
      summary: this.formatSummary(running, totalKm, totalTime, zones),
      highlights: this.getHighlights(running, best, streak),
      nextWeek: this.suggestNextWeek(totalKm, zones),
      grade: this.gradeWeek(running, zones)
    };
  }

  calculateZones(activities) {
    const zones = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
    
    activities.forEach(a => {
      const hr = a.avgHeartrate;
      if (!hr) return;
      
      if (hr < 120) zones.Z1 += a.distance;
      else if (hr < 140) zones.Z2 += a.distance;
      else if (hr < 160) zones.Z3 += a.distance;
      else if (hr < 175) zones.Z4 += a.distance;
      else zones.Z5 += a.distance;
    });

    return zones;
  }

  getBestActivity(activities) {
    if (activities.length === 0) return null;
    
    const withPace = activities.filter(a => a.pace);
    if (withPace.length === 0) return null;

    const sorted = [...withPace].sort((a, b) => 
      this.parsePace(a.pace) - this.parsePace(b.pace)
    );
    
    return sorted[0];
  }

  calculateStreak(activities) {
    if (activities.length === 0) return 0;
    
    const dates = [...new Set(activities.map(a => a.date.slice(0, 10)))].sort().reverse();
    let streak = 1;
    
    for (let i = 0; i < dates.length - 1; i++) {
      const curr = new Date(dates[i]);
      const prev = new Date(dates[i + 1]);
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);
      
      if (diff === 1) streak++;
      else break;
    }
    
    return streak;
  }

  suggestNextWeek(totalKm, zones) {
    const suggestions = [];
    const targetKm = Math.round(totalKm * 1.1);

    if (zones.Z2 < targetKm * 0.5) {
      suggestions.push('🟢 Додай більше легкого темпу (Z2)');
    }
    if (zones.Z4 + zones.Z5 > totalKm * 0.3) {
      suggestions.push('🔴 Зменши інтенсивні тренування');
    }
    if (zones.Z1 < totalKm * 0.1) {
      suggestions.push('🏃 Додай 1 легке відновлювальне тренування');
    }

    suggestions.push(`📈 Ціль: ~${targetKm} км (+\${10}%)`);

    return suggestions;
  }

  gradeWeek(activities, zones) {
    let score = 50;

    if (activities.length >= 4) score += 10;
    else if (activities.length < 3) score -= 10;

    const totalKm = Object.values(zones).reduce((s, v) => s + v, 0);
    if (zones.Z2 / totalKm > 0.5) score += 15;
    else if (zones.Z5 / totalKm > 0.3) score -= 20;

    const avgDrift = activities.filter(a => a.hrDrift).reduce((s, a) => s + a.hrDrift, 0) / activities.filter(a => a.hrDrift).length;
    if (avgDrift && avgDrift < 8) score += 15;
    else if (avgDrift && avgDrift > 12) score -= 15;

    if (score >= 90) return { grade: 'A+', emoji: '🌟' };
    if (score >= 80) return { grade: 'A', emoji: '💪' };
    if (score >= 70) return { grade: 'B', emoji: '👍' };
    if (score >= 60) return { grade: 'C', emoji: '📊' };
    return { grade: 'D', emoji: '💤' };
  }

  formatSummary(activities, totalKm, totalTime, zones) {
    const longest = Math.max(...activities.map(a => a.distance)) || 0;
    const avgPace = this.calcAvgPace(activities);

    return `📊 Тижневий підсумок:

🏃‍♂️ ${activities.length} тренувань | ${totalKm.toFixed(1)} км | ${totalTime} хв
⏱️ Середній темп: ${avgPace}
📏 Найдовше: ${longest} км

💓 Час у зонах:
🟢 Z1-Z2 (база): ${zones.Z1 + zones.Z2} км
🟡 Z3 (темп): ${zones.Z3} км
🔴 Z4-Z5 (інтенсив): ${zones.Z4 + zones.Z5} км`;
  }

  getHighlights(activities, best, streak) {
    const highlights = [];

    if (streak >= 3) {
      highlights.push(`🔥 Серія: ${streak} днів поспіль!`);
    }

    if (best) {
      highlights.push(`⚡ Найкращий темп: ${best.pace}/км`);
    }

    const withHr = activities.filter(a => a.hrDrift);
    if (withHr.length > 0) {
      const avgDrift = withHr.reduce((s, a) => s + a.hrDrift, 0) / withHr.length;
      if (avgDrift < 5) highlights.push('💓 Чудова аеробна форма!');
    }

    return highlights;
  }

  calcAvgPace(activities) {
    if (activities.length === 0) return '0:00';
    const totalSec = activities.reduce((s, a) => s + a.duration, 0);
    const totalM = activities.reduce((s, a) => s + a.distance * 1000, 0);
    const pace = totalSec / (totalM / 1000);
    return this.formatPace(pace);
  }

  parsePace(pace) {
    const [m, s] = pace.split(':').map(Number);
    return m * 60 + s;
  }

  formatPace(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}

module.exports = WeeklySummary;
