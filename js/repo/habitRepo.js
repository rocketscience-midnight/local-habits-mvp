/**
 * Habit Repository - Data access layer using Dexie.js (IndexedDB)
 * v2: added targetPerDay, timeOfDay fields
 */

import Dexie from 'https://unpkg.com/dexie/dist/dexie.mjs';
import { todayString, calculateStreak, calculateBestStreak } from '../utils/dates.js';

const db = new Dexie('LocalHabitsDB');

// v1 original schema
db.version(1).stores({
  habits: 'id, name, order, createdAt',
  completions: 'id, habitId, date, [habitId+date]'
});

// v2: add targetPerDay and timeOfDay (no index changes needed, just bump version for migration)
db.version(2).stores({
  habits: 'id, name, order, createdAt',
  completions: 'id, habitId, date, [habitId+date]'
}).upgrade(tx => {
  // Set defaults for existing habits
  return tx.table('habits').toCollection().modify(habit => {
    if (!habit.targetPerDay) habit.targetPerDay = 1;
    if (!habit.timeOfDay) habit.timeOfDay = 'anytime';
  });
});

function uuid() {
  return crypto.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

const habitRepo = {
  async getAll() {
    return db.habits.orderBy('order').toArray();
  },

  async getById(id) {
    return db.habits.get(id);
  },

  async save(habit) {
    if (!habit.id) {
      habit.id = uuid();
      habit.createdAt = new Date().toISOString();
      const count = await db.habits.count();
      habit.order = count;
    }
    // Ensure defaults
    if (!habit.targetPerDay) habit.targetPerDay = 1;
    if (!habit.timeOfDay) habit.timeOfDay = 'anytime';
    await db.habits.put(habit);
    return habit;
  },

  async delete(id) {
    await db.completions.where('habitId').equals(id).delete();
    await db.habits.delete(id);
  },

  async getCompletionsForDate(date = todayString()) {
    return db.completions.where('date').equals(date).toArray();
  },

  /**
   * Increment completion count for a habit on a date.
   * For multi-completion habits, adds one completion each call.
   * Returns { count, target, completed }
   */
  async incrementCompletion(habitId, date = todayString()) {
    const habit = await db.habits.get(habitId);
    const target = habit?.targetPerDay || 1;
    const existing = await db.completions
      .where({ habitId, date })
      .toArray();

    if (existing.length >= target) {
      // Already at target — reset (delete all for this day)
      for (const c of existing) {
        await db.completions.delete(c.id);
      }
      return { count: 0, target, completed: false };
    }

    // Add one completion
    await db.completions.put({
      id: uuid(),
      habitId,
      date,
      completedAt: new Date().toISOString()
    });

    const newCount = existing.length + 1;
    return { count: newCount, target, completed: newCount >= target };
  },

  /**
   * Get completion count for a habit on a date
   */
  async getCompletionCount(habitId, date = todayString()) {
    return db.completions.where({ habitId, date }).count();
  },

  async getStreak(habitId) {
    const habit = await db.habits.get(habitId);
    if (!habit) return 0;
    const completions = await db.completions
      .where('habitId').equals(habitId).toArray();
    const dates = completions.map(c => c.date);
    return calculateStreak(dates, habit);
  },

  async getBestStreak(habitId) {
    const habit = await db.habits.get(habitId);
    if (!habit) return 0;
    const completions = await db.completions
      .where('habitId').equals(habitId).toArray();
    const dates = completions.map(c => c.date);
    return calculateBestStreak(dates, habit);
  },

  async exportData() {
    const habits = await db.habits.toArray();
    const completions = await db.completions.toArray();
    return JSON.stringify({ habits, completions }, null, 2);
  },

  async importData(jsonString) {
    const data = JSON.parse(jsonString);
    await db.transaction('rw', db.habits, db.completions, async () => {
      await db.habits.clear();
      await db.completions.clear();
      if (data.habits) await db.habits.bulkPut(data.habits);
      if (data.completions) await db.completions.bulkPut(data.completions);
    });
  }
};

export default habitRepo;
