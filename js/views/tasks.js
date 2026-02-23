/**
 * Tasks View - Recurring household todos grouped by difficulty.
 * Uses targeted DOM updates: completing/uncompleting a task moves the card
 * between groups instead of re-rendering the entire view.
 * Full re-render only happens on create/edit/delete (via showTaskForm).
 */

import taskRepo from '../repo/taskRepo.js';
import { getCurrentPeriod, isTaskOverdue, getOverdueDays } from '../utils/dates.js';
import { showTaskForm } from './taskForm.js';
import { escapeHtml } from '../utils/sanitize.js';
import { awardDeco } from '../utils/decoRewards.js';
import { playPling } from '../utils/sounds.js';
import { burstConfetti } from '../utils/confetti.js';
import { createFAB } from '../components/fab.js';

const FREQUENCY_GROUPS = [
  { key: 'once', label: 'Einmalig' },
  { key: 'weekly', label: 'Wöchentlich' },
  { key: 'bimonthly', label: '2× im Monat' },
  { key: 'monthly', label: 'Monatlich' },
  { key: 'quarterly', label: 'Quartalsweise' },
];

const DIFFICULTY_GROUPS = [
  { key: 'hard', label: '🔴 Schwer' },
  { key: 'medium', label: '🟡 Mittel' },
  { key: 'easy', label: '🟢 Leicht' },
];

const DIFFICULTY_DOT = { easy: '🟢', medium: '🟡', hard: '🔴' };

