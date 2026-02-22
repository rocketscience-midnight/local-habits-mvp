/**
 * Date utility helpers for habit tracking
 * Week starts on Monday (1=Mon, 2=Tue, ..., 7=Sun)
 */

/**
 * Returns today's date as YYYY-MM-DD string
 */
export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns day of week with Monday=1 ... Sunday=7 (ISO standard)
 */
export function getDayOfWeek(dateStr) {
  const jsDay = new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun
  return jsDay === 0 ? 7 : jsDay; // convert to 1=Mon..7=Sun
}

/**
 * Weekday labels starting Monday
 */
export const WEEKDAYS_MONDAY = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/**
 * Convert Monday-based index (0=Mo..6=So) to ISO day (1=Mon..7=Sun)
 */
export function mondayIndexToIso(idx) {
  return idx + 1;
}

/**
 * Get the ISO week start (Monday) for a given date string
 */
export function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Check if a habit is due on a given date.
 * Weekly habits (timesPerWeek) are always shown — they're due every day.
 */
export function isHabitDueToday(habit, dateStr = todayString()) {
  const freq = habit.frequency;
  if (freq === 'daily') return true;
  // New weekly model: { type: 'weekly', timesPerWeek: N }
  if (freq && typeof freq === 'object' && freq.type === 'weekly') return true;
  // Legacy: array of ISO day numbers
  if (Array.isArray(freq)) {
    const day = getDayOfWeek(dateStr);
    return freq.includes(day);
  }
  return true;
}

/**
 * Check if habit uses the weekly frequency model
 */
export function isWeeklyHabit(habit) {
  const freq = habit.frequency;
  return freq && typeof freq === 'object' && freq.type === 'weekly';
}

/**
 * Calculate current streak for a habit given its completions.
 * For weekly habits, streak counts complete weeks.
 */
export function calculateStreak(completionDates, habit) {
  if (!completionDates.length) return 0;

  if (isWeeklyHabit(habit)) {
    return calculateWeeklyStreak(completionDates, habit, false);
  }

  const target = habit.targetPerDay || 1;
  const dateCount = countByDate(completionDates);
  const today = todayString();
  let streak = 0;
  let checkDate = new Date(today + 'T12:00:00');

  if ((dateCount[today] || 0) < target) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (!isHabitDueToday(habit, dateStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }
    if ((dateCount[dateStr] || 0) >= target) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
    if (streak > 1000) break;
  }

  return streak;
}

/**
 * Calculate best (longest) streak ever for a habit
 */
export function calculateBestStreak(completionDates, habit) {
  if (!completionDates.length) return 0;

  if (isWeeklyHabit(habit)) {
    return calculateWeeklyStreak(completionDates, habit, true);
  }

  const target = habit.targetPerDay || 1;
  const sorted = [...new Set(completionDates)].sort();
  const dateCount = countByDate(completionDates);
  let best = 0, current = 0;

  const start = new Date(sorted[0] + 'T12:00:00');
  const end = new Date(todayString() + 'T12:00:00');
  const d = new Date(start);

  while (d <= end) {
    const dateStr = d.toISOString().slice(0, 10);
    if (!isHabitDueToday(habit, dateStr)) {
      d.setDate(d.getDate() + 1);
      continue;
    }
    if ((dateCount[dateStr] || 0) >= target) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
    d.setDate(d.getDate() + 1);
  }

  return best;
}

/**
 * Calculate weekly streak (in weeks).
 * A week is "complete" if completions in that week >= timesPerWeek.
 */
function calculateWeeklyStreak(completionDates, habit, findBest) {
  const target = habit.frequency.timesPerWeek || 1;
  const weekCounts = {};
  for (const d of completionDates) {
    const ws = getWeekStart(d);
    weekCounts[ws] = (weekCounts[ws] || 0) + 1;
  }

  const today = todayString();
  const currentWeekStart = getWeekStart(today);

  // Get all week starts sorted descending
  const allWeeks = [];
  const d = new Date(currentWeekStart + 'T12:00:00');
  // go back up to 200 weeks
  for (let i = 0; i < 200; i++) {
    allWeeks.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() - 7);
  }

  if (findBest) {
    let best = 0, current = 0;
    // reverse to go chronologically
    for (const ws of [...allWeeks].reverse()) {
      if ((weekCounts[ws] || 0) >= target) {
        current++;
        if (current > best) best = current;
      } else {
        current = 0;
      }
    }
    return best;
  }

  // Current streak
  let streak = 0;
  let startIdx = 0;
  // If current week isn't complete yet, skip it (still in progress)
  if ((weekCounts[currentWeekStart] || 0) < target) {
    startIdx = 1;
  }
  for (let i = startIdx; i < allWeeks.length; i++) {
    if ((weekCounts[allWeeks[i]] || 0) >= target) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Get weekly completion count for a habit in the current week
 */
export function getWeeklyCompletionCount(completionDates, dateStr = todayString()) {
  const weekStart = getWeekStart(dateStr);
  let count = 0;
  for (const d of completionDates) {
    if (getWeekStart(d) === weekStart) count++;
  }
  return count;
}

/**
 * Get ISO week key string (e.g. "2026-W08") from a date string
 */
export function getISOWeekKey(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  // Thursday of current week determines year
  const thu = new Date(d);
  thu.setDate(thu.getDate() - ((d.getDay() + 6) % 7) + 3);
  const yearStart = new Date(thu.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((thu - yearStart) / 86400000 + 1) / 7);
  return `${thu.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Get the current period key for a task frequency
 */
export function getCurrentPeriod(frequency) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  switch (frequency) {
    case 'weekly':
      return getISOWeekKey(todayString());
    case 'bimonthly':
    case 'monthly':
      return `${year}-${month}`;
    case 'quarterly': {
      const q = Math.ceil((now.getMonth() + 1) / 3);
      return `${year}-Q${q}`;
    }
    default:
      return `${year}-${month}`;
  }
}

/**
 * Check if a task is overdue (not completed and >50% of period elapsed)
 */
export function isTaskOverdue(task, completions) {
  const period = getCurrentPeriod(task.frequency);
  const maxCompletions = task.frequency === 'bimonthly' ? 2 : 1;
  const periodCompletions = completions.filter(c => c.period === period).length;
  if (periodCompletions >= maxCompletions) return false;

  const now = new Date();
  let elapsed = 0;

  switch (task.frequency) {
    case 'weekly': {
      const dow = now.getDay();
      const daysSinceMonday = dow === 0 ? 6 : dow - 1;
      elapsed = (daysSinceMonday + now.getHours() / 24) / 7;
      break;
    }
    case 'bimonthly':
    case 'monthly': {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      elapsed = (now.getDate() - 1 + now.getHours() / 24) / daysInMonth;
      break;
    }
    case 'quarterly': {
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const qEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1);
      const totalMs = qEnd - qStart;
      elapsed = (now - qStart) / totalMs;
      break;
    }
  }

  return elapsed > 0.5;
}

/** Count occurrences per date string */
export function countByDate(dates) {
  const map = {};
  for (const d of dates) {
    map[d] = (map[d] || 0) + 1;
  }
  return map;
}

/**
 * Get date string N days ago
 */
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
