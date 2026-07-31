(() => {
  "use strict";

  const VERSION = "2026-07-30-pagamentos-multifiltro-visual-36";
  const ID_CONTROLE = "pagamentoFiltroProcessosMultiplos";
  const ID_BOTAO = "btnPagamentoFiltroProcessosMultiplos";
  const ID_PAINEL = "painelPagamentoFiltroProcessosMultiplos";
  const ID_LISTA = "listaPagamentoFiltroProcessosMultiplos";

  if (window.__CORPONU_PAGAMENTOS_MULTIFILTRO_VISUAL__ === VERSION) return;
  window.__CORPONU_PAGAMENTOS_MULTIFILTRO_VISUAL__ = VERSION;

  let sincronizandoAliases = false;
  let observerLista = null;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  function nomeCanonico(valor) {
    const chave = normalizar(valor);
    const aliases = {
      "BOJO": "ENCAPAR BOJO",
      "ENCAPA BOJO": "ENCAPAR BOJO",
      "ENCAPAR BOJO": "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      "ALCA": "ALÇA",
      "ALCAS": "ALÇA",
      "ALCA PRONTA": "ALÇA",
      "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
      "SUTIA COMPLETO": "SUTIÃ COMPLETO",
      "MONTAGEM CALCINHA": "CALCINHA MONTAGEM",
      "MONTAR CALCINHA": "CALCINHA MONTAGEM"
    };
    return aliases[chave] || String(valor || "").trim().toUpperCase();
  }

  function injetarEstilos() {
    let style = document.getElementById("stylePagamentoMultifiltroVisual36");
    if (style) return;
    style = document.createElement("style");
    style.id = "stylePagamentoMultifiltroVisual36";
    style.textContent = `
      #${ID_CONTROLE}{position:relative!important;margin-top:6px!important}
      #${ID_BOTAO}{min-height:40px!important;padding:9px 12px!important;border:1px solid #cbd5e1!important;border-radius:10px!important;background:#fff!important;box-shadow:none!important;color:#0f172a!important;font-size:12px!important;font-weight:800!important}
      #${ID_BOTAO}:hover{border-color:#94a3b8!important;background:#f8fafc!important}
      #${ID_BOTAO}:focus,#${ID_BOTAO}.aberto{outline:none!important;border-color:#7c3aed!important;box-shadow:0 0 0 3px rgba(124,58,237,.12)!important}
      #${ID_BOTAO} .pag-multi-seta{font-size:13px!important;color:#64748b!important;transform:rotate(0deg);transition:transform .16s ease}
      #${ID_BOTAO}.aberto .pag-multi-seta{transform:rotate(180deg)}
      #${ID_PAINEL}{left:auto!important;right:0!important;width:min(410px,calc(100vw - 28px))!important;padding:0!important;overflow:hidden!important;border:1px solid #d7e0eb!important;border-radius:16px!important;background:#fff!important;box-shadow:0 22px 55px rgba(15,23,42,.22)!important}
      #${ID_PAINEL}.hidden{display:none!important}
      #${ID_PAINEL} .pag-multi-topo{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:14px 16px 12px!important;border-bottom:1px solid #e2e8f0!important;background:#f8fafc!important}
      #${ID_PAINEL} .pag-multi-topo strong{font-size:13px!important;color:#0f172a!important}
      #${ID_PAINEL} .pag-multi-topo button{min-height:auto!important;padding:5px 8px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:#6d28d9!important;font-size:11px!important;font-weight:900!important}
      #${ID_PAINEL} .pag-multi-topo button:hover{background:#ede9fe!important}
      .pmf-v36-search-wrap{padding:12px 14px 8px;background:#fff}
      .pmf-v36-search{width:100%!important;min-height:38px!important;margin:0!important;padding:8px 11px 8px 34px!important;border:1px solid #cbd5e1!important;border-radius:10px!important;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.3-4.3'/%3E%3C/svg%3E") no-repeat 10px center!important;color:#0f172a!important;font-size:12px!important}
      .pmf-v36-search:focus{outline:none!important;border-color:#7c3aed!important;box-shadow:0 0 0 3px rgba(124,58,237,.11)!important}
      #${ID_LISTA}{display:grid!important;gap:4px!important;max-height:270px!important;overflow:auto!important;padding:4px 10px 10px!important;scrollbar-width:thin}
      #${ID_LISTA} .pag-multi-opcao{display:grid!important;grid-template-columns:20px minmax(0,1fr)!important;align-items:center!important;gap:10px!important;min-height:42px!important;margin:0!important;padding:9px 10px!important;border:1px solid transparent!important;border-radius:10px!important;background:#fff!important;color:#334155!important;font-size:12px!important;font-weight:800!important;line-height:1.3!important}
      #${ID_LISTA} .pag-multi-opcao:hover{background:#f8fafc!important;border-color:#e2e8f0!important}
      #${ID_LISTA} .pag-multi-opcao.pmf-v36-selecionado{background:#f5f3ff!important;border-color:#c4b5fd!important;color:#5b21b6!important}
      #${ID_LISTA} .pag-multi-opcao.pmf-v36-oculto{display:none!important}
      #${ID_LISTA} .pag-multi-opcao span{display:block!important;margin:0!important;padding:0!important;min-width:0!important}
      #${ID_LISTA} .pag-multi-opcao input[type="checkbox"]{appearance:none!important;-webkit-appearance:none!important;display:grid!important;place-items:center!important;width:18px!important;height:18px!important;min-width:18px!important;min-height:18px!important;max-width:18px!important;max-height:18px!important;margin:0!important;padding:0!important;border:1.5px solid #94a3b8!important;border-radius:5px!important;background:#fff!important;box-shadow:none!important;accent-color:transparent!important;cursor:pointer!important}
      #${ID_LISTA} .pag-multi-opcao input[type="checkbox"]::after{content:"";width:8px;height:4px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg) scale(0);transform-origin:center;transition:transform .1s ease}
      #${ID_LISTA} .pag-multi-opcao input[type="checkbox"]:checked{border-color:#7c3aed!important;background:#7c3aed!important}
      #${ID_LISTA} .pag-multi-opcao input[type="checkbox"]:checked::after{transform:rotate(-45deg) scale(1)}
      .pmf-v36-vazio{padding:22px 12px;text-align:center;color:#64748b;font-size:12px}
      .pmf-v36-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px;border-top:1px solid #e2e8f0;background:#f8fafc}
      .pmf-v36-contagem{color:#64748b;font-size:11px;font-weight:800}
      .pmf-v36-concluir{min-height:34px!important;padding:7px 13px!important;border:1px solid #7c3aed!important;border-radius:9px!important;background:#7c3aed!important;color:#fff!important;font-size:11px!important;font-weight:900!important;cursor:pointer!important}
      .pmf-v36-concluir:hover{background:#6d28d9!important}
      #${ID_CONTROLE} .pag-multi-resumo{margin-top:5px!important;color:#64748b!important;font-size:10px!important;font-weight:700!important;line-height:1.35!important}
      #${ID_CONTROLE} .pag-multi-resumo strong{color:#5b21b6!important}
      @media(max-width:720px){#${ID_PAINEL}{position:fixed!important;left:12px!important;right:12px!important;top:auto!important;bottom:12px!important;width:auto!important;max-height:72vh!important}#${ID_LISTA}{max-height:42vh!important}}
    `;
    document.head.appendChild(style);
  }

  function gruposVisuais() {
    const lista = document.getElementById(ID_LISTA);
    if (!lista) return new Map();
    const grupos = new Map();
    lista.querySelectorAll(".pag-multi-opcao").forEach(label => {
      const texto = label.querySelector("span")?.textContent?.trim() || "";
      const canonico = nomeCanonico(texto);
      const chave = normalizar(canonico);
      if (!grupos.has(chave)) grupos.set(chave, { canonico, labels: [] });
      grupos.get(chave).labels.push(label);
    });
    return grupos;
  }

  function atualizarResumoBonito() {
    const grupos = gruposVisuais();
    const selecionados = [];
    grupos.forEach(grupo => {
      const marcado = grupo.labels.some(label => label.querySelector("input")?.checked);
      const principal = grupo.labels[0];
      principal?.classList.toggle("pmf-v36-selecionado", marcado);
      if (marcado) selecionados.push(grupo.canonico);
    });
    const botao = document.getElementById(ID_BOTAO);
    const label = botao?.querySelector(".pag-multi-label");
    const resumo = document.querySelector(`#${ID_CONTROLE} .pag-multi-resumo`);
    const contagem = document.querySelector(".pmf-v36-contagem");
    if (label) label.textContent = selecionados.length === 0 ? "Todos" : selecionados.length === 1 ? selecionados[0] : `${selecionados.length} processos selecionados`;
    if (resumo) resumo.innerHTML = selecionados.length === 0 ? "Todos os processos serão considerados." : `<strong>${selecionados.length}</strong> selecionado(s): ${selecionados.join(", ")}`;
    if (contagem) contagem.textContent = selecionados.length === 0 ? "Todos os processos" : `${selecionados.length} selecionado(s)`;
  }

  function organizarOpcoes() {
    const grupos = gruposVisuais();
    grupos.forEach(grupo => {
      const principal = grupo.labels[0];
      if (!principal) return;
      const span = principal.querySelector("span");
      if (span) span.textContent = grupo.canonico;
      grupo.labels.forEach((label, indice) => {
        label.classList.toggle("pmf-v36-oculto", indice > 0);
        label.dataset.pmfGrupo = normalizar(grupo.canonico);
      });
      const marcado = grupo.labels.some(label => label.querySelector("input")?.checked);
      const inputPrincipal = principal.querySelector("input");
      if (inputPrincipal) inputPrincipal.checked = marcado;
    });
    atualizarResumoBonito();
  }

  function filtrarOpcoes(termo) {
    const busca = normalizar(termo);
    const grupos = gruposVisuais();
    let visiveis = 0;
    grupos.forEach(grupo => {
      const principal = grupo.labels[0];
      if (!principal) return;
      const mostrar = !busca || normalizar(grupo.canonico).includes(busca);
      principal.style.display = mostrar ? "" : "none";
      if (mostrar) visiveis += 1;
    });
    let vazio = document.querySelector(".pmf-v36-vazio");
    if (!vazio) {
      vazio = document.createElement("div");
      vazio.className = "pmf-v36-vazio";
      vazio.textContent = "Nenhum processo encontrado.";
      document.getElementById(ID_LISTA)?.appendChild(vazio);
    }
    vazio.style.display = visiveis ? "none" : "block";
  }

  function garantirEstrutura() {
    const painel = document.getElementById(ID_PAINEL);
    const lista = document.getElementById(ID_LISTA);
    if (!painel || !lista) return false;
    injetarEstilos();
    if (!painel.querySelector(".pmf-v36-search-wrap")) {
      const buscaWrap = document.createElement("div");
      buscaWrap.className = "pmf-v36-search-wrap";
      buscaWrap.innerHTML = '<input class="pmf-v36-search" type="search" autocomplete="off" placeholder="Buscar processo...">';
      painel.querySelector(".pag-multi-topo")?.insertAdjacentElement("afterend", buscaWrap);
      buscaWrap.querySelector("input")?.addEventListener("input", event => filtrarOpcoes(event.target.value));
    }
    if (!painel.querySelector(".pmf-v36-footer")) {
      const footer = document.createElement("div");
      footer.className = "pmf-v36-footer";
      footer.innerHTML = '<span class="pmf-v36-contagem">Todos os processos</span><button type="button" class="pmf-v36-concluir">Concluir</button>';
      painel.appendChild(footer);
      footer.querySelector(".pmf-v36-concluir")?.addEventListener("click", () => {
        painel.classList.add("hidden");
        document.getElementById(ID_BOTAO)?.classList.remove("aberto");
        document.getElementById(ID_BOTAO)?.setAttribute("aria-expanded", "false");
      });
    }
    const limpar = painel.querySelector("[data-limpar-processos-multiplos]");
    if (limpar) limpar.textContent = "Limpar seleção";
    organizarOpcoes();
    if (observerLista) observerLista.disconnect();
    observerLista = new MutationObserver(() => {
      organizarOpcoes();
      const busca = painel.querySelector(".pmf-v36-search")?.value || "";
      filtrarOpcoes(busca);
    });
    observerLista.observe(lista, { childList: true });
    return true;
  }

  document.addEventListener("change", event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches("[data-processo-multiplo]")) return;
    if (sincronizandoAliases) return;
    const label = input.closest(".pag-multi-opcao");
    const texto = label?.querySelector("span")?.textContent || "";
    const canonico = normalizar(nomeCanonico(texto));
    const grupo = gruposVisuais().get(canonico);
    if (!grupo) return setTimeout(atualizarResumoBonito, 0);
    sincronizandoAliases = true;
    try {
      grupo.labels.forEach(outroLabel => {
        const outro = outroLabel.querySelector("input[data-processo-multiplo]");
        if (!outro || outro === input || outro.checked === input.checked) return;
        outro.checked = input.checked;
        outro.dispatchEvent(new Event("change", { bubbles: true }));
      });
    } finally {
      sincronizandoAliases = false;
    }
    setTimeout(atualizarResumoBonito, 0);
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;
    if (alvo.closest(`#${ID_BOTAO}`)) {
      setTimeout(() => {
        garantirEstrutura();
        document.querySelector(`#${ID_PAINEL} .pmf-v36-search`)?.focus();
      }, 0);
    }
    if (alvo.closest("[data-limpar-processos-multiplos]")) {
      setTimeout(() => {
        atualizarResumoBonito();
        const busca = document.querySelector(`#${ID_PAINEL} .pmf-v36-search`);
        if (busca) busca.value = "";
        filtrarOpcoes("");
      }, 0);
    }
    if (alvo.closest('.nav-btn[data-page="pagamentos"]')) [120, 450, 900].forEach(atraso => setTimeout(garantirEstrutura, atraso));
  }, true);

  function iniciar() {
    let tentativas = 0;
    const tentar = () => {
      tentativas += 1;
      if (garantirEstrutura() || tentativas >= 40) return;
      setTimeout(tentar, 250);
    };
    tentar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();