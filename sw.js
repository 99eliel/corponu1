const APP_VERSION = "2026-07-30-organizacao-autoupdate-pagamentos-2";
const CACHE_NAME = `op-confeccao-${APP_VERSION}`;
const INJECT_MARKER = "data-corponu-release-injetado";

const CORE_ASSETS = [
  `./style.css?v=${APP_VERSION}`,
  `./app.js?v=${APP_VERSION}`,
  `./update.js?v=${APP_VERSION}`,
  `./corponu-dual-mode.js?v=${APP_VERSION}`,
  `./corponu-auditoria-op.js?v=${APP_VERSION}`,
  `./corponu-atualizador.js?v=${APP_VERSION}`,
  `./corponu-pagamentos-seguro.js?v=${APP_VERSION}`,
  `./corponu-pagamentos-manual.js?v=${APP_VERSION}`,
  "./corponu-release.json",
  "./version.json",
  `./calcinhas-historico-2026.json?v=${APP_VERSION}`,
  `./valores-processos-corponu-2026.json?v=${APP_VERSION}`
];

const ARQUIVOS_VERSIONADOS = [
  "style.css",
  "app.js",
  "update.js",
  "corponu-dual-mode.js",
  "corponu-auditoria-op.js"
];

function escaparRegex(valor) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function versionarArquivoNoHtml(html, arquivo) {
  const nome = escaparRegex(arquivo);
  const regex = new RegExp(`((?:href|src)=["'](?:\\./)?${nome})(?:\\?[^"']*)?(["'])`, "gi");
  return html.replace(regex, `$1?v=${APP_VERSION}$2`);
}

function removerResgateLegado(html) {
  return html.replace(
    /<script\b[^>]*>[\s\S]*?\bRESCUE_VERSION\b[\s\S]*?<\/script>\s*/i,
    ""
  );
}

function atualizarMetaVersao(html) {
  const novaMeta = `<meta name="app-version" content="${APP_VERSION}" />`;
  if (/<meta\s+name=["']app-version["'][^>]*>/i.test(html)) {
    return html.replace(/<meta\s+name=["']app-version["'][^>]*>/i, novaMeta);
  }
  return html.replace("</head>", `  ${novaMeta}\n</head>`);
}

function montarScriptsAusentes(html) {
  const scripts = [];
  if (!html.includes("corponu-atualizador.js")) {
    scripts.push(`<script ${INJECT_MARKER}="${APP_VERSION}" src="./corponu-atualizador.js?v=${APP_VERSION}"></script>`);
  }
  if (!html.includes("corponu-pagamentos-seguro.js")) {
    scripts.push(`<script ${INJECT_MARKER}="${APP_VERSION}" src="./corponu-pagamentos-seguro.js?v=${APP_VERSION}"></script>`);
  }
  if (!html.includes("corponu-pagamentos-manual.js")) {
    scripts.push(`<script ${INJECT_MARKER}="${APP_VERSION}" type="module" src="./corponu-pagamentos-manual.js?v=${APP_VERSION}"></script>`);
  }
  return scripts.join("\n");
}

function prepararHtml(htmlOriginal) {
  let html = String(htmlOriginal || "");
  html = removerResgateLegado(html);
  html = atualizarMetaVersao(html);
  ARQUIVOS_VERSIONADOS.forEach(arquivo => {
    html = versionarArquivoNoHtml(html, arquivo);
  });

  const scripts = montarScriptsAusentes(html);
  if (!scripts) return html;
  if (html.includes("</body>")) return html.replace("</body>", `${scripts}\n</body>`);
  return `${html}\n${scripts}`;
}

async function respostaHtmlAtualizada(request) {
  try {
    const resposta = await fetch(request, { cache: "no-store" });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const html = prepararHtml(await resposta.text());
    const headers = new Headers(resposta.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

    const modificada = new Response(html, {
      status: resposta.status,
      statusText: resposta.statusText,
      headers
    });

    const cache = await caches.open(CACHE_NAME);
    await cache.put("./index.html", modificada.clone());
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
    const html = prepararHtml(await resposta.text());
    const headers = new Headers(resposta.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    const cache = await caches.open(CACHE_NAME);
    await cache.put("./index.html", new Response(html, { status: 200, headers }));
  } catch (error) {
    console.warn("Não foi possível preparar o index offline.", error);
  }
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
    await Promise.all(
      chaves
        .filter(chave => chave.startsWith("op-confeccao-") && chave !== CACHE_NAME)
        .map(chave => caches.delete(chave))
    );

    await self.clients.claim();
    const clientes = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    clientes.forEach(cliente => {
      cliente.postMessage({
        type: "CORPONU_UPDATE_READY",
        version: APP_VERSION
      });
    });
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CHECK_UPDATE") {
    event.waitUntil(
      self.registration.update().catch(error => {
        console.warn("Não foi possível verificar atualização.", error);
      })
    );
  }
});

async function networkFirst(request) {
  try {
    const resposta = await fetch(request, { cache: "no-store" });
    if (resposta?.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, resposta.clone());
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
  const rede = fetch(request).then(async resposta => {
    if (resposta?.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, resposta.clone());
    }
    return resposta;
  }).catch(() => salva);
  return salva || rede;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (
    request.mode === "navigate" ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html")
  ) {
    event.respondWith(respostaHtmlAtualizada(request));
    return;
  }

  if (
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/style.css") ||
    url.pathname.endsWith("/update.js") ||
    url.pathname.endsWith("/corponu-dual-mode.js") ||
    url.pathname.endsWith("/corponu-auditoria-op.js") ||
    url.pathname.endsWith("/corponu-atualizador.js") ||
    url.pathname.endsWith("/corponu-pagamentos-seguro.js") ||
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
