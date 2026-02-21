/**
 * Today View - Daily habit checklist
 * Shows all habits due today with completion toggles and streaks
 */

import habitRepo from '../repo/habitRepo.js';
import { todayString, isHabitDueToday } from '../utils/dates.js';

/**
 * Render the Today screen
 */
export async function renderToday(container) {
  const today = todayString();
  const habits = await habitRepo.getAll();
  const completions = await habitRepo.getCompletionsForDate(today);
  const completedIds = new Set(completions.map(c => c.habitId));

  // Filter to habits due today
  const dueToday = habits.filter(h => isHabitDueToday(h, today));

  // Build header
  const header = document.createElement('div');
  header.className = 'today-header';
  const dateObj = new Date(today + 'T12:00:00');
  const dayName = dateObj.toLocaleDateString('de-DE', { weekday: 'long' });
  const dateStr = dateObj.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  header.innerHTML = `
    <h1 class="today-title">Heute</h1>
    <p class="today-date">${dayName}, ${dateStr}</p>
  `;
  container.appendChild(header);

  if (dueToday.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-emoji">🌿</div>
      <p>Keine Gewohnheiten für heute!</p>
      <p class="empty-hint">Erstelle deine erste Gewohnheit in den Einstellungen ⚙️</p>
    `;
    container.appendChild(empty);
    return;
  }

  // Progress indicator
  const completedCount = dueToday.filter(h => completedIds.has(h.id)).length;
  const progress = document.createElement('div');
  progress.className = 'today-progress';
  progress.innerHTML = `
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${dueToday.length ? (completedCount / dueToday.length * 100) : 0}%"></div>
    </div>
    <span class="progress-text">${completedCount} / ${dueToday.length}</span>
  `;
  container.appendChild(progress);

  // Habit cards list
  const list = document.createElement('div');
  list.className = 'habit-list';

  for (const habit of dueToday) {
    const isCompleted = completedIds.has(habit.id);
    const streak = await habitRepo.getStreak(habit.id);
    const card = createHabitCard(habit, isCompleted, streak, list, container);
    list.appendChild(card);
  }

  container.appendChild(list);
}

/**
 * Create a single habit card element
 */
function createHabitCard(habit, isCompleted, streak, list, mainContainer) {
  const card = document.createElement('button');
  card.className = `habit-card ${isCompleted ? 'completed' : ''}`;
  card.setAttribute('aria-label', `${habit.name} ${isCompleted ? 'erledigt' : 'offen'}`);

  card.innerHTML = `
    <div class="habit-card-left">
      <span class="habit-emoji">${habit.emoji || '✨'}</span>
      <span class="habit-name">${habit.name}</span>
    </div>
    <div class="habit-card-right">
      ${streak > 0 ? `<span class="habit-streak">🔥 ${streak}</span>` : ''}
      <span class="habit-check ${isCompleted ? 'checked' : ''}">
        ${isCompleted ? '✓' : ''}
      </span>
    </div>
  `;

  card.addEventListener('click', async () => {
    const result = await habitRepo.toggleCompletion(habit.id);

    if (result.completed) {
      card.classList.add('completed', 'just-completed');
      card.querySelector('.habit-check').classList.add('checked');
      card.querySelector('.habit-check').textContent = '✓';

      // Update streak display
      const newStreak = await habitRepo.getStreak(habit.id);
      const rightSide = card.querySelector('.habit-card-right');
      const streakEl = rightSide.querySelector('.habit-streak');
      if (newStreak > 0) {
        if (streakEl) {
          streakEl.textContent = `🔥 ${newStreak}`;
        } else {
          const s = document.createElement('span');
          s.className = 'habit-streak';
          s.textContent = `🔥 ${newStreak}`;
          rightSide.insertBefore(s, rightSide.firstChild);
        }
      }

      // Remove animation class after it plays
      setTimeout(() => card.classList.remove('just-completed'), 600);
    } else {
      card.classList.remove('completed', 'just-completed');
      card.querySelector('.habit-check').classList.remove('checked');
      card.querySelector('.habit-check').textContent = '';

      const newStreak = await habitRepo.getStreak(habit.id);
      const streakEl = card.querySelector('.habit-streak');
      if (streakEl) {
        if (newStreak > 0) {
          streakEl.textContent = `🔥 ${newStreak}`;
        } else {
          streakEl.remove();
        }
      }
    }

    // Update progress bar
    updateProgress(mainContainer);
  });

  return card;
}

/**
 * Update the progress bar after toggling
 */
async function updateProgress(container) {
  const today = todayString();
  const habits = await habitRepo.getAll();
  const completions = await habitRepo.getCompletionsForDate(today);
  const completedIds = new Set(completions.map(c => c.habitId));
  const dueToday = habits.filter(h => isHabitDueToday(h, today));
  const completedCount = dueToday.filter(h => completedIds.has(h.id)).length;

  const fill = container.querySelector('.progress-fill');
  const text = container.querySelector('.progress-text');
  if (fill && text) {
    fill.style.width = `${dueToday.length ? (completedCount / dueToday.length * 100) : 0}%`;
    text.textContent = `${completedCount} / ${dueToday.length}`;
  }
}
