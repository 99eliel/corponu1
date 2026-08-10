(() => {
  "use strict";

  const VERSION = "2026-08-09-manejo-padrao-calcinha-173";
  const STYLE_ID = "corponuManejoPadraoCalcinha173Style";
  const TABLE_CLASS = "manejo-padrao-calcinha-173";
  const COLGROUP_ID = "corponuManejoColgroup173";

  if (window.__CORPONU_MANEJO_PADRAO_CALCINHA_173__ === VERSION) return;
  window.__CORPONU_MANEJO_PADRAO_CALCINHA_173__ = VERSION;

  // Mesmo princípio usado no Manejo Calcinha: não espremer a tabela.
  // Mantém largura mínima confortável e usa rolagem horizontal em telas menores.
  // Fase Bojo + Fase Lateral continuam dentro da coluna estrutural 5.
  const LARGURAS = [82, 72, 210, 210, 400, 72, 100, 130, 90, 74];
  const LARGURA_TOTAL = LARGURAS.reduce((soma, valor) => soma + valor, 0); // 1440px
  const FASE_GAP = 8;
  const FASE_GRID = LARGURAS[4] - 8;
  const FASE_SUB = Math.floor((FASE_GRID - FASE_GAP) / 2);

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
      /* 173 — Manejo Sutiã seguindo o padrão estável do Manejo Calcinha. */
      #manejo .table-wrap {
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        overflow-y: visible !important;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} {
        width: ${LARGURA_TOTAL}px !important;
        min-width: ${LARGURA_TOTAL}px !important;
        max-width: ${LARGURA_TOTAL}px !important;
        table-layout: fixed !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} th,
      #manejo .manejo-inline-table.${TABLE_CLASS} td {
        box-sizing: border-box !important;
        min-width: 0 !important;
        overflow: hidden !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(1),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(1) { width: 82px !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(2),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(2) { width: 72px !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(3),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(3) { width: 210px !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(4),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(4) { width: 210px !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(5),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(5) { width: 400px !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(6),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(6) { width: 72px !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(7),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(7) { width: 100px !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(8),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(8) { width: 130px !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(9),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(9) { width: 90px !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(10),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(10) { width: 74px !important; }

      #manejo .manejo-inline-table.${TABLE_CLASS} td input,
      #manejo .manejo-inline-table.${TABLE_CLASS} td select,
      #manejo .manejo-inline-table.${TABLE_CLASS} td textarea,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row input,
      #manejo .manejo-inline-table.${TABLE_CLASS} .manejo-filter-row select {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* SILK e TECIDO recebem o mesmo espaço confortável e nunca invadem vizinhos. */
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(3) > *,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(4) > *,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(3) label,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(4) label {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(3) label,
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(4) label {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      /* Fase Bojo e Fase Lateral ficam lado a lado com espaço real e fixo. */
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-filter-host-163 {
        width: 400px !important;
        min-width: 400px !important;
        max-width: 400px !important;
        padding-left: 4px !important;
        padding-right: 4px !important;
        overflow: hidden !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-grid-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-filter-grid-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 {
        display: grid !important;
        grid-template-columns: ${FASE_SUB}px ${FASE_SUB}px !important;
        gap: ${FASE_GAP}px !important;
        width: ${FASE_GRID}px !important;
        min-width: ${FASE_GRID}px !important;
        max-width: ${FASE_GRID}px !important;
        box-sizing: border-box !important;
        align-items: start !important;
        overflow: hidden !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-grid-163 > span,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-bojo-data-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-lateral-data-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-plus {
        width: ${FASE_SUB}px !important;
        min-width: 0 !important;
        max-width: ${FASE_SUB}px !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-plus {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-plus input {
        flex: 1 1 auto !important;
        width: auto !important;
        min-width: 0 !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-lateral-campo-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163 > input,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163 > select {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
      }

      /* Colunas compactas seguem o padrão visual da Calcinha. */
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(1),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(1),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(2),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(2),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(6),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(6),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(9),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(9),
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(10),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(10) {
        padding-left: 5px !important;
        padding-right: 5px !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(10) button {
        max-width: 44px !important;
        min-width: 34px !important;
        margin-inline: auto !important;
      }

      @media (max-width: 780px) {
        #manejo .manejo-inline-table.${TABLE_CLASS} {
          width: ${LARGURA_TOTAL}px !important;
          min-width: ${LARGURA_TOTAL}px !important;
          max-width: ${LARGURA_TOTAL}px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function garantirColgroup(tabela) {
    tabela.querySelectorAll("colgroup[data-corponu-layout]").forEach(el => el.remove());

    let colgroup = tabela.querySelector(`colgroup#${COLGROUP_ID}`);
    if (!colgroup) {
      colgroup = document.createElement("colgroup");
      colgroup.id = COLGROUP_ID;
      tabela.insertBefore(colgroup, tabela.firstChild);
    }

    colgroup.dataset.corponuLayout = VERSION;
    colgroup.innerHTML = "";

    LARGURAS.forEach((largura, indice) => {
      const col = document.createElement("col");
      col.dataset.colunaManejo = String(indice + 1);
      col.style.width = `${largura}px`;
      col.style.minWidth = `${largura}px`;
      col.style.maxWidth = `${largura}px`;
      colgroup.appendChild(col);
    });
  }

  function limparLayoutSutia(tabela) {
    tabela.classList.remove(TABLE_CLASS, "manejo-colunas-fixas-166", "manejo-responsivo-172", "mr-compacto-172", "mr-scroll-172");
    tabela.querySelector(`colgroup#${COLGROUP_ID}`)?.remove();
    tabela.querySelector("colgroup#corponuManejoColgroup166")?.remove();
    for (let i = 1; i <= 10; i += 1) tabela.style.removeProperty(`--mr-c${i}`);
    tabela.style.removeProperty("--mr-total");
    tabela.style.removeProperty("--mr-fase-grid");
    tabela.style.removeProperty("--mr-fase-sub");
  }

  function aplicar() {
    injetarEstilo();
    const tabela = document.querySelector("#manejo .manejo-inline-table");
    if (!tabela) return;

    const sutia = setorAtual() === "sutia";

    if (!sutia) {
      limparLayoutSutia(tabela);
      return;
    }

    tabela.classList.remove("manejo-colunas-fixas-166", "manejo-responsivo-172", "mr-compacto-172", "mr-scroll-172");
    tabela.classList.add(TABLE_CLASS);
    garantirColgroup(tabela);

    const filtroOp = document.getElementById("filtroManejoOP");
    if (filtroOp) {
      filtroOp.placeholder = "OP";
      filtroOp.title = "Digite o número da OP";
    }
  }

  function agendar() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      aplicar();
      setTimeout(aplicar, 80);
      setTimeout(aplicar, 220);
    });
  }

  function iniciar() {
    aplicar();

    const manejo = document.getElementById("manejo");
    if (manejo && !observer) {
      observer = new MutationObserver(agendar);
      observer.observe(manejo, { childList: true, subtree: true });
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
