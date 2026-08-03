(() => {
  "use strict";

  const VERSION = "2026-08-03-remover-codigo-interno-alca-102";
  const BOTAO_ID = "btnCorteRegistrarChegada";
  const CODIGO_INTERNO_ALCA = "__CORPONU_ALCA__";

  if (window.__CORPONU_OCULTAR_CHEGADA_TOPO__ === VERSION) return;
  window.__CORPONU_OCULTAR_CHEGADA_TOPO__ = VERSION;

  function instalarEstilo() {
    if (document.getElementById("corponuStyleOcultarChegadaTopo102")) return;

    const style = document.createElement("style");
    style.id = "corponuStyleOcultarChegadaTopo102";
    style.textContent = `
      #painelFaccoesCorte #${BOTAO_ID} {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function ajustarAcessibilidade() {
    const botao = document.getElementById(BOTAO_ID);
    if (!(botao instanceof HTMLElement)) return;
    botao.setAttribute("aria-hidden", "true");
    botao.setAttribute("tabindex", "-1");
  }

  function limparSelectProcesso(select) {
    if (!(select instanceof HTMLSelectElement)) return;

    // O código técnico continua permitido somente no filtro interno da tabela.
    // Em qualquer formulário de saída ou chegada ele não pode aparecer.
    if (select.id !== "corteFiltroProcesso") {
      [...select.options]
        .filter(option => String(option.value || "").trim() === CODIGO_INTERNO_ALCA)
        .forEach(option => option.remove());
    }

    // Evita duas opções vazias com a mesma orientação.
    const vazias = [...select.options].filter(option => !String(option.value || "").trim());
    vazias.slice(1).forEach(option => option.remove());
  }

  function limparCodigosInternos(raiz = document) {
    raiz.querySelectorAll?.("select").forEach(limparSelectProcesso);
  }

  function iniciar() {
    instalarEstilo();
    ajustarAcessibilidade();
    limparCodigosInternos();

    let tentativas = 0;
    const timer = window.setInterval(() => {
      tentativas += 1;
      ajustarAcessibilidade();
      limparCodigosInternos();
      if (document.getElementById(BOTAO_ID) && document.getElementById("saidaCorteProcesso")) {
        window.clearInterval(timer);
      } else if (tentativas >= 40) {
        window.clearInterval(timer);
      }
    }, 250);

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node instanceof HTMLSelectElement) limparSelectProcesso(node);
          limparCodigosInternos(node);
        });

        if (mutation.target instanceof HTMLSelectElement) {
          limparSelectProcesso(mutation.target);
        }
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    window.addEventListener("pageshow", () => {
      ajustarAcessibilidade();
      limparCodigosInternos();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
