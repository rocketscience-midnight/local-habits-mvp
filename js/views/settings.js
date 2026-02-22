/**
 * Settings View - JSON import/export only
 */

import habitRepo from '../repo/habitRepo.js';
import { showHelp } from './help.js';
import { playSound } from '../utils/sounds.js';

export async function renderSettings(container) {
  const isDark = localStorage.getItem('theme') === 'dark';

  container.innerHTML = `
    <div class="settings-screen">
      <div class="header-row"><h1 class="settings-title">Einstellungen</h1><button class="help-btn" aria-label="Hilfe">❓</button></div>

      <section class="settings-section">
        <h2>Darstellung</h2>
        <div class="dark-mode-toggle">
          <span class="dark-mode-toggle-label">🌙 Dark Mode</span>
          <label class="toggle-switch">
            <input type="checkbox" id="dark-mode-checkbox" ${isDark ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="dark-mode-toggle">
          <span class="dark-mode-toggle-label">🔊 Sound-Effekte</span>
          <label class="toggle-switch">
            <input type="checkbox" id="sound-checkbox" ${localStorage.getItem('sound') !== 'off' ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="sound-style-picker" id="sound-style-section">
          <span class="dark-mode-toggle-label" style="margin-bottom:8px;display:block;">🎵 Sound-Stil</span>
          <div class="sound-btn-row">
            <button class="btn btn-secondary sound-pick-btn ${(localStorage.getItem('soundStyle') || 'glockenspiel') === 'pling' ? 'active' : ''}" data-style="pling">✨ Pling</button>
            <button class="btn btn-secondary sound-pick-btn ${(localStorage.getItem('soundStyle') || 'glockenspiel') === 'xylophon' ? 'active' : ''}" data-style="xylophon">🪵 Xylophon</button>
            <button class="btn btn-secondary sound-pick-btn ${(localStorage.getItem('soundStyle') || 'glockenspiel') === 'tropfen' ? 'active' : ''}" data-style="tropfen">💧 Tropfen</button>
            <button class="btn btn-secondary sound-pick-btn ${(localStorage.getItem('soundStyle') || 'glockenspiel') === 'glockenspiel' ? 'active' : ''}" data-style="glockenspiel">🔔 Glockenspiel</button>
          </div>
        </div>
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

  // Help button
  container.querySelector('.help-btn')?.addEventListener('click', showHelp);

  // Sound toggle
  container.querySelector('#sound-checkbox').addEventListener('change', (e) => {
    localStorage.setItem('sound', e.target.checked ? 'on' : 'off');
  });

  // Sound style picker
  container.querySelectorAll('.sound-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const style = btn.dataset.style;
      localStorage.setItem('soundStyle', style);
      container.querySelectorAll('.sound-pick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Play preview
      playSound(style, 'small');
      setTimeout(() => playSound(style, 'big'), 400);
    });
  });

  // Dark mode toggle
  container.querySelector('#dark-mode-checkbox').addEventListener('change', (e) => {
    const theme = e.target.checked ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    document.documentElement.dataset.theme = theme;
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
    } catch (err) {
      alert('Fehler beim Import: ' + err.message);
    }
    importFile.value = '';
  });
}
