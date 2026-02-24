/**
 * Service Worker - Offline cache for all app files
 */

const CACHE_NAME = 'local-habits-v44';
const DEXIE_URL = 'https://unpkg.com/dexie@4.0.11/dist/dexie.mjs';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/garden.css',
  './js/app.js',
  './js/router.js',
  './js/repo/db.js',
  './js/repo/habitRepo.js',
  './js/repo/gardenRepo.js',
  './js/repo/taskRepo.js',
  './js/components/fab.js',
  './js/components/modal.js',
  './js/components/emojiPicker.js',
  './js/views/today.js',
  './js/views/garden.js',
  './js/views/stats.js',
  './js/views/settings.js',
  './js/views/habitForm.js',
  './js/utils/dates.js',
  './js/utils/confetti.js',
  './js/utils/rewards.js',
  './js/utils/sanitize.js',
  './js/views/tasks.js',
  './js/views/taskForm.js',
  './js/views/onboarding.js',
  './js/views/help.js',
  './js/views/gardenRenderer.js',
  './js/views/gardenInventory.js',
  './js/views/weeklyFocus.js',
  './js/utils/decoRewards.js',
  './js/utils/sounds.js',
  './js/garden/plantArt.js',
  './js/garden/decoArt.js',
  './js/utils/demoData.js',
  './js/views/info.js',
  './js/utils/installPrompt.js'
];

// Install: cache all app assets + Dexie from CDN
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        await cache.addAll(ASSETS);
        // Cache Dexie.js from unpkg
        const response = await fetch(DEXIE_URL);
        await cache.put(DEXIE_URL, response);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: stale-while-revalidate
// Serve cached version immediately, update cache in background
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
