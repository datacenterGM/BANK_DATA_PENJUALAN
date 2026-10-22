// Service worker PENJUALAN — app shell offline. Data tetap di IndexedDB + Supabase.
const VER = 'penjualan-v4';
const SHELL = ['./', './index.html', './manifest-v2.json?v=2', './icons/pwa-192.png?v=2', './icons/pwa-512.png?v=2'];
// Library CDN yang dipakai index.html — di-cache SAAT INSTALL (bukan menunggu kunjungan ke-2)
const CDN_LIBS = [
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
  'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js'
];
const CDN_HOSTS = ['cdn.jsdelivr.net'];

// Tambah satu per satu: kalau satu file gagal (mis. ikon belum ada), yang lain tetap ter-cache.
async function addOne(cache, req) {
  try { const r = await fetch(req); if (r && (r.ok || r.type === 'opaque')) await cache.put(req, r); } catch (_) {}
}
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VER).then(async (c) => {
    await Promise.all([
      ...SHELL.map((u) => addOne(c, u)),
      ...CDN_LIBS.map((u) => addOne(c, new Request(u, { mode: 'no-cors' })))
    ]);
  }).then(() => self.skipWaiting()));
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
