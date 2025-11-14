// sw.js
const CACHE_NAME = 'podcasts-cache-v1';
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './idb.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// fetch: cache-first para assets
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).then(resp => {
        // opcional: cache dinámico para assets
        if (req.url.startsWith(self.location.origin)) {
          caches.open(CACHE_NAME).then(cache => cache.put(req, resp.clone()));
        }
        return resp.clone();
      }).catch(() => caches.match('./'));// fallback
    })
  );
});

// escuchamos mensajes desde la página
self.addEventListener('message', event => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'SHOW_NOTIFICATION') {
    showNotification(data.title, { body: data.body });
  }
});

function showNotification(title, options = {}) {
  const opts = Object.assign({
    body: options.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    data: { url: '/' }
  }, options);
  self.registration.showNotification(title, opts);
}

// manejo de clicks en la notificación
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
      const urlToOpen = event.notification.data;
      const hadWindow = clientsArr.some(windowClient => {
        if (windowClient.url === urlToOpen && 'focus' in windowClient) {
          windowClient.focus();
          return true;
        }
      });
      if (!hadWindow && urlToOpen) {
        self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Ajuste para manejar notificaciones push y mensajes
self.addEventListener("push", event => {
    const data = event.data.json();

    self.registration.showNotification(data.title, {
        body: data.body,
        icon: "icons/icon-192.png",
        badge: "icons/badge.png",
        data: data.url || "/" // Agregar URL opcional para redirección
    });
});