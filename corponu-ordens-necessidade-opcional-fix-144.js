(() => {
  "use strict";

  const VERSION = "2026-08-07-calcinha-aba-fix-144";
  const MODULO_142 = "corponu-ordens-necessidade-opcional-142.js";
  const VERSAO_142 = "2026-08-07-ordens-necessidade-opcional-142";

  if (window.__CORPONU_CALCINHA_ABA_FIX_144__ === VERSION) return;
  window.__CORPONU_CALCINHA_ABA_FIX_144__ = VERSION;

  const MutationObserverOriginal = window.MutationObserver;
  let restaurado = false;

  function ehMutacaoInternaDaNecessidade142(registro) {
    const alvo = registro?.target instanceof Element
      ? registro.target
      : registro?.target?.parentElement;

    if (!alvo?.closest) return false;

    return Boolean(
      alvo.closest("#ordemCalcinhaPlanejamento .notice.small") ||
      alvo.closest("#formOrdem .panel-header p")
    );
  }

  class MutationObserverProtegido144 {
    constructor(callback) {
      this._callback = callback;
      this._filtrarNecessidade142 = false;
      this._observer = new MutationObserverOriginal((registros) => {
        if (!this._filtrarNecessidade142) {
          this._callback(registros, this);
          return;
        }

        const relevantes = registros.filter(registro => !ehMutacaoInternaDaNecessidade142(registro));
        if (relevantes.length) this._callback(relevantes, this);
      });
    }

    observe(alvo, opcoes) {
      if (
        alvo === document.documentElement &&
        opcoes?.childList === true &&
        opcoes?.subtree === true
      ) {
        this._filtrarNecessidade142 = true;
      }
      return this._observer.observe(alvo, opcoes);
    }

    disconnect() {
      return this._observer.disconnect();
    }

    takeRecords() {
      return this._observer.takeRecords();
    }
  }

  function restaurarMutationObserver() {
    if (restaurado) return;
    restaurado = true;
    if (window.MutationObserver === MutationObserverProtegido144) {
      window.MutationObserver = MutationObserverOriginal;
    }
  }

  function carregar142ComProtecao() {
    const existente = [...document.scripts].find(script => String(script.src || "").includes(MODULO_142));
    if (existente) {
      restaurarMutationObserver();
      return;
    }

    window.MutationObserver = MutationObserverProtegido144;

    const script = document.createElement("script");
    script.src = `./${MODULO_142}?v=${encodeURIComponent(VERSAO_142)}&fix=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuModulo = "ordens-necessidade-opcional-142-protegido-144";
    script.onload = () => restaurarMutationObserver();
    script.onerror = () => {
      restaurarMutationObserver();
      console.error("[Calcinha 144] Não foi possível carregar a necessidade opcional protegida.");
    };
    document.head.appendChild(script);

    window.setTimeout(restaurarMutationObserver, 10000);
  }

  carregar142ComProtecao();
})();
