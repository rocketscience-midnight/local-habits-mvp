/**
 * Date utility helpers for habit tracking
 */

/**
 * Returns today's date as YYYY-MM-DD string
 */
export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export function getDayOfWeek(dateStr) {
  return new Date(dateStr + 'T12:00:00').getDay();
}

/**
 * Check if a habit is due on a given date
 * @param {Object} habit - Habit object with frequency property
 * @param {string} dateStr - YYYY-MM-DD date string
 * @returns {boolean}
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
 * @param {string[]} completionDates - Array of YYYY-MM-DD strings (sorted desc)
 * @param {Object} habit - Habit object for frequency check
 * @returns {number} Current streak count
 */
export function calculateStreak(completionDates, habit) {
  if (!completionDates.length) return 0;

  const sorted = [...completionDates].sort().reverse();
  const today = todayString();
  let streak = 0;
  let checkDate = new Date(today + 'T12:00:00');

  // If today isn't completed, start checking from yesterday
  if (sorted[0] !== today) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);

    // Skip days the habit isn't due
    if (!isHabitDueToday(habit, dateStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    if (sorted.includes(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }

    // Safety: don't go back more than 1000 days
    if (streak > 1000) break;
  }

  return streak;
}

/**
 * Calculate best (longest) streak ever for a habit
 * @param {string[]} completionDates - Array of YYYY-MM-DD strings
 * @param {Object} habit - Habit object for frequency check
 * @returns {number} Best streak count
 */
export function calculateBestStreak(completionDates, habit) {
  if (!completionDates.length) return 0;

  const sorted = [...completionDates].sort();
  let best = 0;
  let current = 0;

  // Walk through each date from the first completion to today
  const start = new Date(sorted[0] + 'T12:00:00');
  const end = new Date(todayString() + 'T12:00:00');
  const dateSet = new Set(sorted);

  const d = new Date(start);
  while (d <= end) {
    const dateStr = d.toISOString().slice(0, 10);

    if (!isHabitDueToday(habit, dateStr)) {
      d.setDate(d.getDate() + 1);
      continue;
    }

    if (dateSet.has(dateStr)) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }

    d.setDate(d.getDate() + 1);
  }

  return best;
}
