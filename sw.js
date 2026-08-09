const CACHE_NAME = "life-calibration-v0.4.10";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=0.4.10",
  "./data-core.js",
  "./data-store.js",
  "./app.js?v=0.4.10",
  "./manifest.json",
  "./icons/icon-192.png?v=0.3.4",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/brand-mark.png",
  // 自帶等寬字：離線可用是產品邊界，不依賴 Google Fonts CDN
  "./fonts/ibm-plex-mono-400.woff2",
  "./fonts/ibm-plex-mono-500.woff2"
];
const APP_SHELL_URLS = new Set(APP_SHELL.map(path => new URL(path, self.registration.scope).href));
const NETWORK_TIMEOUT_MS = 3000;

async function fetchAndCache(request, timeoutMs = 0) {
  const controller = timeoutMs ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(request, controller ? { signal: controller.signal } : undefined);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function appShellFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = request.mode === "navigate"
    ? await cache.match("./index.html")
    : await cache.match(request);
  if (cached) return cached;
  return fetchAndCache(request, NETWORK_TIMEOUT_MS);
}

async function boundedNetworkFirst(request) {
  try {
    return await fetchAndCache(request, NETWORK_TIMEOUT_MS);
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

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
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const scopeUrl = new URL(self.registration.scope);
  const sameOrigin = url.origin === self.location.origin;
  const relativePath = sameOrigin && url.pathname.startsWith(scopeUrl.pathname)
    ? url.pathname.slice(scopeUrl.pathname.length)
    : null;
  const isAppNavigation = request.mode === "navigate" && (relativePath === "" || relativePath === "index.html");
  const useAppShell = sameOrigin && (isAppNavigation || APP_SHELL_URLS.has(request.url));
  event.respondWith(useAppShell ? appShellFirst(request) : boundedNetworkFirst(request));
});
