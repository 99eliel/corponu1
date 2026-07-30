(() => {
  "use strict";

  if (window.__CORPONU_ATUALIZADOR_NOVO__) return;

  const LOCAL_RELEASE = "2026-07-30-organizacao-autoupdate-pagamentos-2";
  const LEGACY_VERSION = "2026-07-29-restantes-faccoes-complementares-1";
  const STORAGE_KEY = "corponu_release_instalada";
  const RELOAD_KEY = "corponu_release_recarregada";
  const INTERVALO_VERIFICACAO = 60 * 1000;
  const originalFetch = window.fetch.bind(window);

  window.__CORPONU_ATUALIZADOR_NOVO__ = LOCAL_RELEASE;
  window.CORPONU_RELEASE_VERSION = LOCAL_RELEASE;

  // Impede que o verificador antigo execute o fluxo destrutivo de apagar caches
  // e desregistrar o PWA. O version.json legado permanece apenas por compatibilidade.
  window.fetch = function(input, init) {
    try {
      const endereco = typeof input === "string" ? input : input?.url;
      const url = new URL(endereco, window.location.href);
      if (url.pathname.endsWith("/version.json")) {
        return Promise.resolve(new Response(JSON.stringify({
          version: LEGACY_VERSION,
          updatedAt: "2026-07-30T00:55:00-03:00",
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
    const chave = `${RELOAD_KEY}_${release}`;

    try {
      if (sessionStorage.getItem(chave) === "1") return;
      sessionStorage.setItem(chave, "1");
    } catch (error) {}

    const url = new URL(window.location.href);
    url.searchParams.set("release", release);
    url.searchParams.delete("ts");
    window.location.replace(url.toString());
  }

  async function registrarWorker(versao = LOCAL_RELEASE) {
    if (!("serviceWorker" in navigator)) return null;

    const release = String(versao || LOCAL_RELEASE).trim() || LOCAL_RELEASE;
    const registro = await navigator.serviceWorker.register(
      `sw.js?release=${encodeURIComponent(release)}`,
      { updateViaCache: "none" }
    );

    if (registro.waiting) {
      registro.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    registro.addEventListener("updatefound", () => {
      const worker = registro.installing;
      if (!worker) return;

      worker.addEventListener("statechange", () => {
        if (
          worker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });

    return registro;
  }

  let recarregamentoPorController = false;
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    if (recarregamentoPorController) return;
    recarregamentoPorController = true;
    recarregarUmaVez(window.__CORPONU_RELEASE_REMOTA__ || LOCAL_RELEASE);
  });

  navigator.serviceWorker?.addEventListener("message", event => {
    if (event.data?.type !== "CORPONU_UPDATE_READY") return;
    const versao = event.data.version || window.__CORPONU_RELEASE_REMOTA__ || LOCAL_RELEASE;
    recarregarUmaVez(versao);
  });

  let verificando = false;

  async function verificarRelease(registroAtual) {
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

      window.__CORPONU_RELEASE_REMOTA__ = remota;

      if (remota === LOCAL_RELEASE) {
        try {
          localStorage.setItem(STORAGE_KEY, remota);
        } catch (error) {}
        await registroAtual?.update().catch(() => {});
        return;
      }

      mostrarAviso("Nova versão encontrada. O sistema será atualizado e recarregado automaticamente.");

      const novoRegistro = await registrarWorker(remota);
      await novoRegistro?.update().catch(() => {});

      if (novoRegistro?.waiting) {
        novoRegistro.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      setTimeout(() => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "CHECK_UPDATE" });
        }
      }, 600);

      setTimeout(() => recarregarUmaVez(remota), 3500);
    } catch (error) {
      console.warn("Não foi possível verificar a nova versão do CorpoNu.", error);
    } finally {
      verificando = false;
    }
  }

  async function iniciar() {
    try {
      const registro = await registrarWorker(LOCAL_RELEASE);
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
