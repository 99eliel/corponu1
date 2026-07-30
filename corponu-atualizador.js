(() => {
  "use strict";

  if (window.__CORPONU_ATUALIZADOR_WEB__) return;

  const LOCAL_RELEASE = "2026-07-30-revisao-tela-segura-20";
  const INTERVALO_VERIFICACAO = 60 * 1000;
  const RELOAD_KEY = "corponu_web_release_recarregada";
  const MODULO_REVISAO = "corponu-revisao-lateral-bojo.js";
  const MODULO_FIX_REVISAO = "corponu-revisao-lateral-bojo-fix.js";
  let verificando = false;

  window.__CORPONU_ATUALIZADOR_WEB__ = LOCAL_RELEASE;
  window.CORPONU_RELEASE_VERSION = LOCAL_RELEASE;

  // O PWA foi removido. Este sinal impede que o módulo financeiro antigo
  // volte a registrar service worker ou deixe o aviso de instalação preso.
  window.__corponuAutoUpdateIniciado = true;

  function removerAvisosAntigosDeAtualizacao() {
    [
      "corponuToastAtualizacaoAutomatica",
      "toastAtualizacaoSistema",
      "toastAtualizadorCorpoNu"
    ].forEach(id => document.getElementById(id)?.remove());

    document.querySelectorAll("body > div").forEach(elemento => {
      const texto = String(elemento.textContent || "").toLowerCase();
      if (
        texto.includes("nova versão encontrada. instalando automaticamente") ||
        texto.includes("nova versao encontrada. instalando automaticamente") ||
        texto.includes("atualização instalada. reabrindo o sistema") ||
        texto.includes("atualizacao instalada. reabrindo o sistema")
      ) {
        elemento.remove();
      }
    });
  }

  function observarAvisosAntigos() {
    removerAvisosAntigosDeAtualizacao();
    if (window.__CORPONU_OBSERVADOR_AVISO_PWA__) return;
    window.__CORPONU_OBSERVADOR_AVISO_PWA__ = true;

    const observer = new MutationObserver(removerAvisosAntigosDeAtualizacao);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Depois desse período os módulos da tela já terminaram a inicialização.
    setTimeout(() => observer.disconnect(), 30000);
  }

  function carregarScriptUnico(nomeArquivo, marcador, aoFalhar) {
    const existente = [...document.scripts].find(script =>
      String(script.src || "").includes(nomeArquivo)
    );
    if (existente) return existente;

    const script = document.createElement("script");
    script.src = `./${nomeArquivo}?v=${encodeURIComponent(LOCAL_RELEASE)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuModulo = marcador;
    script.onerror = () => console.error(aoFalhar);
    document.head.appendChild(script);
    return script;
  }

  function carregarCorrecaoRevisao() {
    if (window.__CORPONU_FIX_REVISAO_TELA__ === LOCAL_RELEASE) return;
    carregarScriptUnico(
      MODULO_FIX_REVISAO,
      "revisao-lateral-bojo-fix",
      "Não foi possível carregar a proteção da área Revisão lateral e bojo."
    );
  }

  function carregarModuloRevisao() {
    if (window.CorpoNuRevisaoComponentes?.versao) return;
    carregarScriptUnico(
      MODULO_REVISAO,
      "revisao-lateral-bojo",
      "Não foi possível carregar a área Revisão lateral e bojo."
    );
  }

  async function removerPwaAntigo() {
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
        const registros = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registros.map(registro => registro.unregister()));
      }
    } catch (error) {
      console.warn("Não foi possível remover o service worker antigo.", error);
    }

    try {
      if ("caches" in window) {
        const chaves = await caches.keys();
        await Promise.all(
          chaves
            .filter(chave => chave.startsWith("op-confeccao-"))
            .map(chave => caches.delete(chave))
        );
      }
    } catch (error) {
      console.warn("Não foi possível remover o cache antigo do PWA.", error);
    }
  }

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
    clearTimeout(aviso._corponuTimer);
    aviso._corponuTimer = setTimeout(() => aviso.remove(), 4500);
  }

  function recarregarUmaVez(versao) {
    const release = String(versao || "").trim();
    if (!release || release === LOCAL_RELEASE) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get("release") === release) return;

    const chave = `${RELOAD_KEY}_${release}`;
    try {
      const ultima = Number(sessionStorage.getItem(chave) || 0);
      if (Date.now() - ultima < 30000) return;
      sessionStorage.setItem(chave, String(Date.now()));
    } catch (error) {}

    mostrarAviso("Nova versão encontrada. Atualizando a página...");
    url.searchParams.set("release", release);
    url.searchParams.set("t", String(Date.now()));
    setTimeout(() => window.location.replace(url.toString()), 350);
  }

  async function verificarRelease() {
    if (verificando) return;
    verificando = true;
    try {
      const resposta = await fetch(`corponu-release.json?ts=${Date.now()}`, { cache: "no-store" });
      if (!resposta.ok) return;
      const dados = await resposta.json();
      recarregarUmaVez(dados?.version);
    } catch (error) {
      console.warn("Não foi possível verificar a versão online do CorpoNu.", error);
    } finally {
      verificando = false;
    }
  }

  async function iniciar() {
    observarAvisosAntigos();
    carregarCorrecaoRevisao();
    carregarModuloRevisao();
    await removerPwaAntigo();
    removerAvisosAntigosDeAtualizacao();
    await verificarRelease();
    setInterval(verificarRelease, INTERVALO_VERIFICACAO);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) verificarRelease();
    });
    window.addEventListener("focus", verificarRelease);
    window.addEventListener("online", verificarRelease);
  }

  // A proteção é carregada primeiro; ela cria a página antes de liberar o clique.
  carregarCorrecaoRevisao();
  carregarModuloRevisao();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
