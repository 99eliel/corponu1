(() => {
  "use strict";

  const VERSION = "2026-07-30-pendencias-valores-pagina-38";
  const PAGE_ID = "pendenciasValoresFinanceiroPage";
  const CONTENT_ID = "pendenciasValoresFinanceiroConteudo";
  const ORIGINAL_BUTTON_ID = "btnAtualizarConferenciaPagamentoFinal";
  const PAGE_BUTTON_ID = "btnAbrirPendenciasValoresPagina";
  const MODAL_ID = "modalPendenciasValoresFinanceiro";

  if (window.__CORPONU_PENDENCIAS_VALORES_PAGINA__ === VERSION) return;
  window.__CORPONU_PENDENCIAS_VALORES_PAGINA__ = VERSION;

  let integrando = false;
  let timerModal = 0;

  function injetarEstilos() {
    if (document.getElementById("stylePendenciasValoresPagina38")) return;
    const style = document.createElement("style");
    style.id = "stylePendenciasValoresPagina38";
    style.textContent = `
      #${PAGE_ID}{display:grid;gap:16px;align-content:start;padding-bottom:32px}
      #${PAGE_ID}.hidden{display:none!important}
      .pvp38-cabecalho{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 20px;border:1px solid #dbe3ee;border-radius:18px;background:linear-gradient(135deg,#ffffff 0%,#f8fafc 58%,#f5f3ff 100%);box-shadow:0 8px 22px rgba(15,23,42,.05)}
      .pvp38-cabecalho-principal{display:flex;align-items:center;gap:14px;min-width:0}
      .pvp38-icone{display:grid;place-items:center;flex:0 0 auto;width:48px;height:48px;border-radius:15px;background:#ede9fe;color:#6d28d9;font-size:24px;font-weight:900}
      .pvp38-cabecalho h2{margin:0;color:#0f172a;font-size:21px;letter-spacing:-.02em}
      .pvp38-cabecalho p{margin:5px 0 0;color:#64748b;font-size:12px;line-height:1.45}
      .pvp38-acoes{display:flex;align-items:center;gap:9px;flex:0 0 auto}
      .pvp38-voltar,.pvp38-atualizar{min-height:40px;padding:9px 13px;border-radius:10px;font-size:12px;font-weight:900;cursor:pointer}
      .pvp38-voltar{border:1px solid #cbd5e1;background:#fff;color:#334155}
      .pvp38-voltar:hover{background:#f8fafc;border-color:#94a3b8}
      .pvp38-atualizar{border:1px solid #7c3aed;background:#7c3aed;color:#fff}
      .pvp38-atualizar:hover{background:#6d28d9}
      .pvp38-fluxo{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .pvp38-etapa{display:flex;align-items:flex-start;gap:11px;padding:13px 14px;border:1px solid #dbe3ee;border-radius:14px;background:#fff}
      .pvp38-etapa-numero{display:grid;place-items:center;flex:0 0 auto;width:27px;height:27px;border-radius:9px;background:#f1f5f9;color:#475569;font-size:11px;font-weight:900}
      .pvp38-etapa strong{display:block;color:#0f172a;font-size:12px}
      .pvp38-etapa span{display:block;margin-top:3px;color:#64748b;font-size:10px;line-height:1.4}
      #${CONTENT_ID}{min-height:260px}
      .pvp38-carregando{display:grid;place-items:center;min-height:240px;padding:28px;border:1px dashed #cbd5e1;border-radius:18px;background:#fff;color:#64748b;font-size:13px;font-weight:800;text-align:center}

      #${CONTENT_ID} > #${MODAL_ID}.pvp38-integrado{position:static!important;inset:auto!important;z-index:auto!important;display:block!important;width:100%!important;padding:0!important;background:transparent!important;backdrop-filter:none!important}
      #${CONTENT_ID} > #${MODAL_ID}.pvp38-integrado.hidden{display:block!important}
      #${CONTENT_ID} > #${MODAL_ID}.pvp38-integrado .corponu-pendencias-card{width:100%!important;max-width:none!important;max-height:none!important;overflow:visible!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
      #${CONTENT_ID} > #${MODAL_ID}.pvp38-integrado .corponu-pagamento-modal-header{display:none!important}
      #${CONTENT_ID} > #${MODAL_ID}.pvp38-integrado .corponu-pagamento-modal-body{max-height:none!important;overflow:visible!important;padding:0!important;background:transparent!important}

      #${CONTENT_ID} .corponu-pendencias-toolbar{position:sticky!important;top:8px!important;z-index:8!important;display:grid!important;grid-template-columns:minmax(220px,1.35fr) minmax(170px,.8fr) minmax(160px,.75fr) auto!important;gap:10px!important;margin:0 0 14px!important;padding:13px!important;border:1px solid #dbe3ee!important;border-radius:16px!important;background:rgba(255,255,255,.97)!important;box-shadow:0 10px 28px rgba(15,23,42,.08)!important;backdrop-filter:blur(10px)!important}
      #${CONTENT_ID} .corponu-pendencias-toolbar input,
      #${CONTENT_ID} .corponu-pendencias-toolbar select{min-height:42px!important;width:100%!important;margin:0!important;padding:9px 11px!important;border:1px solid #cbd5e1!important;border-radius:10px!important;background:#fff!important;color:#0f172a!important;font-size:12px!important}
      #${CONTENT_ID} .corponu-pendencias-toolbar input:focus,
      #${CONTENT_ID} .corponu-pendencias-toolbar select:focus{outline:none!important;border-color:#7c3aed!important;box-shadow:0 0 0 3px rgba(124,58,237,.12)!important}

      #${CONTENT_ID} .corponu-pendencias-resumo{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;margin:0 0 14px!important}
      #${CONTENT_ID} .corponu-pendencias-resumo button{min-width:0!important;padding:14px!important;border:1px solid #dbe3ee!important;border-radius:15px!important;background:#fff!important;text-align:left!important;box-shadow:0 3px 10px rgba(15,23,42,.035)!important;transition:border-color .15s ease,transform .15s ease,box-shadow .15s ease!important}
      #${CONTENT_ID} .corponu-pendencias-resumo button:hover{transform:translateY(-1px)!important;border-color:#a5b4fc!important;box-shadow:0 8px 20px rgba(15,23,42,.07)!important}
      #${CONTENT_ID} .corponu-pendencias-resumo button.ativo{border-color:#7c3aed!important;background:#f5f3ff!important;box-shadow:0 0 0 3px rgba(124,58,237,.10)!important}
      #${CONTENT_ID} .corponu-pendencias-resumo span{display:block!important;color:#64748b!important;font-size:9px!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:.04em!important}
      #${CONTENT_ID} .corponu-pendencias-resumo strong{display:block!important;margin-top:5px!important;color:#0f172a!important;font-size:23px!important;letter-spacing:-.025em!important}

      #${CONTENT_ID} .corponu-pendencias-alca{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(180px,230px) auto!important;align-items:end!important;gap:12px!important;margin:0 0 14px!important;padding:15px!important;border:1px solid #fdba74!important;border-radius:15px!important;background:#fff7ed!important;box-shadow:none!important}
      #${CONTENT_ID} .corponu-pendencias-alca.hidden{display:none!important}
      #${CONTENT_ID} .corponu-pendencias-aviso{margin:0 0 14px!important;padding:12px 14px!important;border:1px solid #bfdbfe!important;border-radius:13px!important;background:#eff6ff!important;color:#1e3a8a!important;font-size:11px!important;line-height:1.5!important}
      #${CONTENT_ID} .corponu-pendencias-contagem{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin:0 2px 10px!important;color:#475569!important;font-size:11px!important;font-weight:900!important}

      #${CONTENT_ID} .corponu-pendencias-grupo{margin:0 0 14px!important;padding:15px!important;border:1px solid #dbe3ee!important;border-radius:17px!important;background:#fff!important;box-shadow:0 5px 16px rgba(15,23,42,.035)!important}
      #${CONTENT_ID} .corponu-pendencias-grupo-cabecalho{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin:0 0 10px!important;padding:0 2px 10px!important;border-bottom:1px solid #eef2f7!important}
      #${CONTENT_ID} .corponu-pendencias-grupo-cabecalho h4{margin:0!important;color:#0f172a!important;font-size:14px!important}
      #${CONTENT_ID} .corponu-pendencias-grupo-cabecalho span{padding:5px 9px!important;border-radius:999px!important;background:#ede9fe!important;color:#6d28d9!important;font-size:10px!important;font-weight:900!important}
      #${CONTENT_ID} .corponu-pendencias-lista,
      #${CONTENT_ID} .corponu-pendencias-grupo-lista{display:grid!important;gap:9px!important}
      #${CONTENT_ID} .corponu-pendencia-item{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(260px,320px)!important;gap:15px!important;padding:14px!important;border:1px solid #e2e8f0!important;border-radius:14px!important;background:#fbfdff!important;box-shadow:none!important;transition:border-color .15s ease,background .15s ease!important}
      #${CONTENT_ID} .corponu-pendencia-item:hover{border-color:#c4b5fd!important;background:#fff!important;box-shadow:none!important}
      #${CONTENT_ID} .corponu-pendencia-cabecalho{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:7px!important;margin:0 0 8px!important}
      #${CONTENT_ID} .corponu-pendencia-cabecalho strong{color:#0f172a!important;font-size:15px!important}
      #${CONTENT_ID} .corponu-pendencia-badge{display:inline-flex!important;align-items:center!important;min-height:23px!important;padding:3px 8px!important;border-radius:999px!important;background:#fef3c7!important;color:#92400e!important;font-size:9px!important;font-weight:900!important;text-transform:uppercase!important}
      #${CONTENT_ID} .corponu-pendencia-valor-input{min-height:40px!important;margin-top:5px!important;padding:8px 10px!important;border:1px solid #cbd5e1!important;border-radius:9px!important;background:#fff!important;font-size:12px!important}
      #${CONTENT_ID} .corponu-pendencia-valor-input:focus{outline:none!important;border-color:#7c3aed!important;box-shadow:0 0 0 3px rgba(124,58,237,.11)!important}
      #${CONTENT_ID} .corponu-pagamento-modal-fechar{display:none!important}

      #${ORIGINAL_BUTTON_ID}{display:none!important}
      #${PAGE_BUTTON_ID}{white-space:nowrap!important;background:#f59e0b!important;border-color:#d97706!important;color:#fff!important;font-weight:900!important}
      #${PAGE_BUTTON_ID}:hover{background:#d97706!important}

      @media(max-width:980px){
        .pvp38-fluxo{grid-template-columns:1fr}
        #${CONTENT_ID} .corponu-pendencias-toolbar{position:static!important;grid-template-columns:1fr 1fr!important}
        #${CONTENT_ID} .corponu-pendencias-resumo{grid-template-columns:1fr 1fr!important}
        #${CONTENT_ID} .corponu-pendencia-item{grid-template-columns:1fr!important}
      }
      @media(max-width:680px){
        .pvp38-cabecalho{align-items:flex-start;flex-direction:column;padding:15px}
        .pvp38-acoes{width:100%;display:grid;grid-template-columns:1fr 1fr}
        #${CONTENT_ID} .corponu-pendencias-toolbar{grid-template-columns:1fr!important}
        #${CONTENT_ID} .corponu-pendencias-resumo{grid-template-columns:1fr!important}
        #${CONTENT_ID} .corponu-pendencias-alca{grid-template-columns:1fr!important}
        #${CONTENT_ID} .corponu-pendencias-grupo{padding:12px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function mainContainer() {
    return document.querySelector("#appShell main.main") || document.querySelector("main.main") || document.querySelector("main");
  }

  function garantirPagina() {
    let pagina = document.getElementById(PAGE_ID);
    if (pagina) return pagina;
    const main = mainContainer();
    if (!main) return null;

    pagina = document.createElement("section");
    pagina.id = PAGE_ID;
    pagina.className = "page hidden";
    pagina.innerHTML = `
      <div class="pvp38-cabecalho">
        <div class="pvp38-cabecalho-principal">
          <div class="pvp38-icone">R$</div>
          <div>
            <h2>Central de pendências de valores</h2>
            <p>Defina valores em aberto, revise os lançamentos e acompanhe o que ainda impede o fechamento dos pagamentos.</p>
          </div>
        </div>
        <div class="pvp38-acoes">
          <button type="button" class="pvp38-voltar" id="btnVoltarPagamentosPendencias">Voltar para Pagamentos</button>
          <button type="button" class="pvp38-atualizar" id="btnAtualizarPaginaPendencias">Atualizar pendências</button>
        </div>
      </div>
      <div class="pvp38-fluxo">
        <div class="pvp38-etapa"><span class="pvp38-etapa-numero">1</span><div><strong>Localize a pendência</strong><span>Use busca, processo e tipo de valor para encontrar rapidamente o lançamento.</span></div></div>
        <div class="pvp38-etapa"><span class="pvp38-etapa-numero">2</span><div><strong>Informe o valor correto</strong><span>Cadastre o valor por referência ou o total manual conforme o processo.</span></div></div>
        <div class="pvp38-etapa"><span class="pvp38-etapa-numero">3</span><div><strong>Confirme o recálculo</strong><span>Os pagamentos pendentes compatíveis são atualizados sem alterar itens já pagos.</span></div></div>
      </div>
      <div id="${CONTENT_ID}"><div class="pvp38-carregando">Abra as pendências para carregar os lançamentos em aberto.</div></div>
    `;

    const referencia = document.getElementById("relatorios") || document.getElementById("usuarios");
    if (referencia?.parentElement === main) main.insertBefore(pagina, referencia);
    else main.appendChild(pagina);

    pagina.querySelector("#btnVoltarPagamentosPendencias")?.addEventListener("click", abrirPagamentos);
    pagina.querySelector("#btnAtualizarPaginaPendencias")?.addEventListener("click", () => carregarConteudo(true));
    return pagina;
  }

  function garantirBotao() {
    const original = document.getElementById(ORIGINAL_BUTTON_ID);
    if (!original) return false;
    original.hidden = true;
    original.style.setProperty("display", "none", "important");

    let botao = document.getElementById(PAGE_BUTTON_ID);
    if (!botao) {
      botao = document.createElement("button");
      botao.type = "button";
      botao.id = PAGE_BUTTON_ID;
      botao.className = original.className || "btn btn-warning";
      botao.textContent = "Pendências de valores";
      botao.title = "Abrir a Central de pendências de valores";
      original.insertAdjacentElement("afterend", botao);
      botao.addEventListener("click", abrirPaginaPendencias);
    }
    return true;
  }

  function restaurarPaginasNativas() {
    document.querySelectorAll("#appShell main.main > .page, main.main > .page").forEach(pagina => {
      if (pagina.id === PAGE_ID) return;
      pagina.classList.remove("hidden");
      pagina.hidden = false;
      pagina.style.removeProperty("display");
    });
  }

  function atualizarCabecalho(titulo, subtitulo) {
    const tituloEl = document.getElementById("pageTitle");
    const subtituloEl = document.getElementById("pageSubtitle");
    if (tituloEl) tituloEl.textContent = titulo;
    if (subtituloEl) subtituloEl.textContent = subtitulo;
  }

  function abrirPaginaPendencias() {
    const pagina = garantirPagina();
    if (!pagina) return;
    restaurarPaginasNativas();
    document.querySelectorAll("#appShell main.main > .page, main.main > .page").forEach(item => item.classList.remove("active"));
    pagina.classList.remove("hidden");
    pagina.hidden = false;
    pagina.classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(botao => botao.classList.remove("active"));
    atualizarCabecalho("Pendências de valores", "Central financeira para definir valores em aberto e liberar pagamentos pendentes.");
    window.scrollTo({ top: 0, behavior: "smooth" });
    carregarConteudo(false);
  }

  function abrirPagamentos() {
    const pagina = document.getElementById(PAGE_ID);
    pagina?.classList.remove("active");
    pagina?.classList.add("hidden");
    restaurarPaginasNativas();
    document.querySelectorAll("#appShell main.main > .page, main.main > .page").forEach(item => item.classList.remove("active"));
    const pagamentos = document.getElementById("pagamentos");
    pagamentos?.classList.remove("hidden");
    pagamentos?.classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(botao => botao.classList.remove("active"));
    document.querySelector('.nav-btn[data-page="pagamentos"]')?.classList.add("active");
    atualizarCabecalho("Pagamentos", "Use a tabela de preços e as movimentações de facção para fechar pagamentos.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function integrarModal(modal) {
    const conteudo = document.getElementById(CONTENT_ID);
    if (!modal || !conteudo) return false;
    modal.classList.remove("hidden");
    modal.hidden = false;
    modal.classList.add("pvp38-integrado");
    if (modal.parentElement !== conteudo) conteudo.replaceChildren(modal);
    return true;
  }

  function aguardarModal() {
    window.clearTimeout(timerModal);
    let tentativas = 0;
    const tentar = () => {
      tentativas += 1;
      const modal = document.getElementById(MODAL_ID);
      if (modal && integrarModal(modal)) {
        integrando = false;
        return;
      }
      if (tentativas >= 40) {
        integrando = false;
        const conteudo = document.getElementById(CONTENT_ID);
        if (conteudo) conteudo.innerHTML = '<div class="pvp38-carregando">Não foi possível carregar as pendências agora. Volte para Pagamentos e tente novamente.</div>';
        return;
      }
      timerModal = window.setTimeout(tentar, 100);
    };
    tentar();
  }

  function carregarConteudo(forcar) {
    if (integrando) return;
    integrando = true;
    const original = document.getElementById(ORIGINAL_BUTTON_ID);
    const modalExistente = document.getElementById(MODAL_ID);

    if (modalExistente && modalExistente.parentElement?.id === CONTENT_ID && !forcar) {
      modalExistente.classList.remove("hidden");
      integrando = false;
      return;
    }

    if (!original) {
      integrando = false;
      garantirBotao();
      const conteudo = document.getElementById(CONTENT_ID);
      if (conteudo) conteudo.innerHTML = '<div class="pvp38-carregando">A área financeira ainda está sendo carregada. Aguarde alguns segundos e clique em Atualizar pendências.</div>';
      return;
    }

    if (modalExistente && modalExistente.parentElement?.id === CONTENT_ID && forcar) {
      document.body.appendChild(modalExistente);
      modalExistente.classList.add("hidden");
      modalExistente.classList.remove("pvp38-integrado");
    }

    original.click();
    aguardarModal();
  }

  function instalarEventos() {
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      const navegacao = alvo.closest(".nav-btn[data-page]");
      if (navegacao && document.getElementById(PAGE_ID)?.classList.contains("active")) {
        document.getElementById(PAGE_ID)?.classList.remove("active");
        document.getElementById(PAGE_ID)?.classList.add("hidden");
        restaurarPaginasNativas();
      }
      if (navegacao?.dataset.page === "pagamentos") {
        [100, 400, 900].forEach(atraso => window.setTimeout(garantirBotao, atraso));
      }
    }, true);

    window.addEventListener("pageshow", () => {
      if (!document.getElementById(PAGE_ID)?.classList.contains("active")) restaurarPaginasNativas();
    });
  }

  function iniciar() {
    injetarEstilos();
    garantirPagina();
    instalarEventos();
    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      garantirBotao();
      if (tentativas >= 40 || document.getElementById(PAGE_BUTTON_ID)) window.clearInterval(intervalo);
    }, 300);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();