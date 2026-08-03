(() => {
  "use strict";

  const VERSION = "2026-08-03-ocultar-chegada-topo-99";
  const BOTAO_ID = "btnCorteRegistrarChegada";

  if (window.__CORPONU_OCULTAR_CHEGADA_TOPO__ === VERSION) return;
  window.__CORPONU_OCULTAR_CHEGADA_TOPO__ = VERSION;

  function instalarEstilo() {
    if (document.getElementById("corponuStyleOcultarChegadaTopo99")) return;

    const style = document.createElement("style");
    style.id = "corponuStyleOcultarChegadaTopo99";
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

  function iniciar() {
    instalarEstilo();
    ajustarAcessibilidade();

    let tentativas = 0;
    const timer = window.setInterval(() => {
      tentativas += 1;
      ajustarAcessibilidade();
      if (document.getElementById(BOTAO_ID) || tentativas >= 40) {
        window.clearInterval(timer);
      }
    }, 250);

    window.addEventListener("pageshow", ajustarAcessibilidade);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
