class AdviceEngine {
  getQuickAdvice(activity) {
    const advice = [];

    if (activity.hrDrift) {
      if (activity.hrDrift < 5) {
        advice.push('🌟 Чудова аеробна база! Дрейф <5%.');
      } else if (activity.hrDrift < 10) {
        advice.push('📊 Помірний дрейф. Фокус на повільних темпах для покращення бази.');
      } else {
        advice.push('⚠️ Високий дрейф. Знизь темп, більше часу в 2-й зоні.');
      }
    }

    if (activity.avgHeartrate && activity.avgHeartrate > 170) {
      advice.push('💓 Пульс вище 170. Чергуй інтенсивність з відновленням.');
    }

    if (activity.elevation > 100) {
      advice.push('⛰️ Багато набору висоти. Додай силові вправи на ноги.');
    }

    return advice.join('\n');
  }

  getTrainingTips(stats) {
    const tips = [];

    if (stats.avgHrDrift && stats.avgHrDrift > 8) {
      tips.push('🔴 Знизь інтенсивність на 10-15%. Працюй у 2-й зоні.');
    }

    if (stats.consistency < 50) {
      tips.push('📅 Збільш частоту тренувань. 3-4 на тиждень — оптимально.');
    }

    if (stats.weeklyKm.length >= 2) {
      const trend = stats.weeklyKm[stats.weeklyKm.length - 1] - stats.weeklyKm[stats.weeklyKm.length - 2];
      if (trend > 10) {
        tips.push('⚠️ Різке зростання обсягів. Не більше +10% на тиждень!');
      } else if (trend > 0) {
        tips.push('📈 Гарне прогресивне навантаження.');
      }
    }

    if (stats.totalKm > 0 && stats.totalKm < 30) {
      tips.push('🏃 Для початку достатньо. Фокус на регулярності.');
    } else if (stats.totalKm > 100) {
      tips.push('💪 Високі обсяги. Не забувай про відновлення та сон.');
    }

    return tips;
  }

  getRecoveryAdvice(hrDrift) {
    if (!hrDrift) return '📋 Продовжуй тренування як usual.';

    if (hrDrift > 15) {
      return '🛑 Відновлення 2-3 дні. Легкий темп або перерва.';
    } else if (hrDrift > 10) {
      return '🚶 Знизь темп на 30 сек/км. Більше відновлення.';
    } else if (hrDrift > 5) {
      return '⚡ Тренування OK. Трохи уповільнись на довгих.';
    }
    return '✅ Все добре! Підтримуй темп.';
  }

  getPaceZone(targetPace, currentAvgPace) {
    const target = this.parsePace(targetPace);
    const current = this.parsePace(currentAvgPace);

    if (target < current * 0.9) {
      return { zone: '5 (VO2max)', color: '🔴', desc: 'Інтервали, швидкість' };
    } else if (target < current) {
      return { zone: '4 (Threshold)', color: '🟠', desc: 'Темпова робота' };
    } else if (target < current * 1.1) {
      return { zone: '3 (Tempo)', color: '🟡', desc: 'Комфортний темп' };
    } else {
      return { zone: '2 (Easy)', color: '🟢', desc: 'Легкий темп для бази' };
    }
  }

  parsePace(pace) {
    const [m, s] = pace.split(':').map(Number);
    return m * 60 + s;
  }

  formatAdvice(advice) {
    if (Array.isArray(advice)) {
      return advice.map((a, i) => `${i + 1}. ${a}`).join('\n');
    }
    return advice;
  }
}

module.exports = AdviceEngine;
