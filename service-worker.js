/**
 * Service Worker - Offline cache for all app files
 */

const CACHE_NAME = 'local-habits-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './js/app.js',
  './js/router.js',
  './js/repo/habitRepo.js',
  './js/views/today.js',
  './js/views/garden.js',
  './js/views/stats.js',
  './js/views/settings.js',
  './js/utils/dates.js'
];

// Install: cache all app assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
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
  // Skip non-GET and CDN requests (let Dexie load from network)
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('unpkg.com')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
