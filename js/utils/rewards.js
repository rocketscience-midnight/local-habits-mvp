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

    // Determine maxGrowth based on plant type
    const growthSpeeds = {
      'bush': 4, 'mushroom': 3, 'grass': 3, 'clover': 3,      // fast
      'tulip': 5, 'fern': 5, 'daisy': 5,                       // normal  
      'sunflower': 7, 'cherry': 10, 'appletree': 12           // slow
    };
    const maxGrowth = growthSpeeds[plantType] || 5;

    const plant = await gardenRepo.addGardenPlant({
      plantType,
      rarity,
      growthStage: 1,               // starts as seed
      totalGrowth: 1,               // starts at 1  
      maxGrowth: maxGrowth,
      habitId: habit.id,
      habitName: habit.name,
      weekEarned: lastWeekISO,
      placed: 0,                    // in inventory (seed)
      gridCol: null,
      gridRow: null,
      plantedDate: null,            // not planted yet
      isAdopted: false,
      originalHabitName: null,
      adoptedDate: null
    });

    newPlants.push(plant);
  }

  return newPlants;
}

/**
 * Map completed days (0-7 scale) to growth stage (1-5).
 * Day 1 = seed, Day 2-3 = sprout, Day 4-5 = small, Day 6 = bloom, Day 7 = full
 */
function completionsToStage(daysCompleted) {
  if (daysCompleted <= 1) return 1;
  if (daysCompleted <= 3) return 2;
  if (daysCompleted <= 5) return 3;
  if (daysCompleted <= 6) return 4;
  return 5;
}

/**
 * Update growth stages for plants earned last week based on this week's habit completions.
 * Plants start at stage 1 (seed) and grow as the user completes their habit during the current week.
 */
export async function updatePlantGrowth() {
  const today = todayString();
  const currentWeekStart = getWeekStart(today);
  const lastWeekStart = getWeekStartNWeeksAgo(1, today);
  const lastWeekISO = getISOWeekKey(lastWeekStart);

  const allPlants = await gardenRepo.getAllGardenPlants();
  const plantsToGrow = allPlants.filter(p => p.weekEarned === lastWeekISO && p.growthStage < 5);
  if (plantsToGrow.length === 0) return;

  const habits = await habitRepo.getAll();
  const habitMap = {};
  for (const h of habits) habitMap[h.id] = h;

  for (const plant of plantsToGrow) {
    const habit = habitMap[plant.habitId];
    if (!habit) continue;

    const completions = await habitRepo.getCompletionsForHabit(plant.habitId);
    const weekCompletions = completions.filter(c => getWeekStart(c.date) === currentWeekStart);

    let daysCompleted;
    if (isWeeklyHabit(habit)) {
      const target = habit.frequency.timesPerWeek || 1;
      daysCompleted = Math.min(7, Math.round(weekCompletions.length / target * 7));
    } else {
      const target = habit.targetPerDay || 1;
      const dayCounts = {};
      for (const c of weekCompletions) {
        dayCounts[c.date] = (dayCounts[c.date] || 0) + 1;
      }
      daysCompleted = Object.values(dayCounts).filter(c => c >= target).length;
    }

    const newStage = completionsToStage(daysCompleted);
    if (newStage > plant.growthStage) {
      await gardenRepo.gardenPlants.update(plant.id, { growthStage: newStage });
    }
  }
}

/**
 * Get current season based on calendar month
 */
function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer'; 
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/**
 * Get growth modifier based on current season
 */
function getSeasonalGrowthModifier(season) {
  const modifiers = {
    spring: 1.2,   // +20% growth
    summer: 1.0,   // normal
    autumn: 1.1,   // +10% growth  
    winter: 0.9    // -10% growth
  };
  return modifiers[season] || 1.0;
}

/**
 * Grow plants for a specific habit (individual growth system)
 * Called after each habit completion
 */
export async function growPlantsForHabit(habitId) {
  if (!habitId) return;
  
  const plants = await gardenRepo.getAllGardenPlants();
  const plantsToGrow = plants.filter(p => 
    p.habitId === habitId && 
    p.placed > 0 && 
    p.totalGrowth < p.maxGrowth
  );
  
  if (plantsToGrow.length === 0) return;
  
  const season = getCurrentSeason();
  const growthModifier = getSeasonalGrowthModifier(season);
  
  for (const plant of plantsToGrow) {
    // Calculate growth points to add (seasonal modifier + randomness)
    const baseGrowth = 1;
    const seasonalGrowth = Math.random() < growthModifier ? baseGrowth + 1 : baseGrowth;
    const finalGrowth = Math.min(seasonalGrowth, plant.maxGrowth - plant.totalGrowth);
    
    const newTotalGrowth = plant.totalGrowth + finalGrowth;
    const newStage = Math.min(5, Math.floor((newTotalGrowth / plant.maxGrowth) * 4) + 1);
    
    await gardenRepo.gardenPlants.update(plant.id, { 
      totalGrowth: newTotalGrowth,
      growthStage: newStage
    });
  }
}

/**
 * Adopt orphaned plants when a habit is deleted
 * Automatically assigns them to the habit with fewest plants
 */
export async function adoptOrphanedPlants(deletedHabitId) {
  if (!deletedHabitId) return;
  
  // Get orphaned plants
  const orphanedPlants = (await gardenRepo.getAllGardenPlants())
    .filter(p => p.habitId === deletedHabitId);
  
  if (orphanedPlants.length === 0) return;
  
  // Get all remaining habits
  const allHabits = await habitRepo.getAll();
  if (allHabits.length === 0) {
    // No habits left - plants become truly orphaned
    for (const plant of orphanedPlants) {
      await gardenRepo.gardenPlants.update(plant.id, {
        habitId: null,
        isAdopted: true,
        originalHabitName: plant.habitName,
        adoptedDate: new Date().toISOString()
      });
    }
    return;
  }
  
  // Count plants per habit
  const allPlants = await gardenRepo.getAllGardenPlants();
  const plantCounts = {};
  for (const habit of allHabits) {
    plantCounts[habit.id] = allPlants.filter(p => p.habitId === habit.id).length;
  }
  
  // Find habit with fewest plants
  const targetHabit = allHabits.reduce((min, habit) => 
    (plantCounts[habit.id] || 0) < (plantCounts[min.id] || 0) ? habit : min
  );
  
  // Adopt all orphaned plants
  const originalHabitName = orphanedPlants[0]?.habitName;
  for (const plant of orphanedPlants) {
    await gardenRepo.gardenPlants.update(plant.id, {
      habitId: targetHabit.id,
      habitName: targetHabit.name,
      isAdopted: true,
      originalHabitName: originalHabitName,
      adoptedDate: new Date().toISOString()
    });
  }
  
  // Show adoption toast
  if (typeof window !== 'undefined' && orphanedPlants.length > 0) {
    const message = `🌱 ${orphanedPlants.length} Pflanzen von "${originalHabitName}" wurden zu "${targetHabit.name}" adoptiert!`;
    showAdoptionToast(message);
  }
}

/**
 * Show adoption toast notification  
 */
function showAdoptionToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: #4CAF50; color: white; padding: 12px 24px;
    border-radius: 8px; z-index: 10000; font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    opacity: 0; transition: opacity 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Fade in
  requestAnimationFrame(() => toast.style.opacity = '1');
  
  // Remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
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
