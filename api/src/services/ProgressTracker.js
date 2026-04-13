const JsonStore = require('../db/JsonStore');
const { parsePace, formatPace } = require('../utils');

class ProgressTracker {
  constructor() {
    this.store = new JsonStore('progress.json');
  }

  async trackActivity(activity) {
    const enriched = {
      ...activity,
      trackedAt: new Date().toISOString()
    };
    await this.store.push('activities', enriched);
    return enriched;
  }

  async getStats(days = 30) {
    const activities = await this.store.filterByDate('activities', days);
    
    const running = activities.filter(a => a.type === 'Run');
    
    if (running.length === 0) {
      return this.emptyStats(days);
    }

    const totalKm = running.reduce((s, a) => s + a.distance, 0);
    const totalTime = running.reduce((s, a) => s + a.duration, 0);
    const avgPace = this.calcAvgPace(running);
    const avgHrDrift = this.calcAvgDrift(running);
    
    const byWeek = this.groupByWeek(running);
    const weeklyKm = Object.values(byWeek).map(arr => 
      arr.reduce((s, a) => s + a.distance, 0)
    );

    const paceValues = running.map(a => this.parsePace(a.pace)).sort((a, b) => a - b);
    const bestPace = paceValues[0];

    return {
      period: days,
      activities: running.length,
      totalKm: parseFloat(totalKm.toFixed(1)),
      totalTime: Math.round(totalTime / 60),
      avgPace: this.formatPace(avgPace),
      avgHrDrift: avgHrDrift ? parseFloat(avgHrDrift.toFixed(1)) : null,
      bestPace: this.formatPace(bestPace),
      weeklyKm: weeklyKm.slice(-4),
      consistency: this.calcConsistency(running, days)
    };
  }

  async getTrends(activities) {
    if (activities.length < 3) return null;

    const recent = activities.slice(-5);
    const older = activities.slice(-10, -5);

    if (older.length === 0) return null;

    const recentAvg = this.calcAvgPace(recent);
    const olderAvg = this.calcAvgPace(older);

    const change = ((olderAvg - recentAvg) / olderAvg) * 100;

    return {
      direction: change > 0 ? 'faster' : 'slower',
      percent: Math.abs(change).toFixed(1),
      message: change > 0 
        ? `📈 Темп покращився на ${Math.abs(change).toFixed(1)}%!`
        : `📉 Темп сповільнився на ${Math.abs(change).toFixed(1)}%`
    };
  }

  async getAchievements(activities) {
    const achievements = [];
    const running = activities.filter(a => a.type === 'Run');
    
    if (running.length >= 1) {
      achievements.push({ type: 'first_run', title: '🏃 Перший крок', desc: 'Розпочав відстеження' });
    }
    
    const totalKm = running.reduce((s, a) => s + a.distance, 0);
    if (totalKm >= 100) achievements.push({ type: 'century', title: '💯 100 км', desc: `${totalKm.toFixed(0)} км пробіжено` });
    if (totalKm >= 500) achievements.push({ type: 'half_marathon_km', title: '🏅 500 км', desc: `${totalKm.toFixed(0)} км пробіжено` });

    const bestPace = Math.min(...running.map(a => this.parsePace(a.pace)));
    if (bestPace < 300) achievements.push({ type: 'sub5', title: '⚡ Sub-5:00', desc: `Найкращий темп: ${this.formatPace(bestPace)}` });
    if (bestPace < 240) achievements.push({ type: 'sub4', title: '🚀 Sub-4:00', desc: `Найкращий темп: ${this.formatPace(bestPace)}` });

    const longRun = Math.max(...running.map(a => a.distance));
    if (longRun >= 21) achievements.push({ type: 'marathon', title: '🏆 Марафонець', desc: `Найдовший: ${longRun} км` });

    return achievements.slice(-5);
  }

  calcAvgPace(activities) {
    const totalSec = activities.reduce((s, a) => s + a.duration, 0);
    const totalM = activities.reduce((s, a) => s + a.distance * 1000, 0);
    return totalSec / (totalM / 1000);
  }

  calcAvgDrift(activities) {
    const withDrift = activities.filter(a => a.hrDrift);
    if (withDrift.length === 0) return null;
    return withDrift.reduce((s, a) => s + a.hrDrift, 0) / withDrift.length;
  }

  calcConsistency(activities, days) {
    const dates = [...new Set(activities.map(a => a.date.slice(0, 10)))];
    return Math.round((dates.length / days) * 100);
  }

  groupByWeek(activities) {
    const groups = {};
    activities.forEach(a => {
      const date = new Date(a.date);
      const week = `${date.getFullYear()}-W${Math.ceil((date.getMonth() * 30 + date.getDate()) / 7)}`;
      if (!groups[week]) groups[week] = [];
      groups[week].push(a);
    });
    return groups;
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

  emptyStats(days) {
    return {
      period: days,
      activities: 0,
      totalKm: 0,
      totalTime: 0,
      avgPace: '0:00',
      avgHrDrift: null,
      bestPace: '0:00',
      weeklyKm: [0, 0, 0, 0],
      consistency: 0
    };
  }
}

module.exports = ProgressTracker;
