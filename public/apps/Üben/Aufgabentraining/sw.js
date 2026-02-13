const CACHE_NAME = 'aufgabentraining-v10';
const ASSETS = [
    './',
    './index.html',
    './registerSW.js',
    './numo-logo-home.png',
    './install-modal.css',
    './install-logic.js'
];

// Kill switch for any old workbox or conflicting SW
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cache) => {
                        // Delete everything that is not the current version
                        if (cache !== CACHE_NAME) {
                            console.log('Cleaning up old cache:', cache);
                            return caches.delete(cache);
                        }
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    // Basic network-first for navigation, else cache-first or similar
    event.respondWith(
        fetch(event.request)
            .catch(() => caches.match(event.request))
    );
});
