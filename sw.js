const APP_VERSION = "2026-07-29-processos-faccoes-gerenciados-1";
const CACHE_NAME = `op-confeccao-${APP_VERSION}`;

const CORE_ASSETS = [
  "./index.html",
  "./style.css?v=2026-07-27-resgate-chegada-manual-faccao-1",
  "./app.js?v=2026-07-27-resgate-chegada-manual-faccao-1",
  "./update.js?v=2026-07-29-processos-faccoes-gerenciados-1",
  "./corponu-dual-mode.js?v=2026-07-28-pagamentos-relatorio-pix-auditoria-1",
  "./corponu-auditoria-op.js?v=2026-07-28-pagamentos-relatorio-pix-auditoria-1",
  "./calcinhas-historico-2026.json?v=2026-07-28-pagamentos-relatorio-pix-auditoria-1",
  "./valores-processos-corponu-2026.json?v=2026-07-28-pagamentos-relatorio-pix-auditoria-1"
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
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request)
    .then(response => {
      if (response && response.ok) {
        caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => cached);
  return cached || networkPromise;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  if (
    request.mode === "navigate" ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/style.css") ||
    url.pathname.endsWith("/update.js") ||
    url.pathname.endsWith("/corponu-dual-mode.js") ||
    url.pathname.endsWith("/corponu-auditoria-op.js") ||
    url.pathname.endsWith("/calcinhas-historico-2026.json") ||
    url.pathname.endsWith("/version.json") ||
    url.pathname.endsWith("/dados-ligia-migracao.json") ||
    url.pathname.endsWith("/valores-processos-corponu-2026.json")
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
