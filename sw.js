// sw.js - Service Worker for Enhanced Grammar Checker PWA

const CACHE_NAME = 'grammar-checker-enhanced-v1.5'; // Incremented version (Recommended)
const urlsToCache = [
  '/', // Root URL
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/diff.min.js', // Cache the local diff library
  '/images/icon-192.png',
  '/images/icon-512.png'
];

// Install event: Cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell:', urlsToCache);
        const cachePromises = urlsToCache.map(url => {
            const requestUrl = new URL(url, self.location.origin).toString();
            return cache.add(new Request(requestUrl, {cache: 'reload'})).catch(err => console.warn(`[SW] Failed to cache ${url}: ${err}`));
        });
        return Promise.all(cachePromises);
      })
      .then(() => { console.log('[SW] App Shell caching complete.'); return self.skipWaiting(); })
      .catch(error => console.error('[SW] Install failed:', error))
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => { console.log('[SW] Old caches deleted.'); return self.clients.claim(); })
  );
});

// Fetch event: Serve cached assets first (Cache First Strategy for App Shell)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') { return; } // Ignore non-GET

  // Network Only for API calls
  if (url.hostname === 'middleman.yebekhe.workers.dev' || url.hostname === 'generativelanguage.googleapis.com') {
    event.respondWith(
        fetch(event.request).catch(error => {
             console.error("[SW] Network error fetching API:", error);
             return new Response(JSON.stringify({ error: 'Network error accessing API' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        })
    );
    return;
  }

  // Cache First for App Shell
  const isAppShellUrl = urlsToCache.some(cacheUrl => {
      try { const cachedPath = new URL(cacheUrl, self.location.origin).pathname; return url.pathname === cachedPath; }
      catch (e) { return url.pathname === cacheUrl; }
  });

  if (isAppShellUrl) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) { return cachedResponse; }
        return fetch(event.request).then(networkResponse => {
           if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') { return networkResponse; }
           const responseToCache = networkResponse.clone();
           caches.open(CACHE_NAME).then(cache => { cache.put(event.request, responseToCache); });
           return networkResponse;
        }).catch(error => { console.error('[SW] Network fetch failed for app shell resource:', url.pathname, error); });
      })
    );
    return;
  }
  // Other GET requests: Let browser handle (Network first)
});