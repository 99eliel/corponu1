(() => {
  "use strict";

  const VERSION = "2026-07-30-chegada-manual-visual-faccoes-34";
  if (window.__CORPONU_CHEGADA_MANUAL_VISUAL__ === VERSION) return;
  window.__CORPONU_CHEGADA_MANUAL_VISUAL__ = VERSION;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  function injetarEstilos() {
    if (document.getElementById("styleChegadaManualVisualFaccoes")) return;
    const style = document.createElement("style");
    style.id = "styleChegadaManualVisualFaccoes";
    style.textContent = `
      .cmf-v34 .modal-card,
      .cmf-v34-card {
        width:min(820px,calc(100vw - 24px)) !important;
        max-height:94vh !important;
        overflow:auto !important;
        border-radius:22px !important;
        border:1px solid #d8e2ef !important;
        background:#f8fafc !important;
        box-shadow:0 24px 70px rgba(15,23,42,.24) !important;
      }
      .cmf-v34 .modal-header,
      .cmf-v34-header {
        position:sticky;
        top:0;
        z-index:5;
        padding:18px 20px 15px !important;
        border-bottom:1px solid #e2e8f0 !important;
        background:#fff !important;
      }
      .cmf-v34-header h1,
      .cmf-v34-header h2,
      .cmf-v34-header h3,
      .cmf-v34-header h4 {
        margin:0 0 4px !important;
        color:#0f172a !important;
        font-size:21px !important;
        letter-spacing:-.015em;
      }
      .cmf-v34-header p { margin:0 !important; color:#64748b !important; line-height:1.4; }
      .cmf-v34-form {
        display:grid !important;
        grid-template-columns:1fr !important;
        gap:12px !important;
        padding:16px 20px 20px !important;
      }
      .cmf-v34-intro {
        position:relative;
        margin:0 !important;
        padding:12px 14px 12px 44px !important;
        border:1px solid #bfdbfe !important;
        border-radius:13px !important;
        background:#eff6ff !important;
        color:#1e3a8a !important;
        font-size:13px !important;
        line-height:1.45 !important;
      }
      .cmf-v34-intro::before {
        content:"i";
        position:absolute;
        left:14px;
        top:50%;
        width:22px;
        height:22px;
        display:grid;
        place-items:center;
        transform:translateY(-50%);
        border-radius:999px;
        background:#2563eb;
        color:#fff;
        font:900 13px/1 Arial,sans-serif;
      }
      .cmf-v34-shell {
        padding:14px !important;
        border:1px solid #d8e2ef !important;
        border-radius:15px !important;
        background:#fff !important;
        box-shadow:0 5px 16px rgba(15,23,42,.035);
      }
      .cmf-v34-search {
        display:grid !important;
        grid-template-columns:minmax(0,1fr) auto !important;
        gap:10px !important;
        align-items:end !important;
        border-color:#c4b5fd !important;
        background:linear-gradient(180deg,#faf5ff 0%,#fff 100%) !important;
      }
      .cmf-v34-search .cmf-v34-step { grid-column:1/-1; }
      .cmf-v34-search label { margin:0 !important; }
      .cmf-v34-search input {
        min-height:48px !important;
        border:2px solid #8b5cf6 !important;
        border-radius:12px !important;
        background:#fff !important;
        font-size:16px !important;
        font-weight:900 !important;
      }
      .cmf-v34-search button {
        min-height:48px !important;
        padding:0 18px !important;
        border-radius:12px !important;
        white-space:nowrap;
      }
      .cmf-v34-status {
        grid-column:1/-1;
        margin:0 !important;
        color:#64748b !important;
        font-size:11px !important;
        font-weight:800 !important;
      }
      .cmf-v34-step {
        display:flex;
        align-items:flex-start;
        gap:10px;
        margin-bottom:11px;
      }
      .cmf-v34-step-numero {
        display:grid;
        place-items:center;
        width:26px;
        height:26px;
        flex:0 0 26px;
        border-radius:9px;
        background:#ede9fe;
        color:#6d28d9;
        font:900 12px/1 Arial,sans-serif;
      }
      .cmf-v34-step strong { display:block; color:#0f172a; font-size:14px; }
      .cmf-v34-step span { display:block; margin-top:2px; color:#64748b; font-size:11px; }
      .cmf-v34-grid {
        display:grid !important;
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
        gap:12px !important;
      }
      .cmf-v34-grid label { margin:0 !important; min-width:0; }
      .cmf-v34-grid input,
      .cmf-v34-grid select {
        width:100% !important;
        min-height:44px !important;
        margin-top:5px !important;
        border-radius:11px !important;
        background:#fff !important;
      }
      .cmf-v34-grid label,
      .cmf-v34-search label {
        color:#1e293b !important;
        font-size:12px !important;
        font-weight:900 !important;
      }
      .cmf-v34-helper {
        grid-column:1/-1;
        margin:-4px 0 0 !important;
        padding:0 2px;
        color:#64748b !important;
        font-size:11px !important;
        font-weight:700 !important;
      }
      .cmf-v34-resumo {
        margin:0 !important;
        padding:13px 15px !important;
        border:1px solid #bfdbfe !important;
        border-radius:13px !important;
        background:#eff6ff !important;
        color:#1e3a8a !important;
        font-weight:900 !important;
      }
      .cmf-v34-aviso {
        margin:0 !important;
        padding:12px 14px !important;
        border:1px solid #fdba74 !important;
        border-radius:13px !important;
        background:#fff7ed !important;
        color:#9a3412 !important;
        font-size:12px !important;
        line-height:1.45 !important;
      }
      .cmf-v34-actions {
        position:sticky;
        bottom:-20px;
        z-index:4;
        display:flex !important;
        justify-content:flex-end !important;
        gap:9px !important;
        margin:2px -20px -20px !important;
        padding:13px 20px 16px !important;
        border-top:1px solid #e2e8f0;
        background:rgba(255,255,255,.97);
        backdrop-filter:blur(8px);
      }
      .cmf-v34-actions button { min-height:42px !important; border-radius:11px !important; }
      .cmf-v34-actions .btn-success,
      .cmf-v34-actions button:first-child {
        background:#16a34a !important;
        border-color:#16a34a !important;
        color:#fff !important;
        font-weight:900 !important;
      }
      @media (max-width:680px) {
        .cmf-v34 .modal-header,
        .cmf-v34-header { padding:15px 14px 12px !important; }
        .cmf-v34-form { padding:13px 14px 16px !important; }
        .cmf-v34-search,
        .cmf-v34-grid { grid-template-columns:1fr !important; }
        .cmf-v34-search button { width:100% !important; }
        .cmf-v34-actions {
          position:static;
          margin:2px -14px -16px !important;
          padding:12px 14px 14px !important;
          display:grid !important;
          grid-template-columns:1fr 1fr;
        }
        .cmf-v34-actions button { width:100% !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function elementoMenorComTexto(raiz, trecho) {
    const alvo = normalizar(trecho);
    const candidatos = [...raiz.querySelectorAll("div,p,span,small,strong,label")]
      .filter(elemento => normalizar(elemento.textContent).includes(alvo));
    candidatos.sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length);
    return candidatos[0] || null;
  }

  function labelComTexto(raiz, trecho) {
    const alvo = normalizar(trecho);
    return [...raiz.querySelectorAll("label")]
      .find(label => normalizar(label.textContent).includes(alvo)) || null;
  }

  function botaoComTexto(raiz, trecho) {
    const alvo = normalizar(trecho);
    return [...raiz.querySelectorAll("button")]
      .find(botao => normalizar(botao.textContent).includes(alvo)) || null;
  }

  function criarEtapa(numero, titulo, descricao) {
    const etapa = document.createElement("div");
    etapa.className = "cmf-v34-step";
    etapa.innerHTML = `<span class="cmf-v34-step-numero">${numero}</span><div><strong>${titulo}</strong><span>${descricao}</span></div>`;
    return etapa;
  }

  function localizarModal() {
    const titulos = [...document.querySelectorAll("h1,h2,h3,h4")];
    const titulo = titulos.find(item => normalizar(item.textContent).includes("CHEGADA MANUAL DE FACCAO"));
    if (!titulo) return null;

    let modal = titulo.closest(".modal-backdrop,dialog,[role='dialog'],.modal");
    if (modal) return { modal, titulo };

    let atual = titulo.parentElement;
    for (let i = 0; atual && atual !== document.body && i < 7; i += 1, atual = atual.parentElement) {
      if (atual.querySelector("form") && botaoComTexto(atual, "SALVAR CHEGADA MANUAL")) {
        modal = atual;
        break;
      }
    }
    return modal ? { modal, titulo } : null;
  }

  function criarShell(form, id, classe, antesDe = null) {
    let shell = document.getElementById(id);
    if (shell) return shell;
    shell = document.createElement("section");
    shell.id = id;
    shell.className = `cmf-v34-shell ${classe}`;
    if (antesDe?.parentElement) antesDe.parentElement.insertBefore(shell, antesDe);
    else form.appendChild(shell);
    return shell;
  }

  function aplicarVisual() {
    const localizado = localizarModal();
    if (!localizado) return false;
    const { modal, titulo } = localizado;
    const form = modal.querySelector("form");
    if (!form) return false;
    if (modal.dataset.cmfVisual === VERSION) return true;

    injetarEstilos();
    modal.classList.add("cmf-v34");
    modal.dataset.cmfVisual = VERSION;
    const card = modal.querySelector(".modal-card") || titulo.parentElement?.parentElement;
    card?.classList.add("cmf-v34-card");
    const header = titulo.closest(".modal-header") || titulo.parentElement;
    header?.classList.add("cmf-v34-header");
    form.classList.add("cmf-v34-form");

    const intro = elementoMenorComTexto(form, "INFORME SOMENTE A OP");
    intro?.classList.add("cmf-v34-intro");

    const labelOP = labelComTexto(form, "Nº OP") || labelComTexto(form, "NUMERO DA OP");
    const botaoBusca = botaoComTexto(form, "BUSCAR OP");
    const statusBusca = elementoMenorComTexto(form, "DIGITE A OP PARA CARREGAR");
    if (labelOP && botaoBusca) {
      const shellBusca = criarShell(form, "cmfBuscaChegadaManual", "cmf-v34-search", labelOP);
      if (!shellBusca.querySelector(".cmf-v34-step")) shellBusca.appendChild(criarEtapa("1", "Localize a OP", "Os dados da ordem serão carregados automaticamente."));
      shellBusca.appendChild(labelOP);
      shellBusca.appendChild(botaoBusca);
      if (statusBusca) {
        statusBusca.classList.add("cmf-v34-status");
        shellBusca.appendChild(statusBusca);
      }
    }

    const labelProcesso = labelComTexto(form, "O QUE FOI FEITO") || labelComTexto(form, "PROCESSO");
    const labelFaccao = labelComTexto(form, "QUEM FEZ") || labelComTexto(form, "FACCAO");
    if (labelProcesso || labelFaccao) {
      const referencia = labelProcesso || labelFaccao;
      const shellServico = criarShell(form, "cmfServicoChegadaManual", "cmf-v34-servico", referencia);
      if (!shellServico.querySelector(".cmf-v34-step")) shellServico.appendChild(criarEtapa("2", "Serviço realizado", "Selecione o processo e a facção responsável."));
      let grid = shellServico.querySelector(".cmf-v34-grid");
      if (!grid) {
        grid = document.createElement("div");
        grid.className = "cmf-v34-grid";
        shellServico.appendChild(grid);
      }
      if (labelProcesso) grid.appendChild(labelProcesso);
      if (labelFaccao) grid.appendChild(labelFaccao);
    }

    const labelFalta = labelComTexto(form, "QUANTIDADE FALTANDO");
    const labelDesconto = labelComTexto(form, "DESCONTO POR DEFEITO");
    const ajudaRecebida = elementoMenorComTexto(form, "QUANTIDADE RECEBIDA SERA CALCULADA");
    const ajudaDesconto = elementoMenorComTexto(form, "INFORME 0 QUANDO NAO HOUVER DESCONTO");
    if (labelFalta || labelDesconto) {
      const referencia = labelFalta || labelDesconto;
      const shellValores = criarShell(form, "cmfValoresChegadaManual", "cmf-v34-valores", referencia);
      if (!shellValores.querySelector(".cmf-v34-step")) shellValores.appendChild(criarEtapa("3", "Conferência das quantidades", "Informe faltas e descontos; o recebido será calculado automaticamente."));
      let grid = shellValores.querySelector(".cmf-v34-grid");
      if (!grid) {
        grid = document.createElement("div");
        grid.className = "cmf-v34-grid";
        shellValores.appendChild(grid);
      }
      if (labelFalta) grid.appendChild(labelFalta);
      if (labelDesconto) grid.appendChild(labelDesconto);
      [ajudaRecebida, ajudaDesconto].filter(Boolean).forEach(item => {
        item.classList.add("cmf-v34-helper");
        grid.appendChild(item);
      });
    }

    const resumo = elementoMenorComTexto(form, "QUANTIDADE QUE SERA CONSIDERADA COMO RECEBIDA");
    resumo?.classList.add("cmf-v34-resumo");

    const aviso = elementoMenorComTexto(form, "A CHEGADA E O PAGAMENTO SERAO GRAVADOS JUNTOS");
    aviso?.classList.add("cmf-v34-aviso");

    const salvar = botaoComTexto(form, "SALVAR CHEGADA MANUAL");
    const cancelar = botaoComTexto(form, "CANCELAR");
    const actions = salvar && cancelar && salvar.parentElement === cancelar.parentElement
      ? salvar.parentElement
      : salvar?.parentElement;
    actions?.classList.add("cmf-v34-actions");

    return true;
  }

  function aplicarComTentativas() {
    let tentativas = 0;
    const tentar = () => {
      tentativas += 1;
      if (aplicarVisual() || tentativas >= 30) return;
      setTimeout(tentar, 250);
    };
    tentar();
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target.closest("button,a") : null;
    if (!alvo) return;
    const texto = normalizar(alvo.textContent);
    if (texto.includes("CHEGADA MANUAL")) {
      [0, 100, 300].forEach(atraso => setTimeout(aplicarVisual, atraso));
    }
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aplicarComTentativas, { once:true });
  } else {
    aplicarComTentativas();
  }
})();
