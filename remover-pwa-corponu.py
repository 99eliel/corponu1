from pathlib import Path
import json
import re

VERSION = "2026-07-30-modo-web-sem-pwa-15"
UPDATED_AT = "2026-07-30T11:44:00-03:00"
LEGACY_VERSION = "2026-07-29-restantes-faccoes-complementares-1"


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding="utf-8")


# -----------------------------------------------------------------------------
# INDEX: site comum, scripts carregados diretamente e limpeza do PWA antigo.
# -----------------------------------------------------------------------------
index = read("index.html")

index = re.sub(
    r"\n?\s*<script>\s*\(function\(\)\s*\{[\s\S]*?RESCUE_VERSION[\s\S]*?</script>\s*",
    "\n",
    index,
    count=1,
    flags=re.IGNORECASE,
)

meta = f'<meta name="app-version" content="{VERSION}" />'
if re.search(r'<meta\s+name=["\']app-version["\'][^>]*>', index, flags=re.IGNORECASE):
    index = re.sub(
        r'<meta\s+name=["\']app-version["\'][^>]*>',
        meta,
        index,
        count=1,
        flags=re.IGNORECASE,
    )
else:
    index = index.replace("</head>", f"  {meta}\n</head>", 1)

for arquivo in ("style.css", "update.js", "app.js"):
    nome = re.escape(arquivo)
    index = re.sub(
        rf'((?:href|src)=["\'](?:\./)?{nome})(?:\?[^"\']*)?(["\'])',
        rf'\1?v={VERSION}\2',
        index,
        flags=re.IGNORECASE,
    )

limpeza_pwa = f'''  <script data-corponu-sem-pwa="{VERSION}">
    (() => {{
      const CACHE_PREFIX = "op-confeccao-";
      if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {{
        navigator.serviceWorker.getRegistrations()
          .then(registros => Promise.all(registros.map(registro => registro.unregister())))
          .catch(() => {{}});
      }}
      if ("caches" in window) {{
        caches.keys()
          .then(chaves => Promise.all(chaves.filter(chave => chave.startsWith(CACHE_PREFIX)).map(chave => caches.delete(chave))))
          .catch(() => {{}});
      }}
    }})();
  </script>'''

if "data-corponu-sem-pwa=" not in index:
    index = index.replace("</head>", f"{limpeza_pwa}\n</head>", 1)
else:
    index = re.sub(
        r'\s*<script\s+data-corponu-sem-pwa=["\'][^"\']+["\']>[\s\S]*?</script>',
        "\n" + limpeza_pwa,
        index,
        count=1,
        flags=re.IGNORECASE,
    )

scripts_diretos = [
    ("corponu-atualizador.js", False),
    ("corponu-pagamentos-seguro.js", False),
    ("corponu-pagamentos-manual.js", True),
    ("corponu-rastreamento-interno.js", False),
    ("corponu-necessidade-livre.js", False),
]

blocos = []
for arquivo, modulo in scripts_diretos:
    if arquivo not in index:
        tipo = ' type="module"' if modulo else ""
        blocos.append(f'  <script{tipo} src="./{arquivo}?v={VERSION}"></script>')
    else:
        nome = re.escape(arquivo)
        index = re.sub(
            rf'((?:src)=["\'](?:\./)?{nome})(?:\?[^"\']*)?(["\'])',
            rf'\1?v={VERSION}\2',
            index,
            flags=re.IGNORECASE,
        )

if blocos:
    index = index.replace("</body>", "\n" + "\n".join(blocos) + "\n</body>", 1)

write("index.html", index)


# -----------------------------------------------------------------------------
# UPDATE.JS: mantém os hotfixes, mas não registra Service Worker nem usa
# version.json para atualizar o site.
# -----------------------------------------------------------------------------
update = read("update.js")
update, total = re.subn(
    r'const APP_VERSION = "[^"]+";',
    f'const APP_VERSION = "{VERSION}";',
    update,
    count=1,
)
if total != 1:
    raise RuntimeError("Não foi possível atualizar APP_VERSION em update.js")

if "registerServiceWorker();" not in update:
    raise RuntimeError("Chamada registerServiceWorker() não encontrada em update.js")
update = update.replace(
    "    registerServiceWorker();",
    "    unregisterOldWorkers();\n    clearAppCaches();",
    1,
)
update = update.replace(
    "    checkVersionFile();",
    "    // Atualização agora é feita pelo navegador, sem PWA.",
    1,
)
update = update.replace(
    "    if (!document.hidden) checkVersionFile();",
    "    // Sem verificação pelo version.json legado.",
    1,
)
write("update.js", update)


