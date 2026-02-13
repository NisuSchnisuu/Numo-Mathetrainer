const CACHE_NAME = 'aufgabentraining-v4';
const ASSETS = [
    './',
    './index.html',
    './registerSW.js',
    './numo-logo-home.png'
];

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
                        if (cache.startsWith('aufgabentraining-') && cache !== CACHE_NAME) {
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
    // For simplicity and to fix the error, we use a simple network-first
    event.respondWith(
        fetch(event.request)
            .catch(() => caches.match(event.request))
    );
});
