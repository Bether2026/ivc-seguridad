// IVC Seguridad y Emergencias — Service Worker (ÚNICO — no debe haber otro registrado)
// BUILD_TIMESTAMP: este comentario se actualiza automáticamente en cada deploy
// via deploy.sh — fuerza reinstalación del SW en todos los dispositivos.
// LAST_BUILD: 2026-08-03T13:04:14Z
const CACHE_NAME = 'ivc-seg-v11';
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
     .then(function() {
       // Auto-reparación: cuando una versión NUEVA del Service Worker toma
       // control, recarga automáticamente cualquier pestaña/PWA que ya
       // estuviera abierta con la versión vieja — sin esto, el usuario
       // puede quedar viendo HTML viejo en memoria aunque el SW ya se
       // haya actualizado, hasta que cierre y reabra la app manualmente.
       return self.clients.matchAll({ type: 'window' }).then(function(clientList) {
         clientList.forEach(function(client) {
           client.postMessage({ type: 'SW_UPDATED_RELOAD' });
         });
       });
     })
  );
});

self.addEventListener('fetch', function(event) {
  const req = event.request;
  const isDoc = req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').indexOf('text/html') !== -1);
  if (isDoc) {
    // Network-first para el HTML: siempre intenta traer la versión más nueva
    // del servidor. Solo usa la copia en caché si no hay conexión (offline).
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
self.addEventListener('message', function(event) {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
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
    return;
  }

});


// Notificaciones push del servidor
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {
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
