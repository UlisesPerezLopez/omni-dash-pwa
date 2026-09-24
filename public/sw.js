const VERSION = "omnidash-v4";
const STATIC_CACHE = `${VERSION}-static`;
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE);
      await staticCache.addAll(APP_SHELL);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== CDN_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Strict Cache-First strategy for all assets & offline navigation fallback
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isCdn =
    url.hostname.includes("cdn.") ||
    url.hostname.includes("cdnjs.") ||
    url.hostname.includes("jsdelivr") ||
    url.hostname.includes("sheetjs");

  event.respondWith(
    (async () => {
      const cacheName = isCdn ? CDN_CACHE : STATIC_CACHE;
      const cache = await caches.open(cacheName);

      // 1. Check exact cache match
      const cached = await cache.match(request);
      if (cached) return cached;

      // 2. Network fetch with fallback
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          if (isCdn || url.origin === self.location.origin) {
            cache.put(request, response.clone());
          }
        }
        return response;
      } catch (err) {
        // 3. Fallback for navigation requests when offline
        if (request.mode === "navigate") {
          const appShell = (await cache.match("/index.html")) || (await cache.match("/"));
          if (appShell) return appShell;
        }
        // Fallback for icons or images
        if (request.destination === "image") {
          const icon = await cache.match("/icon.svg");
          if (icon) return icon;
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })()
  );
});