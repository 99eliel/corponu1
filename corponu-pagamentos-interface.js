(() => {
  "use strict";

  const VERSION = "2026-07-30-pagamentos-visual-limpo-32";
  if (window.__CORPONU_PAGAMENTOS_INTERFACE__ === VERSION) return;
  window.__CORPONU_PAGAMENTOS_INTERFACE__ = VERSION;

  const normalizar = valor => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  function injetarEstilos() {
    ["corponuPagamentosV30Estilos", "corponuPagamentosV31Estilos", "corponuPagamentosV32Estilos"]
      .forEach(id => document.getElementById(id)?.remove());

    const style = document.createElement("style");
    style.id = "corponuPagamentosV32Estilos";
    style.textContent = `
      #pagamentos.pag-v32 {
        --pag-bg:#f4f7fb;
        --pag-card:#ffffff;
        --pag-line:#d8e2ee;
        --pag-soft:#f8fafc;
        --pag-text:#0f172a;
        --pag-muted:#64748b;
        --pag-purple:#7c3aed;
        --pag-green:#15803d;
      }

      #pagamentos.pag-v32 > .pagamentos-relatorio-panel,
      #pagamentos.pag-v32 > .valores-manager-panel {
        border:1px solid var(--pag-line);
        border-radius:18px;
        background:var(--pag-card);
        box-shadow:0 8px 24px rgba(15,23,42,.05);
      }

      #pagamentos.pag-v32 .pagamentos-relatorio-panel {
        padding:0;
        overflow:hidden;
      }

      #pagamentos.pag-v32 .pagamentos-relatorio-panel > .panel-header:first-child {
        margin:0;
        padding:20px 22px;
        border-bottom:1px solid #e8eef5;
        background:linear-gradient(180deg,#fff 0%,#fbfdff 100%);
      }

      #pagamentos.pag-v32 .pagamentos-relatorio-panel > .panel-header:first-child h3 {
        margin:0 0 4px;
        font-size:21px;
        letter-spacing:-.02em;
        color:var(--pag-text);
      }

      #pagamentos.pag-v32 .pagamentos-relatorio-panel > .panel-header:first-child p {
        margin:0;
        max-width:760px;
        color:var(--pag-muted);
        line-height:1.45;
      }

      #pagamentos.pag-v32 .pagamento-filtros-entregas {
        margin:16px 22px 12px;
        padding:15px;
        display:grid;
        grid-template-columns:repeat(6,minmax(125px,1fr));
        gap:11px;
        align-items:end;
        border:1px solid var(--pag-line);
        border-radius:14px;
        background:var(--pag-soft);
      }

      #pagamentos.pag-v32 .pagamento-filtros-entregas::before {
        content:"Filtros do fechamento";
        grid-column:1/-1;
        display:block;
        margin-bottom:1px;
        color:var(--pag-text);
        font-size:14px;
        font-weight:900;
      }

      #pagamentos.pag-v32 .pagamento-filtros-entregas label {
        min-width:0;
        margin:0;
        color:#334155;
        font-size:12px;
        font-weight:800;
      }

      #pagamentos.pag-v32 .pagamento-filtros-entregas input,
      #pagamentos.pag-v32 .pagamento-filtros-entregas select {
        width:100%;
        min-height:42px;
        margin-top:5px;
        border:1px solid #cbd5e1;
        border-radius:10px;
        background:#fff;
      }

      #pagamentos.pag-v32 .pagamento-filtros-entregas > .btn {
        min-height:40px;
        margin:0;
        white-space:normal;
      }

      #pagamentos.pag-v32 #btnLimparFiltrosPagamento {
        background:#fff;
      }

      #pagamentos.pag-v32 #btnMarcarPagamentosFiltrados {
        background:var(--pag-green);
        border-color:var(--pag-green);
        color:#fff;
        font-weight:900;
      }

      #pagamentos.pag-v32 .pagamento-cards {
        margin:0;
        padding:16px 22px;
        display:grid;
        grid-template-columns:repeat(4,minmax(150px,1fr));
        gap:12px;
        background:#fff;
      }

      #pagamentos.pag-v32 .pagamento-card {
        min-height:88px;
        padding:14px 16px;
        border:1px solid var(--pag-line);
        border-radius:14px;
        background:#fff;
        box-shadow:none;
      }

      #pagamentos.pag-v32 .pagamento-card span {
        color:var(--pag-muted);
        font-size:11px;
        font-weight:900;
        text-transform:uppercase;
        letter-spacing:.045em;
      }

      #pagamentos.pag-v32 .pagamento-card strong {
        display:block;
        margin-top:7px;
        color:var(--pag-text);
        font-size:23px;
      }

      #pagamentos.pag-v32 .pagamento-card.destaque {
        border-color:#c4b5fd;
        background:#f5f3ff;
      }

      #pagamentos.pag-v32 .pagamento-card.destaque strong {
        color:#6d28d9;
      }

      #pagamentos.pag-v32 .panel-header.compact-header,
      #pagamentos.pag-v32 .entregas-header,
      #pagamentos.pag-v32 [class*="conferencia-pagamento"],
      #pagamentos.pag-v32 [class*="pagamento-conferencia"] {
        margin-left:22px;
        margin-right:22px;
      }

      #pagamentos.pag-v32 .table-wrap {
        margin-left:22px;
        margin-right:22px;
        border:1px solid var(--pag-line);
        border-radius:13px;
        overflow:auto;
        background:#fff;
      }

      #pagamentos.pag-v32 .table-wrap table {
        margin:0;
      }

      #pagamentos.pag-v32 .table-wrap thead th {
        position:sticky;
        top:0;
        z-index:1;
        background:#eef3fb;
        color:#334155;
        font-size:11px;
        text-transform:uppercase;
        letter-spacing:.035em;
      }

      #pagamentos.pag-v32 .table-wrap tbody tr:hover {
        background:#f8fafc;
      }

      #pagamentos.pag-v32 .table-wrap td:last-child {
        white-space:nowrap;
      }

      #pagamentos.pag-v32 .entregas-header {
        margin-top:20px;
        padding-top:17px;
        border-top:1px solid #e8eef5;
      }

      #pagamentos.pag-v32 .valores-manager-panel {
        margin-top:16px;
        box-shadow:none;
      }

      #pagamentos.pag-v32 .valores-manager-panel > .panel-header {
        border-bottom:1px solid var(--pag-line);
      }

      #pagamentos.pag-v32 .pag-v32-pendencias-trigger {
        background:#fff7ed !important;
        border-color:#fdba74 !important;
        color:#9a3412 !important;
      }

      .pag-v32-pendencias-simples {
        width:min(760px,calc(100vw - 24px)) !important;
        max-width:760px !important;
        max-height:76vh !important;
        padding:0 !important;
        border:1px solid #d8e2ee !important;
        border-radius:12px !important;
        background:#fff !important;
        box-shadow:0 18px 55px rgba(15,23,42,.18) !important;
        overflow:auto !important;
      }

      .pag-v32-pendencias-simples .panel,
      .pag-v32-pendencias-simples .card,
      .pag-v32-pendencias-simples .modal-content,
      .pag-v32-pendencias-simples > div {
        width:100% !important;
        max-width:none !important;
        margin:0 !important;
        border:0 !important;
        border-radius:0 !important;
        background:#fff !important;
        box-shadow:none !important;
      }

      .pag-v32-pendencias-simples table {
        font-size:12px;
      }

      @media (max-width:1180px) {
        #pagamentos.pag-v32 .pagamento-filtros-entregas {
          grid-template-columns:repeat(3,minmax(160px,1fr));
        }
      }

      @media (max-width:760px) {
        #pagamentos.pag-v32 .pagamentos-relatorio-panel > .panel-header:first-child {
          padding:17px 14px;
        }

        #pagamentos.pag-v32 .pagamento-filtros-entregas {
          margin:14px;
          grid-template-columns:1fr;
        }

        #pagamentos.pag-v32 .pagamento-cards {
          padding:0 14px 14px;
          grid-template-columns:repeat(2,minmax(0,1fr));
        }

        #pagamentos.pag-v32 .pagamento-card {
          min-height:78px;
          padding:12px;
        }

        #pagamentos.pag-v32 .pagamento-card strong {
          font-size:19px;
        }

        #pagamentos.pag-v32 .table-wrap,
        #pagamentos.pag-v32 .panel-header.compact-header,
        #pagamentos.pag-v32 .entregas-header,
        #pagamentos.pag-v32 [class*="conferencia-pagamento"],
        #pagamentos.pag-v32 [class*="pagamento-conferencia"] {
          margin-left:14px;
          margin-right:14px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function marcarBotoesPendencia() {
    document.querySelectorAll("#pagamentos button, #pagamentos a").forEach(elemento => {
      const texto = normalizar(elemento.textContent);
      if (texto.includes("PENDENCIA") && texto.includes("VALOR")) {
        elemento.classList.add("pag-v32-pendencias-trigger");
      }
    });
  }

  function simplificarPainelPendencias() {
    const candidatos = [...document.querySelectorAll(
      "body > dialog, body > [role='dialog'], body > .modal, #pagamentos dialog, #pagamentos [role='dialog'], #pagamentos .modal"
    )].filter(elemento => {
      if (!(elemento instanceof HTMLElement)) return false;
      const texto = normalizar(elemento.textContent);
      const identidade = normalizar(`${elemento.id} ${elemento.className}`);
      return texto.includes("PENDENCIA") && texto.includes("VALOR") ||
        identidade.includes("PENDENCIA") && identidade.includes("VALOR");
    });

    candidatos.forEach(elemento => elemento.classList.add("pag-v32-pendencias-simples"));
  }

  function aplicar() {
    const pagina = document.getElementById("pagamentos");
    if (!pagina) return false;

    pagina.classList.remove("pag-v30", "pag-v31");
    pagina.classList.add("pag-v32");
    pagina.removeAttribute("data-pag-v31-organizado");

    injetarEstilos();
    marcarBotoesPendencia();
    return true;
  }

  function iniciarComTentativas() {
    let tentativas = 0;
    const executar = () => {
      tentativas += 1;
      if (aplicar() || tentativas >= 20) return;
      setTimeout(executar, 250);
    };
    executar();
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target.closest("button, a") : null;
    if (!alvo) return;
    const texto = normalizar(alvo.textContent);
    if (texto.includes("PENDENCIA") && texto.includes("VALOR")) {
      setTimeout(simplificarPainelPendencias, 0);
      setTimeout(simplificarPainelPendencias, 120);
    }
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarComTentativas, { once:true });
  } else {
    iniciarComTentativas();
  }
})();