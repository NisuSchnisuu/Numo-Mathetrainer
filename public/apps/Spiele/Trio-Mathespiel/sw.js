const CACHE_NAME = 'trio-v8'; // WICHTIG: Bei jeder Änderung am Code hier hochzählen (v8, v9...)!
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './firebase-config.js',
    './assets/Trio-logo-192x192.png',
    './assets/Trio-logo-512x512.png'
];

// Install Event
// Lädt die Dateien in den Cache, sobald der SW installiert wird
self.addEventListener('install', (event) => {
    // Zwingt den wartenden SW sofort aktiv zu werden
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching assets');
                return cache.addAll(ASSETS);
            })
    );
});

// Activate Event
// Löscht alte Caches, damit die Festplatte nicht volläuft und User nicht alte Daten behalten
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Übernimmt sofort die Kontrolle über alle offenen Tabs
            clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cache) => {
                        if (cache !== CACHE_NAME) {
                            console.log('Clearing old cache:', cache);
                            return caches.delete(cache);
                        }
                    })
                );
            })
        ])
    );
});

// Fetch Event - NETWORK FIRST STRATEGY
// Versucht immer erst, das Netzwerk zu fragen. Nur wenn das fehlschlägt (offline), geht es an den Cache.
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Netzwerk war erfolgreich -> Antwort zurückgeben
                return response;
            })
            .catch(() => {
                // Netzwerk fehlgeschlagen (Offline) -> Im Cache nachsehen
                return caches.match(event.request);
            })
    );
});