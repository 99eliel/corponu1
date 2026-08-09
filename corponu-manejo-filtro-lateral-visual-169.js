(() => {
  "use strict";

  const VERSION = "2026-08-08-manejo-filtro-lateral-visual-169";
  const STYLE_ID = "corponuManejoFiltroLateralVisual169Style";

  if (window.__CORPONU_MANEJO_FILTRO_LATERAL_VISUAL_169__ === VERSION) return;
  window.__CORPONU_MANEJO_FILTRO_LATERAL_VISUAL_169__ = VERSION;

  function aplicar() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* =========================================================
         MANEJO 169 — acabamento visual do filtro Fase Lateral
         SOMENTE CSS. Não altera seleção, dados ou funcionamento.
         ========================================================= */

      #popupFiltroFaseLateral163 {
        width: min(350px, calc(100vw - 24px)) !important;
        padding: 14px !important;
        border: 1px solid #d7dfeb !important;
        border-radius: 14px !important;
        background: #ffffff !important;
        box-shadow: 0 18px 46px rgba(15, 23, 42, .20) !important;
        overflow: hidden !important;
      }

      #popupFiltroFaseLateral163 .fl163-top {
        min-height: 30px !important;
        margin: 0 0 12px !important;
        padding: 0 2px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
      }

      #popupFiltroFaseLateral163 .fl163-top strong {
        color: #172033 !important;
        font-size: 14px !important;
        font-weight: 900 !important;
        line-height: 1.2 !important;
      }

      #popupFiltroFaseLateral163 .fl163-fechar {
        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;
        padding: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 0 !important;
        border-radius: 8px !important;
        background: transparent !important;
        color: #64748b !important;
        font-size: 19px !important;
        line-height: 1 !important;
      }

      #popupFiltroFaseLateral163 .fl163-fechar:hover {
        background: #f1f5f9 !important;
        color: #172033 !important;
      }

      #popupFiltroFaseLateral163 .fl163-busca {
        width: 100% !important;
        height: 38px !important;
        min-height: 38px !important;
        margin: 0 0 10px !important;
        padding: 8px 11px !important;
        border: 1px solid #cbd6e5 !important;
        border-radius: 10px !important;
        background: #fff !important;
        color: #172033 !important;
        font-size: 12.5px !important;
        box-shadow: none !important;
      }

      #popupFiltroFaseLateral163 .fl163-busca:focus {
        border-color: #8060f3 !important;
        box-shadow: 0 0 0 3px rgba(109, 58, 242, .12) !important;
        outline: none !important;
      }

      #popupFiltroFaseLateral163 .fl163-lista {
        display: grid !important;
        gap: 4px !important;
        max-height: 250px !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding: 7px 0 !important;
        margin: 0 !important;
        border-top: 1px solid #e5eaf2 !important;
        border-bottom: 1px solid #e5eaf2 !important;
        scrollbar-width: thin;
        scrollbar-color: #c5cedc transparent;
      }

      #popupFiltroFaseLateral163 .fl163-opcao {
        width: 100% !important;
        min-height: 38px !important;
        margin: 0 !important;
        padding: 8px 10px !important;
        display: grid !important;
        grid-template-columns: 18px minmax(0, 1fr) !important;
        align-items: center !important;
        justify-content: start !important;
        column-gap: 10px !important;
        border: 1px solid transparent !important;
        border-radius: 9px !important;
        background: #ffffff !important;
        color: #25324a !important;
        font-size: 12.5px !important;
        font-weight: 800 !important;
        line-height: 1.2 !important;
        white-space: nowrap !important;
        text-align: left !important;
        cursor: pointer !important;
        box-sizing: border-box !important;
      }

      #popupFiltroFaseLateral163 .fl163-opcao:hover {
        border-color: #e2dcff !important;
        background: #f8f6ff !important;
      }

      #popupFiltroFaseLateral163 .fl163-opcao:has(input:checked) {
        border-color: #c7b9ff !important;
        background: #f3efff !important;
        color: #4c2ac7 !important;
      }

      #popupFiltroFaseLateral163 .fl163-opcao input[type="checkbox"] {
        appearance: auto !important;
        -webkit-appearance: checkbox !important;
        width: 16px !important;
        height: 16px !important;
        min-width: 16px !important;
        max-width: 16px !important;
        min-height: 16px !important;
        max-height: 16px !important;
        margin: 0 !important;
        padding: 0 !important;
        border-radius: 4px !important;
        box-shadow: none !important;
        justify-self: start !important;
        flex: 0 0 16px !important;
        cursor: pointer !important;
      }

      #popupFiltroFaseLateral163 .fl163-acoes {
        margin: 10px 0 0 !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 8px !important;
      }

      #popupFiltroFaseLateral163 .fl163-acoes .btn {
        min-height: 34px !important;
        height: 34px !important;
        margin: 0 !important;
        padding: 6px 12px !important;
        border-radius: 9px !important;
        font-size: 12px !important;
        font-weight: 800 !important;
      }

      #popupFiltroFaseLateral163 [data-fl163-limpar] {
        border-color: #d4dce8 !important;
        background: #ffffff !important;
        color: #475569 !important;
      }

      #popupFiltroFaseLateral163 [data-fl163-aplicar] {
        border-color: #6d3af2 !important;
        background: #6d3af2 !important;
        color: #ffffff !important;
        box-shadow: 0 4px 10px rgba(109, 58, 242, .16) !important;
      }

      #popupFiltroFaseLateral163 .notice.small {
        margin: 4px 0 !important;
        padding: 10px !important;
        border-radius: 9px !important;
        font-size: 12px !important;
        text-align: center !important;
      }
    `;

    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aplicar, { once: true });
  } else {
    aplicar();
  }
})();
