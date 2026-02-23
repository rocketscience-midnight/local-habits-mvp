/**
 * Demo Mode - Loads realistic sample data for showcasing the app
 */

import habitRepo from '../repo/habitRepo.js';
import { getISOWeekKey } from './dates.js';

function uuid() {
  return crypto.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/** Date string YYYY-MM-DD, offset days from today */
function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Seeded-ish deterministic skip pattern per habit */
function shouldSkip(dayOffset, habitIndex, skipRate) {
  // Use a simple hash to decide skips - not truly random but consistent-looking
  const val = Math.abs(Math.sin(dayOffset * 13.7 + habitIndex * 47.3)) ;
  return val < skipRate;
}

function generateCompletions(habits) {
  const completions = [];

  for (let h = 0; h < habits.length; h++) {
    const habit = habits[h];
    const isWeekly = habit.frequency?.type === 'weekly';
    const timesPerWeek = habit.frequency?.timesPerWeek || 7;
    const targetPerDay = habit.targetPerDay || 1;
    // Skip rate: ~15-25% miss rate
    const skipRate = 0.15 + (h * 0.015);

    // For weekly habits, pick ~timesPerWeek days per week
    let weeklyDaysUsed = 0;
    let currentWeekStart = null;

    for (let day = -27; day <= 0; day++) {
      const date = dateStr(day);

      // Track week boundaries for weekly habits
      const d = new Date();
      d.setDate(d.getDate() + day);
      const weekDay = d.getDay(); // 0=Sun
      const mondayOffset = weekDay === 0 ? -6 : 1 - weekDay;
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() + mondayOffset);
      const weekKey = weekStart.toISOString().slice(0, 10);

      if (weekKey !== currentWeekStart) {
        currentWeekStart = weekKey;
        weeklyDaysUsed = 0;
      }

      if (isWeekly) {
        // Weekly: only do it on some days, up to timesPerWeek
        if (weeklyDaysUsed >= timesPerWeek) continue;
        if (shouldSkip(day, h, 0.5)) continue; // 50% chance per day
        weeklyDaysUsed++;
      } else {
        // Daily: skip some days for realism
        if (shouldSkip(day, h, skipRate)) continue;
      }

      // For current streak: don't skip last 3-7 days
      const streakDays = 3 + (h % 5); // 3-7 per habit
      if (day > -streakDays && !isWeekly) {
        // Force completion for current streak (daily habits)
      } else if (day > -streakDays && isWeekly && weeklyDaysUsed <= timesPerWeek) {
        // Allow weekly within streak
      }

      // Add completions (multiple for water habit)
      const count = (habit.name === 'Wasser trinken')
        ? 3 + Math.floor(Math.abs(Math.sin(day * 7.1)) * 4) // 3-6
        : Math.min(targetPerDay, 1);

      for (let c = 0; c < count; c++) {
        completions.push({
          id: uuid(),
          habitId: habit.id,
          date,
          completedAt: new Date(date + 'T08:00:00').toISOString()
        });
      }
    }
  }

  return completions;
}

