(() => {
  "use strict";

  const VERSION = "2026-08-07-chegada-badge-compartilhado-153";
  if (window.__CORPONU_CHEGADA_BADGE_COMPARTILHADO_153__ === VERSION) return;
  window.__CORPONU_CHEGADA_BADGE_COMPARTILHADO_153__ = VERSION;

  let frame = 0;
  let aplicando = false;

  function idPrincipal(elemento) {
    return String(elemento?.dataset?.avisoChegadaBadge || "").trim();
  }

  function idGuard(elemento) {
    return String(elemento?.dataset?.chegadaAviso131 || "").trim();
  }

  function normalizarCelula(celula) {
    if (!(celula instanceof HTMLTableCellElement)) return;

    const principais = [...celula.querySelectorAll("[data-aviso-chegada-badge]")];
    if (!principais.length) return;

    const vistos = new Map();

    principais.forEach(principal => {
      const id = idPrincipal(principal);
      if (!id) return;

      // O mesmo badge passa a ser reconhecido pelos módulos 130 e 131.
      // Assim o 131 encontra este elemento e não cria uma segunda cópia.
      principal.dataset.chegadaAviso131 = id;

      if (!vistos.has(id)) {
        vistos.set(id, principal);
        return;
      }

      principal.remove();
    });

    vistos.forEach((principal, id) => {
      celula.querySelectorAll("[data-chegada-aviso-131]").forEach(elemento => {
        if (elemento === principal) return;
        if (idGuard(elemento) === id) elemento.remove();
      });
    });
  }

  function normalizarPagina() {
    if (aplicando) return;
    const pagina = document.getElementById("faccoes");
    if (!pagina) return;

    aplicando = true;
    try {
      pagina.querySelectorAll("td").forEach(normalizarCelula);
    } finally {
      aplicando = false;
    }
  }

  function agendar() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      normalizarPagina();
    });
  }

  function instalarEstilo() {
    if (document.getElementById("corponu-chegada-badge-compartilhado-153-style")) return;
    const style = document.createElement("style");
    style.id = "corponu-chegada-badge-compartilhado-153-style";
    style.textContent = `
      #faccoes [data-aviso-chegada-badge],
      #faccoes [data-chegada-aviso-131] {
        box-sizing: border-box;
        display: inline-flex;
        max-width: 230px !important;
        white-space: normal !important;
        overflow-wrap: anywhere;
        line-height: 1.25;
      }
    `;
    document.head.appendChild(style);
  }

  function iniciar() {
    instalarEstilo();
    normalizarPagina();

    const pagina = document.getElementById("faccoes");
    if (!pagina) return;

    const observer = new MutationObserver(agendar);
    observer.observe(pagina, { childList: true, subtree: true });

    [0, 50, 120, 250, 500, 900, 1500].forEach(atraso => {
      setTimeout(normalizarPagina, atraso);
    });
  }

  instalarEstilo();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
