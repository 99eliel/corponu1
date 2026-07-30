(() => {
  "use strict";

  const VERSION = "2026-07-30-pagamentos-interface-segura-31";
  if (window.__CORPONU_PAGAMENTOS_INTERFACE__ === VERSION) return;
  window.__CORPONU_PAGAMENTOS_INTERFACE__ = VERSION;

  const normalizar = valor => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  function injetarEstilos() {
    if (document.getElementById("corponuPagamentosV31Estilos")) return;

    const style = document.createElement("style");
    style.id = "corponuPagamentosV31Estilos";
    style.textContent = `
      #pagamentos.pag-v31 { --pag-border:#d8e2ef; --pag-soft:#f7f9fc; --pag-muted:#64748b; --pag-ink:#0f172a; }
      #pagamentos.pag-v31 .pagamentos-relatorio-panel { border:1px solid var(--pag-border); border-radius:18px; background:#fff; overflow:hidden; }
      #pagamentos.pag-v31 .pagamentos-relatorio-panel > .panel-header:first-child { padding:20px 22px 16px; margin:0; border-bottom:1px solid #e7edf5; background:linear-gradient(180deg,#fff 0%,#fbfdff 100%); }
      #pagamentos.pag-v31 .pagamentos-relatorio-panel > .panel-header:first-child h3 { margin:0 0 4px; font-size:21px; }
      #pagamentos.pag-v31 .pagamentos-relatorio-panel > .panel-header:first-child p { margin:0; color:var(--pag-muted); }
      #pagamentos.pag-v31 .pagamento-cards { margin:0; padding:16px 22px; display:grid; grid-template-columns:repeat(4,minmax(150px,1fr)); gap:12px; }
      #pagamentos.pag-v31 .pagamento-card { min-height:90px; padding:14px 16px; border:1px solid var(--pag-border); border-radius:14px; background:#fff; box-shadow:none; }
      #pagamentos.pag-v31 .pagamento-card span { color:var(--pag-muted); font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.045em; }
      #pagamentos.pag-v31 .pagamento-card strong { display:block; margin-top:7px; font-size:23px; color:var(--pag-ink); }
      #pagamentos.pag-v31 .pagamento-card.destaque { border-color:#c4b5fd; background:#f5f3ff; }
      #pagamentos.pag-v31 .pagamento-card.destaque strong { color:#6d28d9; }
      #pagamentos.pag-v31 .pagamento-filtros-entregas { margin:0 22px 12px; padding:15px; display:grid; grid-template-columns:repeat(6,minmax(130px,1fr)); gap:11px; align-items:end; border:1px solid var(--pag-border); border-radius:14px; background:var(--pag-soft); }
      #pagamentos.pag-v31 .pagamento-filtros-entregas::before { content:"Filtros do fechamento"; grid-column:1/-1; color:var(--pag-ink); font-size:14px; font-weight:900; }
      #pagamentos.pag-v31 .pagamento-filtros-entregas label { min-width:0; margin:0; color:#334155; font-size:12px; font-weight:800; }
      #pagamentos.pag-v31 .pagamento-filtros-entregas input,
      #pagamentos.pag-v31 .pagamento-filtros-entregas select { width:100%; min-height:42px; margin-top:5px; border-radius:10px; background:#fff; }
      #pagamentos.pag-v31 .pag-v31-actions { margin:0 22px 16px; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; gap:14px; border:1px solid var(--pag-border); border-radius:14px; background:#fff; }
      #pagamentos.pag-v31 .pag-v31-actions-copy strong { display:block; color:var(--pag-ink); font-size:14px; }
      #pagamentos.pag-v31 .pag-v31-actions-copy span { display:block; margin-top:3px; color:var(--pag-muted); font-size:12px; }
      #pagamentos.pag-v31 .pag-v31-actions-buttons { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
      #pagamentos.pag-v31 .pag-v31-actions-buttons .btn { min-height:40px; white-space:nowrap; }
      #pagamentos.pag-v31 #btnMarcarPagamentosFiltrados { background:#15803d; border-color:#15803d; color:#fff; font-weight:900; }
      #pagamentos.pag-v31 .pag-v31-section-title { margin:18px 22px 9px; padding-top:14px; border-top:1px solid #e7edf5; }
      #pagamentos.pag-v31 .pag-v31-section-title h3 { margin:0; font-size:16px; }
      #pagamentos.pag-v31 .pag-v31-section-title p { margin:3px 0 0; color:var(--pag-muted); font-size:12px; }
      #pagamentos.pag-v31 .pag-v31-table { margin:0 22px 18px; border:1px solid var(--pag-border); border-radius:13px; overflow:auto; }
      #pagamentos.pag-v31 .pag-v31-table table { margin:0; }
      #pagamentos.pag-v31 .pag-v31-table thead th { position:sticky; top:0; z-index:1; background:#eef3fb; color:#334155; font-size:11px; text-transform:uppercase; letter-spacing:.035em; }
      #pagamentos.pag-v31 .pag-v31-table tbody tr:hover { background:#f8fafc; }
      #pagamentos.pag-v31 .pag-v31-table td:last-child { white-space:nowrap; }
      #pagamentos.pag-v31 .pag-v31-pendencias-slot:empty { display:none; }
      #pagamentos.pag-v31 .pag-v31-pendencias-slot { margin:0 22px 14px; }
      #pagamentos.pag-v31 .pag-v31-pendencias-inline { position:static !important; inset:auto !important; width:100% !important; max-width:none !important; min-height:0 !important; margin:0 !important; padding:12px 14px !important; border:1px solid #fed7aa !important; border-radius:11px !important; background:#fff7ed !important; box-shadow:none !important; backdrop-filter:none !important; }
      #pagamentos.pag-v31 .pag-v31-pendencias-inline > * { width:100% !important; max-width:none !important; margin:0 !important; box-shadow:none !important; }
      #pagamentos.pag-v31 .pag-v31-pendencias-trigger { background:#fff7ed !important; border-color:#fdba74 !important; color:#9a3412 !important; }
      #pagamentos.pag-v31 .valores-manager-panel { margin-top:16px; border:1px solid var(--pag-border); box-shadow:none; }
      @media (max-width:1180px) {
        #pagamentos.pag-v31 .pagamento-filtros-entregas { grid-template-columns:repeat(3,minmax(160px,1fr)); }
        #pagamentos.pag-v31 .pag-v31-actions { align-items:flex-start; flex-direction:column; }
        #pagamentos.pag-v31 .pag-v31-actions-buttons { width:100%; justify-content:flex-start; }
      }
      @media (max-width:760px) {
        #pagamentos.pag-v31 .pagamento-cards { padding:14px; grid-template-columns:repeat(2,minmax(0,1fr)); }
        #pagamentos.pag-v31 .pagamento-card { min-height:80px; padding:12px; }
        #pagamentos.pag-v31 .pagamento-card strong { font-size:19px; }
        #pagamentos.pag-v31 .pagamento-filtros-entregas { margin:0 14px 12px; grid-template-columns:1fr; }
        #pagamentos.pag-v31 .pag-v31-actions,
        #pagamentos.pag-v31 .pag-v31-section-title,
        #pagamentos.pag-v31 .pag-v31-table,
        #pagamentos.pag-v31 .pag-v31-pendencias-slot { margin-left:14px; margin-right:14px; }
        #pagamentos.pag-v31 .pag-v31-actions-buttons { display:grid; grid-template-columns:1fr 1fr; }
        #pagamentos.pag-v31 .pag-v31-actions-buttons .btn { width:100%; white-space:normal; }
      }
    `;
    document.head.appendChild(style);
  }

  function criarTitulo(id, titulo, descricao) {
    let elemento = document.getElementById(id);
    if (elemento) return elemento;
    elemento = document.createElement("div");
    elemento.id = id;
    elemento.className = "pag-v31-section-title";
    elemento.innerHTML = `<h3>${titulo}</h3><p>${descricao}</p>`;
    return elemento;
  }

  function criarBarraAcoes(filtros) {
    let barra = document.getElementById("pagV31Actions");
    if (!barra) {
      barra = document.createElement("section");
      barra.id = "pagV31Actions";
      barra.className = "pag-v31-actions";
      barra.innerHTML = `
        <div class="pag-v31-actions-copy">
          <strong>Ações do fechamento</strong>
          <span>Confira os filtros e os lançamentos antes de confirmar os pagamentos.</span>
        </div>
        <div class="pag-v31-actions-buttons" id="pagV31ActionsButtons"></div>
      `;
      filtros.after(barra);
    }

    const destino = document.getElementById("pagV31ActionsButtons");
    [
      "btnLimparFiltrosPagamento",
      "btnImprimirPagamento",
      "btnToggleGerenciarValores",
      "btnMarcarPagamentosFiltrados"
    ].forEach(id => {
      const botao = document.getElementById(id);
      if (botao && destino && !destino.contains(botao)) destino.appendChild(botao);
    });

    return barra;
  }

  function criarSlotPendencias(barra) {
    let slot = document.getElementById("pagV31PendenciasSlot");
    if (!slot) {
      slot = document.createElement("div");
      slot.id = "pagV31PendenciasSlot";
      slot.className = "pag-v31-pendencias-slot";
      barra.after(slot);
    }
    return slot;
  }

  function encontrarPainelPendencias() {
    const candidatos = [...document.querySelectorAll(
      "#pagamentos [id], #pagamentos [class], body > dialog, body > [role='dialog'], body > .modal"
    )].filter(elemento => {
      if (!(elemento instanceof HTMLElement)) return false;
      if (elemento.id === "pagamentos") return false;
      if (elemento.classList.contains("pagamentos-relatorio-panel")) return false;
      if (elemento.matches("button, a, option, tr, td, th")) return false;
      const texto = normalizar(elemento.textContent);
      const identificador = normalizar(`${elemento.id} ${elemento.className}`);
      const relacionado = texto.includes("PENDENCIAS POR VALORES") ||
        texto.includes("PENDENCIAS DE VALOR") ||
        texto.includes("VALOR A DEFINIR") ||
        (identificador.includes("PENDENCIA") && identificador.includes("VALOR"));
      return relacionado && elemento.querySelectorAll("*").length > 0;
    });

    candidatos.sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length);
    return candidatos[0] || null;
  }

  function simplificarPendencias() {
    const slot = document.getElementById("pagV31PendenciasSlot");
    if (!slot) return;
    const painel = encontrarPainelPendencias();
    if (!painel || painel === slot || slot.contains(painel)) return;
    painel.classList.add("pag-v31-pendencias-inline");
    slot.appendChild(painel);
  }

  function organizar() {
    const pagina = document.getElementById("pagamentos");
    const painel = pagina?.querySelector(":scope > .pagamentos-relatorio-panel");
    const filtros = pagina?.querySelector(".pagamento-filtros-entregas");
    const cards = pagina?.querySelector(".pagamento-cards");
    const resumo = document.getElementById("listaPagamento")?.closest(".table-wrap");
    const detalhes = document.getElementById("listaEntregasPagamento")?.closest(".table-wrap");
    const detalhesHeader = painel?.querySelector(".entregas-header");

    if (!pagina || !painel || !filtros || !cards || !resumo || !detalhes) return false;
    if (pagina.dataset.pagV31Organizado === VERSION) return true;

    injetarEstilos();
    pagina.classList.add("pag-v31");

    const barra = criarBarraAcoes(filtros);
    criarSlotPendencias(barra);

    const tituloResumo = criarTitulo(
      "pagV31TituloResumo",
      "Resumo por facção",
      "Totais agrupados por facção, referência e processo."
    );
    if (!tituloResumo.isConnected) barra.after(tituloResumo);
    resumo.classList.add("pag-v31-table");
    tituloResumo.after(resumo);

    const tituloDetalhes = criarTitulo(
      "pagV31TituloDetalhes",
      "Pagamentos gerados",
      "Lançamentos individuais criados pelas chegadas das facções."
    );
    if (!tituloDetalhes.isConnected) resumo.after(tituloDetalhes);
    detalhesHeader?.remove();
    detalhes.classList.add("pag-v31-table");
    tituloDetalhes.after(detalhes);

    document.querySelectorAll("#pagamentos button, #pagamentos a").forEach(elemento => {
      const texto = normalizar(elemento.textContent);
      if (texto.includes("PENDENCIA") && texto.includes("VALOR")) {
        elemento.classList.add("pag-v31-pendencias-trigger");
      }
    });

    pagina.dataset.pagV31Organizado = VERSION;
    return true;
  }

  function iniciarComTentativas() {
    let tentativas = 0;
    const executar = () => {
      tentativas += 1;
      if (organizar() || tentativas >= 20) return;
      setTimeout(executar, 250);
    };
    executar();
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;

    if (alvo.closest('.nav-btn[data-page="pagamentos"]')) {
      setTimeout(iniciarComTentativas, 50);
    }

    const texto = normalizar(alvo.closest("button, a")?.textContent || "");
    if (texto.includes("PENDENCIA") && texto.includes("VALOR")) {
      setTimeout(simplificarPendencias, 80);
      setTimeout(simplificarPendencias, 300);
    }
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarComTentativas, { once: true });
  } else {
    iniciarComTentativas();
  }
})();
