/**
 * Tasks View - Recurring household todos grouped by frequency
 */

import habitRepo from '../repo/habitRepo.js';
import { getCurrentPeriod, isTaskOverdue, getOverdueDays } from '../utils/dates.js';
import { showTaskForm } from './taskForm.js';
import { escapeHtml } from '../utils/sanitize.js';
import { showHelp } from './help.js';
import { awardDeco } from '../utils/decoRewards.js';
import { playPling } from '../utils/sounds.js';
import { burstConfetti } from '../utils/confetti.js';

const FREQUENCY_GROUPS = [
  { key: 'once', label: 'Einmalig' },
  { key: 'weekly', label: 'Wöchentlich' },
  { key: 'bimonthly', label: '2× im Monat' },
  { key: 'monthly', label: 'Monatlich' },
  { key: 'quarterly', label: 'Quartalsweise' },
];

const DIFFICULTY_DOT = { easy: '🟢', medium: '🟡', hard: '🔴' };

export async function renderTasks(container) {
  const tasks = await habitRepo.getAllTasks();

  // Header
  const header = document.createElement('div');
  header.className = 'today-header';
  header.innerHTML = `<div class="header-row"><h1 class="today-title">Aufgaben</h1><button class="help-btn" aria-label="Hilfe">❓</button></div>`;
  header.querySelector('.help-btn').addEventListener('click', showHelp);
  container.appendChild(header);

  // Load completions for all relevant periods
  const periods = {};
  const allCompletions = {};
  for (const fg of FREQUENCY_GROUPS) {
    periods[fg.key] = getCurrentPeriod(fg.key);
    const comps = await habitRepo.getTaskCompletions(periods[fg.key]);
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

  // Filter out completed once-tasks
  const visibleTasks = tasks.filter(t => {
    if (t.frequency !== 'once') return true;
    const comps = allCompletions[t.id] || [];
    return comps.filter(c => c.period === 'once').length === 0;
  });

  // Render by frequency group
  for (const fg of FREQUENCY_GROUPS) {
    const groupTasks = visibleTasks.filter(t => t.frequency === fg.key);
    if (groupTasks.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'task-section';
    section.innerHTML = `<div class="task-section-header">${fg.label}</div>`;
    const list = document.createElement('div');
    list.className = 'task-list';
    for (const task of groupTasks) {
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
      <span class="difficulty-dot">${DIFFICULTY_DOT[task.difficulty] || '🟢'}</span>
      <span class="task-check ${isCompleted ? 'checked' : ''}">${isCompleted ? '✓' : ''}</span>
    </div>
  `;

  card.addEventListener('click', async (e) => {

    if (isCompleted) {
      await habitRepo.uncompleteTask(task.id, period);
      rerender(mainContainer);
    } else {
      await habitRepo.completeTask(task.id, period);
      // Instant visual feedback
      const check = card.querySelector('.task-check');
      if (check) { check.classList.add('checked'); check.textContent = '✓'; }
      card.classList.add('completed');

      playPling(task.difficulty === 'hard' ? 'big' : 'small');
      const deco = await awardDeco(task);
      if (deco) {
        showDecoReward(card, deco);
        setTimeout(() => rerender(mainContainer), 3800);
      } else {
        // Easy tasks: confetti instead of deco reward
        const rect = card.getBoundingClientRect();
        burstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 'small');
        setTimeout(() => rerender(mainContainer), 1200);
      }
    }
  });

  // Long press to edit
  let pressTimer;
  card.addEventListener('pointerdown', () => {
    pressTimer = setTimeout(() => {
      showTaskForm(task.id, () => rerender(mainContainer));
    }, 500);
  });
  card.addEventListener('pointerup', () => clearTimeout(pressTimer));
  card.addEventListener('pointerleave', () => clearTimeout(pressTimer));

  return card;
}

function addTaskFAB(container) {
  // Remove any existing FAB first
  document.querySelector('.fab')?.remove();

  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.setAttribute('aria-label', 'Neue Aufgabe erstellen');
  fab.textContent = '+';
  fab.addEventListener('click', () => {
    showTaskForm(null, () => rerender(container));
  });
  document.body.appendChild(fab);

  const observer = new MutationObserver(() => {
    if (!document.body.contains(container) || container.innerHTML === '') {
      fab.remove();
      observer.disconnect();
    }
  });
  observer.observe(container, { childList: true });
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
