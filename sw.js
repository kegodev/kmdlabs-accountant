const CACHE = "kmd-accountant-v3-auto-update-20260802";
const CACHE_PREFIX = "kmd-accountant-";
const OFFLINE_PAGE = "./index.html";

const ASSETS = [
  "./",
  "./assets/app-icon-1024.png",
  "./assets/apple-touch-icon.png",
  "./assets/favicon-32.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png",
  "./assets/km-digital-labs-logo.png",
  "./index.html",
  "./manifest.webmanifest",
  "./version-loader.js",
  "./version.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function networkFirst(request, fallbackUrl = null) {
  const cache = await caches.open(CACHE);

  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) return cache.match(fallbackUrl);
    throw error;
  }
}

async function cacheFirstWithRefresh(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);

  const refresh = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || refresh;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) return;

  const isVersionResource =
    url.pathname.endsWith("/version.json") ||
    url.pathname.endsWith("/version-loader.js") ||
    url.pathname.endsWith("/sw.js");

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, OFFLINE_PAGE));
    return;
  }

  if (isVersionResource) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirstWithRefresh(event.request));
});
