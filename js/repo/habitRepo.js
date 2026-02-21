/**
 * Habit Repository - Data access layer using Dexie.js (IndexedDB)
 * Repository pattern allows swapping storage later (e.g. REST API)
 */

import Dexie from 'https://unpkg.com/dexie/dist/dexie.mjs';
import { todayString, calculateStreak, calculateBestStreak } from '../utils/dates.js';

// Initialize database
const db = new Dexie('LocalHabitsDB');

db.version(1).stores({
  habits: 'id, name, order, createdAt',
  completions: 'id, habitId, date, [habitId+date]'
});

/**
 * Generate a simple UUID
 */
function uuid() {
  return crypto.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

const habitRepo = {
  /**
   * Get all habits ordered by 'order' field
   */
  async getAll() {
    return db.habits.orderBy('order').toArray();
  },

  /**
   * Get a single habit by ID
   */
  async getById(id) {
    return db.habits.get(id);
  },

  /**
   * Save (create or update) a habit
   */
  async save(habit) {
    if (!habit.id) {
      habit.id = uuid();
      habit.createdAt = new Date().toISOString();
      // Set order to end of list
      const count = await db.habits.count();
      habit.order = count;
    }
    await db.habits.put(habit);
    return habit;
  },

  /**
   * Delete a habit and all its completions
   */
  async delete(id) {
    await db.completions.where('habitId').equals(id).delete();
    await db.habits.delete(id);
  },

  /**
   * Get all completions for a specific date
   */
  async getCompletionsForDate(date = todayString()) {
    return db.completions.where('date').equals(date).toArray();
  },

  /**
   * Toggle completion for a habit on a given date
   * Returns { completed: boolean }
   */
  async toggleCompletion(habitId, date = todayString()) {
    const existing = await db.completions
      .where({ habitId, date })
      .first();

    if (existing) {
      await db.completions.delete(existing.id);
      return { completed: false };
    } else {
      await db.completions.put({
        id: uuid(),
        habitId,
        date,
        completedAt: new Date().toISOString()
      });
      return { completed: true };
    }
  },

  /**
   * Get current streak for a habit
   */
  async getStreak(habitId) {
    const habit = await db.habits.get(habitId);
    if (!habit) return 0;
    const completions = await db.completions
      .where('habitId').equals(habitId)
      .toArray();
    const dates = completions.map(c => c.date);
    return calculateStreak(dates, habit);
  },

  /**
   * Get best (all-time) streak for a habit
   */
  async getBestStreak(habitId) {
    const habit = await db.habits.get(habitId);
    if (!habit) return 0;
    const completions = await db.completions
      .where('habitId').equals(habitId)
      .toArray();
    const dates = completions.map(c => c.date);
    return calculateBestStreak(dates, habit);
  },

  /**
   * Export all data as JSON
   */
  async exportData() {
    const habits = await db.habits.toArray();
    const completions = await db.completions.toArray();
    return JSON.stringify({ habits, completions }, null, 2);
  },

  /**
   * Import data from JSON string (replaces all data)
   */
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
