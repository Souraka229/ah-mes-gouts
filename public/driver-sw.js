const CACHE_NAME = "amg-driver-assets-v2";
const ASSETS = ["/pwa/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("amg-driver-assets-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || request.mode === "navigate") return;

  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/pwa/") ||
    ["style", "script", "font", "image"].includes(request.destination);
  if (!cacheable) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) void cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
