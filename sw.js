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

  // HTML / navigation: Network-First (bypass 10-min GitHub Pages HTTP cache on reload)
  // Cache under canonical URL without query params so ?tab=/?lang=/?fish= don't bloat cache
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    const navCacheKey = url.origin + url.pathname;
    event.respondWith(
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(navCacheKey, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(navCacheKey).then((match) => match || caches.match(req, { ignoreSearch: true }) || caches.match('./'))
        )
    );
    return;
  }

  // Lazy unhashed i18n bundles: Stale-While-Revalidate so edits propagate without breaking offline
  if (url.pathname.includes('/data/i18n/')) {
    event.respondWith(
      caches.open(CACHE_STATIC).then((cache) =>
        cache.match(req).then((cached) => {
          const networkPromise = fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || networkPromise;
        })
      )
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

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'PRUNE_STATIC' || !Array.isArray(data.activeAssets)) return;
  const activeSet = new Set(data.activeAssets);
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) =>
      cache.keys().then((requests) =>
        Promise.all(
          requests.map((req) => {
            try {
              const u = new URL(req.url);
              const p = u.pathname;
              if (p.includes('/dist/') && !activeSet.has(p)) {
                return cache.delete(req);
              }
              if ((p === '/' || p.endsWith('/index.html') || p.endsWith('/')) && u.search) {
                return cache.delete(req);
              }
            } catch (e) {}
            return Promise.resolve(false);
          })
        )
      )
    )
  );
});
