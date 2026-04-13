const MOTIVATION = {
  daily: [
    "🏃‍♂️ Кожен крок наближає тебе до мети!",
    "⚡ Сьогоднішній пробіг - завтрашня перемога!",
    "🔥 Немає поганого погода - є непоганий одяг!",
    "🏅 Краще бігти, ніж шкодувати!",
    "💪 Твоє тіло здатне на більше, ніж ти думаєш!",
    "🎯 Маленькі кроки кожен день - великі зміни за рік!",
    "🚀 Сьогодні ти біжиш легше, ніж вчора!",
    "⏰ Кращий час бігти - зараз!",
    "🌟 Кожен кілометр - це перемога над собою!",
    "💯 Без болю немає результату!",
    "🔥 Тільки лінь не біжить!",
    "🏃 Парадокс: чим більше біжиш, тим більше хочеться!",
    "⚡ Завтра ти подякуєш собі за сьогоднішній біг!",
    "🎉 Біг - це найкращий антистрес!",
    "💪 Немає вихідних для чемпіонів!"
  ],
  
  streak: [
    "🔥 ${days} днів поспіль! Ти не зупиняєшся!",
    "⚡ ${days} днів серії! Твій характер - твоя сила!",
    "🏆 ${days} днів! Ти в зоні!",
    "💪 ${days} днів - ти машина!",
    "🔥 Нереальна серія ${days} днів! Продовжуй!"
  ],
  
  achievement: [
    "🏅 Новий рекорд! Ти це зробив!",
    "⭐ Ти побив свій рекорд! Відзначай!",
    "🎉 Нова вершина підкорена!",
    "💯 Персональний рекорд! Ти найкращий!",
    "🏆 Ти це зробив! Гордий за тебе!"
  ],
  
  afterRun: [
    "💪 Відмінний біг! Продовжуй!",
    "🔥 Чудова робота! Тіло дякує!",
    "⚡ Ти зробив це!",
    "🏃 Після бігу - найкращий сон!",
    "🎯 Кожен біг робить тебе сильнішим!"
  ],
  
  encouragement: [
    "Не здавайся! Перші км найважчі!",
    "Тримай темп! Ти можеш!",
    "Один крок за раз!",
    "Дихай і біжи!",
    "Ти сильніший за втому!"
  ]
};

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daily() {
  return getRandom(MOTIVATION.daily);
}

function streak(days) {
  const template = getRandom(MOTIVATION.streak);
  return template.replace('${days}', days);
}

function achievement() {
  return getRandom(MOTIVATION.achievement);
}

function afterRun() {
  return getRandom(MOTIVATION.afterRun);
}

function encouragement() {
  return getRandom(MOTIVATION.encouragement);
}

function byStats(activities, totalKm) {
  if (activities >= 10 && totalKm >= 50) {
    return "🔥 Ти справжній атлет! Продовжуй рівень!";
  }
  if (activities >= 5 && totalKm >= 20) {
    return "💪 Чудовий темп! Ти на правильному шляху!";
  }
  if (activities >= 3) {
    return "⚡ Початок є! Додай ще трохи!";
  }
  return "🏃 Перший крок - найважчий. Ти вже біжиш!";
}

function afterAnalyze(activity) {
  const distance = activity.distance || 0;
  const pace = activity.pace || '0:00';
  const paceSec = parsePace(pace);
  
  if (distance >= 21) {
    return getRandom([
      "🏆 Марафонець! Шалений результат!",
      "🔥 21+ км! Ти не людина, ти легенда!",
      "💪 Марафон! Твоя витривалість вражає!"
    ]);
  }
  
  if (distance >= 10) {
    return getRandom([
      "💪 Десятка! Чудова робота!",
      "⚡ 10+ км! Ти в грі!",
      "🔥 Довгий забіг - міцні ноги!"
    ]);
  }
  
  if (paceSec < 270) {
    return getRandom([
      "⚡ Шалений темп! Ти швидкий!",
      "🚀 Sub-4:30! Просто бомба!",
      "🔥 VO2max зона! Ти гориш!"
    ]);
  }
  
  if (paceSec < 300) {
    return getRandom([
      "💪 Хороший темп! Тримай!",
      "⚡ Темпова зона! Чудово!"
    ]);
  }
  
  if (paceSec >= 360) {
    return getRandom([
      "🧘 Легкий темп - основа!",
      "🌿 Відновлювальний біг - теж тренування!",
      "💚 Z1 - найважливіша зона!"
    ]);
  }
  
  return getRandom(MOTIVATION.afterRun);
}

function parsePace(pace) {
  if (!pace || typeof pace !== 'string') return 0;
  const parts = pace.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

module.exports = {
  daily,
  streak,
  achievement,
  afterRun,
  encouragement,
  byStats,
  afterAnalyze
};
