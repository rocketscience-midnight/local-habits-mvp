/**
 * Habit Repository - Habits, Completions, Weekly Focus, and data export/import
 */

import db, { uuid } from './db.js';
import { todayString, calculateStreak, calculateBestStreak } from '../utils/dates.js';

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

  async incrementCompletion(habitId, date = todayString()) {
    const habit = await db.habits.get(habitId);
    const target = habit?.targetPerDay || 1;
    const existing = await db.completions
      .where({ habitId, date })
      .toArray();

    if (existing.length >= target) {
      for (const c of existing) {
        await db.completions.delete(c.id);
      }
      return { count: 0, target, completed: false };
    }

    await db.completions.put({
      id: uuid(),
      habitId,
      date,
      completedAt: new Date().toISOString()
    });

    const newCount = existing.length + 1;
    return { count: newCount, target, completed: newCount >= target };
  },

  async getCompletionCount(habitId, date = todayString()) {
    return db.completions.where({ habitId, date }).count();
  },

  async getCompletionsForHabit(habitId) {
    return db.completions.where('habitId').equals(habitId).toArray();
  },

  async getAllCompletions() {
    return db.completions.toArray();
  },

  async getStreak(habitId) {
    const habit = await db.habits.get(habitId);
    if (!habit) return 0;
    const completions = await db.completions
      .where('habitId').equals(habitId).toArray();
    const dates = completions.map(c => c.date);
    return calculateStreak(dates, habit);
  },

  /**
   * Batch-load all streaks in 2 DB calls (habits + completions).
   * Returns { habitId: streakCount, ... }
   */
  async getAllStreaks() {
    const habits = await db.habits.toArray();
    const completions = await db.completions.toArray();
    const byHabit = {};
    for (const c of completions) {
      if (!byHabit[c.habitId]) byHabit[c.habitId] = [];
      byHabit[c.habitId].push(c.date);
    }
    const streaks = {};
    for (const habit of habits) {
      streaks[habit.id] = calculateStreak(byHabit[habit.id] || [], habit);
    }
    return streaks;
  },

  async getBestStreak(habitId) {
    const habit = await db.habits.get(habitId);
    if (!habit) return 0;
    const completions = await db.completions
      .where('habitId').equals(habitId).toArray();
    const dates = completions.map(c => c.date);
    return calculateBestStreak(dates, habit);
  },

  // === Weekly Focus methods ===

  async getWeeklyFocus(weekKey) {
    return db.weeklyFocus.where('weekKey').equals(weekKey).first();
  },

  async saveWeeklyFocus(weekKey, text) {
    const existing = await db.weeklyFocus.where('weekKey').equals(weekKey).first();
    if (existing) {
      await db.weeklyFocus.update(existing.id, { text });
    } else {
      await db.weeklyFocus.put({ id: uuid(), weekKey, text });
    }
  },

  async getAllWeeklyFocus() {
    return db.weeklyFocus.toArray();
  },

  // === Export / Import (all tables!) ===

  async exportData() {
    const habits = await db.habits.toArray();
    const completions = await db.completions.toArray();
    const gardenPlants = await db.gardenPlants.toArray();
    const weeklyFocus = await db.weeklyFocus.toArray();
    const tasks = await db.tasks.toArray();
    const taskCompletions = await db.taskCompletions.toArray();
    return JSON.stringify({ habits, completions, gardenPlants, weeklyFocus, tasks, taskCompletions }, null, 2);
  },

  async importData(jsonString) {
    const data = JSON.parse(jsonString);
    await db.transaction('rw', db.habits, db.completions, db.gardenPlants, db.weeklyFocus, db.tasks, db.taskCompletions, async () => {
      await db.habits.clear();
      await db.completions.clear();
      await db.gardenPlants.clear();
      await db.weeklyFocus.clear();
      await db.tasks.clear();
      await db.taskCompletions.clear();
      if (data.habits) await db.habits.bulkPut(data.habits);
      if (data.completions) await db.completions.bulkPut(data.completions);
      if (data.gardenPlants) await db.gardenPlants.bulkPut(data.gardenPlants);
      if (data.weeklyFocus) await db.weeklyFocus.bulkPut(data.weeklyFocus);
      if (data.tasks) await db.tasks.bulkPut(data.tasks);
      if (data.taskCompletions) await db.taskCompletions.bulkPut(data.taskCompletions);
    });
  }
};

export default habitRepo;
