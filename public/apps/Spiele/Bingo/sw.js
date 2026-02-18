const CACHE_NAME = 'bingo-v2';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './game.js',
    './assets/bingo_logo-192x192.png',
    './assets/bingo_logo-512x512.png',
    './assets/Numo-logo-192x192.png'
];

// Install Event
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching Bingo assets');
                return cache.addAll(ASSETS);
            })
    );
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cache) => {
                        if (cache.startsWith('bingo-') && cache !== CACHE_NAME) {
                            console.log('Clearing old Bingo cache:', cache);
                            return caches.delete(cache);
                        }
                    })
                );
            })
        ])
    );
});

// Fetch Event - NETWORK FIRST STRATEGY
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});