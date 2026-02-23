/**
 * Central Dexie DB instance – shared by all repos.
 */

import Dexie from 'https://unpkg.com/dexie@4.0.11/dist/dexie.mjs';

const db = new Dexie('LocalHabitsDB');

// v1 original schema
db.version(1).stores({
  habits: 'id, name, order, createdAt',
  completions: 'id, habitId, date, [habitId+date]'
});

// v2: add targetPerDay and timeOfDay
db.version(2).stores({
  habits: 'id, name, order, createdAt',
  completions: 'id, habitId, date, [habitId+date]'
}).upgrade(tx => {
  return tx.table('habits').toCollection().modify(habit => {
    if (!habit.targetPerDay) habit.targetPerDay = 1;
    if (!habit.timeOfDay) habit.timeOfDay = 'anytime';
  });
});

// v3: migrate frequency arrays to { type: 'weekly', timesPerWeek: N }
db.version(3).stores({
  habits: 'id, name, order, createdAt',
  completions: 'id, habitId, date, [habitId+date]'
}).upgrade(tx => {
  return tx.table('habits').toCollection().modify(habit => {
    if (Array.isArray(habit.frequency)) {
      habit.frequency = { type: 'weekly', timesPerWeek: habit.frequency.length || 3 };
    }
  });
});

// v4: (dead migration removed - v5 deletes plantType anyway)
db.version(4).stores({
  habits: 'id, name, order, createdAt',
  completions: 'id, habitId, date, [habitId+date]'
});

// v5: add gardenPlants table, remove plantType from habits
db.version(5).stores({
  habits: 'id, name, order, createdAt',
  completions: 'id, habitId, date, [habitId+date]',
  gardenPlants: 'id, habitId, weekEarned, placed, [habitId+weekEarned]'
}).upgrade(tx => {
  return tx.table('habits').toCollection().modify(habit => {
    delete habit.plantType;
  });
});

// v6: add weeklyFocus table
db.version(6).stores({
  habits: 'id, name, order, createdAt',
  completions: 'id, habitId, date, [habitId+date]',
  gardenPlants: 'id, habitId, weekEarned, placed, [habitId+weekEarned]',
  weeklyFocus: 'id, weekKey'
});

// v7: add tasks and taskCompletions tables
db.version(7).stores({
  habits: 'id, name, order, createdAt',
  completions: 'id, habitId, date, [habitId+date]',
  gardenPlants: 'id, habitId, weekEarned, placed, [habitId+weekEarned]',
  weeklyFocus: 'id, weekKey',
  tasks: 'id, name, frequency, difficulty, order, createdAt',
  taskCompletions: 'id, taskId, period'
});

export function uuid() {
  return crypto.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export default db;
