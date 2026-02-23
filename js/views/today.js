/**
 * Today View - Daily habit checklist with FAB, grouping by time-of-day,
 * multi-completion support, and inline edit/delete
 */

import habitRepo from '../repo/habitRepo.js';
import { todayString, isHabitDueToday, isWeeklyHabit, getWeeklyCompletionCount } from '../utils/dates.js';
import { showHabitForm } from './habitForm.js';
import { burstConfetti } from '../utils/confetti.js';
import { escapeHtml } from '../utils/sanitize.js';
import { playPling } from '../utils/sounds.js';
import { renderWeeklyFocus } from './weeklyFocus.js';
import { createFAB } from '../components/fab.js';

/** Time-of-day categories in display order */
const TIME_CATEGORIES = [
  { key: 'morning', label: 'Morgens', icon: '🌅' },
  { key: 'midday', label: 'Mittag', icon: '☀️' },
  { key: 'afternoon', label: 'Abends', icon: '🌆' },
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
    <div class="header-row"><h1 class="today-title">Heute</h1></div>
    <p class="today-date">${dayName}, ${dateStr}</p>
  `;
  container.appendChild(header);

  // Weekly Focus section
  await renderWeeklyFocus(container, () => rerender(container));

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
  const pct = dueToday.length ? (fullyCompleted / dueToday.length * 100) : 0;
  const circumference = 2 * Math.PI * 22; // r=22
  const offset = circumference - (pct / 100) * circumference;
  const progress = document.createElement('div');
  progress.className = 'today-progress';
  progress.innerHTML = `
    <div class="progress-ring-wrap">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <defs><linearGradient id="progress-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8B5CF6"/>
          <stop offset="100%" stop-color="#F472B6"/>
        </linearGradient></defs>
        <circle class="progress-ring-bg-circle" cx="26" cy="26" r="22" fill="none" stroke="#EDE9F3" stroke-width="5"/>
        <circle class="progress-ring-fill-circle" cx="26" cy="26" r="22" fill="none" stroke="url(#progress-grad)" stroke-width="5"
          stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
          style="transform:rotate(-90deg);transform-origin:center;transition:stroke-dashoffset 0.6s ease"/>
      </svg>
      <span class="progress-ring-label">${fullyCompleted}</span>
    </div>
    <div class="progress-info">
      <span class="progress-title">${fullyCompleted === dueToday.length ? 'Alle erledigt! 🎉' : `${fullyCompleted} von ${dueToday.length}`}</span>
      <span class="progress-sub">Gewohnheiten heute</span>
    </div>
  `;
  container.appendChild(progress);

  // Debug: Mega confetti test button (only in debug mode)
  if (localStorage.getItem('debug') !== '0') {
    const confettiTest = document.createElement('button');
    confettiTest.textContent = '🎊 Mega Konfetti!';
    confettiTest.style.cssText = 'display:block;margin:8px auto;padding:8px 16px;border-radius:8px;border:2px dashed #8B5CF6;background:#FFF8F0;color:#8B5CF6;font-size:14px;font-weight:600;cursor:pointer;';
    confettiTest.addEventListener('click', () => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      burstConfetti(cx, cy, 'mega');
    });
    container.appendChild(confettiTest);
  }

  // Batch-load all streaks in 2 DB calls instead of N
  const allStreaks = await habitRepo.getAllStreaks();

  // Batch-load all completions for weekly habits
  const allHabitCompletions = {};
  const weeklyHabits = dueToday.filter(h => isWeeklyHabit(h));
  if (weeklyHabits.length > 0) {
    const allComps = await habitRepo.getAllCompletions();
    for (const c of allComps) {
      if (!allHabitCompletions[c.habitId]) allHabitCompletions[c.habitId] = [];
      allHabitCompletions[c.habitId].push(c);
    }
  }

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
      const streak = allStreaks[habit.id] || 0;
      let weeklyInfo = null;
      if (isWeeklyHabit(habit)) {
        const hComps = allHabitCompletions[habit.id] || [];
        const weeklyCount = getWeeklyCompletionCount(hComps.map(c => c.date));
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
  createFAB({
    container,
    label: 'Neue Gewohnheit erstellen',
    onClick: async () => {
      await showHabitForm(null, () => rerender(container));
    },
  });
}

/**
 * Re-render the today view
 */
async function rerender(container) {
  document.querySelector('.fab')?.remove();
  container.innerHTML = '';
  await renderToday(container);
}

/**
 * Handle habit toggle: increment/reset completion, visual feedback, sounds, confetti
 */
async function handleHabitToggle(habit, card, mainContainer) {
  const target = habit.targetPerDay || 1;
  const isMulti = target > 1;

  const result = await habitRepo.incrementCompletion(habit.id);

  // Confetti + sound on completion
  if (result.count > 0) {
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    burstConfetti(cx, cy, result.completed ? 'big' : 'small');
    playPling(result.completed ? 'big' : 'small');

    // Check if ALL habits for today are now completed → MEGA burst!
    if (result.completed) {
      const _today = todayString();
      const _allHabits = (await habitRepo.getAll()).filter(h => isHabitDueToday(h, _today));
      const _comps = await habitRepo.getCompletionsForDate(_today);
      const _counts = {};
      for (const c of _comps) _counts[c.habitId] = (_counts[c.habitId] || 0) + 1;
      const allDone = _allHabits.every(h => (_counts[h.id] || 0) >= (h.targetPerDay || 1));
      if (allDone && _allHabits.length > 1) {
        setTimeout(() => { burstConfetti(window.innerWidth / 2, window.innerHeight / 2, 'mega'); playPling('mega'); }, 400);
      }
    }
  }

  // Visual feedback on card
  if (result.completed && result.count > 0) {
    card.classList.add('completed', 'just-completed');
    setTimeout(() => card.classList.remove('just-completed'), 600);
  } else if (result.count === 0) {
    card.classList.remove('completed');
  }

  // Update multi-progress label
  const multiLabel = card.querySelector('.habit-multi-progress');
  if (multiLabel) multiLabel.textContent = `${result.count} / ${result.target}`;

  // Update progress ring or check mark
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

  // Update streak display
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
        ${''}<!-- weeklyInfo ausgeblendet zum Testen -->
      </div>
    </div>
    <div class="habit-card-right">
      ${streak > 0 ? `<span class="habit-streak">🔥 ${streak}</span>` : ''}
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

  // Long-press to edit
  let pressTimer = null;
  let didLongPress = false;

  card.addEventListener('touchstart', (e) => {
    didLongPress = false;
    pressTimer = setTimeout(async () => {
      didLongPress = true;
      if (navigator.vibrate) navigator.vibrate(30);
      await showHabitForm(habit.id, () => rerender(mainContainer));
    }, 500);
  }, { passive: true });

  card.addEventListener('touchend', () => {
    clearTimeout(pressTimer);
  });

  card.addEventListener('touchmove', () => {
    clearTimeout(pressTimer);
  });

  // Tap to increment/toggle
  card.addEventListener('click', async (e) => {
    if (didLongPress) return;
    await handleHabitToggle(habit, card, mainContainer);
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

  const circumference = 2 * Math.PI * 22;
  const pct = dueToday.length ? (fullyCompleted / dueToday.length * 100) : 0;
  const offset = circumference - (pct / 100) * circumference;
  const ringFill = container.querySelector('.progress-ring-fill-circle');
  const ringLabel = container.querySelector('.progress-ring-label');
  const titleEl = container.querySelector('.progress-title');
  if (ringFill) ringFill.style.strokeDashoffset = offset;
  if (ringLabel) ringLabel.textContent = fullyCompleted;
  if (titleEl) titleEl.textContent = fullyCompleted === dueToday.length ? 'Alle erledigt! 🎉' : `${fullyCompleted} von ${dueToday.length}`;
}
