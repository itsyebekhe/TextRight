// sw.js - Service Worker for Enhanced Grammar Checker PWA

const CACHE_NAME = 'grammar-checker-enhanced-v1.1'; // Updated cache name
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/diff.min.js'
  // Add other static assets if needed
  // NOTE: The jsdiff library is loaded via CDN in this example, so it's not cached here.
  // If you host jsdiff locally, add its path here.
];

// Install event: Cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell:', urlsToCache);
        // Use cache: 'reload' to ensure fresh assets during install
        const cachePromises = urlsToCache.map(url => {
            return cache.add(new Request(url, {cache: 'reload'})).catch(err => console.warn(`[SW] Failed to cache ${url}: ${err}`));
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('[SW] App Shell caching complete.');
        return self.skipWaiting(); // Activate worker immediately
      })
      .catch(error => console.error('[SW] Install failed:', error))
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  const cacheWhitelist = [CACHE_NAME]; // Only keep the current cache version
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
    }).then(() => {
        console.log('[SW] Old caches deleted.');
        return self.clients.claim(); // Take control of existing clients
    })
  );
});


// Fetch event: Serve cached assets first (Cache First Strategy for App Shell)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // --- Strategy ---
  // 1. Ignore non-GET requests (like POST to Gemini API)
  // 2. For App Shell URLs (defined in urlsToCache) or the root '/': Cache First, then Network.
  // 3. For the Gemini API: Network only.
  // 4. For CDN resources (like jsdiff): Network first (or let browser handle). Could implement StaleWhileRevalidate if needed.
  // 5. Other GET requests: Network first (or let browser handle).

  if (event.request.method !== 'GET') {
    // console.log('[SW] Ignoring non-GET request:', event.request.method, url.pathname);
    return; // Network default
  }

  // Network Only for API calls
  if (url.hostname === 'generativelanguage.googleapis.com') {
    // console.log('[SW] Fetching API request from network:', event.request.url);
    // Use fetch directly - don't try to cache API responses
    // Add timeout / fallback logic if necessary for API calls
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache First for App Shell
  // Check if the request URL path matches one of the cached URLs or is the root
  const isAppShellUrl = urlsToCache.some(cacheUrl => {
      // Handle absolute vs relative URLs in comparison
      try {
          const cachedPath = new URL(cacheUrl, self.location.origin).pathname;
          return url.pathname === cachedPath;
      } catch (e) {
          // Handle cases where cacheUrl might not be a valid relative path (e.g., just '/')
          return url.pathname === cacheUrl;
      }
  });


  if (isAppShellUrl) {
    // console.log('[SW] Handling fetch for App Shell resource:', url.pathname);
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // console.log('[SW] Serving from Cache:', url.pathname);
          return cachedResponse;
        }
        // console.log('[SW] Not in Cache, fetching from Network:', url.pathname);
        // If not in cache (e.g., first visit, cache cleared), fetch and cache it
        return fetch(event.request).then(networkResponse => {
           // Check if response is valid before caching
           if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
               // Don't cache errors, redirects, or opaque responses for the app shell
               // console.warn(`[SW] Not caching invalid response for ${url.pathname}: Status ${networkResponse.status}, Type ${networkResponse.type}`);
               return networkResponse;
           }
           // console.log('[SW] Caching new resource:', url.pathname);
           const responseToCache = networkResponse.clone(); // Clone response for caching
           caches.open(CACHE_NAME).then(cache => {
               cache.put(event.request, responseToCache);
           });
           return networkResponse;
        }).catch(error => {
           console.error('[SW] Network fetch failed for:', url.pathname, error);
           // Optional: Return an offline fallback page/resource here for navigation requests
           // if (event.request.mode === 'navigate') {
           //     return caches.match('/offline.html'); // You'd need an offline.html file & cache it
           // }
           // Return a generic error response or undefined to let the browser handle it
        });
      })
    );
    return; // Handled
  }

  // For other GET requests (like CDN), let the browser handle it by default.
  // You could implement StaleWhileRevalidate here if needed for things like CDNs.
  // console.log('[SW] Letting browser handle fetch for:', url.pathname);
});