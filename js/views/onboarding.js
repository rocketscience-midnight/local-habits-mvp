/**
 * Onboarding screen – shown on first app launch
 */
import habitRepo from '../repo/habitRepo.js';
import gardenRepo from '../repo/gardenRepo.js';
import taskRepo from '../repo/taskRepo.js';

const ONBOARDING_KEY = 'onboarding-done';

export function isOnboardingDone() {
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export async function showOnboarding() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-card">
        <div class="onboarding-emoji">🌱</div>
        <h1 class="onboarding-title">Willkommen!</h1>
        <p class="onboarding-text">
          Schön, dass du da bist! 💜
        </p>
        <p class="onboarding-text">
          Hier kannst du deine <strong>Gewohnheiten</strong> tracken –
          und für jede Woche, in der du dranbleibst, 
          wächst eine neue <strong>Pflanze</strong> in deinem Garten. 🌸
        </p>
        <p class="onboarding-text">
          Wir haben dir schon zwei Gewohnheiten und zwei Aufgaben 
          angelegt, damit du direkt loslegen kannst. 
          Natürlich kannst du alles anpassen oder Neues hinzufügen.
        </p>
        <p class="onboarding-text">
          Im Garten wartet eine kleine Orchidee auf dich – 
          platziere sie als Erstes! 🌿
        </p>
        <button class="btn btn-primary onboarding-start" id="onboarding-go">Los geht's! 🚀</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('visible'));

    overlay.querySelector('#onboarding-go').addEventListener('click', async () => {
      // Add starter habits first (need their IDs for plants)
      const waterHabit = await habitRepo.save({
        name: 'Wasser trinken',
        emoji: '💧',
        frequency: 'daily',
        targetPerDay: 6,
        timeOfDay: 'anytime',
      });
      const showerHabit = await habitRepo.save({
        name: 'Kalt duschen',
        emoji: '🚿',
        frequency: { type: 'weekly', timesPerWeek: 5 },
        targetPerDay: 1,
        timeOfDay: 'morning',
      });

      // Add 3 starter plants assigned to the habits
      const starterPlants = [
        {
          plantType: 'daisy',
          rarity: 'common', 
          growthStage: 2,
          totalGrowth: 2,
          maxGrowth: 5,
          habit: waterHabit,
          stage: 'Keimling'
        },
        {
          plantType: 'bush',
          rarity: 'uncommon',
          growthStage: 3,
          totalGrowth: 3, 
          maxGrowth: 4,
          habit: showerHabit,
          stage: 'Jungpflanze'
        },
        {
          plantType: 'sunflower',
          rarity: 'rare',
          growthStage: 4,
          totalGrowth: 6,
          maxGrowth: 7, 
          habit: waterHabit, // 2 Pflanzen für Wasser trinken
          stage: 'Ausgewachsen'
        }
      ];

      for (const plant of starterPlants) {
        await gardenRepo.addGardenPlant({
          plantType: plant.plantType,
          rarity: plant.rarity,
          growthStage: plant.growthStage,
          totalGrowth: plant.totalGrowth,
          maxGrowth: plant.maxGrowth,
          habitId: plant.habit.id,
          habitName: plant.habit.name,
          weekEarned: 'welcome',
          placed: 0,
          gridCol: null,
          gridRow: null,
          plantedDate: null,
          isAdopted: false,
          originalHabitName: null,
          adoptedDate: null
        });
      }

      // Add starter tasks
      await taskRepo.saveTask({
        name: 'Staubsaugen',
        emoji: '🧹',
        frequency: 'weekly',
        difficulty: 'medium',
      });
      await taskRepo.saveTask({
        name: 'Die erste Pflanze in den Garten pflanzen',
        emoji: '🌱',
        frequency: 'weekly',
        difficulty: 'medium',
      });

      localStorage.setItem(ONBOARDING_KEY, '1');
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 300);
      resolve();
    });
  });
}
