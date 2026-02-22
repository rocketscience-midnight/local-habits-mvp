/**
 * Service Worker - Offline cache for all app files
 */

const CACHE_NAME = 'local-habits-v6';
const DEXIE_URL = 'https://unpkg.com/dexie/dist/dexie.mjs';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/garden.css',
  './js/app.js',
  './js/router.js',
  './js/repo/habitRepo.js',
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
  './js/utils/decoRewards.js'
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

// Fetch: cache-first, fallback to network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
