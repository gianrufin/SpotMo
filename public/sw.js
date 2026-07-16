// SpotMo service worker — offline-capable app shell + runtime caching.
// Versioned cache names; bump SHELL_VERSION to force a refresh of cached assets.
const SHELL_VERSION = 'spotmo-v1';
const SHELL_CACHE = `${SHELL_VERSION}-shell`;
const RUNTIME_CACHE = `${SHELL_VERSION}-runtime`;

// Resolve URLs relative to the SW scope so it works under a project sub-path.
const SHELL_ASSETS = ['.', 'index.html', 'manifest.webmanifest', 'favicon.svg'].map(
  (p) => new URL(p, self.registration.scope).toString(),
);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // App navigations: network-first, fall back to cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then(
              (cached) =>
                cached ||
                caches.match(new URL('index.html', self.registration.scope).toString()),
            ),
        ),
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;

  // Same-origin assets (hashed JS/CSS/icons): stale-while-revalidate.
  if (sameOrigin) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((res) => {
              if (res && res.status === 200) cache.put(request, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || network;
        }),
      ),
    );
    return;
  }

  // Cross-origin (map tiles, fonts, posters): cache-first, best effort.
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) =>
      cache.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((res) => {
              if (res && (res.status === 200 || res.type === 'opaque')) {
                cache.put(request, res.clone());
              }
              return res;
            })
            .catch(() => cached),
      ),
    ),
  );
});
