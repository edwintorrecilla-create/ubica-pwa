// Service worker de Ubica — permite abrir y usar la app sin señal dentro del almacén.
const CACHE_NAME = 'ubica-cache-v2';
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cachea cada archivo por separado: si uno falla, los demás igual quedan
      // guardados y la instalación del service worker se completa con éxito.
      return Promise.all(CORE_ASSETS.map(url =>
        fetch(url).then(res => { if (res && res.ok) return cache.put(url, res); }).catch(() => {})
      ));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first para el shell de la app; cache-first-con-actualización para todo lo demás
// (incluye la librería xlsx y las fuentes de Google, que quedan disponibles offline
// después de la primera visita con conexión).
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => cached);

      return cached || network;
    })
  );
});
