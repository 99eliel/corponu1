(() => {
  "use strict";

  const VERSION = "2026-08-09-manejo-largura-total-174";
  const STYLE_ID = "corponuManejoLarguraTotal174Style";
  const TABLE_CLASS = "manejo-largura-total-174";
  const COLGROUP_ID = "corponuManejoColgroup174";
  const MIN_TOTAL = 1440;

  // Proporções baseadas no layout seguro que já funcionava na 173.
  // Em telas largas, a tabela cresce até ocupar 100% do espaço, como no Manejo Calcinha.
  const PROPORCOES = [
    5.694444,
    5,
    14.583333,
    14.583333,
    27.777778,
    5,
    6.944444,
    9.027778,
    6.25,
    5.138889
  ];

  if (window.__CORPONU_MANEJO_LARGURA_TOTAL_174__ === VERSION) return;
  window.__CORPONU_MANEJO_LARGURA_TOTAL_174__ = VERSION;

  let observer = null;
  let raf = 0;

  function setorAtual() {
    return document.querySelector('.manejo-setor-btn.active[data-setor]')?.dataset?.setor || "sutia";
  }

  function injetarEstilo() {
    if (document.getElementById(STYLE_ID)) return;

    // Remove somente estilos de layout antigos desta mesma sequência.
    document.getElementById("corponuManejoPadraoCalcinha173Style")?.remove();
    document.getElementById("corponuManejoResponsivo172Style")?.remove();
    document.getElementById("corponuManejoColunasFixas166Style")?.remove();

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* =========================================================
         MANEJO 174 — LARGURA TOTAL COMO O MANEJO CALCINHA
         Somente layout. Não altera dados, filtros ou salvamento.
         ========================================================= */

      #manejo .table-wrap {
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        overflow-y: visible !important;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
      }

      /* Em tela larga ocupa a largura inteira. Em tela pequena respeita 1440px e rola. */
      #manejo .manejo-inline-table.${TABLE_CLASS} {
        width: 100% !important;
        min-width: ${MIN_TOTAL}px !important;
        max-width: none !important;
        table-layout: fixed !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} th,
      #manejo .manejo-inline-table.${TABLE_CLASS} td {
        box-sizing: border-box !important;
        min-width: 0 !important;
        overflow: hidden !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(1),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(1) { width: 5.694444% !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(2),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(2) { width: 5% !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(3),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(3) { width: 14.583333% !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(4),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(4) { width: 14.583333% !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(5),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(5) { width: 27.777778% !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(6),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(6) { width: 5% !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(7),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(7) { width: 6.944444% !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(8),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(8) { width: 9.027778% !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(9),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(9) { width: 6.25% !important; }
      #manejo .manejo-inline-table.${TABLE_CLASS} th:nth-child(10),
      #manejo .manejo-inline-table.${TABLE_CLASS} td:nth-child(10) { width: 5.138889% !important; }

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

      /* SILK e TECIDO ocupam o espaço disponível sem invadir vizinhos. */
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

      /* Fase Bojo + Fase Lateral passam a crescer junto com a coluna estrutural. */
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-filter-host-163 {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        padding-left: 4px !important;
        padding-right: 4px !important;
        overflow: hidden !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-grid-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-filter-grid-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 8px !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        align-items: start !important;
        overflow: hidden !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-head-grid-163 > span,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-bojo-data-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-lateral-data-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-dupla-data-grid-163 .fase-plus {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
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
        max-width: none !important;
      }

      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-lateral-campo-163,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163 > input,
      #manejo .manejo-inline-table.${TABLE_CLASS} .fase-filter-sub-163 > select {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
      }

      /* Campos pequenos continuam compactos. */
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

    PROPORCOES.forEach((proporcao, indice) => {
      const col = document.createElement("col");
      col.dataset.colunaManejo = String(indice + 1);
      col.style.width = `${proporcao}%`;
      colgroup.appendChild(col);
    });
  }

  function limparLayoutSutia(tabela) {
    tabela.classList.remove(
      TABLE_CLASS,
      "manejo-padrao-calcinha-173",
      "manejo-colunas-fixas-166",
      "manejo-responsivo-172",
      "mr-compacto-172",
      "mr-scroll-172"
    );
    tabela.querySelector(`colgroup#${COLGROUP_ID}`)?.remove();
    tabela.querySelector("colgroup#corponuManejoColgroup173")?.remove();
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

    tabela.classList.remove(
      "manejo-padrao-calcinha-173",
      "manejo-colunas-fixas-166",
      "manejo-responsivo-172",
      "mr-compacto-172",
      "mr-scroll-172"
    );
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
