const CACHE_NAME = 'market-cevil-v7';
const RUNTIME_CACHE = 'market-cevil-runtime-v7';

// Assets to cache on install.
// NOTE: Do NOT add /_next/static/ here — Next.js JS/CSS chunks already have
// content-hash filenames and are optimally handled by the browser HTTP cache.
// Caching them in the SW causes stale-code issues on iOS.
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
    }).then((cachesToDelete) => {
      return Promise.all(cachesToDelete.map((cacheToDelete) => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip Chrome extensions
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Let the browser handle Next.js static chunks — they have content-hash
  // filenames and are already optimally cached via HTTP Cache-Control headers.
  // Intercepting them here causes stale-code on iOS and requires manual SW bumps.
  if (event.request.url.includes('/_next/')) {
    return;
  }

  // API requests — always network, never cache
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Auth routes — always network (critical for OAuth flow)
  if (
    event.request.url.includes('/auth/') ||
    event.request.url.includes('/login') ||
    event.request.url.includes('/register')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For everything else (pages, icons, manifest): cache-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return caches.open(RUNTIME_CACHE).then((cache) => {
        return fetch(event.request).then((response) => {
          if (event.request.method === 'GET' && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch((error) => {
          console.error('Fetch failed:', error);
          throw error;
        });
      });
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
