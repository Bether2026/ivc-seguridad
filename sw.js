// IVC Seguridad y Emergencias — Service Worker
// IMPORTANT: bump CACHE_NAME on every deploy that changes HTML/CSS/JS,
// otherwise installed PWA users will keep seeing the old cached version.
const CACHE_NAME = 'ivc-seg-v2';
const urlsToCache = ['/'];

self.addEventListener('install', function(event) {
  // Activate the new SW immediately on next page load instead of waiting
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', function(event) {
  // Clean up old caches so users actually get the new version
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  // Network-first for the main document so changes show up fast,
  // cache-first for static assets so offline still works.
  const req = event.request;
  const isDoc = req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').indexOf('text/html') !== -1);

  if (isDoc) {
    event.respondWith(
      fetch(req).then(function(res) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(req, copy); });
        return res;
      }).catch(function() {
        return caches.match(req).then(function(r) { return r || caches.match('/'); });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function(response) {
      return response || fetch(req);
    })
  );
});
