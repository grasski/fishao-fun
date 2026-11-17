const CACHE_IMAGES = 'fishao-images-v1';
const CACHE_STATIC = 'fishao-static-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_IMAGES && k !== CACHE_STATIC)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache version.json or sw.js
  if (url.pathname.endsWith('/version.json') || url.pathname === '/version.json' || url.pathname.endsWith('/sw.js')) {
    return;
  }

  // HTML / navigation: Network-First so users always get the latest build
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Images: Cache-First (long-term cache for fish/bait/location WebP assets)
  if (url.pathname.includes('/images/')) {
    event.respondWith(
      caches.open(CACHE_IMAGES).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // Versioned / hashed CSS & JS: Cache-First (URL changes on every build)
  if (/\.(css|js)(\?.*)?$/.test(url.pathname + url.search)) {
    event.respondWith(
      caches.open(CACHE_STATIC).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          });
        })
      )
    );
  }
});
