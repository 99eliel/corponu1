(() => {
  "use strict";

  const VERSION = "2026-08-08-manejo-fases-sutia-161";
  const STYLE_ID = "corponuManejoFasesSutia161Style";
  const COL_ATTR = "data-fase-lateral-161";

  if (window.__CORPONU_MANEJO_FASES_SUTIA_161__ === VERSION) return;
  window.__CORPONU_MANEJO_FASES_SUTIA_161__ = VERSION;

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
      #manejo .manejo-inline-table td[${COL_ATTR}]{background:inherit}
      #manejo .manejo-inline-table td[${COL_ATTR}] .fase-lateral-vazia-161{display:block;min-height:34px}
    `;
    document.head.appendChild(style);
  }

  function cabecalhoFaseBojo() {
    return document.querySelector("#manejo .manejo-head-row th:nth-child(5)");
  }

  function filtroFaseBojo() {
    return document.getElementById("filtroManejoFase")?.closest("th") || null;
  }

  function removerColunaLateral() {
    document.querySelectorAll(`#manejo [${COL_ATTR}]`).forEach(el => el.remove());
  }

  function restaurarCalcinha() {
    removerColunaLateral();
    const thFase = cabecalhoFaseBojo();
    if (thFase) thFase.textContent = "FASE";
    const tituloSoma = [...document.querySelectorAll("#manejo .soma-detalhes h4")]
      .find(el => /soma por fase/i.test(el.textContent || ""));
    if (tituloSoma) tituloSoma.textContent = "Soma por fase";
  }

  function garantirCabecalhosSutia() {
    const thFase = cabecalhoFaseBojo();
    if (thFase) thFase.textContent = "FASE BOJO";

    const headRow = document.querySelector("#manejo .manejo-head-row");
    if (headRow && !headRow.querySelector(`th[${COL_ATTR}]`)) {
      const th = document.createElement("th");
      th.setAttribute(COL_ATTR, "1");
      th.textContent = "FASE LATERAL";
      thFase?.insertAdjacentElement("afterend", th);
    }

    const filterRow = document.querySelector("#manejo .manejo-filter-row");
    const thFiltroFase = filtroFaseBojo();
    if (filterRow && thFiltroFase && !filterRow.querySelector(`th[${COL_ATTR}]`)) {
      const th = document.createElement("th");
      th.setAttribute(COL_ATTR, "1");
      th.setAttribute("aria-label", "Fase lateral ainda sem dados");
      th.innerHTML = '<span class="fase-lateral-vazia-161" aria-hidden="true"></span>';
      thFiltroFase.insertAdjacentElement("afterend", th);
    }

    const tituloSoma = [...document.querySelectorAll("#manejo .soma-detalhes h4")]
      .find(el => /soma por fase/i.test(el.textContent || ""));
    if (tituloSoma) tituloSoma.textContent = "Soma por fase bojo";
  }

  function garantirCelulasSutia() {
    document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']").forEach(row => {
      if (row.querySelector(`td[${COL_ATTR}]`)) return;
      const tdFaseBojo = row.cells?.[4];
      if (!tdFaseBojo) return;
      const td = document.createElement("td");
      td.setAttribute(COL_ATTR, "1");
      td.innerHTML = '<span class="fase-lateral-vazia-161" title="Fase Lateral ainda sem dados"></span>';
      tdFaseBojo.insertAdjacentElement("afterend", td);
    });
  }

  function aplicar() {
    if (aplicando || !paginaManejoAtiva()) return;
    aplicando = true;
    try {
      injetarEstilo();
      if (setorAtual() === "sutia") {
        garantirCabecalhosSutia();
        garantirCelulasSutia();
      } else {
        restaurarCalcinha();
      }
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

    document.addEventListener("change", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (alvo?.closest("#manejo")) setTimeout(agendar, 50);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
