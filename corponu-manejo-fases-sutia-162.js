(() => {
  "use strict";

  const VERSION = "2026-08-08-manejo-fases-sutia-162";
  const STYLE_ID = "corponuManejoFasesSutia162Style";
  const COL_ATTR = "data-fase-lateral-162";
  const OLD_COL_ATTR = "data-fase-lateral-161";

  if (window.__CORPONU_MANEJO_FASES_SUTIA_162__ === VERSION) return;
  window.__CORPONU_MANEJO_FASES_SUTIA_162__ = VERSION;

  let aplicando = false;
  let observer = null;

  function setorAtual() {
    return document.querySelector('.manejo-setor-btn.active[data-setor]')?.dataset?.setor || "sutia";
  }

  function paginaManejoAtiva() {
    const pagina = document.getElementById("manejo");
    return !!pagina && (pagina.classList.contains("active") || pagina.getClientRects().length > 0);
  }

  function injetarEstilo() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #manejo .manejo-inline-table th[${COL_ATTR}],
      #manejo .manejo-inline-table td[${COL_ATTR}]{min-width:130px;text-align:center}
      #manejo .manejo-inline-table td[${COL_ATTR}] input{width:100%;min-width:110px;box-sizing:border-box}
      #manejo .manejo-inline-table th[${COL_ATTR}] .fase-lateral-filtro-vazio-162{display:block;min-height:34px}
    `;
    document.head.appendChild(style);
  }

  function limparColunasCriadas() {
    document.querySelectorAll(`#manejo [${OLD_COL_ATTR}], #manejo [${COL_ATTR}]`).forEach(el => el.remove());
  }

  function thFiltro(idInput) {
    return document.getElementById(idInput)?.closest("th") || null;
  }

  function indiceColunaPorFiltro(idInput) {
    const th = thFiltro(idInput);
    return th && Number.isInteger(th.cellIndex) ? th.cellIndex : -1;
  }

  function thCabecalhoNoIndice(indice) {
    if (indice < 0) return null;
    const linha = document.querySelector("#manejo .manejo-head-row");
    return linha?.cells?.[indice] || null;
  }

  function restaurarTitulosBase() {
    const indiceTecido = indiceColunaPorFiltro("filtroManejoDataTecido");
    const thTecido = thCabecalhoNoIndice(indiceTecido);
    if (thTecido) thTecido.textContent = "TECIDO";

    const indiceFase = indiceColunaPorFiltro("filtroManejoFase");
    const thFase = thCabecalhoNoIndice(indiceFase);
    if (thFase) thFase.textContent = setorAtual() === "sutia" ? "FASE BOJO" : "FASE";
  }

  function garantirCabecalhoLateral(indiceFase) {
    const headRow = document.querySelector("#manejo .manejo-head-row");
    const thFase = thCabecalhoNoIndice(indiceFase);
    if (!headRow || !thFase || headRow.querySelector(`th[${COL_ATTR}]`)) return;

    const th = document.createElement("th");
    th.setAttribute(COL_ATTR, "1");
    th.textContent = "FASE LATERAL";
    thFase.insertAdjacentElement("afterend", th);
  }

  function garantirFiltroLateral() {
    const thFaseFiltro = thFiltro("filtroManejoFase");
    const filterRow = document.querySelector("#manejo .manejo-filter-row");
    if (!filterRow || !thFaseFiltro || filterRow.querySelector(`th[${COL_ATTR}]`)) return;

    const th = document.createElement("th");
    th.setAttribute(COL_ATTR, "1");
    th.setAttribute("aria-label", "Fase lateral");
    th.innerHTML = '<span class="fase-lateral-filtro-vazio-162" aria-hidden="true"></span>';
    thFaseFiltro.insertAdjacentElement("afterend", th);
  }

  function garantirCamposLaterais(indiceFase) {
    if (indiceFase < 0) return;

    document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']").forEach(row => {
      if (row.querySelector(`td[${COL_ATTR}]`)) return;
      const tdFase = row.cells?.[indiceFase];
      if (!tdFase) return;

      const td = document.createElement("td");
      td.setAttribute(COL_ATTR, "1");
      td.innerHTML = '<input type="text" value="" placeholder="" aria-label="Fase Lateral" autocomplete="off" />';
      tdFase.insertAdjacentElement("afterend", td);
    });
  }

  function restaurarCalcinha() {
    limparColunasCriadas();
    restaurarTitulosBase();
  }

  function aplicarSutia() {
    // Remove qualquer coluna criada pela 161 antes de reconstruir pela coluna real da Fase.
    limparColunasCriadas();
    restaurarTitulosBase();

    const indiceFase = indiceColunaPorFiltro("filtroManejoFase");
    if (indiceFase < 0) return;

    garantirCabecalhoLateral(indiceFase);
    garantirFiltroLateral();
    garantirCamposLaterais(indiceFase);
  }

  function aplicar() {
    if (aplicando || !paginaManejoAtiva()) return;
    aplicando = true;
    try {
      injetarEstilo();
      if (setorAtual() === "sutia") aplicarSutia();
      else restaurarCalcinha();
    } finally {
      aplicando = false;
    }
  }

  function agendar() {
    requestAnimationFrame(() => {
      aplicar();
      setTimeout(aplicar, 80);
    });
  }

  function observarTabela() {
    const tbody = document.getElementById("listaManejoInline");
    if (!tbody || observer) return;
    observer = new MutationObserver(() => {
      if (!aplicando) agendar();
    });
    observer.observe(tbody, { childList: true, subtree: false });
  }

  function iniciar() {
    observarTabela();
    aplicar();

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.closest(".manejo-setor-btn, [data-page='manejo'], [data-target='manejo']")) {
        setTimeout(agendar, 0);
        setTimeout(agendar, 180);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
