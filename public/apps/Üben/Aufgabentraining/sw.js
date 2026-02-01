self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open('numo-store-v1').then((cache) => cache.addAll([
            './',
            './index.html',
            './script.js',
            './style.css',
            './game-terms.js',
            './assets/Aufabentraining-logo-192x192.png'
        ]))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
