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
    "⚡ Ти зробив це!明日も一緒に走ろう!",
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

module.exports = {
  daily,
  streak,
  achievement,
  afterRun,
  encouragement,
  byStats
};
