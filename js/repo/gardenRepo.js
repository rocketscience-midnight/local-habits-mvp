/**
 * Garden Repository - Garden plants data access
 */

import db, { uuid } from './db.js';

const gardenRepo = {
  /** Direct access to gardenPlants table */
  gardenPlants: db.gardenPlants,

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
    const all = await db.gardenPlants.where('placed').equals(1).toArray();
    const occupied = all.some(p => p.gridCol === gridCol && p.gridRow === gridRow);
    if (occupied) return false;
    await db.gardenPlants.update(plantId, {
      placed: 1,
      gridCol,
      gridRow
    });
    return true;
  },

  async clearAllPlants() {
    await db.gardenPlants.clear();
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
};

export default gardenRepo;
