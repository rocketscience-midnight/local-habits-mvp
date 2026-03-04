/**
 * Garden Repository - Garden plants data access
 */

import db, { uuid } from './db.js';
import { STARTER_DECOS } from '../utils/decoRewards.js';

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
      gridRow,
      plantedDate: new Date().toISOString()
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

  /**
   * Move a placed plant to a new grid position.
   * Returns false if the target position is occupied by another plant.
   */
  async movePlant(plantId, newCol, newRow) {
    const all = await db.gardenPlants.where('placed').equals(1).toArray();
    const occupied = all.some(p => p.id !== plantId && p.gridCol === newCol && p.gridRow === newRow);
    if (occupied) return false;
    await db.gardenPlants.update(plantId, {
      placed: 1,
      gridCol: newCol,
      gridRow: newRow,
    });
    return true;
  },

  /**
   * One-time seed: ensure every user has the starter decos (compost heap etc.)
   * Safe to call on every app start – creates missing ones only.
   */
  async seedStarterDecos() {
    const existing = await db.gardenPlants.toArray();
    for (const starter of STARTER_DECOS) {
      const alreadyHas = existing.some(p => p.itemType === 'deco' && p.plantType === starter.type && p.habitId === 'starter');
      if (!alreadyHas) {
        await this.addGardenPlant({
          plantType: starter.type,
          rarity: 'common',
          growthStage: 1,
          itemType: 'deco',
          habitId: 'starter',
          habitName: starter.name,
          weekEarned: new Date().toISOString().slice(0, 10),
          placed: 0,
          gridCol: null,
          gridRow: null,
        });
      }
    }
  },
};

export default gardenRepo;
