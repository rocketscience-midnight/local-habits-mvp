/**
 * Settings View - JSON import/export only
 */

import habitRepo from '../repo/habitRepo.js';
import { showHelp } from './help.js';

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
