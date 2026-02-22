/**
 * Today View - Daily habit checklist with FAB, grouping by time-of-day,
 * multi-completion support, and inline edit/delete
 */

import habitRepo from '../repo/habitRepo.js';
import { todayString, isHabitDueToday, isWeeklyHabit, getWeeklyCompletionCount, getISOWeekKey } from '../utils/dates.js';
import { showHabitForm } from './habitForm.js';
import { burstConfetti } from '../utils/confetti.js';
import { escapeHtml } from '../utils/sanitize.js';
import { showHelp } from './help.js';

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
    <div class="header-row"><h1 class="today-title">Heute</h1><button class="help-btn" aria-label="Hilfe">❓</button></div>
    <p class="today-date">${dayName}, ${dateStr}</p>
  `;
  header.querySelector('.help-btn').addEventListener('click', showHelp);
  container.appendChild(header);

  // Weekly Focus section
  await renderWeeklyFocus(container);

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

  // Debug: Mega confetti test button
  const confettiTest = document.createElement('button');
  confettiTest.textContent = '🎊 Mega Konfetti!';
  confettiTest.style.cssText = 'display:block;margin:8px auto;padding:8px 16px;border-radius:8px;border:2px dashed #8B5CF6;background:#FFF8F0;color:#8B5CF6;font-size:14px;font-weight:600;cursor:pointer;';
  confettiTest.addEventListener('click', () => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    burstConfetti(cx, cy, 'mega');
  });
  container.appendChild(confettiTest);

  // Group habits by timeOfDay
  const grouped = {};
  for (const h of dueToday) {
    const key = h.timeOfDay || 'anytime';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(h);
  }

  // Render each category that has habits, with divider banners
  let lastRenderedKey = null;
  for (const cat of TIME_CATEGORIES) {
    const habitsInCat = grouped[cat.key];
    if (!habitsInCat || habitsInCat.length === 0) continue;

    // Insert banner between morning/midday and afternoon/evening sections
    if (lastRenderedKey && 
        ['morning', 'midday'].includes(lastRenderedKey) && 
        ['afternoon', 'evening'].includes(cat.key)) {
      const banner = document.createElement('div');
      banner.className = 'time-divider-banner';
      container.appendChild(banner);
    }
    lastRenderedKey = cat.key;

    const section = document.createElement('div');
    section.className = 'time-section';
    section.innerHTML = `<div class="time-section-header">${cat.icon} ${cat.label}</div>`;

    const list = document.createElement('div');
    list.className = 'habit-list';

    for (const habit of habitsInCat) {
      const count = completionCounts[habit.id] || 0;
      const target = habit.targetPerDay || 1;
      const streak = await habitRepo.getStreak(habit.id);
      let weeklyInfo = null;
      if (isWeeklyHabit(habit)) {
        const allCompletions = await habitRepo.getCompletionsForHabit(habit.id);
        const weeklyCount = getWeeklyCompletionCount(allCompletions.map(c => c.date));
        weeklyInfo = { count: weeklyCount, target: habit.frequency.timesPerWeek };
      }
      const card = createHabitCard(habit, count, target, streak, container, weeklyInfo);
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
function createHabitCard(habit, count, target, streak, mainContainer, weeklyInfo = null) {
  const isCompleted = count >= target;
  const isMulti = target > 1;

  const card = document.createElement('div');
  card.className = `habit-card ${isCompleted ? 'completed' : ''}`;

  card.innerHTML = `
    <div class="habit-card-left">
      <span class="habit-emoji">${escapeHtml(habit.emoji) || '✨'}</span>
      <div class="habit-card-info">
        <span class="habit-name">${escapeHtml(habit.name)}</span>
        ${isMulti ? `<span class="habit-multi-progress">${count} / ${target}</span>` : ''}
        ${weeklyInfo ? `<span class="habit-weekly-progress">${weeklyInfo.count}/${weeklyInfo.target} diese Woche</span>` : ''}
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

    // Confetti on completion
    if (result.count > 0) {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      burstConfetti(cx, cy, result.completed ? 'big' : 'small');

      // Check if ALL habits for today are now completed → MEGA burst!
      if (result.completed) {
        const _today = todayString();
        const _allHabits = (await habitRepo.getAll()).filter(h => isHabitDueToday(h, _today));
        const _comps = await habitRepo.getCompletionsForDate(_today);
        const _counts = {};
        for (const c of _comps) _counts[c.habitId] = (_counts[c.habitId] || 0) + 1;
        const allDone = _allHabits.every(h => (_counts[h.id] || 0) >= (h.targetPerDay || 1));
        if (allDone && _allHabits.length > 1) {
          setTimeout(() => burstConfetti(window.innerWidth / 2, window.innerHeight / 2, 'mega'), 400);
        }
      }
    }

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
 * Render the Wochenfokus card
 */
async function renderWeeklyFocus(container) {
  const weekKey = getISOWeekKey(todayString());
  const weekNum = weekKey.split('-W')[1];
  const focus = await habitRepo.getWeeklyFocus(weekKey);
  const text = focus?.text || '';

  const section = document.createElement('div');
  section.className = 'weekly-focus-card';
  section.innerHTML = `
    <span class="weekly-focus-week">KW ${parseInt(weekNum)}</span>
    <span class="weekly-focus-text">${text ? escapeHtml(text) : 'Tippe hier um deinen Wochenfokus zu setzen ✨'}</span>
  `;
  if (!text) section.classList.add('placeholder');

  section.addEventListener('click', () => showWeeklyFocusModal(weekKey, text, container));
  container.appendChild(section);
}

/**
 * Show modal to edit weekly focus
 */
function showWeeklyFocusModal(weekKey, currentText, mainContainer) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal weekly-focus-modal">
      <h3>Wochenfokus</h3>
      <textarea class="weekly-focus-input" rows="3" placeholder="Was ist dein Fokus diese Woche?">${currentText}</textarea>
      <div class="modal-actions">
        <button class="btn btn-secondary" data-action="cancel">Abbrechen</button>
        <button class="btn btn-primary" data-action="save">Speichern</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.weekly-focus-input');
  input.focus();

  overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => overlay.remove());
  overlay.querySelector('[data-action="save"]').addEventListener('click', async () => {
    await habitRepo.saveWeeklyFocus(weekKey, input.value.trim());
    overlay.remove();
    rerender(mainContainer);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
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
