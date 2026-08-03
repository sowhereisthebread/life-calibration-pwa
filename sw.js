const CACHE_NAME = "life-calibration-v0.3.6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./data-core.js",
  "./data-store.js",
  "./app.js?v=0.3.6",
  "./manifest.json",
  "./icons/icon-192.png?v=0.3.4",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/brand-mark.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === "opaque") return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request).then(cached => {
        if (cached) return cached;
        if (event.request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      }))
  );
});
