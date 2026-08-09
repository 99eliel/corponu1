(() => {
  "use strict";

  const VERSION = "2026-08-08-manejo-layout-compacto-165";
  const STYLE_ID = "corponuManejoLayoutCompacto165Style";
  const TABLE_CLASS = "manejo-layout-compacto-165";

  if (window.__CORPONU_MANEJO_LAYOUT_COMPACTO_165__ === VERSION) return;
  window.__CORPONU_MANEJO_LAYOUT_COMPACTO_165__ = VERSION;

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
        width:1270px!important;
        min-width:1270px!important;
        max-width:1270px!important;
        table-layout:fixed!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} th,
      #manejo .manejo-inline-table.${TABLE_CLASS} td{
        box-sizing:border-box!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(1),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(1){width:82px!important;min-width:82px!important;max-width:82px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(2),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(2){width:88px!important;min-width:88px!important;max-width:88px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(3),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(3){width:158px!important;min-width:158px!important;max-width:158px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(4),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(4){width:158px!important;min-width:158px!important;max-width:158px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(5),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(5){width:332px!important;min-width:332px!important;max-width:332px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(6),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(6){width:68px!important;min-width:68px!important;max-width:68px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(7),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(7){width:98px!important;min-width:98px!important;max-width:98px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(8),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(8){width:132px!important;min-width:132px!important;max-width:132px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(9),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(9){width:92px!important;min-width:92px!important;max-width:92px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(10),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(10){width:62px!important;min-width:62px!important;max-width:62px!important}

      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(1),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(2),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(6),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(9),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(10){
        padding-left:4px!important;
        padding-right:4px!important;
        text-align:center!important;
        white-space:nowrap!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(1),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(2),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(6),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(9),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(10){
        padding-left:4px!important;
        padding-right:4px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(1) input,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(2) input,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(6) input{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        box-sizing:border-box!important;
        padding-left:7px!important;
        padding-right:7px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-filter-host-163{
        width:332px!important;
        min-width:332px!important;
        max-width:332px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-grid-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-filter-grid-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163{
        grid-template-columns:158px 158px!important;
        gap:8px!important;
        width:324px!important;
        min-width:324px!important;
        max-width:324px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-grid-163>span,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-plus{
        width:158px!important;
        min-width:158px!important;
        max-width:158px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th{
        padding-left:4px!important;
        padding-right:4px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row input,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row select{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        box-sizing:border-box!important;
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
        padding-right:29px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th:nth-child(2) .btn-filtro-excel-manejo,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th:nth-child(6) .btn-filtro-excel-manejo,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th:nth-child(7) .btn-filtro-excel-manejo,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th:nth-child(9) .btn-filtro-excel-manejo{
        width:25px!important;
        min-width:25px!important;
        height:27px!important;
        right:3px!important;
        padding:0!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(7) input,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(8) input{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        box-sizing:border-box!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(9) .badge,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(9) [class*="badge"]{
        max-width:84px!important;
        padding-left:6px!important;
        padding-right:6px!important;
        font-size:11px!important;
        white-space:nowrap!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(10) button{
        min-width:36px!important;
        max-width:42px!important;
      }

      @media(max-width:1320px){
        #manejo .manejo-inline-table.${TABLE_CLASS}{width:1270px!important;min-width:1270px!important;max-width:1270px!important}
      }
    `;
    document.head.appendChild(style);
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
    if (sutia) ajustarConteudoCompacto();
  }

  function agendar() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      aplicar();
      setTimeout(aplicar, 80);
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
