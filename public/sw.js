// Service Worker for PWA functionality and caching
const CACHE_NAME = 'shiv-accounts-v1';
const RUNTIME_CACHE = 'shiv-accounts-runtime';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  // Add other critical assets
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/auth\//,
  /\/api\/dashboard\//,
  /\/api\/contacts\//,
  /\/api\/products\//,
];

// Assets that should be cached with network-first strategy
const NETWORK_FIRST_PATTERNS = [
  /\/api\/transactions\//,
  /\/api\/payments\//,
  /\/api\/reports\//,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(event);
  }

  // Handle static assets
  if (isStaticAsset(request)) {
    return handleStaticAsset(event);
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    return handleNavigation(event);
  }

  // Default: network first with cache fallback
  event.respondWith(networkFirst(request));
});

// Handle API requests with different strategies
function handleApiRequest(event) {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for critical data
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return event.respondWith(networkFirst(request, RUNTIME_CACHE));
  }

  // Cache-first for less critical data
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return event.respondWith(cacheFirst(request, RUNTIME_CACHE));
  }

  // Default: network only for uncached APIs
  return event.respondWith(fetch(request));
}

// Handle static assets (cache-first strategy)
function handleStaticAsset(event) {
  event.respondWith(cacheFirst(event.request, CACHE_NAME));
}

// Handle navigation requests (network-first with offline fallback)
function handleNavigation(event) {
  event.respondWith(
    networkFirst(event.request)
      .catch(() => {
        // Serve offline page if available
        return caches.match('/offline.html') || caches.match('/');
      })
  );
}

// Check if request is for a static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff2?|ttf|eot)$/);
}

// Cache-first strategy
async function cacheFirst(request, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    // Update cache in background for dynamic content
    if (cacheName === RUNTIME_CACHE) {
      updateCacheInBackground(request, cache);
    }
    return cached;
  }

  const response = await fetch(request);
  
  // Cache successful responses
  if (response.status === 200) {
    cache.put(request, response.clone());
  }
  
  return response;
}

// Network-first strategy
async function networkFirst(request, cacheName = RUNTIME_CACHE) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.status === 200 && cacheName) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Fallback to cache
    const cache = await caches.open(cacheName || CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

// Update cache in background
async function updateCacheInBackground(request, cache) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
  } catch (error) {
    // Silent fail for background updates
    console.log('Background cache update failed:', error);
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic for offline actions
  // This could include uploading cached form data, etc.
  console.log('Background sync triggered');
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'default',
      requireInteraction: false,
      actions: data.actions || [],
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});