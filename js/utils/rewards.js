/**
 * Weekly Reward System
 * Checks completed habits from last week and awards garden plants.
 * Rarity is based on consecutive weeks of streak.
 */

import habitRepo from '../repo/habitRepo.js';
import gardenRepo from '../repo/gardenRepo.js';
import { todayString, getWeekStart, isWeeklyHabit, getISOWeekKey } from './dates.js';

// Plant types available for each rarity
const PLANT_TYPES_BY_RARITY = {
  common:    ['bush', 'mushroom', 'grass', 'clover'],
  uncommon:  ['tulip', 'mushroom', 'fern', 'daisy'],
  rare:      ['sunflower', 'bush'],
  epic:      ['cherry', 'appletree'],
  legendary: ['cherry', 'sunflower'],
};

// Rarity display names (German)
export const RARITY_LABELS = {
  common:    'Gewöhnlich',
  uncommon:  'Ungewöhnlich',
  rare:      'Selten',
  epic:      'Episch',
  legendary: 'Legendär',
};

// Rarity colors for UI
export const RARITY_COLORS = {
  common:    '#8ED88E',
  uncommon:  '#6BBF6B',
  rare:      '#FFD966',
  epic:      '#DDA0DD',
  legendary: '#C2185B',
};

// Map rarity to visual growth stage
export const RARITY_TO_STAGE = {
  common:    1,
  uncommon:  2,
  rare:      3,
  epic:      4,
  legendary: 5,
};

/**
 * Get the Monday of a given week, going N weeks back from reference date
 */
function getWeekStartNWeeksAgo(n, refDate = todayString()) {
  const monday = new Date(getWeekStart(refDate) + 'T12:00:00');
  monday.setDate(monday.getDate() - n * 7);
  return monday.toISOString().slice(0, 10);
}

/**
 * Determine rarity from consecutive weeks of completed streaks
 */
function streakWeeksToRarity(weeks) {
  if (weeks >= 12) return 'legendary';
  if (weeks >= 8)  return 'epic';
  if (weeks >= 4)  return 'rare';
  if (weeks >= 2)  return 'uncommon';
  return 'common';
}

/**
 * Pick a random plant type for a given rarity
 */
function pickPlantType(rarity) {
  const types = PLANT_TYPES_BY_RARITY[rarity];
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Count how many consecutive weeks (ending with lastWeekStart) a habit was fully completed.
 * Returns number of consecutive weeks.
 */
function countConsecutiveWeeks(habit, completionDates, lastWeekStart) {
  const target = habit.targetPerDay || 1;
  const isWeekly = isWeeklyHabit(habit);
  const weeklyTarget = isWeekly ? habit.frequency.timesPerWeek : 7; // daily = 7 days per week

  // Group completions by week
  const weekCounts = {};
  for (const d of completionDates) {
    const ws = getWeekStart(d);
    weekCounts[ws] = (weekCounts[ws] || 0) + 1;
  }

  let consecutiveWeeks = 0;
  let checkWeek = new Date(lastWeekStart + 'T12:00:00');

  for (let i = 0; i < 200; i++) {
    const ws = checkWeek.toISOString().slice(0, 10);
    const count = weekCounts[ws] || 0;

    if (isWeekly) {
      // Weekly habit: need timesPerWeek completions
      if (count >= weeklyTarget) {
        consecutiveWeeks++;
      } else {
        break;
      }
    } else {
      // Daily habit: need all 7 days completed (target per day each day)
      // Count unique days with enough completions
      const daysInWeek = completionDates.filter(d => getWeekStart(d) === ws);
      const dayCounts = {};
      for (const d of daysInWeek) {
        dayCounts[d] = (dayCounts[d] || 0) + 1;
      }
      const completedDays = Object.values(dayCounts).filter(c => c >= target).length;
      if (completedDays >= 7) {
        consecutiveWeeks++;
      } else {
        break;
      }
    }

    checkWeek.setDate(checkWeek.getDate() - 7);
  }

  return consecutiveWeeks;
}

/**
 * Check for weekly rewards. Called when garden opens.
 * Looks at LAST completed week and awards plants for habits that met their target.
 * Returns array of newly created GardenPlant objects.
 */
export async function checkWeeklyRewards() {
  const today = todayString();
  const currentWeekStart = getWeekStart(today);
  // Last week's Monday
  const lastWeekStart = getWeekStartNWeeksAgo(1, today);
  const lastWeekISO = getISOWeekKey(lastWeekStart);

  const habits = await habitRepo.getAll();
  const newPlants = [];

  for (const habit of habits) {
    // Check if we already awarded a plant for this habit+week
    const existing = await gardenRepo.getPlantByHabitAndWeek(habit.id, lastWeekISO);
    if (existing) continue;

    // Get all completions for this habit
    const completions = await habitRepo.getCompletionsForHabit(habit.id);
    const dates = completions.map(c => c.date);

    // Check if last week was fully completed
    const isWeekly = isWeeklyHabit(habit);
    const target = habit.targetPerDay || 1;

    if (isWeekly) {
      const weeklyTarget = habit.frequency.timesPerWeek;
      const lastWeekDates = dates.filter(d => getWeekStart(d) === lastWeekStart);
      if (lastWeekDates.length < weeklyTarget) continue;
    } else {
      // Daily: check all 7 days of last week
      const lastWeekDates = dates.filter(d => getWeekStart(d) === lastWeekStart);
      const dayCounts = {};
      for (const d of lastWeekDates) {
        dayCounts[d] = (dayCounts[d] || 0) + 1;
      }
      const completedDays = Object.values(dayCounts).filter(c => c >= target).length;
      if (completedDays < 7) continue;
    }

    // Habit qualified! Determine streak weeks and rarity
    const streakWeeks = countConsecutiveWeeks(habit, dates, lastWeekStart);
    const rarity = streakWeeksToRarity(streakWeeks);
    const plantType = pickPlantType(rarity);

    const plant = await gardenRepo.addGardenPlant({
      plantType,
      rarity,
      growthStage: RARITY_TO_STAGE[rarity],
      habitId: habit.id,
      habitName: habit.name,
      weekEarned: lastWeekISO,
      placed: 0,
      gridCol: null,
      gridRow: null,
    });

    newPlants.push(plant);
  }

  return newPlants;
}

/**
 * Add a random test plant to the inventory (debug helper)
 */
export async function addTestPlant() {
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const rarity = rarities[Math.floor(Math.random() * rarities.length)];
  const plantType = pickPlantType(rarity);
  const weekISO = getISOWeekKey(todayString());

  return gardenRepo.addGardenPlant({
    plantType,
    rarity,
    growthStage: RARITY_TO_STAGE[rarity],
    habitId: 'test-' + Date.now(),
    habitName: 'Test-Gewohnheit',
    weekEarned: weekISO,
    placed: 0,
    gridCol: null,
    gridRow: null,
  });
}
