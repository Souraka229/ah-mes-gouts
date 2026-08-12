/**
 * Service worker de la boutique.
 *
 * Deux règles seulement, pour ne jamais servir un menu ou un stock périmé :
 *  - les ressources statiques (icônes, images, polices) : cache d'abord ;
 *  - tout le reste : réseau d'abord, avec repli hors-ligne.
 *
 * Aucune réponse d'API n'est mise en cache. Le menu du jour, le stock et les
 * créneaux changent en permanence : les servir depuis un cache ferait
 * commander des produits épuisés.
 */
const CACHE = "ge-shop-v1";
const OFFLINE_URL = "/offline";

const PRECACHE = [
  OFFLINE_URL,
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // `addAll` échoue en bloc si une seule ressource manque : on tolère
      // les absences pour ne jamais bloquer l'installation.
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
            .filter((key) => key.startsWith("ge-shop-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/pwa/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|jpe?g|webp|avif|svg|ico|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Jamais de cache sur les API ni sur le back-office.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              void caches.open(CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Pages : réseau d'abord. Hors ligne, on sert la page dédiée.
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
  }
});
