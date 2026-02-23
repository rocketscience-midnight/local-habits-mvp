/**
 * Task Form - Bottom sheet modal for creating/editing tasks
 */

import taskRepo from '../repo/taskRepo.js';
import { escapeHtml } from '../utils/sanitize.js';
import { createModal } from '../components/modal.js';
import { TASK_EMOJI_CATEGORIES, renderEmojiPickerHTML, attachEmojiPickerHandlers } from '../components/emojiPicker.js';

const FREQUENCY_OPTIONS = [
  { value: 'once', label: 'Einmalig' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'bimonthly', label: '2× / Monat' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'quarterly', label: 'Quartalsweise' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Klein', dot: '🟢' },
  { value: 'medium', label: 'Mittel', dot: '🟡' },
  { value: 'hard', label: 'Groß', dot: '🔴' },
];

export async function showTaskForm(editId = null, onDone = () => {}) {
  let task = { name: '', emoji: '🧹', frequency: 'weekly', difficulty: 'easy' };
  if (editId) {
    task = await taskRepo.getAllTasks().then(ts => ts.find(t => t.id === editId)) || task;
  }

  const html = `
    <h2>${editId ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</h2>

    <label class="form-label">Emoji wählen</label>
    <div class="emoji-picker-categories" id="task-emoji-picker">
      ${renderEmojiPickerHTML(TASK_EMOJI_CATEGORIES, task.emoji)}
    </div>

    <label class="form-label">Name</label>
    <input type="text" class="form-input" id="task-name" value="${escapeHtml(task.name)}" placeholder="z.B. Kühlschrank reinigen" maxlength="50">

    <label class="form-label">Frequenz</label>
    <div class="freq-toggle task-freq-toggle">
      ${FREQUENCY_OPTIONS.map(opt => `
        <button type="button" class="btn freq-btn ${task.frequency === opt.value ? 'active' : ''}" data-freq="${opt.value}">${opt.label}</button>
      `).join('')}
    </div>

    <label class="form-label">Schwierigkeit</label>
    <div class="freq-toggle task-diff-toggle">
      ${DIFFICULTY_OPTIONS.map(opt => `
        <button type="button" class="btn freq-btn ${task.difficulty === opt.value ? 'active' : ''}" data-diff="${opt.value}">${opt.dot} ${opt.label}</button>
      `).join('')}
    </div>

    <div class="modal-actions">
      ${editId ? '<button class="btn btn-danger" id="task-delete-btn">🗑️ Löschen</button>' : ''}
      <button class="btn btn-secondary" id="task-cancel-btn">Abbrechen</button>
      <button class="btn btn-primary" id="task-save-btn">Speichern</button>
    </div>
  `;

  const { overlay, close } = createModal(html);

  let currentEmoji = task.emoji;
  let currentFreq = task.frequency;
  let currentDiff = task.difficulty;

  // Emoji picker
  attachEmojiPickerHandlers(overlay.querySelector('#task-emoji-picker'), (emoji) => {
    currentEmoji = emoji;
    overlay.querySelector('#task-name').focus();
  });

  // Frequency toggle
  overlay.querySelectorAll('.task-freq-toggle .freq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.task-freq-toggle .freq-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFreq = btn.dataset.freq;
    });
  });

  // Difficulty toggle
  overlay.querySelectorAll('.task-diff-toggle .freq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.task-diff-toggle .freq-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDiff = btn.dataset.diff;
    });
  });

  // Cancel
  overlay.querySelector('#task-cancel-btn').addEventListener('click', close);

  // Delete
  if (editId) {
    overlay.querySelector('#task-delete-btn').addEventListener('click', async () => {
      if (confirm('Aufgabe wirklich löschen?')) {
        await taskRepo.deleteTask(editId);
        close();
        onDone();
      }
    });
  }

  // Save
  overlay.querySelector('#task-save-btn').addEventListener('click', async () => {
    const name = overlay.querySelector('#task-name').value.trim();
    if (!name) { overlay.querySelector('#task-name').focus(); return; }

    await taskRepo.saveTask({
      ...task,
      name,
      emoji: currentEmoji,
      frequency: currentFreq,
      difficulty: currentDiff,
    });
    close();
    onDone();
  });
}