export async function loadDemoData() {
  // 1. Clear all data
  await habitRepo.importData(JSON.stringify({
    habits: [], completions: [], gardenPlants: [],
    weeklyFocus: [], tasks: [], taskCompletions: []
  }));

  // 2. Create habits
  const habitsData = [
    { name: 'Wasser trinken', emoji: '💧', targetPerDay: 6, frequency: 'daily', timeOfDay: 'morning' },
    { name: 'Vitamin D', emoji: '☀️', targetPerDay: 1, frequency: 'daily', timeOfDay: 'morning' },
    { name: 'Kalt duschen', emoji: '🚿', targetPerDay: 1, frequency: { type: 'weekly', timesPerWeek: 5 }, timeOfDay: 'morning' },
    { name: 'Meditation', emoji: '🧘', targetPerDay: 1, frequency: 'daily', timeOfDay: 'anytime' },
    { name: 'Sport', emoji: '💪', targetPerDay: 1, frequency: { type: 'weekly', timesPerWeek: 3 }, timeOfDay: 'anytime' },
    { name: 'Spaziergang', emoji: '🚶', targetPerDay: 1, frequency: 'daily', timeOfDay: 'anytime' },
    { name: 'Lesen', emoji: '📚', targetPerDay: 1, frequency: 'daily', timeOfDay: 'evening' },
    { name: 'Journaling', emoji: '✍️', targetPerDay: 1, frequency: 'daily', timeOfDay: 'evening' },
  ];

  const habits = [];
  for (let i = 0; i < habitsData.length; i++) {
    const h = habitsData[i];
    const habit = {
      id: uuid(),
      name: h.name,
      emoji: h.emoji,
      targetPerDay: h.targetPerDay,
      frequency: h.frequency,
      timeOfDay: h.timeOfDay,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      order: i,
    };
    habits.push(habit);
  }

  // 3. Generate completions
  const completions = generateCompletions(habits);

  // 4. Garden plants (15 total: 8 placed, 7 in inventory)
  const plants = [
    // 5× common (stage 1)
    { plantType: 'bush', rarity: 'common', growthStage: 1, placed: 1, gridCol: 0, gridRow: 0 },
    { plantType: 'mushroom', rarity: 'common', growthStage: 1, placed: 1, gridCol: 2, gridRow: 1 },
    { plantType: 'grass', rarity: 'common', growthStage: 1, placed: 0, gridCol: null, gridRow: null },
    { plantType: 'clover', rarity: 'common', growthStage: 1, placed: 0, gridCol: null, gridRow: null },
    { plantType: 'bush', rarity: 'common', growthStage: 1, placed: 0, gridCol: null, gridRow: null },
    // 4× uncommon (stage 2)
    { plantType: 'tulip', rarity: 'uncommon', growthStage: 2, placed: 1, gridCol: 1, gridRow: 2 },
    { plantType: 'fern', rarity: 'uncommon', growthStage: 2, placed: 1, gridCol: 3, gridRow: 0 },
    { plantType: 'daisy', rarity: 'uncommon', growthStage: 2, placed: 0, gridCol: null, gridRow: null },
    { plantType: 'mushroom', rarity: 'uncommon', growthStage: 2, placed: 0, gridCol: null, gridRow: null },
    // 3× rare (stage 3)
    { plantType: 'sunflower', rarity: 'rare', growthStage: 3, placed: 1, gridCol: 4, gridRow: 1 },
    { plantType: 'bush', rarity: 'rare', growthStage: 3, placed: 0, gridCol: null, gridRow: null },
    { plantType: 'sunflower', rarity: 'rare', growthStage: 3, placed: 0, gridCol: null, gridRow: null },
    // 2× epic (stage 4)
    { plantType: 'cherry', rarity: 'epic', growthStage: 4, placed: 1, gridCol: 2, gridRow: 3 },
    { plantType: 'appletree', rarity: 'epic', growthStage: 4, placed: 0, gridCol: null, gridRow: null },
    // 1× legendary (stage 5)
    { plantType: 'cherry', rarity: 'legendary', growthStage: 5, placed: 1, gridCol: 3, gridRow: 2 },
  ].map((p, i) => ({
    ...p,
    id: uuid(),
    itemType: 'plant',
    habitId: habits[i % habits.length].id,
    habitName: habits[i % habits.length].name,
    weekEarned: dateStr(-7 * (15 - i)),
  }));

  // 4 Decos: all placed
  const decos = [
    { plantType: 'pond_small', rarity: 'uncommon', placed: 1, gridCol: 1, gridRow: 0 },
    { plantType: 'lantern', rarity: 'uncommon', placed: 1, gridCol: 4, gridRow: 3 },
    { plantType: 'bench', rarity: 'uncommon', placed: 1, gridCol: 0, gridRow: 3 },
    { plantType: 'birdhouse', rarity: 'uncommon', placed: 1, gridCol: 5, gridRow: 1 },
  ].map(d => ({
    ...d,
    id: uuid(),
    growthStage: 1,
    itemType: 'deco',
    habitId: 'task-demo',
    habitName: 'Demo-Task',
    weekEarned: dateStr(-14),
    gridRow: d.gridRow,
    gridCol: d.gridCol,
  }));

  // 5. Tasks
  const tasks = [
    { id: uuid(), name: 'Wäsche waschen', emoji: '🧺', frequency: 'weekly', difficulty: 'medium', createdAt: dateStr(-30), order: 0 },
    { id: uuid(), name: 'Staubsaugen', emoji: '🧹', frequency: 'weekly', difficulty: 'medium', createdAt: dateStr(-30), order: 1 },
    { id: uuid(), name: 'Einkaufen', emoji: '🛒', frequency: 'weekly', difficulty: 'easy', createdAt: dateStr(-30), order: 2 },
    { id: uuid(), name: 'Paket zur Post bringen', emoji: '📦', frequency: 'once', difficulty: 'easy', createdAt: dateStr(-3), order: 3 },
    { id: uuid(), name: 'Fahrrad aufpumpen', emoji: '🔧', frequency: 'once', difficulty: 'easy', createdAt: dateStr(-7), order: 4 },
  ];

  // Task completions: recurring ones have some completions, "Fahrrad" is done
  const taskCompletions = [];
  // Current week key for weekly tasks
  const now = new Date();
  const weekDay = now.getDay();
  const mondayOffset = weekDay === 0 ? -6 : 1 - weekDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const currentWeekKey = monday.toISOString().slice(0, 10);
  const prevMonday = new Date(monday);
  prevMonday.setDate(monday.getDate() - 7);
  const prevWeekKey = prevMonday.toISOString().slice(0, 10);

  // Wäsche + Staubsaugen done last week
  taskCompletions.push({ id: uuid(), taskId: tasks[0].id, period: prevWeekKey, completedAt: dateStr(-5) });
  taskCompletions.push({ id: uuid(), taskId: tasks[1].id, period: prevWeekKey, completedAt: dateStr(-6) });
  // Einkaufen done this week
  taskCompletions.push({ id: uuid(), taskId: tasks[2].id, period: currentWeekKey, completedAt: dateStr(-1) });
  // Fahrrad aufpumpen: done (once task)
  taskCompletions.push({ id: uuid(), taskId: tasks[4].id, period: 'once', completedAt: dateStr(-2) });

  // 6. Weekly Focus
  const weekKey = getISOWeekKey(dateStr(0));
  const weeklyFocus = [{ id: uuid(), weekKey, text: 'Mehr Bewegung im Alltag 🌿' }];

  // 7. Write everything to DB
  const allPlants = [...plants, ...decos];
  await habitRepo.importData(JSON.stringify({
    habits,
    completions,
    gardenPlants: allPlants,
    weeklyFocus,
    tasks,
    taskCompletions,
  }));
}

export async function clearDemoData() {
  await habitRepo.importData(JSON.stringify({
    habits: [], completions: [], gardenPlants: [],
    weeklyFocus: [], tasks: [], taskCompletions: []
  }));
}
