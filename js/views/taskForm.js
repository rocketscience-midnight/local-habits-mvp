/**
 * Task Form - Bottom sheet modal for creating/editing tasks
 */

import habitRepo from '../repo/habitRepo.js';
import { escapeHtml } from '../utils/sanitize.js';

const EMOJI_CATEGORIES = [
  { name: 'Haushalt', emojis: ['🧹', '🧺', '🪣', '🧽', '🗑️', '🚿', '🛁', '🪟', '🧴', '💡'] },
  { name: 'Küche', emojis: ['🍳', '🧊', '🫧', '🔥', '🧈', '🥘', '🍽️', '☕', '🫖', '🧃'] },
  { name: 'Garten', emojis: ['🌿', '🌻', '🪴', '🌳', '🍂', '🪓', '🧑‍🌾', '💧', '🌾', '🪨'] },
  { name: 'Technik', emojis: ['💻', '🔋', '📱', '🔧', '🪛', '🔌', '💾', '🖨️', '📡', '🛠️'] },
  { name: 'Sonstiges', emojis: ['📋', '📦', '🏠', '🚗', '🐕', '👕', '💊', '📬', '🔑', '🎒'] },
];

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
    task = await habitRepo.getAllTasks().then(ts => ts.find(t => t.id === editId)) || task;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${editId ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</h2>

      <label class="form-label">Emoji wählen</label>
      <div class="emoji-picker-categories" id="task-emoji-picker">
        ${EMOJI_CATEGORIES.map(cat => `
          <div class="emoji-cat">
            <div class="emoji-cat-label">${cat.name}</div>
            <div class="emoji-cat-grid">
              ${cat.emojis.map(e => `
                <button type="button" class="emoji-btn ${e === task.emoji ? 'selected' : ''}" data-emoji="${e}">${e}</button>
              `).join('')}
            </div>
          </div>
        `).join('')}
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
    </div>
  `;

  document.body.appendChild(overlay);

  let currentEmoji = task.emoji;
  let currentFreq = task.frequency;
  let currentDiff = task.difficulty;

  // Emoji picker
  overlay.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentEmoji = btn.dataset.emoji;
      overlay.querySelector('#task-name').focus();
    });
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
  overlay.querySelector('#task-cancel-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // Delete
  if (editId) {
    overlay.querySelector('#task-delete-btn').addEventListener('click', async () => {
      if (confirm('Aufgabe wirklich löschen?')) {
        await habitRepo.deleteTask(editId);
        overlay.remove();
        onDone();
      }
    });
  }

  // Save
  overlay.querySelector('#task-save-btn').addEventListener('click', async () => {
    const name = overlay.querySelector('#task-name').value.trim();
    if (!name) { overlay.querySelector('#task-name').focus(); return; }

    await habitRepo.saveTask({
      ...task,
      name,
      emoji: currentEmoji,
      frequency: currentFreq,
      difficulty: currentDiff,
    });
    overlay.remove();
    onDone();
  });
}
