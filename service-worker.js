// BETWEEN — service worker: offline-first app shell caching
const CACHE_NAME = 'between-v3.5.1-crowd-fixes';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/between-mark.svg',
  './css/style.css',
  './js/data.js',
  './js/utils.js',
  './js/storage.js',
  './js/scoring.js',
  './js/tendency.js',
  './js/moments.js',
  './js/timecapsule.js',
  './js/backup.js',
  './js/passthephone.js',
  './js/engine.js',
  './js/modes.js',
  './js/screens.js',
  './js/app.js',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
     .then(() => self.clients.matchAll({ type: 'window' }))
     .then(clients => clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', cache: CACHE_NAME })))
  );
});

// Allow the page to force this worker to activate immediately after an update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || (event.data && event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

// Cache-first for app shell assets; network-first fallback for everything else.
// Crowd-data API calls are explicitly excluded from caching — that data changes
// over time, so serving a stale cached vote count would defeat the entire
// point of it being "live." These always go straight to the network.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.pathname.startsWith('/.netlify/functions/')) {
    event.respondWith(fetch(req));
    return;
  }

  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => {
          if (req.mode === 'navigate') return caches.match('./index.html');
        });
    })
  );
});
