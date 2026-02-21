/**
 * Today View - Daily habit checklist with FAB, grouping by time-of-day,
 * multi-completion support, and inline edit/delete
 */

import habitRepo from '../repo/habitRepo.js';
import { todayString, isHabitDueToday } from '../utils/dates.js';
import { showHabitForm } from './habitForm.js';

/** Time-of-day categories in display order */
const TIME_CATEGORIES = [
  { key: 'morning', label: 'Vor der Arbeit', icon: '🌅' },
  { key: 'midday', label: 'Mittag', icon: '☀️' },
  { key: 'afternoon', label: 'Nach der Arbeit', icon: '🌆' },
  { key: 'evening', label: 'Vor dem Schlafen', icon: '🌙' },
  { key: 'anytime', label: 'Jederzeit', icon: '⏰' },
];

/**
 * Render the Today screen
 */
export async function renderToday(container) {
  const today = todayString();
  const habits = await habitRepo.getAll();
  const completions = await habitRepo.getCompletionsForDate(today);
  const dueToday = habits.filter(h => isHabitDueToday(h, today));

  // Count completions per habit
  const completionCounts = {};
  for (const c of completions) {
    completionCounts[c.habitId] = (completionCounts[c.habitId] || 0) + 1;
  }

  // Header
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
      <p class="empty-hint">Tippe auf + um eine neue Gewohnheit zu erstellen</p>
    `;
    container.appendChild(empty);
    addFAB(container);
    return;
  }

  // Progress bar (counts fully completed habits)
  const fullyCompleted = dueToday.filter(h => {
    const t = h.targetPerDay || 1;
    return (completionCounts[h.id] || 0) >= t;
  }).length;
  const progress = document.createElement('div');
  progress.className = 'today-progress';
  progress.innerHTML = `
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${dueToday.length ? (fullyCompleted / dueToday.length * 100) : 0}%"></div>
    </div>
    <span class="progress-text">${fullyCompleted} / ${dueToday.length}</span>
  `;
  container.appendChild(progress);

  // Group habits by timeOfDay
  const grouped = {};
  for (const h of dueToday) {
    const key = h.timeOfDay || 'anytime';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(h);
  }

  // Render each category that has habits
  for (const cat of TIME_CATEGORIES) {
    const habitsInCat = grouped[cat.key];
    if (!habitsInCat || habitsInCat.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'time-section';
    section.innerHTML = `<div class="time-section-header">${cat.icon} ${cat.label}</div>`;

    const list = document.createElement('div');
    list.className = 'habit-list';

    for (const habit of habitsInCat) {
      const count = completionCounts[habit.id] || 0;
      const target = habit.targetPerDay || 1;
      const streak = await habitRepo.getStreak(habit.id);
      const card = createHabitCard(habit, count, target, streak, container);
      list.appendChild(card);
    }
    section.appendChild(list);
    container.appendChild(section);
  }

  addFAB(container);
}

/**
 * Add floating action button for creating new habits
 */
function addFAB(container) {
  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.setAttribute('aria-label', 'Neue Gewohnheit erstellen');
  fab.textContent = '+';
  fab.addEventListener('click', async () => {
    await showHabitForm(null, () => rerender(container));
  });
  // Append to body so it's fixed positioned above nav
  document.body.appendChild(fab);

  // Clean up FAB when leaving the view
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container) || container.innerHTML === '') {
      fab.remove();
      observer.disconnect();
    }
  });
  observer.observe(container, { childList: true });
}

/**
 * Re-render the today view
 */
async function rerender(container) {
  // Remove existing FAB
  document.querySelector('.fab')?.remove();
  container.innerHTML = '';
  await renderToday(container);
}

/**
 * Create a single habit card with multi-completion and edit support
 */
function createHabitCard(habit, count, target, streak, mainContainer) {
  const isCompleted = count >= target;
  const isMulti = target > 1;

  const card = document.createElement('div');
  card.className = `habit-card ${isCompleted ? 'completed' : ''}`;

  card.innerHTML = `
    <div class="habit-card-left">
      <span class="habit-emoji">${habit.emoji || '✨'}</span>
      <div class="habit-card-info">
        <span class="habit-name">${habit.name}</span>
        ${isMulti ? `<span class="habit-multi-progress">${count} / ${target}</span>` : ''}
      </div>
    </div>
    <div class="habit-card-right">
      ${streak > 0 ? `<span class="habit-streak">🔥 ${streak}</span>` : ''}
      <button class="btn-icon habit-edit-btn" data-habit-id="${habit.id}" aria-label="Bearbeiten">✏️</button>
      ${isMulti
        ? `<div class="habit-progress-ring">
            <svg viewBox="0 0 36 36" class="progress-ring-svg">
              <circle class="progress-ring-bg" cx="18" cy="18" r="15.9" />
              <circle class="progress-ring-fill" cx="18" cy="18" r="15.9"
                style="stroke-dashoffset: ${100 - (Math.min(count / target, 1) * 100)}" />
            </svg>
            <span class="progress-ring-text">${count >= target ? '✓' : count}</span>
          </div>`
        : `<span class="habit-check ${isCompleted ? 'checked' : ''}">${isCompleted ? '✓' : ''}</span>`
      }
    </div>
  `;

  // Tap to increment/toggle
  const tapArea = card;
  tapArea.addEventListener('click', async (e) => {
    // Don't trigger on edit button click
    if (e.target.closest('.habit-edit-btn')) return;

    const result = await habitRepo.incrementCompletion(habit.id);

    if (result.completed && result.count > 0) {
      card.classList.add('completed', 'just-completed');
      setTimeout(() => card.classList.remove('just-completed'), 600);
    } else if (result.count === 0) {
      card.classList.remove('completed');
    }

    // Update card display
    const multiLabel = card.querySelector('.habit-multi-progress');
    if (multiLabel) multiLabel.textContent = `${result.count} / ${result.target}`;

    if (isMulti) {
      const ringFill = card.querySelector('.progress-ring-fill');
      const ringText = card.querySelector('.progress-ring-text');
      if (ringFill) {
        ringFill.style.strokeDashoffset = 100 - (Math.min(result.count / result.target, 1) * 100);
      }
      if (ringText) ringText.textContent = result.count >= result.target ? '✓' : result.count;
    } else {
      const check = card.querySelector('.habit-check');
      if (check) {
        check.classList.toggle('checked', result.completed);
        check.textContent = result.completed ? '✓' : '';
      }
    }

    // Update streak
    const newStreak = await habitRepo.getStreak(habit.id);
    const rightSide = card.querySelector('.habit-card-right');
    let streakEl = rightSide.querySelector('.habit-streak');
    if (newStreak > 0) {
      if (streakEl) {
        streakEl.textContent = `🔥 ${newStreak}`;
      } else {
        const s = document.createElement('span');
        s.className = 'habit-streak';
        s.textContent = `🔥 ${newStreak}`;
        rightSide.insertBefore(s, rightSide.firstChild);
      }
    } else if (streakEl) {
      streakEl.remove();
    }

    updateProgress(mainContainer);
  });

  // Edit button
  card.querySelector('.habit-edit-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    await showHabitForm(habit.id, () => rerender(mainContainer));
  });

  return card;
}

/**
 * Update the progress bar
 */
async function updateProgress(container) {
  const today = todayString();
  const habits = await habitRepo.getAll();
  const completions = await habitRepo.getCompletionsForDate(today);
  const dueToday = habits.filter(h => isHabitDueToday(h, today));

  const completionCounts = {};
  for (const c of completions) {
    completionCounts[c.habitId] = (completionCounts[c.habitId] || 0) + 1;
  }

  const fullyCompleted = dueToday.filter(h => {
    const t = h.targetPerDay || 1;
    return (completionCounts[h.id] || 0) >= t;
  }).length;

  const fill = container.querySelector('.progress-fill');
  const text = container.querySelector('.progress-text');
  if (fill && text) {
    fill.style.width = `${dueToday.length ? (fullyCompleted / dueToday.length * 100) : 0}%`;
    text.textContent = `${fullyCompleted} / ${dueToday.length}`;
  }
}
