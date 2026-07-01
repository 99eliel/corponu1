const APP_VERSION = "2026-07-01-fix-pagamento-manejo-1";
const CACHE_NAME = `op-confeccao-${APP_VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css?v=2026-07-01-fix-pagamento-manejo-1",
  "./app.js?v=2026-07-01-fix-pagamento-manejo-1",
  "./update.js?v=2026-07-01-fix-pagamento-manejo-1",
  "./version.json"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(() => null)
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith("op-confeccao-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    request.mode === "navigate" ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/style.css") ||
    url.pathname.endsWith("/update.js") ||
    url.pathname.endsWith("/version.json")
  ) {
    event.respondWith(networkFirst(request));
  }
});
