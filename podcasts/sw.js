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
      const urlToOpen = event.notification.data.url || '/';
      const hadWindow = clientsArr.some(windowClient => {
        if (windowClient.url.includes(urlToOpen.split('?')[0]) && 'focus' in windowClient) {
          windowClient.focus();
          return true;
        }
        return false;
      });
      if (!hadWindow) {
        self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Manejar notificaciones push desde el servidor
self.addEventListener("push", event => {
    // Valores por defecto en caso de error
    let data = { 
        title: 'Nuevo mensaje', 
        body: 'Tienes una notificación', 
        url: '/' 
    };
    
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.error('Error parsing push data:', e);
    }

    const options = {
        body: data.body,
        icon: data.icon || "icons/icon-192.png",
        badge: data.badge || "icons/icon-192.png",
        data: { url: data.url || "/" },
        vibrate: [200, 100, 200],
        tag: 'podcast-notification',
        requireInteraction: false
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});
