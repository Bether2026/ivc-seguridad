// IVC Seguridad y Emergencias — Service Worker
// IMPORTANT: bump CACHE_NAME on every deploy that changes HTML/CSS/JS,
// otherwise installed PWA users will keep seeing the old cached version.
const CACHE_NAME = 'ivc-seg-v3';
const urlsToCache = ['/'];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', function(event) {
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

// ── NOTIFICACIONES PUSH ──
// Recibe mensajes desde la app (cuando está abierta)
self.addEventListener('message', function(event) {
  if (!event.data || event.data.type !== 'SHOW_NOTIFICATION') return;
  var urgent = event.data.urgent || false;
  self.registration.showNotification(event.data.title || 'IVC Seguridad', {
    body: event.data.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'ivc-' + Date.now(),
    renotify: true,
    vibrate: urgent ? [300, 100, 300, 100, 300] : [200, 100, 200],
    requireInteraction: urgent
  });
});

// Notificaciones push del servidor (futuro)
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {
    data = { title: 'IVC Seguridad', body: event.data ? event.data.text() : 'Nueva notificación' };
  }
  var urgent = (data.title || '').indexOf('URGENTE') !== -1;
  event.waitUntil(
    self.registration.showNotification(data.title || 'IVC Seguridad', {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'ivc-push',
      renotify: true,
      vibrate: urgent ? [300, 100, 300, 100, 300] : [200, 100, 200],
      requireInteraction: urgent
    })
  );
});

// Al tocar la notificación — abre la app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if ('focus' in clients[i]) return clients[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
