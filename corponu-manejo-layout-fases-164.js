(() => {
  "use strict";

  const VERSION = "2026-08-08-manejo-colunas-fixas-166";
  const STYLE_ID = "corponuManejoColunasFixas166Style";
  const TABLE_CLASS = "manejo-colunas-fixas-166";
  const COLGROUP_ID = "corponuManejoColgroup166";

  if (window.__CORPONU_MANEJO_COLUNAS_FIXAS_166__ === VERSION) return;
  window.__CORPONU_MANEJO_COLUNAS_FIXAS_166__ = VERSION;

  const LARGURAS = [78, 78, 165, 165, 360, 64, 96, 120, 90, 54];
  const LARGURA_TOTAL = LARGURAS.reduce((soma, valor) => soma + valor, 0);

  let observer = null;
  let raf = 0;

  function setorAtual() {
    return document.querySelector('.manejo-setor-btn.active[data-setor]')?.dataset?.setor || "sutia";
  }

  function injetarEstilo() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #manejo .manejo-inline-table.${TABLE_CLASS}{
        width:${LARGURA_TOTAL}px!important;
        min-width:${LARGURA_TOTAL}px!important;
        max-width:${LARGURA_TOTAL}px!important;
        table-layout:fixed!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} th,
      #manejo .manejo-inline-table.${TABLE_CLASS} td{
        box-sizing:border-box!important;
        min-width:0!important;
        overflow:hidden!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-head-row th,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th{
        white-space:nowrap!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(1),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(1),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(2),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(2),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(6),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(6),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(9),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(9),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(10),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(10){
        padding-left:4px!important;
        padding-right:4px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td input,
      #manejo .manejo-inline-table.${TABLE_CLASS} td select,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row input,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row select{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        box-sizing:border-box!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(1) input,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(2) input,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(6) input{
        padding-left:7px!important;
        padding-right:7px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(1),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(2),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(6),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(9),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(10){
        text-align:center!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(3) input,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(4) input{
        padding-left:8px!important;
        padding-right:8px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-filter-host-163{
        width:360px!important;
        min-width:360px!important;
        max-width:360px!important;
        padding-left:4px!important;
        padding-right:4px!important;
        overflow:hidden!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-grid-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-filter-grid-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163{
        display:grid!important;
        grid-template-columns:172px 172px!important;
        gap:8px!important;
        width:352px!important;
        min-width:352px!important;
        max-width:352px!important;
        box-sizing:border-box!important;
        align-items:start!important;
        overflow:hidden!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-grid-163>span,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-bojo-data-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-lateral-data-163{
        width:172px!important;
        min-width:172px!important;
        max-width:172px!important;
        box-sizing:border-box!important;
        overflow:hidden!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-plus{
        display:flex!important;
        align-items:center!important;
        gap:4px!important;
        width:172px!important;
        min-width:172px!important;
        max-width:172px!important;
        overflow:hidden!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-plus input{
        flex:1 1 auto!important;
        width:auto!important;
        min-width:0!important;
        max-width:none!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-plus .btn-plus{
        flex:0 0 28px!important;
        width:28px!important;
        min-width:28px!important;
        max-width:28px!important;
        padding-left:0!important;
        padding-right:0!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-lateral-campo-163{
        width:172px!important;
        min-width:0!important;
        max-width:172px!important;
        box-sizing:border-box!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163{
        position:relative!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163>input,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163>select{
        width:172px!important;
        min-width:0!important;
        max-width:172px!important;
        padding-right:31px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163>.btn-filtro-excel-manejo{
        width:27px!important;
        min-width:27px!important;
        height:27px!important;
        right:2px!important;
        padding:0!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th{
        padding-left:4px!important;
        padding-right:4px!important;
        overflow:hidden!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th:nth-child(1) input{
        font-size:11px!important;
        padding-left:6px!important;
        padding-right:6px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th:nth-child(2) select,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th:nth-child(6) select,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th:nth-child(7) select,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th:nth-child(9) select{
        font-size:11px!important;
        padding-left:5px!important;
        padding-right:27px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th:nth-child(2) .btn-filtro-excel-manejo,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th:nth-child(6) .btn-filtro-excel-manejo,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th:nth-child(7) .btn-filtro-excel-manejo,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th:nth-child(9) .btn-filtro-excel-manejo{
        width:24px!important;
        min-width:24px!important;
        height:27px!important;
        right:2px!important;
        padding:0!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(9) .badge,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(9) [class*="badge"]{
        max-width:82px!important;
        padding-left:5px!important;
        padding-right:5px!important;
        font-size:11px!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(10) button{
        min-width:34px!important;
        max-width:40px!important;
        padding-left:0!important;
        padding-right:0!important;
      }

      #manejo .table-wrap{
        overflow-x:auto!important;
        overflow-y:visible!important;
      }
    `;
    document.head.appendChild(style);
  }

  function garantirColgroup(tabela) {
    let colgroup = tabela.querySelector(`colgroup#${COLGROUP_ID}`);
    if (!colgroup) {
      tabela.querySelectorAll("colgroup[data-corponu-layout]").forEach(el => el.remove());
      colgroup = document.createElement("colgroup");
      colgroup.id = COLGROUP_ID;
      colgroup.dataset.corponuLayout = VERSION;
      LARGURAS.forEach((largura, indice) => {
        const col = document.createElement("col");
        col.dataset.colunaManejo = String(indice + 1);
        col.style.width = `${largura}px`;
        col.style.minWidth = `${largura}px`;
        col.style.maxWidth = `${largura}px`;
        colgroup.appendChild(col);
      });
      tabela.insertBefore(colgroup, tabela.firstChild);
    } else {
      [...colgroup.children].forEach((col, indice) => {
        const largura = LARGURAS[indice];
        if (!largura) return;
        col.style.width = `${largura}px`;
        col.style.minWidth = `${largura}px`;
        col.style.maxWidth = `${largura}px`;
      });
    }
  }

  function removerColgroup(tabela) {
    tabela.querySelector(`colgroup#${COLGROUP_ID}`)?.remove();
  }

  function ajustarConteudoCompacto() {
    const filtroOp = document.getElementById("filtroManejoOP");
    if (filtroOp) {
      filtroOp.placeholder = "OP";
      filtroOp.title = "Digite o número da OP";
    }
  }

  function aplicar() {
    injetarEstilo();
    const tabela = document.querySelector("#manejo .manejo-inline-table");
    if (!tabela) return;

    const sutia = setorAtual() === "sutia";
    tabela.classList.toggle(TABLE_CLASS, sutia);

    if (sutia) {
      garantirColgroup(tabela);
      ajustarConteudoCompacto();
    } else {
      removerColgroup(tabela);
    }
  }

  function agendar() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      aplicar();
      setTimeout(aplicar, 60);
      setTimeout(aplicar, 180);
    });
  }

  function iniciar() {
    aplicar();

    const tbody = document.getElementById("listaManejoInline");
    if (tbody && !observer) {
      observer = new MutationObserver(agendar);
      observer.observe(tbody, { childList: true, subtree: true });
    }

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.closest(".manejo-setor-btn, [data-page='manejo'], [data-target='manejo']")) {
        setTimeout(agendar, 0);
        setTimeout(agendar, 180);
      }
    }, true);

    window.addEventListener("resize", agendar);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
