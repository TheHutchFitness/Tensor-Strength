// Service worker for Tensor Strength PWA.
// - Enables installability (Add to Home Screen).
// - Branded offline fallback for uncached navigations.
// - Offline reading: caches visited portal pages + Next.js static assets so a
//   member can reopen the app with no signal and still view their program and
//   workouts (workout data itself is restored from localStorage by the app).
const STATIC_CACHE = "ts-static-v2";
const PAGE_CACHE = "ts-pages-v2";
const OFFLINE_URL = "/offline.html";
const KEEP = [STATIC_CACHE, PAGE_CACHE];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Which same-origin assets are safe to cache-first (immutable / hashed / static).
function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/splash/") ||
    /\.(?:css|js|woff2?|ttf|png|jpg|jpeg|webp|svg|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Top-level navigations: network-first, cache a copy, fall back to cache then
  // the branded offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (sameOrigin && res && res.ok) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(req, res.clone());
          }
          return res;
        } catch (e) {
          const pageCache = await caches.open(PAGE_CACHE);
          const cachedPage = await pageCache.match(req, { ignoreSearch: true });
          if (cachedPage) return cachedPage;
          const staticCache = await caches.open(STATIC_CACHE);
          return (await staticCache.match(OFFLINE_URL)) || Response.error();
        }
      })()
    );
    return;
  }

  // Static assets: cache-first so the app shell renders offline.
  if (sameOrigin && isCacheableAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        } catch (e) {
          return hit || Response.error();
        }
      })()
    );
    return;
  }
  // Everything else (e.g. /api) passes through to the network.
});
