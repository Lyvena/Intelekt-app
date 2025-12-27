// Service Worker for Intelekt - Offline Support
// NOTE: bump cache versions when changing caching strategy so clients update
const CACHE_NAME = 'intelekt-cache-v2';
const STATIC_CACHE = 'intelekt-static-v2';
const PROJECT_CACHE = 'intelekt-projects-v2';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/logo.svg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== PROJECT_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests (except for caching project data)
  if (url.pathname.startsWith('/api/')) {
    // Cache project files API responses
    if (url.pathname.includes('/projects/') && url.pathname.includes('/files')) {
      event.respondWith(networkFirstWithCache(request, PROJECT_CACHE));
      return;
    }
    // Don't cache other API requests
    return;
  }

  // For static assets, try cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
    return;
  }

  // For app routes (SPA navigation), use network-first so index.html is fresh
  if (!url.pathname.includes('.') && request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        // update cached index.html so offline fallback is newer
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put('/index.html', networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // network failed — try cache
        const cached = await caches.match('/index.html');
        if (cached) return cached;
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      }
    })());
    return;
  }

  // Default: try cache, then network
  event.respondWith(cacheFirstWithNetwork(request, CACHE_NAME));
});

// Cache-first strategy with network fallback
async function cacheFirstWithNetwork(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, no cache available:', request.url);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network-first strategy with cache fallback
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_PROJECT') {
    const { projectId, files } = event.data;
    cacheProjectFiles(projectId, files);
  }
  
  if (event.data && event.data.type === 'CLEAR_PROJECT_CACHE') {
    const { projectId } = event.data;
    clearProjectCache(projectId);
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Cache project files for offline access
async function cacheProjectFiles(projectId, files) {
  const cache = await caches.open(PROJECT_CACHE);
  const cacheKey = `/offline/projects/${projectId}/files`;
  
  const response = new Response(JSON.stringify({ projectId, files, timestamp: Date.now() }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  await cache.put(cacheKey, response);
  console.log('[SW] Cached project files:', projectId);
}

// Clear project cache
async function clearProjectCache(projectId) {
  const cache = await caches.open(PROJECT_CACHE);
  const keys = await cache.keys();
  
  for (const key of keys) {
    if (key.url.includes(`/projects/${projectId}`)) {
      await cache.delete(key);
    }
  }
  console.log('[SW] Cleared project cache:', projectId);
}
