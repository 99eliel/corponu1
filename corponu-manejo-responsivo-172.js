(() => {
  "use strict";

  const VERSION = "2026-08-09-manejo-responsivo-172";
  const STYLE_ID = "corponuManejoResponsivo172Style";
  const TABLE_CLASS = "manejo-responsivo-172";

  if (window.__CORPONU_MANEJO_RESPONSIVO_172__ === VERSION) return;
  window.__CORPONU_MANEJO_RESPONSIVO_172__ = VERSION;

  // As 10 colunas reais permanecem exatamente as mesmas.
  // Fase Bojo e Fase Lateral continuam dividindo internamente a coluna 5.
  const MIN = [68, 68, 150, 150, 300, 56, 82, 100, 78, 46];
  const MAX = [78, 78, 180, 180, 360, 64, 96, 120, 90, 54];
  const MIN_TOTAL = MIN.reduce((s, v) => s + v, 0);
  const MAX_TOTAL = MAX.reduce((s, v) => s + v, 0);

  let resizeObserver = null;
  let mutationObserver = null;
  let observado = null;
  let raf = 0;

  function setorAtual() {
    return document.querySelector('.manejo-setor-btn.active[data-setor]')?.dataset?.setor || "sutia";
  }

  function injetarEstilo() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* 172: somente responsividade do Manejo Sutiã. */
      #manejo,
      #manejo .panel,
      #manejo .table-wrap{min-width:0!important;max-width:100%!important}

      #manejo .table-wrap{
        width:100%!important;
        overflow-x:auto!important;
        overflow-y:visible!important;
        overscroll-behavior-x:contain;
        -webkit-overflow-scrolling:touch;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS}{
        width:var(--mr-total)!important;
        min-width:var(--mr-total)!important;
        max-width:var(--mr-total)!important;
        table-layout:fixed!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} col:nth-child(1),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(1),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(1){width:var(--mr-c1)!important;min-width:var(--mr-c1)!important;max-width:var(--mr-c1)!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} col:nth-child(2),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(2),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(2){width:var(--mr-c2)!important;min-width:var(--mr-c2)!important;max-width:var(--mr-c2)!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} col:nth-child(3),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(3),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(3){width:var(--mr-c3)!important;min-width:var(--mr-c3)!important;max-width:var(--mr-c3)!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} col:nth-child(4),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(4),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(4){width:var(--mr-c4)!important;min-width:var(--mr-c4)!important;max-width:var(--mr-c4)!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} col:nth-child(5),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(5),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(5){width:var(--mr-c5)!important;min-width:var(--mr-c5)!important;max-width:var(--mr-c5)!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} col:nth-child(6),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(6),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(6){width:var(--mr-c6)!important;min-width:var(--mr-c6)!important;max-width:var(--mr-c6)!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} col:nth-child(7),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(7),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(7){width:var(--mr-c7)!important;min-width:var(--mr-c7)!important;max-width:var(--mr-c7)!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} col:nth-child(8),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(8),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(8){width:var(--mr-c8)!important;min-width:var(--mr-c8)!important;max-width:var(--mr-c8)!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} col:nth-child(9),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(9),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(9){width:var(--mr-c9)!important;min-width:var(--mr-c9)!important;max-width:var(--mr-c9)!important}
      #manejo .manejo-inline-table.${TABLE_CLASS} col:nth-child(10),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(10),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(10){width:var(--mr-c10)!important;min-width:var(--mr-c10)!important;max-width:var(--mr-c10)!important}

      #manejo .manejo-inline-table.${TABLE_CLASS} th,
      #manejo .manejo-inline-table.${TABLE_CLASS} td{
        box-sizing:border-box!important;
        min-width:0!important;
        overflow:hidden!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td input,
      #manejo .manejo-inline-table.${TABLE_CLASS} td select,
      #manejo .manejo-inline-table.${TABLE_CLASS} td textarea,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row input,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row select{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        box-sizing:border-box!important;
      }

      /* SILK e TECIDO nunca podem invadir a coluna vizinha. */
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(3)>*,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(4)>*,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(3) label,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(4) label{
        min-width:0!important;
        max-width:100%!important;
        box-sizing:border-box!important;
      }
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(3) label,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(4) label{
        overflow:hidden!important;
        text-overflow:ellipsis!important;
      }

      /* A coluna 5 mantém Bojo + Lateral em duas metades reais e responsivas. */
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-filter-host-163{
        width:var(--mr-c5)!important;
        min-width:var(--mr-c5)!important;
        max-width:var(--mr-c5)!important;
        padding-left:4px!important;
        padding-right:4px!important;
        overflow:hidden!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-grid-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-filter-grid-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163{
        display:grid!important;
        grid-template-columns:var(--mr-fase-sub) var(--mr-fase-sub)!important;
        gap:8px!important;
        width:var(--mr-fase-grid)!important;
        min-width:var(--mr-fase-grid)!important;
        max-width:var(--mr-fase-grid)!important;
        box-sizing:border-box!important;
        overflow:hidden!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-grid-163>span,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-bojo-data-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-lateral-data-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-plus{
        width:var(--mr-fase-sub)!important;
        min-width:0!important;
        max-width:var(--mr-fase-sub)!important;
        box-sizing:border-box!important;
        overflow:hidden!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-plus{
        display:flex!important;
        align-items:center!important;
        gap:4px!important;
      }
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-plus input{
        flex:1 1 auto!important;
        width:auto!important;
        min-width:0!important;
      }
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-lateral-campo-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163>input,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163>select{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS}.mr-compacto-172 th,
      #manejo .manejo-inline-table.${TABLE_CLASS}.mr-compacto-172 td{
        padding-left:5px!important;
        padding-right:5px!important;
      }
      #manejo .manejo-inline-table.${TABLE_CLASS}.mr-compacto-172 tbody input:not([type="checkbox"]):not([type="radio"]),
      #manejo .manejo-inline-table.${TABLE_CLASS}.mr-compacto-172 tbody select{
        font-size:11px!important;
      }
      #manejo .manejo-inline-table.${TABLE_CLASS}.mr-compacto-172 tbody label{
        font-size:10px!important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS}.mr-scroll-172{
        margin-right:0!important;
      }
    `;
    document.head.appendChild(style);
  }

  function largurasPara(espacoDisponivel) {
    const alvo = Math.min(MAX_TOTAL, Math.max(MIN_TOTAL, Math.floor(espacoDisponivel || 0)));
    if (alvo <= MIN_TOTAL) return [...MIN];
    if (alvo >= MAX_TOTAL) return [...MAX];

    const razao = (alvo - MIN_TOTAL) / (MAX_TOTAL - MIN_TOTAL);
    const larguras = MIN.map((min, i) => Math.round(min + ((MAX[i] - min) * razao)));
    let diferenca = alvo - larguras.reduce((s, v) => s + v, 0);

    // Ajuste residual fica primeiro nas áreas que comportam melhor variação.
    const prioridade = [4, 2, 3, 7, 6, 8, 0, 1, 5, 9];
    let cursor = 0;
    while (diferenca !== 0 && cursor < 200) {
      const i = prioridade[cursor % prioridade.length];
      if (diferenca > 0 && larguras[i] < MAX[i]) {
        larguras[i] += 1;
        diferenca -= 1;
      } else if (diferenca < 0 && larguras[i] > MIN[i]) {
        larguras[i] -= 1;
        diferenca += 1;
      }
      cursor += 1;
    }
    return larguras;
  }

  function aplicar() {
    injetarEstilo();
    const tabela = document.querySelector("#manejo .manejo-inline-table");
    if (!tabela) return;

    const sutia = setorAtual() === "sutia";
    tabela.classList.toggle(TABLE_CLASS, sutia);
    if (!sutia) {
      tabela.classList.remove("mr-compacto-172", "mr-scroll-172");
      return;
    }

    const wrap = tabela.closest(".table-wrap");
    const disponivel = Math.max(0, Math.floor(wrap?.clientWidth || tabela.parentElement?.clientWidth || window.innerWidth));
    const larguras = largurasPara(disponivel);
    const total = larguras.reduce((s, v) => s + v, 0);
    const faseGrid = Math.max(260, larguras[4] - 8);
    const faseSub = Math.floor((faseGrid - 8) / 2);

    larguras.forEach((largura, i) => tabela.style.setProperty(`--mr-c${i + 1}`, `${largura}px`));
    tabela.style.setProperty("--mr-total", `${total}px`);
    tabela.style.setProperty("--mr-fase-grid", `${faseGrid}px`);
    tabela.style.setProperty("--mr-fase-sub", `${faseSub}px`);

    tabela.classList.toggle("mr-compacto-172", disponivel < 1220);
    tabela.classList.toggle("mr-scroll-172", disponivel < MIN_TOTAL);
  }

  function agendar() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      aplicar();
      setTimeout(aplicar, 80);
    });
  }

  function observarTamanho() {
    const tabela = document.querySelector("#manejo .manejo-inline-table");
    const wrap = tabela?.closest(".table-wrap");
    if (!wrap || observado === wrap) return;
    resizeObserver?.disconnect();
    observado = wrap;
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(agendar);
      resizeObserver.observe(wrap);
    }
  }

  function iniciar() {
    injetarEstilo();
    aplicar();
    observarTamanho();

    const manejo = document.getElementById("manejo");
    if (manejo && !mutationObserver) {
      mutationObserver = new MutationObserver(() => {
        observarTamanho();
        agendar();
      });
      mutationObserver.observe(manejo, { childList: true, subtree: true });
    }

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.closest(".manejo-setor-btn, [data-page='manejo'], [data-target='manejo'], #btnToggleSidebar")) {
        setTimeout(agendar, 0);
        setTimeout(agendar, 180);
        setTimeout(agendar, 360);
      }
    }, true);

    window.addEventListener("resize", agendar, { passive: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
