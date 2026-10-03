/**
 * Service worker du back-office.
 *
 * - Assets (JS/CSS/fonts/icônes) : stale-while-revalidate
 * - Navigations : réseau d'abord, repli `/admin/offline`
 * - Jamais de cache API (commandes / stock / paiements)
 */
const CACHE_NAME = "amg-admin-assets-v3";
const OFFLINE_URL = "/admin/offline";

const PRECACHE = [
  OFFLINE_URL,
  "/pwa/admin-icon-192.png",
  "/pwa/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(PRECACHE.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("amg-admin-assets-") && key !== CACHE_NAME,
            )
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

  // Jamais de cache sur les API.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations admin : réseau d'abord, shell hors-ligne en secours.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await caches.match(OFFLINE_URL)) ??
          new Response("Hors ligne", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
      ),
    );
    return;
  }

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
