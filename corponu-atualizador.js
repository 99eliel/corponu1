(() => {
  "use strict";

  if (window.__CORPONU_ATUALIZADOR_NOVO__) return;

  const LOCAL_RELEASE = "2026-07-30-rastreamento-interno-sem-faccao-4";
  const LEGACY_VERSION = "2026-07-29-restantes-faccoes-complementares-1";
  const STORAGE_KEY = "corponu_release_instalada";
  const RELOAD_KEY = "corponu_release_recarregada";
  const INTERVALO_VERIFICACAO = 60 * 1000;
  const originalFetch = window.fetch.bind(window);

  window.__CORPONU_ATUALIZADOR_NOVO__ = LOCAL_RELEASE;
  window.CORPONU_RELEASE_VERSION = LOCAL_RELEASE;

  // Mantém o verificador legado sem executar o fluxo destrutivo de apagar
  // caches e desregistrar o PWA. O version.json continua apenas como ponte.
  window.fetch = function(input, init) {
    try {
      const endereco = typeof input === "string" ? input : input?.url;
      const url = new URL(endereco, window.location.href);
      if (url.pathname.endsWith("/version.json")) {
        return Promise.resolve(new Response(JSON.stringify({
          version: LEGACY_VERSION,
          updatedAt: "2026-07-30T01:32:00-03:00",
          notes: "Compatibilidade com o atualizador legado do CorpoNu."
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
          }
        }));
      }
    } catch (error) {
      console.warn("Falha ao tratar o version.json legado.", error);
    }
    return originalFetch(input, init);
  };

  function mostrarAviso(mensagem) {
    let aviso = document.getElementById("toastAtualizadorCorpoNu");
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.id = "toastAtualizadorCorpoNu";
      Object.assign(aviso.style, {
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
      });
      document.body.appendChild(aviso);
    }

    aviso.textContent = mensagem;
    clearTimeout(aviso._timer);
    aviso._timer = setTimeout(() => aviso.remove(), 6000);
  }

  function recarregarUmaVez(versao) {
    const release = String(versao || LOCAL_RELEASE).trim() || LOCAL_RELEASE;
    const url = new URL(window.location.href);

    // Se a própria URL já identifica esta versão, não recarrega de novo.
    if (url.searchParams.get("release") === release) return;

    const chave = `${RELOAD_KEY}_${release}`;
    try {
      const ultimaTentativa = Number(sessionStorage.getItem(chave) || 0);
      if (Date.now() - ultimaTentativa < 30000) return;
      sessionStorage.setItem(chave, String(Date.now()));
    } catch (error) {}

    url.searchParams.set("release", release);
    url.searchParams.delete("ts");
    url.searchParams.delete("t");
    window.location.replace(url.toString());
  }

  async function obterRegistroWorker() {
    if (!("serviceWorker" in navigator)) return null;

    // Usa o MESMO registro criado pelo update.js legado. Não registra o mesmo
    // sw.js com URLs diferentes, pois isso foi a causa do loop de carregamento.
    let registro = await navigator.serviceWorker.getRegistration("./").catch(() => null);
    if (!registro) {
      registro = await navigator.serviceWorker.register(
        `sw.js?v=${encodeURIComponent(LEGACY_VERSION)}`,
        { scope: "./", updateViaCache: "none" }
      );
    }

    return registro;
  }

  function ativarWorkerEmEspera(registro) {
    if (registro?.waiting) {
      registro.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  }

  function observarInstalacao(registro) {
    if (!registro || registro.__corponuObservado) return;
    registro.__corponuObservado = true;

    registro.addEventListener("updatefound", () => {
      const worker = registro.installing;
      if (!worker) return;

      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });
  }

  navigator.serviceWorker?.addEventListener("message", event => {
    if (event.data?.type !== "CORPONU_UPDATE_READY") return;
    recarregarUmaVez(event.data.version || LOCAL_RELEASE);
  });

  let verificando = false;

  async function verificarRelease(registro) {
    if (verificando) return;
    verificando = true;

    try {
      const resposta = await originalFetch(
        `corponu-release.json?ts=${Date.now()}`,
        { cache: "no-store" }
      );
      if (!resposta.ok) return;

      const dados = await resposta.json();
      const remota = String(dados?.version || "").trim();
      if (!remota) return;

      if (remota === LOCAL_RELEASE) {
        try {
          localStorage.setItem(STORAGE_KEY, remota);
        } catch (error) {}
        await registro?.update().catch(() => {});
        ativarWorkerEmEspera(registro);
        return;
      }

      mostrarAviso("Nova versão encontrada. O sistema será atualizado automaticamente.");

      // Atualiza o registro existente, sem trocar a URL do Service Worker.
      await registro?.update().catch(() => {});
      ativarWorkerEmEspera(registro);

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CHECK_UPDATE" });
      }
    } catch (error) {
      console.warn("Não foi possível verificar a nova versão do CorpoNu.", error);
    } finally {
      verificando = false;
    }
  }

  async function iniciar() {
    try {
      const registro = await obterRegistroWorker();
      observarInstalacao(registro);
      ativarWorkerEmEspera(registro);
      await verificarRelease(registro);

      setInterval(() => verificarRelease(registro), INTERVALO_VERIFICACAO);

      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) verificarRelease(registro);
      });
      window.addEventListener("focus", () => verificarRelease(registro));
      window.addEventListener("online", () => verificarRelease(registro));
    } catch (error) {
      console.warn("Atualizador automático do CorpoNu não iniciou.", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
