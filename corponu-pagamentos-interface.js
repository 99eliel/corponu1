(() => {
  "use strict";

  const VERSION = "2026-07-30-pagamentos-interface-organizada-30";
  const STORAGE_VIEW = "corponu_pagamentos_visao_v30";

  if (window.__CORPONU_PAGAMENTOS_INTERFACE__ === VERSION) return;
  window.__CORPONU_PAGAMENTOS_INTERFACE__ = VERSION;

  const normalizar = valor => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  function criar(tag, classe, html = "") {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (html) elemento.innerHTML = html;
    return elemento;
  }

  function injetarEstilos() {
    if (document.getElementById("corponuPagamentosV30Estilos")) return;

    const style = document.createElement("style");
    style.id = "corponuPagamentosV30Estilos";
    style.textContent = `
      #pagamentos.pag-v30 { --pag-border:#d8e2ef; --pag-soft:#f7f9fc; --pag-ink:#0f172a; --pag-muted:#64748b; }
      #pagamentos.pag-v30 .pagamentos-relatorio-panel { padding:0; overflow:hidden; border:1px solid var(--pag-border); background:#fff; }
      #pagamentos.pag-v30 .pag-v30-hero { padding:22px 24px 16px; margin:0; border-bottom:1px solid #e8eef6; background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%); }
      #pagamentos.pag-v30 .pag-v30-hero h3 { margin:0 0 5px; font-size:22px; letter-spacing:-.02em; }
      #pagamentos.pag-v30 .pag-v30-hero p { max-width:760px; margin:0; color:var(--pag-muted); }
      #pagamentos.pag-v30 .pagamento-cards { order:initial; margin:0; padding:18px 24px; display:grid; grid-template-columns:repeat(4,minmax(150px,1fr)); gap:12px; background:#fff; }
      #pagamentos.pag-v30 .pagamento-card { min-height:94px; padding:15px 17px; border:1px solid var(--pag-border); border-radius:14px; background:#fff; box-shadow:none; }
      #pagamentos.pag-v30 .pagamento-card span { color:var(--pag-muted); font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.045em; }
      #pagamentos.pag-v30 .pagamento-card strong { margin-top:7px; font-size:24px; color:var(--pag-ink); }
      #pagamentos.pag-v30 .pagamento-card.destaque { border-color:#c4b5fd; background:#f5f3ff; }
      #pagamentos.pag-v30 .pagamento-card.destaque strong { color:#6d28d9; }
      #pagamentos.pag-v30 .pag-v30-filtros { margin:0 24px 14px; border:1px solid var(--pag-border); border-radius:15px; background:var(--pag-soft); overflow:hidden; }
      #pagamentos.pag-v30 .pag-v30-filtros-head { display:flex; align-items:center; justify-content:space-between; gap:15px; padding:13px 16px 10px; border-bottom:1px solid #e4ebf4; }
      #pagamentos.pag-v30 .pag-v30-filtros-head strong { display:block; font-size:14px; color:var(--pag-ink); }
      #pagamentos.pag-v30 .pag-v30-filtros-head span { display:block; margin-top:2px; color:var(--pag-muted); font-size:12px; }
      #pagamentos.pag-v30 .pagamento-filtros-entregas { margin:0; padding:14px 16px 16px; display:grid; grid-template-columns:repeat(6,minmax(130px,1fr)); gap:11px; align-items:end; background:transparent; border:0; }
      #pagamentos.pag-v30 .pagamento-filtros-entregas label { min-width:0; margin:0; font-size:12px; font-weight:800; color:#334155; }
      #pagamentos.pag-v30 .pagamento-filtros-entregas input,
      #pagamentos.pag-v30 .pagamento-filtros-entregas select { min-height:42px; width:100%; margin-top:5px; border-radius:10px; background:#fff; }
      #pagamentos.pag-v30 .pag-v30-toolbar { margin:0 24px 16px; padding:13px 14px; display:flex; align-items:center; justify-content:space-between; gap:14px; border:1px solid var(--pag-border); border-radius:15px; background:#fff; }
      #pagamentos.pag-v30 .pag-v30-toolbar-copy strong { display:block; font-size:14px; }
      #pagamentos.pag-v30 .pag-v30-toolbar-copy span { display:block; margin-top:3px; max-width:540px; color:var(--pag-muted); font-size:12px; line-height:1.35; }
      #pagamentos.pag-v30 .pag-v30-toolbar-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
      #pagamentos.pag-v30 .pag-v30-toolbar .btn { min-height:40px; white-space:nowrap; }
      #pagamentos.pag-v30 #btnMarcarPagamentosFiltrados { order:10; background:#15803d; border-color:#15803d; color:#fff; font-weight:900; }
      #pagamentos.pag-v30 #btnImprimirPagamento { order:6; }
      #pagamentos.pag-v30 #btnLimparFiltrosPagamento { order:1; }
      #pagamentos.pag-v30 #btnToggleGerenciarValores { order:8; }
      #pagamentos.pag-v30 .pag-v30-tabs { margin:0 24px; display:flex; gap:8px; border-bottom:1px solid var(--pag-border); }
      #pagamentos.pag-v30 .pag-v30-tab { appearance:none; border:1px solid transparent; border-bottom:0; padding:11px 15px; border-radius:11px 11px 0 0; background:transparent; color:#475569; font:inherit; font-weight:900; cursor:pointer; }
      #pagamentos.pag-v30 .pag-v30-tab:hover { background:#f8fafc; color:#0f172a; }
      #pagamentos.pag-v30 .pag-v30-tab.active { color:#5b21b6; background:#f5f3ff; border-color:#ddd6fe; }
      #pagamentos.pag-v30 .pag-v30-tab small { margin-left:6px; display:inline-flex; min-width:22px; height:22px; align-items:center; justify-content:center; padding:0 6px; border-radius:999px; background:#e2e8f0; color:#334155; font-size:11px; }
      #pagamentos.pag-v30 .pag-v30-tab.active small { background:#ddd6fe; color:#5b21b6; }
      #pagamentos.pag-v30 .pag-v30-section { margin:0 24px 22px; padding-top:14px; }
      #pagamentos.pag-v30 .pag-v30-section.hidden { display:none !important; }
      #pagamentos.pag-v30 .pag-v30-section-title { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin:0 0 10px; }
      #pagamentos.pag-v30 .pag-v30-section-title h3 { margin:0; font-size:16px; }
      #pagamentos.pag-v30 .pag-v30-section-title p { margin:3px 0 0; color:var(--pag-muted); font-size:12px; }
      #pagamentos.pag-v30 .pag-v30-section > .table-wrap { margin:0; border:1px solid var(--pag-border); border-radius:13px; overflow:auto; }
      #pagamentos.pag-v30 .pag-v30-section table { margin:0; }
      #pagamentos.pag-v30 .pag-v30-section thead th { position:sticky; top:0; z-index:1; background:#eef3fb; color:#334155; font-size:11px; text-transform:uppercase; letter-spacing:.035em; }
      #pagamentos.pag-v30 .pag-v30-section tbody tr:hover { background:#f8fafc; }
      #pagamentos.pag-v30 .pag-v30-section td { vertical-align:middle; }
      #pagamentos.pag-v30 .pag-v30-section td:last-child { white-space:nowrap; }
      #pagamentos.pag-v30 .valores-manager-panel { margin-top:16px; border:1px solid var(--pag-border); box-shadow:none; }
      #pagamentos.pag-v30 .valores-manager-panel:not(.hidden) { display:block; }
      #pagamentos.pag-v30 .valores-manager-panel > .panel-header { position:sticky; top:0; z-index:4; background:#fff; border-bottom:1px solid var(--pag-border); }
      #pagamentos.pag-v30 .valores-workspace { gap:16px; }
      #pagamentos.pag-v30 .valores-sidebar { border-radius:14px; background:#f8fafc; }
      #pagamentos.pag-v30 .valores-main > * { border-radius:14px; }
      #pagamentos.pag-v30 .pag-v30-pendencias-slot:empty { display:none; }
      #pagamentos.pag-v30 .pag-v30-pendencias-slot { margin:0 24px 16px; }
      #pagamentos.pag-v30 .pag-v30-pendencias-simples { position:static !important; inset:auto !important; width:100% !important; max-width:none !important; min-height:0 !important; margin:0 !important; padding:0 !important; border:0 !important; border-radius:0 !important; background:transparent !important; box-shadow:none !important; backdrop-filter:none !important; }
      #pagamentos.pag-v30 .pag-v30-pendencias-simples > * { width:100% !important; max-width:none !important; margin:0 !important; padding:12px 14px !important; border:1px solid #fed7aa !important; border-radius:11px !important; background:#fff7ed !important; box-shadow:none !important; }
      #pagamentos.pag-v30 .pag-v30-pendencias-simples .card,
      #pagamentos.pag-v30 .pag-v30-pendencias-simples .panel { border:0 !important; border-radius:0 !important; background:transparent !important; box-shadow:none !important; }
      #pagamentos.pag-v30 .pag-v30-pendencias-simples table { font-size:12px; }
      #pagamentos.pag-v30 .pag-v30-pendencias-trigger { background:#fff7ed !important; border-color:#fdba74 !important; color:#9a3412 !important; }
      @media (max-width:1180px) {
        #pagamentos.pag-v30 .pagamento-filtros-entregas { grid-template-columns:repeat(3,minmax(160px,1fr)); }
        #pagamentos.pag-v30 .pag-v30-toolbar { align-items:flex-start; flex-direction:column; }
        #pagamentos.pag-v30 .pag-v30-toolbar-actions { width:100%; justify-content:flex-start; }
      }
      @media (max-width:760px) {
        #pagamentos.pag-v30 .pag-v30-hero { padding:18px 15px 13px; }
        #pagamentos.pag-v30 .pagamento-cards { padding:14px 15px; grid-template-columns:repeat(2,minmax(0,1fr)); }
        #pagamentos.pag-v30 .pagamento-card { min-height:82px; padding:12px; }
        #pagamentos.pag-v30 .pagamento-card strong { font-size:19px; }
        #pagamentos.pag-v30 .pag-v30-filtros,
        #pagamentos.pag-v30 .pag-v30-toolbar,
        #pagamentos.pag-v30 .pag-v30-tabs,
        #pagamentos.pag-v30 .pag-v30-section,
        #pagamentos.pag-v30 .pag-v30-pendencias-slot { margin-left:15px; margin-right:15px; }
        #pagamentos.pag-v30 .pagamento-filtros-entregas { grid-template-columns:1fr; }
        #pagamentos.pag-v30 .pag-v30-toolbar-actions { display:grid; grid-template-columns:1fr 1fr; }
        #pagamentos.pag-v30 .pag-v30-toolbar-actions .btn { width:100%; white-space:normal; }
        #pagamentos.pag-v30 .pag-v30-tabs { overflow:auto; }
        #pagamentos.pag-v30 .pag-v30-tab { white-space:nowrap; }
      }
    `;
    document.head.appendChild(style);
  }

  function encontrarPainelPendencias(pagina) {
    const candidatos = [...document.querySelectorAll(
      "#pagamentos [id], #pagamentos [class], body > dialog, body > [role='dialog'], body > .modal"
    )].filter(elemento => {
      if (!(elemento instanceof HTMLElement)) return false;
      if (elemento.id === "pagamentos" || elemento.classList.contains("pagamentos-relatorio-panel")) return false;
      const texto = normalizar(elemento.textContent);
      const identificador = normalizar(`${elemento.id} ${elemento.className}`);
      const relacionado = (
        texto.includes("PENDENCIAS POR VALORES") ||
        texto.includes("PENDENCIAS DE VALOR") ||
        texto.includes("VALOR A DEFINIR") ||
        (identificador.includes("PENDENCIA") && identificador.includes("VALOR"))
      );
      if (!relacionado) return false;
      if (elemento.matches("button, a, option, tr, td, th")) return false;
      return elemento.querySelectorAll("*").length > 0;
    });

    candidatos.sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length);
    return candidatos[0] || null;
  }

  function simplificarPendencias(pagina, slot, toolbarActions) {
    const gatilhos = [...document.querySelectorAll("#pagamentos button, #pagamentos a")]
      .filter(elemento => {
        const texto = normalizar(elemento.textContent);
        return texto.includes("PENDENCIA") && texto.includes("VALOR");
      });

    gatilhos.forEach(gatilho => {
      gatilho.classList.add("pag-v30-pendencias-trigger");
      if (toolbarActions && !toolbarActions.contains(gatilho)) toolbarActions.appendChild(gatilho);
    });

    const painel = encontrarPainelPendencias(pagina);
    if (!painel || painel === slot || slot.contains(painel)) return;

    painel.classList.add("pag-v30-pendencias-simples");
    slot.appendChild(painel);
  }

  function criarTituloSecao(titulo, descricao) {
    return criar("div", "pag-v30-section-title", `
      <div>
        <h3>${titulo}</h3>
        <p>${descricao}</p>
      </div>
    `);
  }

  function atualizarContadoresAbas() {
    const resumo = document.getElementById("listaPagamento");
    const detalhes = document.getElementById("listaEntregasPagamento");
    const contar = tbody => tbody
      ? [...tbody.querySelectorAll(":scope > tr")].filter(linha => !linha.querySelector("td.empty")).length
      : 0;

    const resumoContador = document.querySelector('[data-pag-v30-tab="resumo"] small');
    const detalhesContador = document.querySelector('[data-pag-v30-tab="detalhes"] small');
    if (resumoContador) resumoContador.textContent = String(contar(resumo));
    if (detalhesContador) detalhesContador.textContent = String(contar(detalhes));
  }

  function mostrarVisao(visao) {
    const valor = visao === "resumo" ? "resumo" : "detalhes";
    document.querySelectorAll("[data-pag-v30-tab]").forEach(botao => {
      botao.classList.toggle("active", botao.dataset.pagV30Tab === valor);
      botao.setAttribute("aria-selected", botao.dataset.pagV30Tab === valor ? "true" : "false");
    });
    document.getElementById("pagV30Resumo")?.classList.toggle("hidden", valor !== "resumo");
    document.getElementById("pagV30Detalhes")?.classList.toggle("hidden", valor !== "detalhes");
    try { sessionStorage.setItem(STORAGE_VIEW, valor); } catch (error) {}
  }

  function organizar() {
    const pagina = document.getElementById("pagamentos");
    const painel = pagina?.querySelector(":scope > .pagamentos-relatorio-panel");
    const filtros = pagina?.querySelector(".pagamento-filtros-entregas");
    const cards = pagina?.querySelector(".pagamento-cards");
    const tbodyResumo = document.getElementById("listaPagamento");
    const tbodyDetalhes = document.getElementById("listaEntregasPagamento");

    if (!pagina || !painel || !filtros || !cards || !tbodyResumo || !tbodyDetalhes) return;

    injetarEstilos();
    pagina.classList.add("pag-v30");

    const hero = painel.querySelector(":scope > .panel-header");
    hero?.classList.add("pag-v30-hero");

    let filtrosBox = document.getElementById("pagV30Filtros");
    if (!filtrosBox) {
      filtrosBox = criar("section", "pag-v30-filtros");
      filtrosBox.id = "pagV30Filtros";
      filtrosBox.appendChild(criar("div", "pag-v30-filtros-head", `
        <div><strong>Filtros do fechamento</strong><span>Use um ou mais campos para conferir exatamente o que será pago.</span></div>
      `));
      cards.after(filtrosBox);
    }
    if (!filtrosBox.contains(filtros)) filtrosBox.appendChild(filtros);

    let toolbar = document.getElementById("pagV30Toolbar");
    if (!toolbar) {
      toolbar = criar("section", "pag-v30-toolbar", `
        <div class="pag-v30-toolbar-copy">
          <strong>Ações do fechamento</strong>
          <span>Confira os filtros e os lançamentos antes de marcar pagamentos como pagos.</span>
        </div>
        <div class="pag-v30-toolbar-actions" id="pagV30ToolbarActions"></div>
      `);
      filtrosBox.after(toolbar);
    }

    const toolbarActions = document.getElementById("pagV30ToolbarActions");
    [
      "btnLimparFiltrosPagamento",
      "btnImprimirPagamento",
      "btnToggleGerenciarValores",
      "btnMarcarPagamentosFiltrados"
    ].forEach(id => {
      const botao = document.getElementById(id);
      if (botao && toolbarActions && !toolbarActions.contains(botao)) toolbarActions.appendChild(botao);
    });

    let pendenciasSlot = document.getElementById("pagV30PendenciasSlot");
    if (!pendenciasSlot) {
      pendenciasSlot = criar("div", "pag-v30-pendencias-slot");
      pendenciasSlot.id = "pagV30PendenciasSlot";
      toolbar.after(pendenciasSlot);
    }
    simplificarPendencias(pagina, pendenciasSlot, toolbarActions);

    const resumoTableWrap = tbodyResumo.closest(".table-wrap");
    const detalheTableWrap = tbodyDetalhes.closest(".table-wrap");
    const detalhesHeader = painel.querySelector(".entregas-header");

    let resumoSection = document.getElementById("pagV30Resumo");
    if (!resumoSection) {
      resumoSection = criar("section", "pag-v30-section");
      resumoSection.id = "pagV30Resumo";
      resumoSection.appendChild(criarTituloSecao(
        "Resumo por facção",
        "Agrupamento por facção, referência e processo para conferência rápida."
      ));
      pendenciasSlot.after(resumoSection);
    }
    if (resumoTableWrap && !resumoSection.contains(resumoTableWrap)) resumoSection.appendChild(resumoTableWrap);

    let detalhesSection = document.getElementById("pagV30Detalhes");
    if (!detalhesSection) {
      detalhesSection = criar("section", "pag-v30-section");
      detalhesSection.id = "pagV30Detalhes";
      detalhesSection.appendChild(criarTituloSecao(
        "Pagamentos gerados",
        "Lista individual das chegadas, com situação e ações de pagamento."
      ));
      resumoSection.after(detalhesSection);
    }
    detalhesHeader?.remove();
    if (detalheTableWrap && !detalhesSection.contains(detalheTableWrap)) detalhesSection.appendChild(detalheTableWrap);

    let tabs = document.getElementById("pagV30Tabs");
    if (!tabs) {
      tabs = criar("div", "pag-v30-tabs", `
        <button type="button" class="pag-v30-tab" role="tab" data-pag-v30-tab="detalhes">Lançamentos <small>0</small></button>
        <button type="button" class="pag-v30-tab" role="tab" data-pag-v30-tab="resumo">Resumo por facção <small>0</small></button>
      `);
      tabs.id = "pagV30Tabs";
      resumoSection.before(tabs);
    }

    const manager = document.getElementById("painelGerenciarValores");
    manager?.classList.add("pag-v30-manager");

    atualizarContadoresAbas();

    let visao = "detalhes";
    try { visao = sessionStorage.getItem(STORAGE_VIEW) || "detalhes"; } catch (error) {}
    if (!tabs.dataset.inicializado) {
      tabs.dataset.inicializado = "1";
      mostrarVisao(visao);
    }
  }

  document.addEventListener("click", event => {
    const botao = event.target instanceof Element
      ? event.target.closest("[data-pag-v30-tab]")
      : null;
    if (!botao) return;
    mostrarVisao(botao.dataset.pagV30Tab);
  });

  function iniciar() {
    organizar();
    const observer = new MutationObserver(() => {
      organizar();
      atualizarContadoresAbas();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();