// Kévo service worker: cache shell assets, skip audio files
const CACHE = 'kevo-v1';
const ASSETS = [
  '/index1.html',
  '/style1.css',
  '/script1.js',
  '/icons/icon.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);
  // Bypass non-GET and audio
  if(e.request.method !== 'GET') return;
  if(url.pathname.endsWith('.mp3') || url.pathname.startsWith('/tracks/')) return;

  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request).then(net => {
      const clone = net.clone();
      // Cache CSS/JS/images only
      if(net.ok && /\.(css|js|png|svg|jpg|jpeg|webp|gif|ico|webmanifest)$/.test(url.pathname)){
        caches.open(CACHE).then(c=>c.put(e.request, clone)).catch(()=>{});
      }
      return net;
    }).catch(()=> caches.match('/index1.html')))
  );
});
