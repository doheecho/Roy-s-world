var CACHE_NAME = 'eroi-playground-v2';
var PRECACHE_URLS = [
    '/Roy-s-world/',
    '/Roy-s-world/index.html',
    '/Roy-s-world/manifest.json',
    '/Roy-s-world/css/style.css',
    '/Roy-s-world/js/main.js',
    '/Roy-s-world/js/games/memory.js',
    '/Roy-s-world/js/games/spatial.js',
    '/Roy-s-world/js/games/hangul.js',
    '/Roy-s-world/js/games/observation.js',
    '/Roy-s-world/js/games/logic.js',
    '/Roy-s-world/js/games/math.js',
    '/Roy-s-world/js/games/coding.js',
    '/Roy-s-world/icon-512x512.png'
];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(PRECACHE_URLS);
        }).then(function () {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.filter(function (k) { return k !== CACHE_NAME; })
                    .map(function (k) { return caches.delete(k); })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        caches.match(e.request).then(function (cached) {
            if (cached) return cached;
            return fetch(e.request).then(function (response) {
                if (response && response.status === 200 && response.type === 'basic') {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(e.request, clone);
                    });
                }
                return response;
            }).catch(function () {
                if (e.request.mode === 'navigate') return caches.match('/Roy-s-world/index.html');
            });
        })
    );
});
