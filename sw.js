const APP_VERSION = "2026-07-30-lancamento-manual-pagamentos-restantes-1";
const CACHE_NAME = `op-confeccao-${APP_VERSION}`;
const INJECT_MARKER = "data-corponu-release-injetado";
const INJECT_SCRIPTS = `
<script ${INJECT_MARKER}="${APP_VERSION}" src="./corponu-atualizador.js?v=${APP_VERSION}"></script>
<script ${INJECT_MARKER}="${APP_VERSION}" type="module" src="./corponu-pagamentos-manual.js?v=${APP_VERSION}"></script>`;

const CORE_ASSETS = [
  "./style.css?v=2026-07-27-resgate-chegada-manual-faccao-1",
  "./app.js?v=2026-07-27-resgate-chegada-manual-faccao-1",
  "./update.js?v=2026-07-29-restantes-faccoes-complementares-1",
  "./corponu-dual-mode.js?v=2026-07-29-restantes-faccoes-complementares-1",
  "./corponu-auditoria-op.js?v=2026-07-29-restantes-faccoes-complementares-1",
  `./corponu-atualizador.js?v=${APP_VERSION}`,
  `./corponu-pagamentos-manual.js?v=${APP_VERSION}`,
  "./corponu-release.json",
  "./calcinhas-historico-2026.json?v=2026-07-29-restantes-faccoes-complementares-1",
  "./valores-processos-corponu-2026.json?v=2026-07-29-restantes-faccoes-complementares-1"
];

function injetarScripts(html) {
  if (html.includes(INJECT_MARKER)) return html;
  if (html.includes("</body>")) return html.replace("</body>", `${INJECT_SCRIPTS}\n</body>`);
  return `${html}\n${INJECT_SCRIPTS}`;
}

async function respostaHtmlInjetada(request) {
  try {
    const resposta = await fetch(request, { cache: "no-store" });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const html = injetarScripts(await resposta.text());
    const headers = new Headers(resposta.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    const modificada = new Response(html, { status: resposta.status, statusText: resposta.statusText, headers });
    const cache = await caches.open(CACHE_NAME);
    cache.put("./index.html", modificada.clone());
    return modificada;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const salva = await cache.match("./index.html");
    if (salva) return salva;
    throw error;
  }
}

async function prepararIndexOffline() {
  try {
    const resposta = await fetch("./index.html", { cache: "no-store" });
    if (!resposta.ok) return;
    const html = injetarScripts(await resposta.text());
    const headers = new Headers(resposta.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    const cache = await caches.open(CACHE_NAME);
    await cache.put("./index.html", new Response(html, { status: 200, headers }));
  } catch (error) {}
}

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_ASSETS.map(asset => cache.add(asset)));
    await prepararIndexOffline();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const chaves = await caches.keys();
    await Promise.all(chaves.filter(chave => chave.startsWith("op-confeccao-") && chave !== CACHE_NAME).map(chave => caches.delete(chave)));
    await self.clients.claim();
    const clientes = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clientes.forEach(cliente => cliente.postMessage({ type: "CORPONU_UPDATE_READY", version: APP_VERSION }));
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirst(request) {
  try {
    const resposta = await fetch(request, { cache: "no-store" });
    if (resposta?.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, resposta.clone());
    }
    return resposta;
  } catch (error) {
    const salva = await caches.match(request);
    if (salva) return salva;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const salva = await caches.match(request);
  const rede = fetch(request).then(resposta => {
    if (resposta?.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, resposta.clone()));
    return resposta;
  }).catch(() => salva);
  return salva || rede;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) {
    event.respondWith(respostaHtmlInjetada(request));
    return;
  }
  if (
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/style.css") ||
    url.pathname.endsWith("/update.js") ||
    url.pathname.endsWith("/corponu-dual-mode.js") ||
    url.pathname.endsWith("/corponu-auditoria-op.js") ||
    url.pathname.endsWith("/corponu-atualizador.js") ||
    url.pathname.endsWith("/corponu-pagamentos-manual.js") ||
    url.pathname.endsWith("/corponu-release.json") ||
    url.pathname.endsWith("/version.json") ||
    url.pathname.endsWith("/calcinhas-historico-2026.json") ||
    url.pathname.endsWith("/dados-ligia-migracao.json") ||
    url.pathname.endsWith("/valores-processos-corponu-2026.json")
  ) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});