# -----------------------------------------------------------------------------
# ATUALIZADOR: verifica apenas um JSON online e recarrega a página. Sem PWA.
# -----------------------------------------------------------------------------
atualizador = f'''(() => {{
  "use strict";

  if (window.__CORPONU_ATUALIZADOR_WEB__) return;

  const LOCAL_RELEASE = "{VERSION}";
  const INTERVALO_VERIFICACAO = 60 * 1000;
  const RELOAD_KEY = "corponu_web_release_recarregada";
  let verificando = false;

  window.__CORPONU_ATUALIZADOR_WEB__ = LOCAL_RELEASE;
  window.CORPONU_RELEASE_VERSION = LOCAL_RELEASE;

  async function removerPwaAntigo() {{
    try {{
      if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {{
        const registros = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registros.map(registro => registro.unregister()));
      }}
    }} catch (error) {{
      console.warn("Não foi possível remover o service worker antigo.", error);
    }}

    try {{
      if ("caches" in window) {{
        const chaves = await caches.keys();
        await Promise.all(
          chaves
            .filter(chave => chave.startsWith("op-confeccao-"))
            .map(chave => caches.delete(chave))
        );
      }}
    }} catch (error) {{
      console.warn("Não foi possível remover o cache antigo do PWA.", error);
    }}
  }}

  function mostrarAviso(mensagem) {{
    let aviso = document.getElementById("toastAtualizadorCorpoNu");
    if (!aviso) {{
      aviso = document.createElement("div");
      aviso.id = "toastAtualizadorCorpoNu";
      Object.assign(aviso.style, {{
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: "100000",
        background: "#111827",
        color: "#fff",
        padding: "12px 14px",
        borderRadius: "13px",
        boxShadow: "0 12px 30px rgba(15,23,42,.28)",
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontWeight: "800",
        maxWidth: "390px",
        lineHeight: "1.4"
      }});
      document.body.appendChild(aviso);
    }}
    aviso.textContent = mensagem;
  }}

  function recarregarUmaVez(versao) {{
    const release = String(versao || "").trim();
    if (!release || release === LOCAL_RELEASE) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get("release") === release) return;

    const chave = `${{RELOAD_KEY}}_${{release}}`;
    try {{
      const ultima = Number(sessionStorage.getItem(chave) || 0);
      if (Date.now() - ultima < 30000) return;
      sessionStorage.setItem(chave, String(Date.now()));
    }} catch (error) {{}}

    mostrarAviso("Nova versão encontrada. Atualizando a página...");
    url.searchParams.set("release", release);
    url.searchParams.set("t", String(Date.now()));
    setTimeout(() => window.location.replace(url.toString()), 250);
  }}

  async function verificarRelease() {{
    if (verificando) return;
    verificando = true;
    try {{
      const resposta = await fetch(`corponu-release.json?ts=${{Date.now()}}`, {{ cache: "no-store" }});
      if (!resposta.ok) return;
      const dados = await resposta.json();
      recarregarUmaVez(dados?.version);
    }} catch (error) {{
      console.warn("Não foi possível verificar a versão online do CorpoNu.", error);
    }} finally {{
      verificando = false;
    }}
  }}

  async function iniciar() {{
    await removerPwaAntigo();
    await verificarRelease();
    setInterval(verificarRelease, INTERVALO_VERIFICACAO);
    document.addEventListener("visibilitychange", () => {{
      if (!document.hidden) verificarRelease();
    }});
    window.addEventListener("focus", verificarRelease);
    window.addEventListener("online", verificarRelease);
  }}

  if (document.readyState === "loading") {{
    document.addEventListener("DOMContentLoaded", iniciar, {{ once: true }});
  }} else {{
    iniciar();
  }}
}})();
'''
write("corponu-atualizador.js", atualizador)


# -----------------------------------------------------------------------------
# SW AUTODESTRUTIVO: alcança instalações antigas e remove o próprio registro.
# -----------------------------------------------------------------------------
sw = f'''const REMOVAL_VERSION = "{VERSION}";

self.addEventListener("install", event => {{
  self.skipWaiting();
}});

self.addEventListener("activate", event => {{
  event.waitUntil((async () => {{
    try {{
      const chaves = await caches.keys();
      await Promise.all(
        chaves
          .filter(chave => chave.startsWith("op-confeccao-"))
          .map(chave => caches.delete(chave))
      );
    }} catch (error) {{}}

    try {{
      await self.registration.unregister();
    }} catch (error) {{}}

    const clientes = await self.clients.matchAll({{
      type: "window",
      includeUncontrolled: true
    }});

    clientes.forEach(cliente => {{
      cliente.postMessage({{
        type: "CORPONU_PWA_REMOVIDO",
        version: REMOVAL_VERSION
      }});
    }});
  }})());
}});

// Sem interceptação de requisições: o sistema passa a funcionar somente online.
'''
write("sw.js", sw)


release = {
    "version": VERSION,
    "updatedAt": UPDATED_AT,
    "notes": "Remove os recursos de PWA, cache offline e instalação. O CorpoNu passa a funcionar como site comum, com os módulos carregados diretamente e atualização simples pelo navegador.",
}
write("corponu-release.json", json.dumps(release, ensure_ascii=False, indent=2) + "\n")

print(f"Remoção do PWA preparada: {VERSION}")
