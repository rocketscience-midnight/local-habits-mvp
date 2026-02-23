/**
 * Task Repository - Tasks + TaskCompletions data access
 */

import db, { uuid } from './db.js';

const taskRepo = {
  async getAllTasks() {
    return db.tasks.orderBy('order').toArray();
  },

  async saveTask(task) {
    if (!task.id) {
      task.id = uuid();
      task.createdAt = new Date().toISOString();
      const count = await db.tasks.count();
      task.order = count;
    }
    await db.tasks.put(task);
    return task;
  },

  async deleteTask(id) {
    await db.taskCompletions.where('taskId').equals(id).delete();
    await db.tasks.delete(id);
  },

  async getTaskCompletions(period) {
    return db.taskCompletions.where('period').equals(period).toArray();
  },

  async completeTask(taskId, period) {
    await db.taskCompletions.put({
      id: uuid(),
      taskId,
      period,
      completedAt: new Date().toISOString()
    });
  },

  async uncompleteTask(taskId, period) {
    const comps = await db.taskCompletions
      .where('taskId').equals(taskId)
      .filter(c => c.period === period)
      .toArray();
    if (comps.length > 0) {
      await db.taskCompletions.delete(comps[comps.length - 1].id);
    }
  },
};

export default taskRepo;
