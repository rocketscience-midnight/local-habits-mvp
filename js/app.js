/**
 * App Entry Point - Initialize router, register views, setup PWA
 */

import { initRouter, registerRoute } from './router.js';
import { renderToday } from './views/today.js';
import { renderGarden } from './views/garden.js';
import { renderStats } from './views/stats.js';
import { renderSettings } from './views/settings.js';

// Register all routes
registerRoute('today', renderToday);
registerRoute('garden', renderGarden);
registerRoute('stats', renderStats);
registerRoute('settings', renderSettings);

// Initialize router when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRouter);
} else {
  initRouter();
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch(err => console.warn('SW registration failed:', err));
}
