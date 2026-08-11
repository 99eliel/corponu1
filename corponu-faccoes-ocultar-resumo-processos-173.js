(() => {
  "use strict";

  const VERSION = "2026-08-11-ocultar-resumo-processos-faccoes-173";
  if (window.__CORPONU_OCULTAR_RESUMO_PROCESSOS_FACCOES__ === VERSION) return;
  window.__CORPONU_OCULTAR_RESUMO_PROCESSOS_FACCOES__ = VERSION;

  const normalizar = valor => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function ocultarResumo() {
    const secao = document.getElementById("faccoes");
    if (!secao) return false;

    const titulo = [...secao.querySelectorAll("h1,h2,h3,h4,strong")]
      .find(el => normalizar(el.textContent) === "PROCESSOS DAS FACCOES");
    if (!titulo) return false;

    let alvo = titulo.parentElement;
    while (alvo && alvo !== secao) {
      const texto = normalizar(alvo.innerText || alvo.textContent);
      const botoes = alvo.querySelectorAll("button").length;
      if (texto.includes("PROCESSOS DAS FACCOES") && texto.includes("CLIQUE EM UM PROCESSO") && botoes >= 3) {
        if (alvo.dataset.corponuResumoProcessosOculto !== "1") {
          alvo.dataset.corponuResumoProcessosOculto = "1";
          alvo.hidden = true;
          alvo.style.setProperty("display", "none", "important");
          alvo.setAttribute("aria-hidden", "true");
        }
        return true;
      }
      alvo = alvo.parentElement;
    }
    return false;
  }

  let timer = 0;
  function agendar() {
    window.clearTimeout(timer);
    timer = window.setTimeout(ocultarResumo, 30);
  }

  function iniciarObserver() {
    const secao = document.getElementById("faccoes");
    if (!secao) return;
    new MutationObserver(agendar).observe(secao, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      ocultarResumo();
      iniciarObserver();
    }, { once: true });
  } else {
    ocultarResumo();
    iniciarObserver();
  }

  document.addEventListener("click", event => {
    if (event.target?.closest?.('[data-page="faccoes"]')) {
      [0, 100, 350].forEach(ms => window.setTimeout(ocultarResumo, ms));
    }
  }, true);
})();
