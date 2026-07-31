(() => {
  "use strict";

  const VERSION = "2026-07-30-pendencias-modal-estavel-41";
  const MODAL_ID = "modalPendenciasValoresFinanceiro";
  const BOTAO_ORIGINAL_ID = "btnAtualizarConferenciaPagamentoFinal";
  const BOTAO_PAGINA_ANTIGA_ID = "btnAbrirPendenciasValoresPagina";
  const PAGINA_ANTIGA_ID = "pendenciasValoresFinanceiroPage";

  if (window.__CORPONU_PENDENCIAS_MODAL_ESTAVEL__ === VERSION) return;
  window.__CORPONU_PENDENCIAS_MODAL_ESTAVEL__ = VERSION;

  function injetarEstilos() {
    if (document.getElementById("stylePendenciasModalEstavel41")) return;
    const style = document.createElement("style");
    style.id = "stylePendenciasModalEstavel41";
    style.textContent = `
      #${MODAL_ID}.corponu-pagamento-modal {
        position: fixed !important;
        inset: 0 !important;
        z-index: 100000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: auto !important;
        max-width: none !important;
        height: auto !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 18px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: rgba(15, 23, 42, .68) !important;
        box-shadow: none !important;
        overflow: auto !important;
        backdrop-filter: blur(3px) !important;
      }
      #${MODAL_ID}.corponu-pagamento-modal.hidden,
      #${MODAL_ID}[hidden] {
        display: none !important;
      }
      #${MODAL_ID} > .corponu-pendencias-card,
      #${MODAL_ID} > .corponu-pagamento-modal-card {
        position: relative !important;
        width: min(1180px, 100%) !important;
        max-width: 1180px !important;
        max-height: calc(100vh - 36px) !important;
        margin: auto !important;
        padding: 0 !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 18px !important;
        background: #fff !important;
        box-shadow: 0 24px 70px rgba(15, 23, 42, .34) !important;
        overflow: hidden !important;
      }
      #${MODAL_ID} .corponu-pagamento-modal-header {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 16px !important;
      }
      #${MODAL_ID} .corponu-pagamento-modal-body {
        max-height: calc(100vh - 142px) !important;
        overflow: auto !important;
      }
      @media (max-width: 720px) {
        #${MODAL_ID}.corponu-pagamento-modal { padding: 10px !important; }
        #${MODAL_ID} > .corponu-pendencias-card,
        #${MODAL_ID} > .corponu-pagamento-modal-card {
          max-height: calc(100vh - 20px) !important;
          border-radius: 14px !important;
        }
        #${MODAL_ID} .corponu-pagamento-modal-body {
          max-height: calc(100vh - 120px) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function modalVisivel() {
    const modal = document.getElementById(MODAL_ID);
    if (!(modal instanceof HTMLElement)) return false;
    if (modal.hidden || modal.classList.contains("hidden")) return false;
    return getComputedStyle(modal).display !== "none";
  }

  function removerTravasGlobais() {
    if (modalVisivel()) return;
    [document.documentElement, document.body].forEach(elemento => {
      if (!(elemento instanceof HTMLElement)) return;
      ["modal-open", "no-scroll", "noscroll", "overflow-hidden", "scroll-lock", "scroll-locked", "pvp39-scroll-liberado"]
        .forEach(classe => elemento.classList.remove(classe));
      ["overflow", "overflow-y", "position", "top", "width", "height", "max-height", "touch-action", "padding-right"]
        .forEach(propriedade => elemento.style.removeProperty(propriedade));
    });
  }

  function limparRestosDaPaginaAntiga() {
    const paginaAntiga = document.getElementById(PAGINA_ANTIGA_ID);
    const estavaAtiva = Boolean(paginaAntiga?.classList.contains("active"));
    paginaAntiga?.remove();
    document.getElementById(BOTAO_PAGINA_ANTIGA_ID)?.remove();

    const original = document.getElementById(BOTAO_ORIGINAL_ID);
    if (original instanceof HTMLElement) {
      original.hidden = false;
      original.removeAttribute("hidden");
      original.style.removeProperty("display");
      original.textContent = "Ver pendências de valor";
      original.title = "Abrir pagamentos que ainda aguardam definição de valor";
    }

    if (estavaAtiva) {
      document.querySelectorAll("#appShell main.main > .page, main.main > .page").forEach(secao => secao.classList.remove("active"));
      const pagamentos = document.getElementById("pagamentos");
      pagamentos?.classList.remove("hidden");
      pagamentos?.removeAttribute("hidden");
      pagamentos?.classList.add("active");
      document.querySelectorAll(".nav-btn").forEach(botao => botao.classList.remove("active"));
      document.querySelector('.nav-btn[data-page="pagamentos"]')?.classList.add("active");
    }
  }

  function normalizarModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!(modal instanceof HTMLElement)) return false;

    modal.classList.remove("pag-v32-pendencias-simples", "pvp38-integrado");
    modal.style.removeProperty("width");
    modal.style.removeProperty("max-width");
    modal.style.removeProperty("height");
    modal.style.removeProperty("max-height");
    modal.style.removeProperty("position");
    modal.style.removeProperty("inset");
    modal.style.removeProperty("overflow");

    if (modal.parentElement !== document.body) document.body.appendChild(modal);

    const card = modal.querySelector(":scope > .corponu-pagamento-modal-card");
    card?.classList.remove("pag-v32-pendencias-simples");

    if (modalVisivel()) {
      document.body.style.overflow = "hidden";
    } else {
      removerTravasGlobais();
    }
    return true;
  }

  function revisarAbertura() {
    [0, 20, 80, 160, 320, 650, 1100].forEach(atraso => {
      window.setTimeout(() => {
        limparRestosDaPaginaAntiga();
        normalizarModal();
      }, atraso);
    });
  }

  function instalarEventos() {
    window.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      const botaoAntigo = alvo.closest(`#${BOTAO_PAGINA_ANTIGA_ID}`);
      if (botaoAntigo) {
        event.preventDefault();
        event.stopImmediatePropagation();
        limparRestosDaPaginaAntiga();
        document.getElementById(BOTAO_ORIGINAL_ID)?.click();
        revisarAbertura();
        return;
      }

      if (alvo.closest(`#${BOTAO_ORIGINAL_ID}`)) {
        revisarAbertura();
        return;
      }

      const modal = alvo.closest(`#${MODAL_ID}`);
      const fechar = alvo.closest(`#${MODAL_ID} .corponu-pagamento-modal-fechar, #btnFecharPendenciasValores`);
      if (fechar || (modal && alvo === modal)) {
        window.setTimeout(removerTravasGlobais, 0);
        window.setTimeout(removerTravasGlobais, 120);
      }

      if (alvo.closest(".nav-btn[data-page]")) {
        limparRestosDaPaginaAntiga();
        window.setTimeout(removerTravasGlobais, 0);
      }
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      window.setTimeout(removerTravasGlobais, 0);
      window.setTimeout(removerTravasGlobais, 120);
    });

    window.addEventListener("pageshow", () => {
      limparRestosDaPaginaAntiga();
      normalizarModal();
      removerTravasGlobais();
    });
  }

  function iniciar() {
    injetarEstilos();
    limparRestosDaPaginaAntiga();
    normalizarModal();
    removerTravasGlobais();
    instalarEventos();

    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      limparRestosDaPaginaAntiga();
      normalizarModal();
      if (tentativas >= 20 || document.getElementById(BOTAO_ORIGINAL_ID)) window.clearInterval(intervalo);
    }, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();