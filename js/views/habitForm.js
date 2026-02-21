/**
 * Habit Form - Bottom sheet modal for creating/editing habits
 * Features: emoji picker with categories, time-of-day, multi-completion target
 */

import habitRepo from '../repo/habitRepo.js';
import { WEEKDAYS_MONDAY, mondayIndexToIso } from '../utils/dates.js';

/** Curated emoji grid organized by category */
const EMOJI_CATEGORIES = [
  { name: 'Fitness', emojis: ['💪', '🏃', '🚴', '🏊', '🧘', '⚽', '🎾', '🏋️', '🤸', '🚶'] },
  { name: 'Essen', emojis: ['💧', '🥗', '🍎', '🥦', '🍳', '☕', '🫖', '🥤', '🧃', '🍌'] },
  { name: 'Geist', emojis: ['📚', '🧠', '✍️', '📝', '🎵', '🎨', '🙏', '😴', '🧘', '💭'] },
  { name: 'Arbeit', emojis: ['💻', '📧', '📊', '🎯', '⏰', '📅', '✅', '📞', '🗂️', '💡'] },
  { name: 'Zuhause', emojis: ['🧹', '🛏️', '🪴', '🍳', '👕', '🗑️', '🐕', '🐈', '🧺', '🪥'] },
  { name: 'Natur', emojis: ['🌿', '🌻', '☀️', '🌲', '🦋', '🌈', '🍃', '🌊', '🐦', '⭐'] },
];

/** Time-of-day options */
const TIME_OPTIONS = [
  { value: 'morning', label: 'Vor der Arbeit' },
  { value: 'midday', label: 'Mittag' },
  { value: 'afternoon', label: 'Nach der Arbeit' },
  { value: 'evening', label: 'Vor dem Schlafen' },
  { value: 'anytime', label: 'Jederzeit' },
];

/**
 * Show the habit creation/edit form as a bottom sheet modal
 * @param {string|null} editId - Habit ID to edit, or null for new
 * @param {Function} onDone - Callback after save/delete
 */
export async function showHabitForm(editId = null, onDone = () => {}) {
  let habit = { name: '', emoji: '✨', frequency: 'daily', targetPerDay: 1, timeOfDay: 'anytime' };
  if (editId) {
    habit = await habitRepo.getById(editId) || habit;
  }

  // Convert old Sunday-based frequency arrays to ISO (Mon=1..Sun=7)
  // (old format: 0=Sun..6=Sat; new: 1=Mon..7=Sun)
  const isWeekly = Array.isArray(habit.frequency);
  const selectedDays = isWeekly ? new Set(habit.frequency) : new Set();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${editId ? 'Gewohnheit bearbeiten' : 'Neue Gewohnheit'}</h2>

      <label class="form-label">Name</label>
      <input type="text" class="form-input" id="habit-name" value="${habit.name}" placeholder="z.B. Meditation" maxlength="50">

      <label class="form-label">Emoji</label>
      <div class="emoji-picker-categories" id="emoji-picker">
        ${EMOJI_CATEGORIES.map(cat => `
          <div class="emoji-cat">
            <div class="emoji-cat-label">${cat.name}</div>
            <div class="emoji-cat-grid">
              ${cat.emojis.map(e => `
                <button type="button" class="emoji-btn ${e === habit.emoji ? 'selected' : ''}" data-emoji="${e}">${e}</button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <input type="text" class="form-input emoji-custom" id="habit-emoji" value="${habit.emoji}" placeholder="Oder eigenes Emoji eingeben" maxlength="4">

      <label class="form-label">Tageszeit</label>
      <div class="time-picker">
        ${TIME_OPTIONS.map(opt => `
          <button type="button" class="btn time-btn ${(habit.timeOfDay || 'anytime') === opt.value ? 'active' : ''}" data-time="${opt.value}">${opt.label}</button>
        `).join('')}
      </div>

      <label class="form-label">Ziel pro Tag</label>
      <div class="target-picker">
        <button type="button" class="btn-icon target-dec" aria-label="Weniger">−</button>
        <span class="target-value" id="target-value">${habit.targetPerDay || 1}×</span>
        <button type="button" class="btn-icon target-inc" aria-label="Mehr">+</button>
      </div>

      <label class="form-label">Frequenz</label>
      <div class="freq-toggle">
        <button type="button" class="btn freq-btn ${!isWeekly ? 'active' : ''}" data-freq="daily">Täglich</button>
        <button type="button" class="btn freq-btn ${isWeekly ? 'active' : ''}" data-freq="weekly">Bestimmte Tage</button>
      </div>
      <div class="weekday-picker ${isWeekly ? '' : 'hidden'}" id="weekday-picker">
        ${WEEKDAYS_MONDAY.map((d, i) => {
          const isoDay = mondayIndexToIso(i);
          return `<button type="button" class="weekday-btn ${selectedDays.has(isoDay) ? 'selected' : ''}" data-day="${isoDay}">${d}</button>`;
        }).join('')}
      </div>

      <div class="modal-actions">
        ${editId ? '<button class="btn btn-danger" id="delete-btn">🗑️ Löschen</button>' : ''}
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
  let targetPerDay = habit.targetPerDay || 1;
  let timeOfDay = habit.timeOfDay || 'anytime';

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

  // Time-of-day picker
  overlay.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      timeOfDay = btn.dataset.time;
    });
  });

  // Target per day
  overlay.querySelector('.target-dec').addEventListener('click', () => {
    if (targetPerDay > 1) {
      targetPerDay--;
      overlay.querySelector('#target-value').textContent = targetPerDay + '×';
    }
  });
  overlay.querySelector('.target-inc').addEventListener('click', () => {
    if (targetPerDay < 99) {
      targetPerDay++;
      overlay.querySelector('#target-value').textContent = targetPerDay + '×';
    }
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
      if (days.has(day)) { days.delete(day); btn.classList.remove('selected'); }
      else { days.add(day); btn.classList.add('selected'); }
    });
  });

  // Cancel / backdrop
  overlay.querySelector('#cancel-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // Delete
  if (editId) {
    overlay.querySelector('#delete-btn').addEventListener('click', async () => {
      if (confirm('Gewohnheit wirklich löschen? Alle Daten gehen verloren.')) {
        await habitRepo.delete(editId);
        overlay.remove();
        onDone();
      }
    });
  }

  // Save
  overlay.querySelector('#save-btn').addEventListener('click', async () => {
    const name = overlay.querySelector('#habit-name').value.trim();
    if (!name) { overlay.querySelector('#habit-name').focus(); return; }

    if (freqMode === 'weekly' && days.size === 0) {
      alert('Bitte wähle mindestens einen Tag aus.');
      return;
    }

    const toSave = {
      ...habit,
      name,
      emoji: currentEmoji,
      frequency: freqMode === 'daily' ? 'daily' : [...days].sort(),
      targetPerDay,
      timeOfDay,
    };

    await habitRepo.save(toSave);
    overlay.remove();
    onDone();
  });

  setTimeout(() => overlay.querySelector('#habit-name').focus(), 100);
}
