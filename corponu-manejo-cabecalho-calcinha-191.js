(() => {
  "use strict";

  const VERSION = "2026-08-12-cabecalho-calcinha-estavel-191";
  const STYLE_ID = "styleManejoCabecalhoCalcinha191";
  const CLASSE_OCULTA = "calcinha191-coluna-nao-usada";
  const CLASSE_FASE = "calcinha191-fase-head";

  if (window.__CORPONU_MANEJO_CABECALHO_CALCINHA_191__ === VERSION) return;
  window.__CORPONU_MANEJO_CABECALHO_CALCINHA_191__ = VERSION;

  let aplicando = false;
  let quadroAgendado = 0;
  let observerTabela = null;
  let observerSetor = null;

  function calcinhaAtiva() {
    const botao = document.querySelector('.manejo-setor-btn.active');
    if (botao?.dataset?.setor) return botao.dataset.setor === "calcinha";
    return document.body?.dataset?.corponuManejoTipo === "calcinha";
  }

  function injetarEstilos() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body[data-corponu-manejo-tipo="calcinha"] #manejo .${CLASSE_OCULTA}{
        display:none!important;
      }

      body[data-corponu-manejo-tipo="calcinha"] #manejo th[data-corponu-line-head="1"]{
        display:table-cell!important;
        font-size:0!important;
      }
      body[data-corponu-manejo-tipo="calcinha"] #manejo th[data-corponu-line-head="1"]::after{
        content:"LINHA";
        font-size:clamp(13px,.72vw,14px)!important;
        font-weight:800;
        letter-spacing:.005em;
      }

      body[data-corponu-manejo-tipo="calcinha"] #manejo th.${CLASSE_FASE}{
        font-size:0!important;
      }
      body[data-corponu-manejo-tipo="calcinha"] #manejo th.${CLASSE_FASE}::after{
        content:"FASE";
        font-size:clamp(13px,.72vw,14px)!important;
        font-weight:800;
        letter-spacing:.005em;
      }
    `;
    document.head.appendChild(style);
  }

  function indiceDaCelula(linha, celula) {
    if (!linha || !celula) return -1;
    return Array.prototype.indexOf.call(linha.children, celula);
  }

  function marcarColunaPeloFiltro(idFiltro, classeExtra = "") {
    const tabela = document.querySelector("#manejo .manejo-inline-table");
    const cabecalho = tabela?.querySelector("thead .manejo-head-row");
    const filtros = tabela?.querySelector("thead .manejo-filter-row");
    const campo = document.getElementById(idFiltro);
    const filtroTh = campo?.closest("th");
    if (!tabela || !cabecalho || !filtros || !filtroTh) return -1;

    const indice = indiceDaCelula(filtros, filtroTh);
    if (indice < 0) return -1;

    const cabecalhoTh = cabecalho.children[indice];
    if (cabecalhoTh) {
      cabecalhoTh.classList.add(CLASSE_OCULTA);
      if (classeExtra) cabecalhoTh.classList.add(classeExtra);
    }
    filtroTh.classList.add(CLASSE_OCULTA);

    tabela.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']").forEach(linha => {
      linha.children[indice]?.classList.add(CLASSE_OCULTA);
    });
    return indice;
  }

  function marcarFase() {
    const tabela = document.querySelector("#manejo .manejo-inline-table");
    const cabecalho = tabela?.querySelector("thead .manejo-head-row");
    const filtros = tabela?.querySelector("thead .manejo-filter-row");
    const filtroFase = document.getElementById("filtroManejoFase")?.closest("th");
    if (!cabecalho || !filtros || !filtroFase) return;

    const indice = indiceDaCelula(filtros, filtroFase);
    if (indice < 0) return;
    cabecalho.children[indice]?.classList.add(CLASSE_FASE);
  }

  function garantirLinhaMarcada() {
    const tabela = document.querySelector("#manejo .manejo-inline-table");
    if (!tabela) return;

    const cabecalho = tabela.querySelector("thead .manejo-head-row");
    const filtros = tabela.querySelector("thead .manejo-filter-row");
    const linhaHead = cabecalho?.querySelector('th[data-corponu-line-head="1"]');
    const linhaFiltro = filtros?.querySelector('th[data-corponu-line-filter="1"]');

    linhaHead?.classList.remove(CLASSE_OCULTA);
    linhaFiltro?.classList.remove(CLASSE_OCULTA);
    tabela.querySelectorAll('#listaManejoInline tr[data-manejo-row="1"] [data-corponu-line-cell="1"]')
      .forEach(celula => celula.classList.remove(CLASSE_OCULTA));
  }

  function aplicarSomenteCalcinha() {
    if (aplicando || !calcinhaAtiva()) return;
    const tabela = document.querySelector("#manejo .manejo-inline-table");
    if (!tabela) return;

    aplicando = true;
    try {
      injetarEstilos();
      garantirLinhaMarcada();

      // Identifica as colunas pelo próprio filtro, e não pelo texto do cabeçalho.
      // Assim SILK/TECIDO continuam ocultos mesmo que outro módulo renomeie os THs.
      marcarColunaPeloFiltro("filtroManejoSilk");
      marcarColunaPeloFiltro("filtroManejoDataTecido");
      marcarFase();
    } finally {
      aplicando = false;
    }
  }

  function agendar() {
    if (quadroAgendado) return;
    quadroAgendado = requestAnimationFrame(() => {
      quadroAgendado = 0;
      aplicarSomenteCalcinha();
    });
  }

  function observarTabela() {
    const tabela = document.querySelector("#manejo .manejo-inline-table");
    if (!tabela || observerTabela) return;

    observerTabela = new MutationObserver(() => {
      if (calcinhaAtiva()) agendar();
    });
    observerTabela.observe(tabela, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function observarSetor() {
    if (observerSetor) return;
    const alvo = document.getElementById("manejo") || document.body;
    observerSetor = new MutationObserver(() => {
      observarTabela();
      if (calcinhaAtiva()) agendar();
    });
    observerSetor.observe(alvo, {
      attributes: true,
      subtree: true,
      attributeFilter: ["class", "data-corponu-manejo-tipo"]
    });
  }

  function instalarEventos() {
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      if (alvo.closest('.manejo-setor-btn[data-setor="calcinha"]')) {
        [0, 40, 120, 260].forEach(atraso => window.setTimeout(agendar, atraso));
      }
      if (alvo.closest('.nav-btn[data-page="manejo"]') && calcinhaAtiva()) {
        [40, 140, 300].forEach(atraso => window.setTimeout(agendar, atraso));
      }
    }, true);
  }

  function iniciar() {
    injetarEstilos();
    observarTabela();
    observarSetor();
    instalarEventos();
    if (calcinhaAtiva()) {
      agendar();
      window.setTimeout(agendar, 120);
      window.setTimeout(agendar, 350);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
