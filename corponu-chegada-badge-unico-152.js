(() => {
  "use strict";

  const VERSION = "2026-08-07-chegada-badge-unico-152";
  if (window.__CORPONU_CHEGADA_BADGE_UNICO_152__ === VERSION) return;
  window.__CORPONU_CHEGADA_BADGE_UNICO_152__ = VERSION;

  let aplicando = false;
  let frame = 0;

  function idDoBotao(botao) {
    if (!(botao instanceof Element)) return "";
    const direto = botao.dataset?.avisarChegada ||
      botao.dataset?.avisarChegada131 ||
      botao.dataset?.chegadaCorte || "";
    if (direto) return String(direto);

    const onclick = String(botao.getAttribute("onclick") || "");
    return onclick.match(/registrarChegadaMovimentacao\s*\(\s*['\"]([^'\"]+)['\"]/i)?.[1] || "";
  }

  function botaoChegadaDaCelula(celula) {
    return celula.querySelector(
      '[data-avisar-chegada], [data-avisar-chegada-131], [data-chegada-corte], [onclick*="registrarChegadaMovimentacao"]'
    );
  }

  function limparCelula(celula) {
    if (!(celula instanceof HTMLTableCellElement)) return;

    const principais = [...celula.querySelectorAll("[data-aviso-chegada-badge]")];
    const guards = [...celula.querySelectorAll("[data-chegada-aviso-131]")];
    const todos = [...principais, ...guards];
    if (todos.length <= 1) return;

    const botao = botaoChegadaDaCelula(celula);
    const idEsperado = idDoBotao(botao);

    let manter = null;
    if (idEsperado) {
      manter = principais.find(item => String(item.dataset.avisoChegadaBadge || "") === idEsperado) ||
        guards.find(item => String(item.dataset.chegadaAviso131 || "") === idEsperado) || null;
    }

    manter ||= principais[0] || guards[0] || null;
    if (!manter) return;

    todos.forEach(item => {
      if (item !== manter) item.remove();
    });

    // Se ficou o badge principal (130), marca a célula para a regra visual 141
    // continuar escondendo qualquer badge secundário que outro módulo tente criar.
    celula.classList.toggle(
      "corponu-chegada-badge-principal",
      manter.hasAttribute("data-aviso-chegada-badge")
    );
  }

  function limparPagina() {
    if (aplicando) return;
    const pagina = document.getElementById("faccoes");
    if (!pagina) return;

    aplicando = true;
    try {
      pagina.querySelectorAll("td").forEach(limparCelula);
    } finally {
      aplicando = false;
    }
  }

  function agendar() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      limparPagina();
    });
  }

  function instalarEstilo() {
    if (document.getElementById("corponu-chegada-badge-unico-152-style")) return;
    const style = document.createElement("style");
    style.id = "corponu-chegada-badge-unico-152-style";
    style.textContent = `
      #faccoes .faccoes-mov-table td:last-child {
        overflow: hidden;
      }
      #faccoes [data-aviso-chegada-badge],
      #faccoes [data-chegada-aviso-131] {
        box-sizing: border-box;
        max-width: 230px !important;
        white-space: normal !important;
        overflow-wrap: anywhere;
      }
    `;
    document.head.appendChild(style);
  }

  function iniciar() {
    instalarEstilo();
    limparPagina();

    const pagina = document.getElementById("faccoes");
    if (!pagina) return;

    const observer = new MutationObserver(agendar);
    observer.observe(pagina, { childList: true, subtree: true });

    // Limpezas curtas cobrem a primeira montagem da tabela e qualquer renderização
    // parcelada sem manter um intervalo permanente pesado.
    [0, 80, 220, 500, 1000, 1800].forEach(atraso => setTimeout(limparPagina, atraso));
  }

  instalarEstilo();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
