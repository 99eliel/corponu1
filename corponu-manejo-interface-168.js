(() => {
  "use strict";

  const VERSION = "2026-08-08-manejo-interface-168";
  const STYLE_ID = "corponuManejoInterface168Style";

  if (window.__CORPONU_MANEJO_INTERFACE_168__ === VERSION) return;
  window.__CORPONU_MANEJO_INTERFACE_168__ = VERSION;

  function aplicarEstilo() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* =========================================================
         MANEJO 168 — SOMENTE INTERFACE
         Não altera dados, filtros, salvamento ou Firebase.
         ========================================================= */

      #manejo {
        --manejo-bg: #f7f9fc;
        --manejo-card: #ffffff;
        --manejo-border: #d9e2ef;
        --manejo-border-soft: #e8edf5;
        --manejo-text: #172033;
        --manejo-muted: #64748b;
        --manejo-primary: #6d3af2;
        --manejo-primary-soft: #f1edff;
        --manejo-focus: rgba(109, 58, 242, .14);
      }

      #manejo > .panel,
      #manejo .panel.manejo-panel,
      #manejo .manejo-panel {
        border-color: var(--manejo-border) !important;
        border-radius: 16px !important;
        box-shadow: 0 6px 22px rgba(15, 23, 42, .055) !important;
      }

      #manejo .panel-header {
        align-items: center !important;
        gap: 12px !important;
      }

      #manejo .panel-header h3,
      #manejo .panel-header h2 {
        color: var(--manejo-text) !important;
        letter-spacing: -.02em;
      }

      #manejo .panel-header p,
      #manejo .muted {
        color: var(--manejo-muted) !important;
      }

      /* Botões Sutiã / Calcinha */
      #manejo .manejo-setor-btn {
        min-height: 38px !important;
        padding: 8px 15px !important;
        border: 1px solid var(--manejo-border) !important;
        border-radius: 11px !important;
        background: #fff !important;
        color: #344054 !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        box-shadow: 0 1px 2px rgba(15,23,42,.04) !important;
        transition: border-color .16s ease, background .16s ease, color .16s ease, box-shadow .16s ease !important;
      }

      #manejo .manejo-setor-btn:hover {
        border-color: #b8a6ff !important;
        background: #faf9ff !important;
      }

      #manejo .manejo-setor-btn.active {
        border-color: var(--manejo-primary) !important;
        background: var(--manejo-primary) !important;
        color: #fff !important;
        box-shadow: 0 5px 15px rgba(109,58,242,.20) !important;
      }

      /* Blocos superiores / resumo / ordenação */
      #manejo .manejo-summary,
      #manejo .manejo-resumo,
      #manejo .manejo-toolbar,
      #manejo .manejo-controls,
      #manejo .manejo-filtros-resumo {
        border-color: var(--manejo-border) !important;
        border-radius: 13px !important;
        background: #fbfcfe !important;
      }

      #manejo #somaManejoOps,
      #manejo #somaManejoPecas,
      #manejo #somaManejoFalta,
      #manejo #somaManejoStatus,
      #manejo #somaManejoPecasCompacto,
      #manejo #somaManejoFiltroAtivo,
      #manejo #somaManejoResumoCompacto {
        font-variant-numeric: tabular-nums;
      }

      #manejo .btn,
      #manejo button:not(.btn-filtro-excel-manejo):not(.fase-lateral-seta-167) {
        border-radius: 10px;
      }

      #manejo select[id*="ordem" i],
      #manejo select[id*="orden" i] {
        min-height: 38px !important;
        border-radius: 9px !important;
        border-color: var(--manejo-border) !important;
        background-color: #fff !important;
      }

      /* Avisos do Manejo */
      #manejo .notice,
      #manejo [class*="aviso"][class*="manejo"],
      #manejo [class*="manejo"][class*="aviso"] {
        border-radius: 11px !important;
        box-shadow: none !important;
      }

      /* Container da tabela */
      #manejo .table-wrap {
        border: 1px solid var(--manejo-border) !important;
        border-radius: 14px !important;
        background: var(--manejo-card) !important;
        box-shadow: 0 5px 18px rgba(15,23,42,.045) !important;
        scrollbar-width: thin;
        scrollbar-color: #bcc7d8 transparent;
      }

      #manejo .table-wrap::-webkit-scrollbar {
        height: 9px;
        width: 9px;
      }

      #manejo .table-wrap::-webkit-scrollbar-thumb {
        background: #bcc7d8;
        border-radius: 999px;
        border: 2px solid #fff;
      }

      #manejo .table-wrap::-webkit-scrollbar-track {
        background: transparent;
      }

      #manejo .manejo-inline-table {
        border-collapse: separate !important;
        border-spacing: 0 !important;
        background: #fff !important;
        margin: 0 !important;
      }

      /* Cabeçalho */
      #manejo .manejo-inline-table thead tr:first-child th {
        min-height: 34px !important;
        padding-top: 8px !important;
        padding-bottom: 8px !important;
        border-bottom: 1px solid #cbd6e5 !important;
        background: #edf3fc !important;
        color: #182338 !important;
        font-size: 11.5px !important;
        font-weight: 900 !important;
        letter-spacing: .015em !important;
        white-space: nowrap !important;
      }

      #manejo .manejo-inline-table thead tr:first-child th:first-child {
        border-top-left-radius: 13px;
      }

      #manejo .manejo-inline-table thead tr:first-child th:last-child {
        border-top-right-radius: 13px;
      }

      /* Linha dos filtros */
      #manejo .manejo-inline-table .manejo-filter-row th {
        padding-top: 6px !important;
        padding-bottom: 6px !important;
        background: #f8fafe !important;
        border-bottom: 1px solid var(--manejo-border) !important;
      }

      #manejo .manejo-inline-table .manejo-filter-row input,
      #manejo .manejo-inline-table .manejo-filter-row select {
        min-height: 32px !important;
        height: 32px !important;
        border: 1px solid #cbd6e5 !important;
        border-radius: 8px !important;
        background: #fff !important;
        color: #25324a !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
        box-shadow: none !important;
      }

      #manejo .manejo-inline-table .manejo-filter-row input:focus,
      #manejo .manejo-inline-table .manejo-filter-row select:focus {
        border-color: #8d6cf6 !important;
        box-shadow: 0 0 0 3px var(--manejo-focus) !important;
      }

      #manejo .btn-filtro-excel-manejo {
        border-color: #cbd6e5 !important;
        background: #fff !important;
        color: #475569 !important;
        border-radius: 7px !important;
        box-shadow: none !important;
      }

      #manejo .btn-filtro-excel-manejo:hover,
      #manejo .btn-filtro-excel-manejo:focus-visible {
        border-color: #8d6cf6 !important;
        color: var(--manejo-primary) !important;
        background: #faf9ff !important;
      }

      #manejo .btn-filtro-excel-manejo.ativo {
        border-color: var(--manejo-primary) !important;
        background: var(--manejo-primary) !important;
        color: #fff !important;
      }

      /* Corpo da tabela */
      #manejo .manejo-inline-table tbody td {
        padding-top: 8px !important;
        padding-bottom: 8px !important;
        border-bottom: 1px solid #dde5f0 !important;
        color: var(--manejo-text) !important;
      }

      #manejo .manejo-inline-table tbody tr {
        transition: box-shadow .14s ease, filter .14s ease;
      }

      #manejo .manejo-inline-table tbody tr:hover {
        box-shadow: inset 3px 0 0 #8d6cf6 !important;
        filter: brightness(.995);
      }

      /* Campos de dados: mantém valores e comportamento, muda só aparência */
      #manejo .manejo-inline-table tbody input:not([type="checkbox"]):not([type="radio"]),
      #manejo .manejo-inline-table tbody select,
      #manejo .manejo-inline-table tbody textarea {
        min-height: 35px !important;
        height: 35px !important;
        border: 1px solid #cbd6e5 !important;
        border-radius: 8px !important;
        background: rgba(255,255,255,.96) !important;
        color: #172033 !important;
        padding-top: 7px !important;
        padding-bottom: 7px !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        box-shadow: 0 1px 1px rgba(15,23,42,.025) !important;
      }

      #manejo .manejo-inline-table tbody input::placeholder,
      #manejo .manejo-inline-table tbody textarea::placeholder {
        color: #8895a8 !important;
        font-weight: 500 !important;
        opacity: 1 !important;
      }

      #manejo .manejo-inline-table tbody input:focus,
      #manejo .manejo-inline-table tbody select:focus,
      #manejo .manejo-inline-table tbody textarea:focus {
        border-color: #8060f3 !important;
        box-shadow: 0 0 0 3px var(--manejo-focus) !important;
        outline: none !important;
      }

      /* Nome/Data dentro de SILK e TECIDO */
      #manejo .manejo-inline-table tbody label {
        gap: 3px !important;
        color: #344054 !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        line-height: 1.15 !important;
      }

      #manejo .manejo-inline-table tbody label + label {
        margin-top: 4px !important;
      }

      /* Fases visualmente equivalentes */
      #manejo .fase-dupla-data-grid-163 {
        align-items: center !important;
      }

      #manejo .fase-dupla-data-grid-163 .fase-bojo-data-163,
      #manejo .fase-dupla-data-grid-163 .fase-lateral-data-163 {
        min-width: 0 !important;
      }

      #manejo .fase-lateral-com-seta-167 {
        border-radius: 8px !important;
      }

      #manejo .fase-lateral-seta-167 {
        border-left-color: #d7dfeb !important;
        color: #475569 !important;
        background: transparent !important;
      }

      #manejo .fase-lateral-seta-167:hover {
        background: #f4f1ff !important;
        color: var(--manejo-primary) !important;
      }

      /* Badges de status */
      #manejo .manejo-inline-table tbody .badge,
      #manejo .manejo-inline-table tbody [class*="status"]:not(input):not(select) {
        font-size: 10.5px;
      }

      #manejo .manejo-inline-table tbody .badge,
      #manejo .manejo-inline-table tbody .status-dot {
        min-height: 27px !important;
        border-radius: 999px !important;
        padding: 5px 8px !important;
        align-items: center !important;
        justify-content: center !important;
        white-space: nowrap !important;
      }

      /* Ações */
      #manejo .manejo-inline-table tbody td:last-child {
        text-align: center !important;
      }

      #manejo .manejo-inline-table tbody td:last-child button {
        min-height: 34px !important;
        border: 1px solid #d6deea !important;
        border-radius: 10px !important;
        background: #fff !important;
        color: #344054 !important;
        box-shadow: 0 2px 6px rgba(15,23,42,.055) !important;
      }

      #manejo .manejo-inline-table tbody td:last-child button:hover {
        border-color: #a897f7 !important;
        background: #f8f6ff !important;
        color: var(--manejo-primary) !important;
      }

      /* Botão limpar filtros */
      #manejo #btnLimparFiltrosManejo {
        min-height: 32px !important;
        height: 32px !important;
        padding: 5px 9px !important;
        border: 1px solid #cbd6e5 !important;
        background: #fff !important;
        color: #475569 !important;
        font-size: 11px !important;
        border-radius: 8px !important;
        box-shadow: none !important;
      }

      #manejo #btnLimparFiltrosManejo:hover {
        color: var(--manejo-primary) !important;
        border-color: #9d89f7 !important;
        background: #faf9ff !important;
      }

      /* Popups dos filtros */
      #manejo ~ .popup-filtro-excel-manejo,
      .popup-filtro-excel-manejo {
        border-color: #d7dfeb !important;
        border-radius: 13px !important;
        box-shadow: 0 16px 42px rgba(15,23,42,.18) !important;
      }

      @media (max-width: 900px) {
        #manejo .panel {
          padding-left: 12px !important;
          padding-right: 12px !important;
        }

        #manejo .manejo-setor-btn {
          min-height: 36px !important;
          padding: 7px 11px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  aplicarEstilo();
})();
