/**
 * Habit Form - Bottom sheet modal for creating/editing habits
 * Features: emoji picker with categories, time-of-day, multi-completion target,
 * flexible weekly frequency (X mal pro Woche)
 */

import habitRepo from '../repo/habitRepo.js';
import { isWeeklyHabit } from '../utils/dates.js';
import { escapeHtml } from '../utils/sanitize.js';
import { createModal } from '../components/modal.js';
import { HABIT_EMOJI_CATEGORIES, renderEmojiPickerHTML, attachEmojiPickerHandlers } from '../components/emojiPicker.js';

/** Time-of-day options */
const TIME_OPTIONS = [
  { value: 'morning', label: 'Morgens' },
  { value: 'midday', label: 'Mittag' },
  { value: 'afternoon', label: 'Abends' },
  { value: 'evening', label: 'Vor dem Schlafen' },
  { value: 'anytime', label: 'Jederzeit' },
];

/**
 * Show the habit creation/edit form as a bottom sheet modal
 */
export async function showHabitForm(editId = null, onDone = () => {}) {
  let habit = { name: '', emoji: '✨', frequency: 'daily', targetPerDay: 1, timeOfDay: 'anytime' };
  if (editId) {
    habit = await habitRepo.getById(editId) || habit;
  }

  const isWeekly = isWeeklyHabit(habit);
  const timesPerWeek = isWeekly ? habit.frequency.timesPerWeek : (habit.timesPerWeek || 7);

  const html = `
    <h2>${editId ? 'Gewohnheit bearbeiten' : 'Neue Gewohnheit'}</h2>

    <label class="form-label">Emoji wählen</label>
    <div class="emoji-picker-categories" id="emoji-picker">
      ${renderEmojiPickerHTML(HABIT_EMOJI_CATEGORIES, habit.emoji)}
    </div>
    <label class="form-label">Name</label>
    <input type="text" class="form-input" id="habit-name" value="${escapeHtml(habit.name)}" placeholder="z.B. Meditation" maxlength="50">

    <label class="form-label">Tageszeit</label>
    <div class="time-picker">
      ${TIME_OPTIONS.map(opt => `
        <button type="button" class="btn time-btn ${(habit.timeOfDay || 'anytime') === opt.value ? 'active' : ''}" data-time="${opt.value}">${opt.label}</button>
      `).join('')}
    </div>

    <label class="form-label">Wie oft pro Tag?</label>
    <div class="target-picker">
      <button type="button" class="btn-icon target-dec" aria-label="Weniger">−</button>
      <span class="target-value" id="target-value">${habit.targetPerDay || 1}×</span>
      <button type="button" class="btn-icon target-inc" aria-label="Mehr">+</button>
    </div>

    <label class="form-label">Wie oft pro Woche?</label>
    <div class="target-picker">
      <button type="button" class="btn-icon weekly-dec" aria-label="Weniger">−</button>
      <span class="target-value" id="weekly-value">${timesPerWeek}×</span>
      <button type="button" class="btn-icon weekly-inc" aria-label="Mehr">+</button>
    </div>

    <div class="modal-actions">
      ${editId ? '<button class="btn btn-danger" id="delete-btn">🗑️ Löschen</button>' : ''}
      <button class="btn btn-secondary" id="cancel-btn">Abbrechen</button>
      <button class="btn btn-primary" id="save-btn">Speichern</button>
    </div>
  `;

  const { overlay, close } = createModal(html);

  // State
  let currentEmoji = habit.emoji;
  let currentTimesPerWeek = timesPerWeek;
  let targetPerDay = habit.targetPerDay || 1;
  let timeOfDay = habit.timeOfDay || 'anytime';

  // Emoji picker
  attachEmojiPickerHandlers(overlay.querySelector('#emoji-picker'), (emoji) => {
    currentEmoji = emoji;
    overlay.querySelector('#habit-name').focus();
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

  // Weekly times picker
  overlay.querySelector('.weekly-dec').addEventListener('click', () => {
    if (currentTimesPerWeek > 1) {
      currentTimesPerWeek--;
      overlay.querySelector('#weekly-value').textContent = currentTimesPerWeek + '×';
    }
  });
  overlay.querySelector('.weekly-inc').addEventListener('click', () => {
    if (currentTimesPerWeek < 7) {
      currentTimesPerWeek++;
      overlay.querySelector('#weekly-value').textContent = currentTimesPerWeek + '×';
    }
  });

  // Cancel
  overlay.querySelector('#cancel-btn').addEventListener('click', close);

  // Delete
  if (editId) {
    overlay.querySelector('#delete-btn').addEventListener('click', async () => {
      if (confirm('Gewohnheit wirklich löschen? Alle Daten gehen verloren.')) {
        await habitRepo.delete(editId);
        close();
        onDone();
      }
    });
  }

  // Save
  overlay.querySelector('#save-btn').addEventListener('click', async () => {
    const name = overlay.querySelector('#habit-name').value.trim();
    if (!name) { overlay.querySelector('#habit-name').focus(); return; }

    const toSave = {
      ...habit,
      name,
      emoji: currentEmoji,
      frequency: currentTimesPerWeek >= 7 ? 'daily' : { type: 'weekly', timesPerWeek: currentTimesPerWeek },
      targetPerDay,
      timeOfDay,
    };

    await habitRepo.save(toSave);
    close();
    onDone();
  });
}
