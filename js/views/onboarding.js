/**
 * Onboarding screen – shown on first app launch
 */
import habitRepo from '../repo/habitRepo.js';

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
          Hier kannst du deine <strong>Gewohnheiten</strong> tracken -
          und für jede Woche, in der du dranbleibst, 
          wächst eine neue <strong>Pflanze</strong> in deinem Garten. 🌸
        </p>
        <p class="onboarding-text">
          Starte mit dem <strong>+</strong> Button und leg deine erste Gewohnheit an.
        </p>
        <p class="onboarding-text">
          Wir haben dir auch schon eine kleine Orchidee ins Inventar gelegt -
          geh in den Garten und platziere sie! 🌿
        </p>
        <button class="btn btn-primary onboarding-start" id="onboarding-go">Los geht's! 🚀</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('visible'));

    overlay.querySelector('#onboarding-go').addEventListener('click', async () => {
      // Add starter orchid
      await habitRepo.addGardenPlant({
        plantType: 'orchid',
        rarity: 'uncommon',
        growthStage: 2,
        habitId: 'welcome-gift',
        habitName: 'Willkommensgeschenk',
        weekEarned: 'welcome',
        placed: 0,
        gridCol: null,
        gridRow: null,
      });

      localStorage.setItem(ONBOARDING_KEY, '1');
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 300);
      resolve();
    });
  });
}
