/**
 * Settings View - Manage habits, export/import data
 */

import habitRepo from '../repo/habitRepo.js';

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const COMMON_EMOJIS = ['🧘', '📚', '💪', '🏃', '💧', '🥗', '😴', '✍️', '🎵', '🧹', '🌿', '💊', '🎨', '🧠', '☀️', '🙏'];

/**
 * Render the Settings screen
 */
export async function renderSettings(container) {
  container.innerHTML = `
    <div class="settings-screen">
      <h1 class="settings-title">Einstellungen</h1>

      <section class="settings-section">
        <div class="section-header">
          <h2>Gewohnheiten</h2>
          <button class="btn btn-primary" id="add-habit-btn">+ Neue Gewohnheit</button>
        </div>
        <div id="habits-list" class="habits-manage-list"></div>
      </section>

      <section class="settings-section">
        <h2>Daten</h2>
        <div class="data-buttons">
          <button class="btn btn-secondary" id="export-btn">📤 Daten exportieren</button>
          <button class="btn btn-secondary" id="import-btn">📥 Daten importieren</button>
        </div>
        <input type="file" id="import-file" accept=".json" style="display:none">
      </section>
    </div>
  `;

  await renderHabitsList(container);
  setupEventListeners(container);
}

/**
 * Render the list of all habits with edit/delete buttons
 */
async function renderHabitsList(container) {
  const list = container.querySelector('#habits-list');
  const habits = await habitRepo.getAll();

  if (habits.length === 0) {
    list.innerHTML = `
      <div class="empty-state small">
        <p>Noch keine Gewohnheiten erstellt</p>
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  for (const habit of habits) {
    const item = document.createElement('div');
    item.className = 'habit-manage-item';

    let freqText = 'Täglich';
    if (Array.isArray(habit.frequency)) {
      freqText = habit.frequency.map(d => WEEKDAYS[d]).join(', ');
    }

    item.innerHTML = `
      <div class="habit-manage-info">
        <span class="habit-emoji">${habit.emoji || '✨'}</span>
        <div>
          <span class="habit-name">${habit.name}</span>
          <span class="habit-freq">${freqText}</span>
        </div>
      </div>
      <div class="habit-manage-actions">
        <button class="btn-icon" data-edit="${habit.id}" aria-label="Bearbeiten">✏️</button>
        <button class="btn-icon" data-delete="${habit.id}" aria-label="Löschen">🗑️</button>
      </div>
    `;
    list.appendChild(item);
  }

  // Attach edit/delete handlers
  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => showHabitForm(container, btn.dataset.edit));
  });
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Gewohnheit wirklich löschen? Alle Daten gehen verloren.')) {
        await habitRepo.delete(btn.dataset.delete);
        await renderHabitsList(container);
      }
    });
  });
}

/**
 * Show the add/edit habit form as a modal overlay
 */
async function showHabitForm(container, editId = null) {
  let habit = { name: '', emoji: '✨', frequency: 'daily' };
  if (editId) {
    habit = await habitRepo.getById(editId) || habit;
  }

  const isWeekly = Array.isArray(habit.frequency);
  const selectedDays = isWeekly ? habit.frequency : [];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${editId ? 'Gewohnheit bearbeiten' : 'Neue Gewohnheit'}</h2>

      <label class="form-label">Name</label>
      <input type="text" class="form-input" id="habit-name" value="${habit.name}" placeholder="z.B. Meditation" maxlength="50">

      <label class="form-label">Emoji</label>
      <div class="emoji-picker">
        ${COMMON_EMOJIS.map(e => `
          <button class="emoji-btn ${e === habit.emoji ? 'selected' : ''}" data-emoji="${e}">${e}</button>
        `).join('')}
      </div>
      <input type="text" class="form-input emoji-custom" id="habit-emoji" value="${habit.emoji}" placeholder="Oder eigenes Emoji" maxlength="4">

      <label class="form-label">Frequenz</label>
      <div class="freq-toggle">
        <button class="btn freq-btn ${!isWeekly ? 'active' : ''}" data-freq="daily">Täglich</button>
        <button class="btn freq-btn ${isWeekly ? 'active' : ''}" data-freq="weekly">Bestimmte Tage</button>
      </div>
      <div class="weekday-picker ${isWeekly ? '' : 'hidden'}" id="weekday-picker">
        ${WEEKDAYS.map((d, i) => `
          <button class="weekday-btn ${selectedDays.includes(i) ? 'selected' : ''}" data-day="${i}">${d}</button>
        `).join('')}
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancel-btn">Abbrechen</button>
        <button class="btn btn-primary" id="save-btn">Speichern</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // State
  let currentEmoji = habit.emoji;
  let freqMode = isWeekly ? 'weekly' : 'daily';
  let days = new Set(selectedDays);

  // Emoji picker
  overlay.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentEmoji = btn.dataset.emoji;
      overlay.querySelector('#habit-emoji').value = currentEmoji;
    });
  });

  overlay.querySelector('#habit-emoji').addEventListener('input', (e) => {
    currentEmoji = e.target.value || '✨';
    overlay.querySelectorAll('.emoji-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.emoji === currentEmoji);
    });
  });

  // Frequency toggle
  overlay.querySelectorAll('.freq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      freqMode = btn.dataset.freq;
      overlay.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      overlay.querySelector('#weekday-picker').classList.toggle('hidden', freqMode === 'daily');
    });
  });

  // Weekday picker
  overlay.querySelectorAll('.weekday-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = parseInt(btn.dataset.day);
      if (days.has(day)) {
        days.delete(day);
        btn.classList.remove('selected');
      } else {
        days.add(day);
        btn.classList.add('selected');
      }
    });
  });

  // Cancel
  overlay.querySelector('#cancel-btn').addEventListener('click', () => {
    overlay.remove();
  });

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Save
  overlay.querySelector('#save-btn').addEventListener('click', async () => {
    const name = overlay.querySelector('#habit-name').value.trim();
    if (!name) {
      overlay.querySelector('#habit-name').focus();
      return;
    }

    const toSave = {
      ...habit,
      name,
      emoji: currentEmoji,
      frequency: freqMode === 'daily' ? 'daily' : [...days].sort()
    };

    // Validate weekly has at least one day selected
    if (freqMode === 'weekly' && days.size === 0) {
      alert('Bitte wähle mindestens einen Tag aus.');
      return;
    }

    await habitRepo.save(toSave);
    overlay.remove();
    await renderHabitsList(container);
  });

  // Focus name input
  setTimeout(() => overlay.querySelector('#habit-name').focus(), 100);
}

/**
 * Setup export/import and add button listeners
 */
function setupEventListeners(container) {
  // Add habit
  container.querySelector('#add-habit-btn').addEventListener('click', () => {
    showHabitForm(container);
  });

  // Export
  container.querySelector('#export-btn').addEventListener('click', async () => {
    const data = await habitRepo.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `local-habits-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import
  const importBtn = container.querySelector('#import-btn');
  const importFile = container.querySelector('#import-file');

  importBtn.addEventListener('click', () => importFile.click());

  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('Alle bestehenden Daten werden überschrieben. Fortfahren?')) {
      importFile.value = '';
      return;
    }

    try {
      const text = await file.text();
      await habitRepo.importData(text);
      alert('Daten erfolgreich importiert!');
      await renderHabitsList(container);
    } catch (err) {
      alert('Fehler beim Import: ' + err.message);
    }
    importFile.value = '';
  });
}
