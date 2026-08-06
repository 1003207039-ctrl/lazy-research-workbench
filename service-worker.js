const CACHE = 'defeat-lazy-v2';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './pages1.js',
  './pages2.js',
  './pages3.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evt => {
  if (evt.request.method !== 'GET') return;
  evt.respondWith(
    caches.match(evt.request).then(cached => {
      const f = fetch(evt.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(evt.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || f;
    })
  );
});
