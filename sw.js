const APP_VERSION = "2026-07-29-pendencias-organizadas-auto-update-4";
const CACHE_NAME = `op-confeccao-${APP_VERSION}`;
const PAGAMENTOS_SAFE_FILE = `./corponu-pagamentos-seguro.js?v=${encodeURIComponent(APP_VERSION)}`;
const RELEASE_MANIFEST = "./corponu-release.json";

// Todos os arquivos principais recebem a mesma versão para impedir que o
// GitHub Pages, o navegador ou um proxy mantenha uma cópia antiga.
const CORE_ASSETS = [
  "./index.html",
  `./style.css?v=${encodeURIComponent(APP_VERSION)}`,
  `./app.js?v=${encodeURIComponent(APP_VERSION)}`,
  `./update.js?v=${encodeURIComponent(APP_VERSION)}`,
  `./corponu-dual-mode.js?v=${encodeURIComponent(APP_VERSION)}`,
  `./corponu-auditoria-op.js?v=${encodeURIComponent(APP_VERSION)}`,
  `./calcinhas-historico-2026.json?v=${encodeURIComponent(APP_VERSION)}`,
  `./valores-processos-corponu-2026.json?v=${encodeURIComponent(APP_VERSION)}`,
  `${RELEASE_MANIFEST}?v=${encodeURIComponent(APP_VERSION)}`,
  PAGAMENTOS_SAFE_FILE
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(error => {
        console.warn("Alguns arquivos não puderam ser pré-carregados.", error);
      })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith("op-confeccao-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
    const clientes = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clientes.forEach(cliente => cliente.postMessage({
      type: "CORPONU_SW_ATIVADO",
      version: APP_VERSION
    }));
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "QUAL_VERSAO") {
    event.source?.postMessage({ type: "VERSAO_ATUAL", version: APP_VERSION });
  }
});

function injetarModuloPagamentos(html) {
  const texto = String(html || "");
  // Remove uma inclusão anterior para sempre usar o arquivo da versão atual.
  const limpo = texto.replace(/\s*<script[^>]+src=["'][^"']*corponu-pagamentos-seguro\.js[^"']*["'][^>]*><\/script>\s*/gi, "\n");
  const script = `\n  <script src="${PAGAMENTOS_SAFE_FILE}"></script>\n`;
  if (/<\/body>/i.test(limpo)) return limpo.replace(/<\/body>/i, `${script}</body>`);
  return `${limpo}${script}`;
}

async function respostaHtmlComModulo(response) {
  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=UTF-8");
  headers.set("cache-control", "no-cache, no-store, must-revalidate");
  return new Response(injetarModuloPagamentos(html), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function paginaNetworkFirst(request) {
  try {
    const url = new URL(request.url);
    url.searchParams.set("swv", APP_VERSION);
    url.searchParams.set("ts", Date.now().toString());
    const response = await fetch(new Request(url.toString(), request), { cache: "no-store" });
    if (response?.ok) {
      const respostaFinal = await respostaHtmlComModulo(response);
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, respostaFinal.clone());
      return respostaFinal;
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request) || await caches.match("./index.html");
    if (cached) return respostaHtmlComModulo(cached);
    throw error;
  }
}

async function networkFirst(request) {
  try {
    const url = new URL(request.url);
    url.searchParams.set("v", APP_VERSION);
    const response = await fetch(new Request(url.toString(), request), { cache: "no-store" });
    if (response?.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
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
  const networkPromise = fetch(request, { cache: "no-cache" })
    .then(response => {
      if (response?.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    })
    .catch(() => cached);
  return cached || networkPromise;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) {
    event.respondWith(paginaNetworkFirst(request));
    return;
  }

  if (
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/style.css") ||
    url.pathname.endsWith("/update.js") ||
    url.pathname.endsWith("/corponu-dual-mode.js") ||
    url.pathname.endsWith("/corponu-auditoria-op.js") ||
    url.pathname.endsWith("/corponu-pagamentos-seguro.js") ||
    url.pathname.endsWith("/calcinhas-historico-2026.json") ||
    url.pathname.endsWith("/version.json") ||
    url.pathname.endsWith("/corponu-release.json") ||
    url.pathname.endsWith("/dados-ligia-migracao.json") ||
    url.pathname.endsWith("/valores-processos-corponu-2026.json")
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
