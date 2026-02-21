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
 * Check if a habit is due on a given date
 * frequency can be 'daily' or an array of ISO day numbers (1=Mon..7=Sun)
 */
export function isHabitDueToday(habit, dateStr = todayString()) {
  if (habit.frequency === 'daily') return true;
  if (Array.isArray(habit.frequency)) {
    const day = getDayOfWeek(dateStr);
    return habit.frequency.includes(day);
  }
  return true;
}

/**
 * Calculate current streak for a habit given its completions
 * For multi-completion habits, a day counts as complete only if
 * the number of completions >= targetPerDay
 */
export function calculateStreak(completionDates, habit) {
  if (!completionDates.length) return 0;

  const target = habit.targetPerDay || 1;
  const dateCount = countByDate(completionDates);
  const today = todayString();
  let streak = 0;
  let checkDate = new Date(today + 'T12:00:00');

  // If today isn't fully completed, start from yesterday
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

/** Count occurrences per date string */
function countByDate(dates) {
  const map = {};
  for (const d of dates) {
    map[d] = (map[d] || 0) + 1;
  }
  return map;
}
