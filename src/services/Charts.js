class Charts {
  bar(data, options = {}) {
    const { maxWidth = 20, height = 10, showValues = true, color = true } = options;
    
    if (!data || data.length === 0) return 'Немає даних 📊';

    const max = Math.max(...data.map(d => typeof d === 'object' ? d.value : d));
    const min = Math.min(...data.map(d => typeof d === 'object' ? d.value : d), 0);
    const range = max - min || 1;

    const chars = color ? ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'] : ['░', '▒', '▓', '█'];
    
    let lines = [];
    
    for (let h = height; h >= 0; h--) {
      const threshold = min + (range * h / height);
      let line = '';
      
      for (const item of data) {
        const value = typeof item === 'object' ? item.value : item;
        const bars = Math.round((value / max) * maxWidth);
        const bar = '█'.repeat(bars);
        const fill = value >= threshold ? bar : ' '.repeat(maxWidth);
        line += fill + '  ';
      }
      
      lines.push(line);
    }

    let labels = '';
    for (const item of data) {
      const label = typeof item === 'object' ? item.label : `Val ${item}`;
      labels += label.padEnd(maxWidth + 2);
    }

    let values = '';
    for (const item of data) {
      const value = typeof item === 'object' ? item.value : item;
      values += value.toFixed(1).padEnd(maxWidth + 2);
    }

    return `\`\`\`\n${lines.join('\n')}\n${labels}\n${values}\`\`\``;
  }

  weeklyKmChart(weeklyData) {
    if (!weeklyData || weeklyData.length === 0) return 'Немає даних';

    const max = Math.max(...weeklyData.map(w => w.km), 1);
    const maxWidth = 12;
    const weeks = weeklyData.slice(-6);

    let chart = '';
    
    for (let h = 5; h >= 0; h--) {
      const threshold = (max * h / 5);
      let line = '';
      
      for (const week of weeks) {
        const bars = Math.round((week.km / max) * maxWidth);
        const fill = week.km >= threshold ? '█'.repeat(bars) : '·'.repeat(bars);
        line += fill.padEnd(maxWidth + 1);
      }
      
      chart += line + '\n';
    }

    let labels = '';
    for (const week of weeks) {
      labels += week.label.padEnd(maxWidth + 1);
    }

    return `📊 km по тижнях:\n\n\`\`\`\n${chart}${labels}\`\`\``;
  }

  paceChart(activities) {
    if (!activities || activities.length < 2) return 'Потрібно ≥2 тренування';

    const paces = activities.slice(-10).map(a => ({
      value: this.parsePace(a.pace),
      label: this.formatPaceShort(a.pace)
    }));

    const max = Math.max(...paces.map(p => p.value));
    const min = Math.min(...paces.map(p => p.value));
    const range = max - min || 1;
    const maxWidth = 15;

    let chart = '';
    
    for (const pace of paces) {
      const bars = Math.round(((max - pace.value) / range) * maxWidth);
      const bar = '▓'.repeat(bars) + '░'.repeat(maxWidth - bars);
      chart += `${pace.label} |${bar}|\n`;
    }

    return `⚡ Динаміка темпу:\n\n\`\`\`\n${chart}\`\`\``;
  }

  heartRateZones(zones) {
    const total = Object.values(zones).reduce((s, v) => s + v, 0) || 1;
    const maxWidth = 20;
    
    const zoneNames = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'];
    const emojis = ['😴', '🚶', '🏃', '🏃💨', '🔥'];
    
    let chart = '\n';
    
    for (let i = 0; i < 5; i++) {
      const zone = `Z${i + 1}`;
      const km = zones[zone] || 0;
      const pct = Math.round((km / total) * 100);
      const bars = Math.round((km / total) * maxWidth);
      const bar = '█'.repeat(bars) + '░'.repeat(maxWidth - bars);
      
      chart += `${emojis[i]} ${zone} ${bar} ${km.toFixed(1)}km (${pct}%)\n`;
    }

    return `💓 Час у зонах:${chart}`;
  }

  comparisonBar(current, previous, label = 'km') {
    const max = Math.max(current, previous, 1);
    const width = 15;
    
    const currBars = Math.round((current / max) * width);
    const prevBars = Math.round((previous / max) * width);
    
    const change = previous > 0 ? (((current - previous) / previous) * 100).toFixed(1) : 0;
    const sign = change >= 0 ? '+' : '';
    
    let result = `📊 ${label}:\n`;
    result += `Минулий: ${'▓'.repeat(prevBars)}${'░'.repeat(width - prevBars)} ${previous.toFixed(1)}\n`;
    result += `Поточний: ${'█'.repeat(currBars)}${'░'.repeat(width - currBars)} ${current.toFixed(1)}\n`;
    result += `${change >= 0 ? '📈' : '📉'} ${sign}${change}%`;

    return result;
  }

  sparkline(values, points = 10) {
    if (values.length < 2) return '';
    
    const last = values.slice(-points);
    const min = Math.min(...last);
    const max = Math.max(...last);
    const range = max - min || 1;
    
    const chars = ['╵', '╷', '╹', '╻'];
    
    let result = '';
    for (const v of last) {
      const pos = Math.round(((v - min) / range) * (chars.length - 1));
      result += chars[Math.min(pos, chars.length - 1)];
    }
    
    return result;
  }

  progressEmoji(current, target) {
    const pct = (current / target) * 100;
    if (pct >= 100) return '🎯';
    if (pct >= 75) return '🔥';
    if (pct >= 50) return '💪';
    if (pct >= 25) return '🏃';
    return '🐢';
  }

  weeklyHeatmap(days) {
    const emojis = ['☁️', '🌤', '🔥', '💪'];
    
    let result = '';
    for (const day of days) {
      const intensity = Math.min(Math.round(day.value / 5), 3);
      result += emojis[intensity];
    }
    return result;
  }

  parsePace(pace) {
    if (!pace || typeof pace !== 'string') return 0;
    const [m, s] = pace.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
  }

  formatPaceShort(pace) {
    if (!pace) return '--:--';
    const [m, s] = pace.split(':');
    return `${m}:${s}`;
  }
}

module.exports = Charts;