export async function renderTasks(container) {
  const tasks = await taskRepo.getAllTasks();

  // Header
  const header = document.createElement('div');
  header.className = 'today-header';
  header.innerHTML = `<div class="header-row"><h1 class="today-title">Aufgaben</h1></div>`;
  container.appendChild(header);

  // Load completions for all relevant periods
  const periods = {};
  const allCompletions = {};
  for (const fg of FREQUENCY_GROUPS) {
    periods[fg.key] = getCurrentPeriod(fg.key);
    const comps = await taskRepo.getTaskCompletions(periods[fg.key]);
    for (const c of comps) {
      if (!allCompletions[c.taskId]) allCompletions[c.taskId] = [];
      allCompletions[c.taskId].push(c);
    }
  }

  if (tasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-emoji">🔨</div>
      <p>Keine Aufgaben vorhanden!</p>
      <p class="empty-hint">Tippe auf + um eine neue Aufgabe zu erstellen</p>
    `;
    container.appendChild(empty);
    addTaskFAB(container);
    return;
  }

  // Split tasks into open and completed
  const openTasks = [];
  const completedTasks = [];

  for (const task of tasks) {
    const comps = allCompletions[task.id] || [];
    const period = periods[task.frequency] || 'once';
    const isCompleted = comps.some(c => c.period === period);
    // Hide completed once-tasks entirely
    if (task.frequency === 'once' && comps.some(c => c.period === 'once')) continue;

    if (isCompleted) {
      completedTasks.push(task);
    } else {
      openTasks.push(task);
    }
  }

  // Render open tasks grouped by difficulty
  for (const dg of DIFFICULTY_GROUPS) {
    const groupTasks = openTasks.filter(t => (t.difficulty || 'easy') === dg.key);
    if (groupTasks.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'task-section';
    section.dataset.group = dg.key;
    section.innerHTML = `<div class="task-section-header">${dg.label}</div>`;
    const list = document.createElement('div');
    list.className = 'task-list';
    for (const task of groupTasks) {
      list.appendChild(createTaskCard(task, allCompletions[task.id] || [], periods[task.frequency] || 'once', container));
    }
    section.appendChild(list);
    container.appendChild(section);
  }

  // Render completed tasks in own category
  if (completedTasks.length > 0) {
    const section = document.createElement('div');
    section.className = 'task-section';
    section.dataset.group = 'completed';
    section.innerHTML = `<div class="task-section-header">✅ Erledigt</div>`;
    const list = document.createElement('div');
    list.className = 'task-list';
    for (const task of completedTasks) {
      list.appendChild(createTaskCard(task, allCompletions[task.id] || [], periods[task.frequency] || 'once', container));
    }
    section.appendChild(list);
    container.appendChild(section);
  }

  addTaskFAB(container);
}

function createTaskCard(task, completions, period, mainContainer) {
  const maxCompletions = task.frequency === 'bimonthly' ? 2 : 1;
  const completionCount = completions.filter(c => c.period === period).length;
  const isCompleted = completionCount >= maxCompletions;
  const isOverdue = !isCompleted && task.frequency !== 'once' && isTaskOverdue(task, completions);

  const card = document.createElement('div');
  card.className = `task-card ${isCompleted ? 'completed' : ''}`;
  card.dataset.taskId = task.id;
  card.dataset.difficulty = task.difficulty || 'easy';

  const overdueHint = isOverdue ? `<span class="task-overdue-hint">Offen seit ${getOverdueDays(task)} Tagen</span>` : '';

  card.innerHTML = `
    <div class="task-card-left">
      <span class="task-emoji">${escapeHtml(task.emoji) || '📋'}</span>
      <div class="task-card-info">
        <span class="task-name">${escapeHtml(task.name)}</span>
        ${task.frequency === 'bimonthly' ? `<span class="task-progress-label">${completionCount}/2 diesen Monat</span>` : ''}
        ${overdueHint}
      </div>
    </div>
    <div class="task-card-right">
      <span class="task-check ${isCompleted ? 'checked' : ''}">${isCompleted ? '✓' : ''}</span>
    </div>
  `;

  let isProcessing = false; // prevents double-click race conditions
  let didLongPress = false; // prevents click from firing after long-press edit

  card.addEventListener('click', async (e) => {
    if (isProcessing || didLongPress) return;
    isProcessing = true;
    try {
    const currentlyCompleted = card.classList.contains('completed');

    if (currentlyCompleted) {
      await taskRepo.uncompleteTask(task.id, period);
      // Targeted: move card back to difficulty group
      card.classList.remove('completed');
      const check = card.querySelector('.task-check');
      if (check) { check.classList.remove('checked'); check.textContent = ''; }
      // Restore overdue hint if applicable
      const updatedComps = await taskRepo.getTaskCompletions(period);
      const nowOverdue = task.frequency !== 'once' && isTaskOverdue(task, updatedComps);
      const infoEl = card.querySelector('.task-card-info');
      const existingHint = card.querySelector('.task-overdue-hint');
      if (nowOverdue && !existingHint && infoEl) {
        const hint = document.createElement('span');
        hint.className = 'task-overdue-hint';
        hint.textContent = `Offen seit ${getOverdueDays(task)} Tagen`;
        infoEl.appendChild(hint);
      }
      requestAnimationFrame(() => {
        moveCardToGroup(card, task.difficulty || 'easy', mainContainer);
      });
    } else {
      await taskRepo.completeTask(task.id, period);
      // Instant visual feedback
      const check = card.querySelector('.task-check');
      if (check) { check.classList.add('checked'); check.textContent = '✓'; }
      card.classList.add('completed');
      // Remove overdue hint
      const hint = card.querySelector('.task-overdue-hint');
      if (hint) hint.remove();

      playPling(task.difficulty === 'hard' ? 'big' : 'small');
      const deco = await awardDeco(task);
      if (deco) {
        showDecoReward(card, deco);
        setTimeout(() => {
          if (task.frequency === 'once') {
            fadeOutAndRemove(card, mainContainer);
          } else {
            requestAnimationFrame(() => {
              moveCardToGroup(card, 'completed', mainContainer);
            });
          }
        }, 3800);
      } else {
        const rect = card.getBoundingClientRect();
        burstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 'small');
        setTimeout(() => {
          if (task.frequency === 'once') {
            fadeOutAndRemove(card, mainContainer);
          } else {
            requestAnimationFrame(() => {
              moveCardToGroup(card, 'completed', mainContainer);
            });
          }
        }, 1200);
      }
    }
    } finally {
      isProcessing = false;
    }
  });

  // Long press to edit
  let pressTimer;
  card.addEventListener('pointerdown', () => {
    didLongPress = false;
    pressTimer = setTimeout(() => {
      didLongPress = true;
      showTaskForm(task.id, () => rerender(mainContainer));
    }, 500);
  });
  card.addEventListener('pointerup', () => {
    clearTimeout(pressTimer);
    if (didLongPress) setTimeout(() => { didLongPress = false; }, 100);
  });
  card.addEventListener('pointerleave', () => clearTimeout(pressTimer));

  return card;
}

/**
 * Move a task card to a different group section (difficulty or 'completed').
 * Creates the target section if it doesn't exist. Removes empty source sections.
 */
function moveCardToGroup(card, targetGroupKey, mainContainer) {
  const sourceList = card.parentElement;
  const sourceSection = sourceList?.parentElement;

  // Find or create target section
  let targetSection = mainContainer.querySelector(`.task-section[data-group="${targetGroupKey}"]`);
  if (!targetSection) {
    targetSection = document.createElement('div');
    targetSection.className = 'task-section';
    targetSection.dataset.group = targetGroupKey;
    const groupDef = targetGroupKey === 'completed'
      ? { label: '✅ Erledigt' }
      : DIFFICULTY_GROUPS.find(g => g.key === targetGroupKey);
    targetSection.innerHTML = `<div class="task-section-header">${groupDef?.label || targetGroupKey}</div>`;
    const list = document.createElement('div');
    list.className = 'task-list';
    targetSection.appendChild(list);

    // Insert in correct order
    const groupOrder = [...DIFFICULTY_GROUPS.map(g => g.key), 'completed'];
    const targetIdx = groupOrder.indexOf(targetGroupKey);
    let inserted = false;
    const allSections = mainContainer.querySelectorAll('.task-section[data-group]');
    for (const sec of allSections) {
      const secIdx = groupOrder.indexOf(sec.dataset.group);
      if (secIdx > targetIdx) {
        mainContainer.insertBefore(targetSection, sec);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      // Insert before FAB
      const fab = mainContainer.querySelector('.fab');
      if (fab) {
        mainContainer.insertBefore(targetSection, fab);
      } else {
        mainContainer.appendChild(targetSection);
      }
    }
  }

  const targetList = targetSection.querySelector('.task-list');
  targetList.appendChild(card);

  // Remove empty source section
  if (sourceSection && sourceList && sourceList.children.length === 0) {
    sourceSection.remove();
  }
}

/**
 * Fade out a card and remove it (for completed once-tasks)
 */
function fadeOutAndRemove(card, mainContainer) {
  card.style.transition = 'opacity 0.3s ease, max-height 0.3s ease';
  card.style.opacity = '0';
  card.style.maxHeight = card.offsetHeight + 'px';
  card.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    card.style.maxHeight = '0';
    card.style.marginBottom = '0';
    card.style.paddingTop = '0';
    card.style.paddingBottom = '0';
  });
  setTimeout(() => {
    const sourceList = card.parentElement;
    const sourceSection = sourceList?.parentElement;
    card.remove();
    if (sourceSection && sourceList && sourceList.children.length === 0) {
      sourceSection.remove();
    }
  }, 350);
}

function addTaskFAB(container) {
  createFAB({
    container,
    label: 'Neue Aufgabe erstellen',
    onClick: () => showTaskForm(null, () => rerender(container)),
  });
}

function showDecoReward(card, deco) {
  const rect = card.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'deco-reward-anim';
  el.innerHTML = `
    <div class="deco-reward-emoji">${deco.emoji}</div>
    <div class="deco-reward-text">${deco.name}!</div>
  `;
  el.style.left = (rect.left + rect.width / 2) + 'px';
  el.style.top = (rect.top + rect.height / 2) + 'px';
  document.body.appendChild(el);
  // Double rAF to ensure the browser has painted before animating
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('animate'));
  });
  setTimeout(() => el.remove(), 3500);
}

async function rerender(container) {
  document.querySelector('.fab')?.remove();
  container.innerHTML = '';
  await renderTasks(container);
}
