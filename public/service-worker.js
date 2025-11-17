const CACHE_NAME = 'beerhive-pos-static-v1';
const NEXT_CACHE_NAME = 'beerhive-pos-next-v1';
const CORE_ASSETS = ['/', '/manifest.json', '/beerhive-logo.png'];

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(CORE_ASSETS);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
          return undefined;
        })
      );
      await self.clients.claim();
    })()
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  cache.put(request, networkResponse.clone());
  return networkResponse;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(NEXT_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match('/') || Response.error();
      })
    );
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/_next/')) {
      event.respondWith(staleWhileRevalidate(event.request));
      return;
    }
    if (CORE_ASSETS.includes(url.pathname)) {
      event.respondWith(cacheFirst(event.request));
      return;
    }
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
