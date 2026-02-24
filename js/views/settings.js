/**
 * Settings View - Theme picker, sound settings, demo mode,
 * data export/import, cache clearing, and developer tools.
 */

import habitRepo from '../repo/habitRepo.js';
import { playSound } from '../utils/sounds.js';
import { loadDemoData, clearDemoData } from '../utils/demoData.js';
import { showOnboarding } from './onboarding.js';

export async function renderSettings(container) {
  const currentTheme = localStorage.getItem('theme') || 'light';

  container.innerHTML = `
    <div class="settings-screen">
      <div class="header-row"><h1 class="settings-title">Einstellungen</h1></div>

      <section class="settings-section">
        <h2>🎨 Aussehen & Klang</h2>
        <div class="theme-picker">
          <button class="theme-option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">🌸 Dreamgarden</button>
          <button class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">🌙 Dunkel</button>
          <button class="theme-option ${currentTheme === 'sakura' ? 'active' : ''}" data-theme="sakura">🌸 Sakura</button>
        </div>
        <div class="dark-mode-toggle" style="margin-top:12px;">
          <span class="dark-mode-toggle-label">Sound-Effekte</span>
          <label class="toggle-switch">
            <input type="checkbox" id="sound-checkbox" ${localStorage.getItem('sound') !== 'off' ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="sound-style-picker" id="sound-style-section">
          <span class="dark-mode-toggle-label" style="margin-bottom:8px;display:block;">Sound-Stil</span>
          <div class="sound-btn-row">
            <button class="btn btn-secondary sound-pick-btn ${(localStorage.getItem('soundStyle') || 'glockenspiel') === 'pling' ? 'active' : ''}" data-style="pling">Pling</button>
            <button class="btn btn-secondary sound-pick-btn ${(localStorage.getItem('soundStyle') || 'glockenspiel') === 'xylophon' ? 'active' : ''}" data-style="xylophon">Xylophon</button>
            <button class="btn btn-secondary sound-pick-btn ${(localStorage.getItem('soundStyle') || 'glockenspiel') === 'tropfen' ? 'active' : ''}" data-style="tropfen">Tropfen</button>
            <button class="btn btn-secondary sound-pick-btn ${(localStorage.getItem('soundStyle') || 'glockenspiel') === 'glockenspiel' ? 'active' : ''}" data-style="glockenspiel">Glockenspiel</button>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2>💾 Daten</h2>
        <div class="data-buttons">
          <button class="btn btn-secondary" id="export-btn">Daten exportieren</button>
          <button class="btn btn-secondary" id="import-btn">Daten importieren</button>
          <button class="btn btn-secondary" id="clear-cache-btn">Cache leeren & neu laden</button>
        </div>
        <input type="file" id="import-file" accept=".json" style="display:none">
      </section>

      <section class="settings-section">
        <h2>🛠 Erweitert</h2>
        <div class="dark-mode-toggle">
          <span class="dark-mode-toggle-label">Demo-Modus</span>
          <label class="toggle-switch">
            <input type="checkbox" id="demo-checkbox" ${localStorage.getItem('demoMode') === '1' ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <p style="font-size:12px;color:#8A8A8A;margin:4px 0 12px 0;">Lädt Beispieldaten zum Ausprobieren der App.</p>
        <button id="show-onboarding-btn" class="btn btn-secondary" style="width:100%;margin-bottom:8px;text-align:left;">Onboarding anzeigen</button>
        <div class="dark-mode-toggle">
          <span class="dark-mode-toggle-label">Debug-Modus</span>
          <label class="toggle-switch">
            <input type="checkbox" id="debug-checkbox" ${localStorage.getItem('debug') !== '0' ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </section>
    </div>
  `;

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

  // Demo toggle
  container.querySelector('#demo-checkbox').addEventListener('change', async (e) => {
    if (e.target.checked) {
      if (!confirm('⚠️ Achtung: Deine aktuellen Daten werden gelöscht! Fortfahren?')) {
        e.target.checked = false;
        return;
      }
      await loadDemoData();
      localStorage.setItem('demoMode', '1');
      window.location.hash = 'today';
      window.location.reload();
    } else {
      await clearDemoData();
      localStorage.removeItem('demoMode');
      window.location.hash = 'today';
      window.location.reload();
    }
  });

  // Onboarding button
  container.querySelector('#show-onboarding-btn').addEventListener('click', () => showOnboarding());

  // Debug toggle
  container.querySelector('#debug-checkbox').addEventListener('change', (e) => {
    localStorage.setItem('debug', e.target.checked ? '1' : '0');
  });

  // Theme picker
  container.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      localStorage.setItem('theme', theme);
      document.documentElement.dataset.theme = theme;
      container.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
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

  // Clear cache
  container.querySelector('#clear-cache-btn').addEventListener('click', async () => {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
    if (navigator.serviceWorker) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.unregister();
    }
    window.location.reload(true);
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
