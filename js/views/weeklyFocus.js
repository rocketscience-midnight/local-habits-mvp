/**
 * Weekly Focus Card + Modal
 * Extracted from today.js for maintainability
 */

import habitRepo from '../repo/habitRepo.js';
import { todayString, getISOWeekKey } from '../utils/dates.js';
import { escapeHtml } from '../utils/sanitize.js';

/**
 * Render the Wochenfokus card into the container.
 * @param {HTMLElement} container - parent element
 * @param {Function} rerenderFn - callback to re-render the today view
 */
export async function renderWeeklyFocus(container, rerenderFn) {
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

  section.addEventListener('click', () => showWeeklyFocusModal(weekKey, text, rerenderFn));
  container.appendChild(section);
}

/**
 * Show modal to edit weekly focus
 */
function showWeeklyFocusModal(weekKey, currentText, rerenderFn) {
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
    rerenderFn();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
