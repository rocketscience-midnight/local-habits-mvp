/**
 * Habit Repository - Data access layer using Dexie.js (IndexedDB)
 * v5: garden plants as collectible rewards (collect & place model)
 */

import Dexie from 'https://unpkg.com/dexie/dist/dexie.mjs';
import { todayString, calculateStreak, calculateBestStreak } from '../utils/dates.js';

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

// v4: add plantType field (legacy, now unused)
db.version(4).stores({
  habits: 'id, name, order, createdAt',
  completions: 'id, habitId, date, [habitId+date]'
}).upgrade(tx => {
  return tx.table('habits').toCollection().modify(habit => {
    if (!habit.plantType) {
      const types = ['tulip', 'sunflower', 'bush', 'cherry', 'mushroom'];
      habit.plantType = types[Math.floor(Math.random() * types.length)];
    }
  });
});

// v5: add gardenPlants table, remove plantType from habits
db.version(5).stores({
  habits: 'id, name, order, createdAt',
  completions: 'id, habitId, date, [habitId+date]',
  gardenPlants: 'id, habitId, weekEarned, placed, [habitId+weekEarned]'
}).upgrade(tx => {
  // Remove plantType from habits (Dexie keeps extra props, just clean up)
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

function uuid() {
  return crypto.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

const habitRepo = {
  /** Direct access to gardenPlants table */
  gardenPlants: db.gardenPlants,

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
    // No more plantType assignment
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

  async getBestStreak(habitId) {
    const habit = await db.habits.get(habitId);
    if (!habit) return 0;
    const completions = await db.completions
      .where('habitId').equals(habitId).toArray();
    const dates = completions.map(c => c.date);
    return calculateBestStreak(dates, habit);
  },

  // === Garden Plant methods ===

  async getAllGardenPlants() {
    return db.gardenPlants.toArray();
  },

  async getUnplacedPlants() {
    return db.gardenPlants.where('placed').equals(0).toArray();
  },

  async getPlacedPlants() {
    return db.gardenPlants.where('placed').equals(1).toArray();
  },

  async addGardenPlant(plant) {
    plant.id = uuid();
    await db.gardenPlants.put(plant);
    return plant;
  },

  async placePlant(plantId, gridCol, gridRow) {
    await db.gardenPlants.update(plantId, {
      placed: 1,
      gridCol,
      gridRow
    });
  },

  async unplacePlant(plantId) {
    await db.gardenPlants.update(plantId, {
      placed: 0,
      gridCol: null,
      gridRow: null
    });
  },

  async getPlantByHabitAndWeek(habitId, weekEarned) {
    return db.gardenPlants.where({ habitId, weekEarned }).first();
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

  async exportData() {
    const habits = await db.habits.toArray();
    const completions = await db.completions.toArray();
    const gardenPlants = await db.gardenPlants.toArray();
    return JSON.stringify({ habits, completions, gardenPlants }, null, 2);
  },

  async importData(jsonString) {
    const data = JSON.parse(jsonString);
    await db.transaction('rw', db.habits, db.completions, db.gardenPlants, async () => {
      await db.habits.clear();
      await db.completions.clear();
      await db.gardenPlants.clear();
      if (data.habits) await db.habits.bulkPut(data.habits);
      if (data.completions) await db.completions.bulkPut(data.completions);
      if (data.gardenPlants) await db.gardenPlants.bulkPut(data.gardenPlants);
    });
  }
};

export default habitRepo;
