/**
 * App Entry Point - Initialize router, register views, setup PWA
 */

import { initRouter, registerRoute, registerCleanup } from './router.js';
import { renderToday } from './views/today.js';
import { renderGarden, cleanupGarden } from './views/garden.js';
import { renderInfo } from './views/info.js';
import { renderSettings } from './views/settings.js';
import { renderTasks } from './views/tasks.js';
import { isOnboardingDone, showOnboarding } from './views/onboarding.js';
import { initInstallPrompt } from './utils/installPrompt.js';

// Apply saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.dataset.theme = savedTheme;
}

// Register all routes
registerRoute('today', renderToday);
registerRoute('garden', renderGarden);
registerRoute('info', renderInfo);
registerRoute('tasks', renderTasks);
registerRoute('settings', renderSettings);

// Register cleanup functions
registerCleanup(cleanupGarden);

// Initialize router when DOM is ready, show onboarding if first launch
async function boot() {
  if (!isOnboardingDone()) {
    await showOnboarding();
  }
  initRouter();
  initInstallPrompt();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch(err => console.warn('SW registration failed:', err));
}
