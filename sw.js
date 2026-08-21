/* BANK DATA PENJUALAN — Service Worker */
const CACHE_NAME = 'bank-data-penjualan-v1';
const CORE_ASSETS = [
  './BANK_DATA_PENJUALAN.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/dexie@3.2.7/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of CORE_ASSETS) {
      try { await cache.add(url); } catch (err) { console.warn('[SW] core skip', url, err); }
    }
    for (const url of CDN_ASSETS) {
      try { await cache.add(url); } catch (err) { console.warn('[SW] CDN skip', url); }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // HTML / navigasi: network dulu, fallback cache (offline)
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
        return res;
      } catch (e) {
        return (await caches.match(req)) || (await caches.match('./BANK_DATA_PENJUALAN.html'));
      }
    })());
    return;
  }

  // Aset lain: cache dulu, lalu network
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.status === 200 &&
          (url.origin === self.location.origin || url.hostname.includes('jsdelivr.net'))) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      return cached;
    }
  })());
});
