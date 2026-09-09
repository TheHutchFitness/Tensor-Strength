// Minimal service worker to satisfy PWA installability (Add to Home Screen).
// Intentionally does NOT cache anything — requests pass through to the network,
// so there is no risk of serving stale content.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A fetch handler must exist for installability; this one is a pure passthrough.
self.addEventListener("fetch", () => {
  // no event.respondWith() => browser handles the request normally (network)
});
