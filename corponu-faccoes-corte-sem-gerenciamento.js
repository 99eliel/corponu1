(() => {
  "use strict";

  const VERSION = "2026-07-30-faccoes-corte-sem-gerenciamento-26";
  if (window.__CORPONU_CORTE_SEM_GERENCIAMENTO__ === VERSION) return;
  window.__CORPONU_CORTE_SEM_GERENCIAMENTO__ = VERSION;

  function removerGerenciamentoDaAbaCorte() {
    document.getElementById("btnCorteGerenciar")?.remove();
    document.getElementById("cortePainelAdmin")?.remove();
  }

  function iniciar() {
    removerGerenciamentoDaAbaCorte();

    const observer = new MutationObserver(() => {
      removerGerenciamentoDaAbaCorte();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
