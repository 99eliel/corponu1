(() => {
  "use strict";

  const VERSION = "2026-07-30-pendencias-valores-scroll-seguro-39";
  const PAGE_ID = "pendenciasValoresFinanceiroPage";
  const CONTENT_ID = "pendenciasValoresFinanceiroConteudo";
  const MODAL_ID = "modalPendenciasValoresFinanceiro";
  const PAGE_BUTTON_ID = "btnAbrirPendenciasValoresPagina";

  if (window.__CORPONU_PENDENCIAS_SCROLL_FIX__ === VERSION) return;
  window.__CORPONU_PENDENCIAS_SCROLL_FIX__ = VERSION;

  let corrigindo = false;
  let observerBody = null;
  let observerHtml = null;
  let timerRevisao = 0;

  function paginaAtiva() {
    const pagina = document.getElementById(PAGE_ID);
    return Boolean(
      pagina &&
      pagina.classList.contains("active") &&
      !pagina.classList.contains("hidden") &&
      pagina.hidden !== true
    );
  }

  function modalVisivel(elemento) {
    if (!(elemento instanceof HTMLElement)) return false;
    if (elemento.classList.contains("hidden") || elemento.hidden) return false;
    return getComputedStyle(elemento).display !== "none";
  }

  function existeModalRealAberto() {
    return [...document.querySelectorAll(".corponu-pagamento-modal")].some(modal => {
      if (modal.id === MODAL_ID && modal.parentElement?.id === CONTENT_ID) return false;
      return modalVisivel(modal);
    });
  }

  function removerTravas(elemento) {
    if (!(elemento instanceof HTMLElement)) return;
    ["modal-open", "no-scroll", "noscroll", "overflow-hidden", "scroll-lock", "scroll-locked"]
      .forEach(classe => elemento.classList.remove(classe));
    ["overflow", "overflow-y", "position", "top", "width", "height", "max-height", "touch-action", "padding-right"]
      .forEach(propriedade => elemento.style.removeProperty(propriedade));
  }

  function liberarRolagem({ forcar = false } = {}) {
    if (corrigindo) return;
    const deveLiberar = forcar || paginaAtiva() || !existeModalRealAberto();
    if (!deveLiberar || existeModalRealAberto()) return;

    corrigindo = true;
    try {
      removerTravas(document.documentElement);
      removerTravas(document.body);
      document.documentElement.classList.toggle("pvp39-scroll-liberado", paginaAtiva());
      document.body.classList.toggle("pvp39-scroll-liberado", paginaAtiva());
    } finally {
      corrigindo = false;
    }
  }

  function retirarClasseDeRolagem() {
    document.documentElement.classList.remove("pvp39-scroll-liberado");
    document.body?.classList.remove("pvp39-scroll-liberado");
  }

  function agendarRevisao() {
    window.clearTimeout(timerRevisao);
    [0, 80, 180, 350, 700, 1300, 2500].forEach(atraso => {
      window.setTimeout(() => liberarRolagem(), atraso);
    });
    timerRevisao = window.setTimeout(() => liberarRolagem(), 4200);
  }

  function injetarEstilo() {
    if (document.getElementById("stylePendenciasValoresScroll39")) return;
    const style = document.createElement("style");
    style.id = "stylePendenciasValoresScroll39";
    style.textContent = `
      html.pvp39-scroll-liberado,
      body.pvp39-scroll-liberado {
        overflow-x: hidden !important;
        overflow-y: auto !important;
        position: static !important;
        top: auto !important;
        width: auto !important;
        height: auto !important;
        max-height: none !important;
        touch-action: auto !important;
      }
      #${PAGE_ID}.active {
        min-height: calc(100vh - 32px);
        overflow: visible !important;
      }
      #${CONTENT_ID} > #${MODAL_ID}.pvp38-integrado {
        overflow: visible !important;
        max-height: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function instalarObservers() {
    if (!document.body) return;
    observerBody?.disconnect();
    observerHtml?.disconnect();

    observerBody = new MutationObserver(() => {
      if (corrigindo) return;
      if (paginaAtiva()) liberarRolagem();
      else if (!existeModalRealAberto()) liberarRolagem({ forcar: true });
    });
    observerBody.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class"],
      childList: true
    });

    observerHtml = new MutationObserver(() => {
      if (!corrigindo && paginaAtiva()) liberarRolagem();
    });
    observerHtml.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"]
    });
  }

  function instalarEventos() {
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      if (alvo.closest(`#${PAGE_BUTTON_ID}`)) {
        agendarRevisao();
        return;
      }

      if (alvo.closest("#btnAtualizarPaginaPendencias")) {
        agendarRevisao();
        return;
      }

      if (alvo.closest("#btnVoltarPagamentosPendencias, .nav-btn[data-page]")) {
        retirarClasseDeRolagem();
        window.setTimeout(() => liberarRolagem({ forcar: true }), 0);
        window.setTimeout(() => liberarRolagem({ forcar: true }), 250);
      }
    }, true);

    window.addEventListener("pageshow", () => {
      if (paginaAtiva()) agendarRevisao();
      else liberarRolagem({ forcar: true });
    });

    window.addEventListener("focus", () => {
      if (paginaAtiva()) liberarRolagem();
    });
  }

  function iniciar() {
    injetarEstilo();
    instalarObservers();
    instalarEventos();
    liberarRolagem({ forcar: true });
    if (paginaAtiva()) agendarRevisao();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();