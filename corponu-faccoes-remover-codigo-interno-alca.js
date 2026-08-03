(() => {
  "use strict";

  const VERSION = "2026-08-03-remover-codigo-interno-alca-102";
  const CODIGO_INTERNO = "__CORPONU_ALCA__";

  if (window.__CORPONU_REMOVER_CODIGO_INTERNO_ALCA__ === VERSION) return;
  window.__CORPONU_REMOVER_CODIGO_INTERNO_ALCA__ = VERSION;

  function limparSelect(select) {
    if (!(select instanceof HTMLSelectElement)) return;

    // O código técnico é usado somente pelo filtro interno da tabela.
    // Ele nunca deve aparecer como processo em formulários de saída ou chegada.
    if (select.id !== "corteFiltroProcesso") {
      [...select.options]
        .filter(option => String(option.value || "").trim() === CODIGO_INTERNO)
        .forEach(option => option.remove());
    }

    // Mantém somente uma opção vazia de orientação no mesmo seletor.
    const vazias = [...select.options].filter(option => !String(option.value || "").trim());
    vazias.slice(1).forEach(option => option.remove());
  }

  function limparTudo(raiz = document) {
    raiz.querySelectorAll?.("select").forEach(limparSelect);
  }

  function iniciar() {
    limparTudo();

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node instanceof HTMLSelectElement) limparSelect(node);
          limparTudo(node);
        });

        if (mutation.target instanceof HTMLSelectElement) {
          limparSelect(mutation.target);
        }
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (alvo?.closest("#btnCorteRegistrarSaida, [data-abrir-saida-corte], #btnAbrirSaidaFaccao")) {
        window.setTimeout(limparTudo, 0);
        window.setTimeout(limparTudo, 120);
      }
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
