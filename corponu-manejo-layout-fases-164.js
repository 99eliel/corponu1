(() => {
  "use strict";

  const VERSION = "2026-08-08-manejo-layout-fases-164";
  const STYLE_ID = "corponuManejoLayoutFases164Style";
  const TABLE_CLASS = "manejo-layout-fases-164";
  const WRAP_CLASS = "manejo-layout-fases-wrap-164";

  if (window.__CORPONU_MANEJO_LAYOUT_FASES_164__ === VERSION) return;
  window.__CORPONU_MANEJO_LAYOUT_FASES_164__ = VERSION;

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
      #manejo .${WRAP_CLASS}{
        width:100%!important;
        max-width:100%!important;
        overflow-x:auto!important;
        overflow-y:visible!important;
        padding-bottom:10px!important;
        -webkit-overflow-scrolling:touch;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS}{
        width:1530px!important;
        min-width:1530px!important;
        max-width:none!important;
        table-layout:fixed!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} th,
      #manejo .manejo-inline-table.${TABLE_CLASS} td{
        box-sizing:border-box!important;
        vertical-align:middle!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(1),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(1){width:140px!important;min-width:140px!important;max-width:140px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(2),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(2){width:150px!important;min-width:150px!important;max-width:150px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(3),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(3){width:165px!important;min-width:165px!important;max-width:165px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(4),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(4){width:165px!important;min-width:165px!important;max-width:165px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(5),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(5){width:340px!important;min-width:340px!important;max-width:340px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(6),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(6){width:110px!important;min-width:110px!important;max-width:110px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(7),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(7){width:130px!important;min-width:130px!important;max-width:130px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(8),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(8){width:150px!important;min-width:150px!important;max-width:150px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(9),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(9){width:110px!important;min-width:110px!important;max-width:110px!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(10),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(10){width:70px!important;min-width:70px!important;max-width:70px!important}

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-filter-host-163{
        width:340px!important;
        min-width:340px!important;
        max-width:340px!important;
        overflow:visible!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-grid-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-filter-grid-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163{
        display:grid!important;
        grid-template-columns:160px 160px!important;
        gap:10px!important;
        width:330px!important;
        min-width:330px!important;
        max-width:330px!important;
        box-sizing:border-box!important;
        align-items:start!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-grid-163>span{
        width:160px!important;
        min-width:160px!important;
        max-width:160px!important;
        overflow:visible!important;
        white-space:nowrap!important;
        text-overflow:clip!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-plus{
        width:160px!important;
        min-width:160px!important;
        max-width:160px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163>input,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163>select,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 input{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        box-sizing:border-box!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row th{
        overflow:visible!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row input,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row select{
        box-sizing:border-box!important;
        max-width:100%!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(6) input,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(7) input,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(8) input{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        box-sizing:border-box!important;
      }

      @media(max-width:900px){
        #manejo .manejo-inline-table.${TABLE_CLASS}{width:1530px!important;min-width:1530px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function aplicar() {
    injetarEstilo();
    const tabela = document.querySelector("#manejo .manejo-inline-table");
    if (!tabela) return;
    const wrap = tabela.closest(".table-wrap");
    const sutia = setorAtual() === "sutia";
    tabela.classList.toggle(TABLE_CLASS, sutia);
    wrap?.classList.toggle(WRAP_CLASS, sutia);
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
