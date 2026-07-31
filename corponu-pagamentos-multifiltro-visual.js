(() => {
  "use strict";

  const VERSION = "2026-07-30-pagamentos-multifiltro-profissional-37";
  const ID_CONTROLE = "pagamentoFiltroProcessosMultiplos";
  const ID_BOTAO = "btnPagamentoFiltroProcessosMultiplos";
  const ID_PAINEL = "painelPagamentoFiltroProcessosMultiplos";
  const ID_LISTA = "listaPagamentoFiltroProcessosMultiplos";

  if (window.__CORPONU_PAGAMENTOS_MULTIFILTRO_VISUAL__ === VERSION) return;
  window.__CORPONU_PAGAMENTOS_MULTIFILTRO_VISUAL__ = VERSION;

  let observer = null;
  let organizando = false;
  let timer = 0;

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
      "ENCAPAR": "ENCAPAR BOJO",
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
    document.getElementById("stylePagamentoMultifiltroVisual36")?.remove();
    document.getElementById("stylePagamentoMultifiltroProfissional37")?.remove();

    const style = document.createElement("style");
    style.id = "stylePagamentoMultifiltroProfissional37";
    style.textContent = `
      #${ID_CONTROLE}{position:relative!important;width:100%!important;margin-top:6px!important}
      #${ID_BOTAO}{width:100%!important;min-height:42px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;padding:9px 12px!important;border:1px solid #cbd5e1!important;border-radius:11px!important;background:#fff!important;color:#0f172a!important;font-size:12px!important;font-weight:850!important;line-height:1.25!important;box-shadow:none!important;cursor:pointer!important}
      #${ID_BOTAO}:hover{border-color:#94a3b8!important;background:#f8fafc!important}
      #${ID_BOTAO}:focus,#${ID_BOTAO}.aberto{outline:none!important;border-color:#7c3aed!important;box-shadow:0 0 0 3px rgba(124,58,237,.12)!important}
      #${ID_BOTAO} .pag-multi-seta{font-size:0!important;width:18px!important;height:18px!important;position:relative!important;flex:0 0 auto!important}
      #${ID_BOTAO} .pag-multi-seta::before{content:"";position:absolute;left:5px;top:4px;width:6px;height:6px;border-right:2px solid #64748b;border-bottom:2px solid #64748b;transform:rotate(45deg);transition:transform .16s ease}
      #${ID_BOTAO}.aberto .pag-multi-seta::before{transform:rotate(225deg);top:8px}

      #${ID_PAINEL}{position:absolute!important;z-index:10030!important;top:calc(100% + 8px)!important;left:auto!important;right:0!important;width:min(420px,calc(100vw - 28px))!important;padding:0!important;overflow:hidden!important;border:1px solid #d8e2ef!important;border-radius:16px!important;background:#fff!important;box-shadow:0 24px 64px rgba(15,23,42,.22)!important}
      #${ID_PAINEL}.hidden{display:none!important}
      #${ID_PAINEL} .pag-multi-topo{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:14px 16px 12px!important;border-bottom:1px solid #e2e8f0!important;background:#f8fafc!important}
      #${ID_PAINEL} .pag-multi-topo strong{font-size:13px!important;color:#0f172a!important}
      #${ID_PAINEL} .pag-multi-topo button{min-height:30px!important;padding:6px 9px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:#6d28d9!important;font-size:11px!important;font-weight:900!important;cursor:pointer!important}
      #${ID_PAINEL} .pag-multi-topo button:hover{background:#ede9fe!important}

      .pmf-v37-search-wrap{padding:12px 14px 8px!important;background:#fff!important}
      .pmf-v37-search{width:100%!important;min-height:40px!important;margin:0!important;padding:9px 11px 9px 36px!important;border:1px solid #cbd5e1!important;border-radius:10px!important;background:#fff!important;color:#0f172a!important;font-size:12px!important;box-shadow:none!important}
      .pmf-v37-search-wrap{position:relative!important}
      .pmf-v37-search-wrap::before{content:"";position:absolute;left:25px;top:24px;width:13px;height:13px;border:2px solid #64748b;border-radius:999px;pointer-events:none}
      .pmf-v37-search-wrap::after{content:"";position:absolute;left:37px;top:37px;width:6px;height:2px;background:#64748b;transform:rotate(45deg);pointer-events:none}
      .pmf-v37-search:focus{outline:none!important;border-color:#7c3aed!important;box-shadow:0 0 0 3px rgba(124,58,237,.10)!important}

      #${ID_LISTA}{display:grid!important;gap:6px!important;max-height:286px!important;overflow:auto!important;padding:5px 10px 10px!important;scrollbar-width:thin!important}
      #${ID_LISTA} .pag-multi-opcao{position:relative!important;display:flex!important;align-items:center!important;gap:11px!important;min-height:44px!important;margin:0!important;padding:10px 12px 10px 42px!important;border:1px solid transparent!important;border-radius:11px!important;background:#fff!important;color:#334155!important;font-size:12px!important;font-weight:850!important;line-height:1.3!important;cursor:pointer!important;transition:background .14s ease,border-color .14s ease!important}
      #${ID_LISTA} .pag-multi-opcao:hover{background:#f8fafc!important;border-color:#e2e8f0!important}
      #${ID_LISTA} .pag-multi-opcao.pmf-v37-selecionado{background:#f5f3ff!important;border-color:#c4b5fd!important;color:#5b21b6!important}
      #${ID_LISTA} .pag-multi-opcao[hidden]{display:none!important}
      #${ID_LISTA} .pag-multi-opcao span{display:block!important;margin:0!important;padding:0!important;min-width:0!important}
      #${ID_LISTA} .pag-multi-opcao input[type="checkbox"]{position:absolute!important;left:12px!important;top:50%!important;width:20px!important;height:20px!important;min-width:20px!important;min-height:20px!important;max-width:20px!important;max-height:20px!important;margin:0!important;padding:0!important;transform:translateY(-50%)!important;opacity:0!important;pointer-events:none!important}
      #${ID_LISTA} .pag-multi-opcao::before{content:"";position:absolute;left:12px;top:50%;width:18px;height:18px;border:1.5px solid #94a3b8;border-radius:5px;background:#fff;transform:translateY(-50%);box-sizing:border-box}
      #${ID_LISTA} .pag-multi-opcao::after{content:"";position:absolute;left:17px;top:calc(50% - 1px);width:7px;height:4px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:translateY(-50%) rotate(-45deg) scale(0);transition:transform .1s ease}
      #${ID_LISTA} .pag-multi-opcao.pmf-v37-selecionado::before{border-color:#7c3aed;background:#7c3aed}
      #${ID_LISTA} .pag-multi-opcao.pmf-v37-selecionado::after{transform:translateY(-50%) rotate(-45deg) scale(1)}

      .pmf-v37-vazio{display:none;padding:24px 12px;text-align:center;color:#64748b;font-size:12px}
      .pmf-v37-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px;border-top:1px solid #e2e8f0;background:#f8fafc}
      .pmf-v37-contagem{color:#64748b;font-size:11px;font-weight:800}
      .pmf-v37-concluir{min-height:34px!important;padding:7px 14px!important;border:1px solid #7c3aed!important;border-radius:9px!important;background:#7c3aed!important;color:#fff!important;font-size:11px!important;font-weight:900!important;cursor:pointer!important}
      .pmf-v37-concluir:hover{background:#6d28d9!important}
      #${ID_CONTROLE} .pag-multi-resumo{margin-top:5px!important;color:#64748b!important;font-size:10px!important;font-weight:750!important;line-height:1.35!important;white-space:normal!important}
      #${ID_CONTROLE} .pag-multi-resumo strong{color:#5b21b6!important}

      @media(max-width:720px){#${ID_PAINEL}{position:fixed!important;left:12px!important;right:12px!important;top:auto!important;bottom:12px!important;width:auto!important;max-height:72vh!important}#${ID_LISTA}{max-height:42vh!important}}
    `;
    document.head.appendChild(style);
  }

  function obterGrupos() {
    const lista = document.getElementById(ID_LISTA);
    const grupos = new Map();
    lista?.querySelectorAll(".pag-multi-opcao").forEach(label => {
      const span = label.querySelector("span");
      const input = label.querySelector('input[type="checkbox"]');
      const texto = span?.textContent?.trim() || input?.dataset.processoMultiplo || "";
      const canonico = nomeCanonico(texto);
      const chave = normalizar(canonico);
      if (!chave) return;
      if (!grupos.has(chave)) grupos.set(chave, { canonico, labels: [] });
      grupos.get(chave).labels.push(label);
    });
    return grupos;
  }

  function atualizarResumo() {
    const selecionados = [];
    obterGrupos().forEach(grupo => {
      const principal = grupo.labels[0];
      const marcado = Boolean(principal?.querySelector('input[type="checkbox"]')?.checked);
      principal?.classList.toggle("pmf-v37-selecionado", marcado);
      if (marcado) selecionados.push(grupo.canonico);
    });

    const label = document.querySelector(`#${ID_BOTAO} .pag-multi-label`);
    const resumo = document.querySelector(`#${ID_CONTROLE} .pag-multi-resumo`);
    const contagem = document.querySelector(".pmf-v37-contagem");
    if (label) label.textContent = selecionados.length === 0 ? "Todos" : selecionados.length === 1 ? selecionados[0] : `${selecionados.length} processos selecionados`;
    if (resumo) resumo.innerHTML = selecionados.length === 0
      ? "Todos os processos serão considerados."
      : `<strong>${selecionados.length}</strong> selecionado(s): ${selecionados.join(", ")}`;
    if (contagem) contagem.textContent = selecionados.length === 0 ? "Todos os processos" : `${selecionados.length} selecionado(s)`;
  }

  function organizarLista() {
    if (organizando) return;
    organizando = true;
    try {
      obterGrupos().forEach(grupo => {
        const principal = grupo.labels.find(label => normalizar(label.querySelector("span")?.textContent) === normalizar(grupo.canonico)) || grupo.labels[0];
        const inputPrincipal = principal?.querySelector('input[type="checkbox"]');
        if (!principal || !inputPrincipal) return;

        const haviaMarcado = grupo.labels.some(label => label.querySelector('input[type="checkbox"]')?.checked);
        principal.hidden = false;
        principal.querySelector("span").textContent = grupo.canonico;
        principal.classList.toggle("pmf-v37-selecionado", haviaMarcado);
        if (inputPrincipal.checked !== haviaMarcado) inputPrincipal.checked = haviaMarcado;

        grupo.labels.forEach(label => {
          if (label === principal) return;
          const input = label.querySelector('input[type="checkbox"]');
          label.hidden = true;
          label.style.setProperty("display", "none", "important");
          if (input?.checked) {
            input.checked = false;
            input.dispatchEvent(new Event("change", { bubbles:true }));
          }
        });
      });
      atualizarResumo();
    } finally {
      organizando = false;
    }
  }

  function filtrar(termo) {
    const busca = normalizar(termo);
    let visiveis = 0;
    obterGrupos().forEach(grupo => {
      const principal = grupo.labels.find(label => !label.hidden);
      if (!principal) return;
      const mostrar = !busca || normalizar(grupo.canonico).includes(busca);
      principal.style.setProperty("display", mostrar ? "flex" : "none", "important");
      if (mostrar) visiveis += 1;
    });
    const vazio = document.querySelector(".pmf-v37-vazio");
    if (vazio) vazio.style.display = visiveis ? "none" : "block";
  }

  function garantirEstrutura() {
    const painel = document.getElementById(ID_PAINEL);
    const lista = document.getElementById(ID_LISTA);
    if (!painel || !lista) return false;

    injetarEstilos();
    painel.querySelectorAll(".pmf-v36-search-wrap,.pmf-v36-footer,.pmf-v36-vazio").forEach(el => el.remove());

    let buscaWrap = painel.querySelector(".pmf-v37-search-wrap");
    if (!buscaWrap) {
      buscaWrap = document.createElement("div");
      buscaWrap.className = "pmf-v37-search-wrap";
      buscaWrap.innerHTML = '<input class="pmf-v37-search" type="search" autocomplete="off" placeholder="Buscar processo...">';
      painel.querySelector(".pag-multi-topo")?.insertAdjacentElement("afterend", buscaWrap);
      buscaWrap.querySelector("input")?.addEventListener("input", event => filtrar(event.target.value));
    }

    if (!lista.querySelector(".pmf-v37-vazio")) {
      const vazio = document.createElement("div");
      vazio.className = "pmf-v37-vazio";
      vazio.textContent = "Nenhum processo encontrado.";
      lista.appendChild(vazio);
    }

    let footer = painel.querySelector(".pmf-v37-footer");
    if (!footer) {
      footer = document.createElement("div");
      footer.className = "pmf-v37-footer";
      footer.innerHTML = '<span class="pmf-v37-contagem">Todos os processos</span><button type="button" class="pmf-v37-concluir">Concluir</button>';
      painel.appendChild(footer);
      footer.querySelector("button")?.addEventListener("click", () => {
        painel.classList.add("hidden");
        const botao = document.getElementById(ID_BOTAO);
        botao?.classList.remove("aberto");
        botao?.setAttribute("aria-expanded", "false");
      });
    }

    const limpar = painel.querySelector("[data-limpar-processos-multiplos]");
    if (limpar) limpar.textContent = "Limpar seleção";

    organizarLista();
    filtrar(buscaWrap.querySelector("input")?.value || "");

    observer?.disconnect();
    observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        organizarLista();
        filtrar(buscaWrap.querySelector("input")?.value || "");
      }, 30);
    });
    observer.observe(lista, { childList:true });
    return true;
  }

  document.addEventListener("change", event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches('[data-processo-multiplo]')) return;
    const label = input.closest(".pag-multi-opcao");
    if (label?.hidden) return;
    label?.classList.toggle("pmf-v37-selecionado", input.checked);
    setTimeout(atualizarResumo, 0);
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;
    if (alvo.closest(`#${ID_BOTAO}`)) {
      [0,40,120].forEach(atraso => setTimeout(() => {
        garantirEstrutura();
        document.querySelector(".pmf-v37-search")?.focus();
      }, atraso));
    }
    if (alvo.closest(".nav-btn[data-page='pagamentos']")) {
      [120,400,900].forEach(atraso => setTimeout(garantirEstrutura, atraso));
    }
  }, true);

  let tentativas = 0;
  const intervalo = setInterval(() => {
    tentativas += 1;
    if (garantirEstrutura() || tentativas >= 40) clearInterval(intervalo);
  }, 250);
})();