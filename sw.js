// Service worker PENJUALAN — app shell offline. Data tetap di IndexedDB + Supabase.
const VER = 'penjualan-v1';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];
const CDN_HOSTS = ['cdn.jsdelivr.net'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VER).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VER).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return; // API & realtime: jangan di-cache
  // Halaman: network-first agar update langsung terbaca, fallback cache saat offline
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(VER).then((c) => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then((m) => m || caches.match('./index.html') || caches.match('./'))));
    return;
  }
  // Aset statis & library CDN: cache-first + refresh di belakang
  if (url.origin === location.origin || CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then((m) => {
      const net = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(VER).then((c) => c.put(req, cp)); } return r; }).catch(() => m);
      return m || net;
    }));
  }
});
