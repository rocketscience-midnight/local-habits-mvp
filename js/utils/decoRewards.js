/**
 * Decoration rewards for completing medium/hard tasks
 */
import habitRepo from '../repo/habitRepo.js';

const MEDIUM_DECOS = [
  { type: 'pond_small', name: 'Kleiner Teich', emoji: '🪷' },
  { type: 'lantern', name: 'Laterne', emoji: '🏮' },
  { type: 'bench', name: 'Bank', emoji: '🪑' },
  { type: 'birdhouse', name: 'Vogelhaus', emoji: '🐦' },
  { type: 'watering_can', name: 'Gießkanne', emoji: '🌊' },
  { type: 'mushroom_ring', name: 'Pilzkreis', emoji: '🍄' },
  { type: 'carrot', name: 'Möhre', emoji: '🥕' },
  { type: 'karotte', name: 'Karotte', emoji: '🥕' },
  { type: 'mohrruebe', name: 'Mohrrübe', emoji: '🥕' },
];

const HARD_DECOS = [
  { type: 'barn', name: 'Scheune', emoji: '🏚️' },
  { type: 'bicycle', name: 'Fahrrad', emoji: '🚲' },
  { type: 'fountain', name: 'Brunnen', emoji: '⛲' },
  { type: 'pavilion', name: 'Pavillon', emoji: '🏕️' },
  { type: 'windmill', name: 'Windmühle', emoji: '🎡' },
  { type: 'bridge', name: 'Brücke', emoji: '🌉' },
];

export const ALL_DECOS = [...MEDIUM_DECOS, ...HARD_DECOS];

export const DECO_NAMES = Object.fromEntries(ALL_DECOS.map(d => [d.type, d.name]));
export const DECO_EMOJIS = Object.fromEntries(ALL_DECOS.map(d => [d.type, d.emoji]));
export const DECO_DIFFICULTY = Object.fromEntries([
  ...MEDIUM_DECOS.map(d => [d.type, 'medium']),
  ...HARD_DECOS.map(d => [d.type, 'hard']),
]);

/**
 * Award a random decoration for completing a medium/hard task.
 * Returns the deco object or null if task difficulty is 'easy'.
 */
export async function awardDeco(task) {
  if (task.difficulty === 'easy') return null;

  const pool = task.difficulty === 'hard' ? HARD_DECOS : MEDIUM_DECOS;
  const deco = pool[Math.floor(Math.random() * pool.length)];

  const plant = {
    plantType: deco.type,
    rarity: task.difficulty === 'hard' ? 'epic' : 'uncommon',
    growthStage: 1,
    itemType: 'deco',
    habitId: 'task-' + task.id,
    habitName: task.name,
    weekEarned: new Date().toISOString().slice(0, 10),
    placed: 0,
    gridCol: null,
    gridRow: null,
  };

  await habitRepo.addGardenPlant(plant);
  return deco;
}
