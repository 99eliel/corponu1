(() => {
  "use strict";

  if (window.CorpoNuAjustesRapidos) return;

  const ajustes = new Map();
  let observador = null;
  let quadroAgendado = 0;
  let iniciado = false;

  function normalizar(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function paginaAtiva() {
    return document.querySelector(".page.active")?.id ||
      [...document.querySelectorAll(".page")].find(pagina => !pagina.classList.contains("hidden"))?.id ||
      "";
  }

  function executarAjuste(nome) {
    const ajuste = ajustes.get(nome);
    if (!ajuste) return;

    try {
      ajuste.executar(api);
    } catch (error) {
      console.error(`[CorpoNu modo rápido] Falha no ajuste ${nome}.`, error);
    }
  }

  function aplicarTodos() {
    quadroAgendado = 0;
    ajustes.forEach((_, nome) => executarAjuste(nome));
  }

  function agendarAplicacao() {
    if (quadroAgendado) return;
    quadroAgendado = window.requestAnimationFrame(aplicarTodos);
  }

  function precisaObservarDom() {
    return [...ajustes.values()].some(ajuste => ajuste.observarDom === true);
  }

  function atualizarObservador() {
    if (!document.body) return;

    if (!precisaObservarDom()) {
      observador?.disconnect();
      observador = null;
      return;
    }

    if (observador) return;

    observador = new MutationObserver(agendarAplicacao);
    observador.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function registrar(nome, executar, opcoes = {}) {
    const identificador = String(nome || "").trim();
    if (!identificador) throw new Error("O ajuste precisa ter um nome.");
    if (typeof executar !== "function") throw new Error(`O ajuste ${identificador} precisa ser uma função.`);

    ajustes.set(identificador, {
      executar,
      observarDom: opcoes.observarDom === true
    });

    atualizarObservador();
    if (iniciado) agendarAplicacao();

    return () => remover(identificador);
  }

  function remover(nome) {
    ajustes.delete(String(nome || "").trim());
    atualizarObservador();
  }

  function aplicar(nome) {
    executarAjuste(String(nome || "").trim());
  }

  function quandoElemento(seletor, opcoes = {}) {
    const limite = Math.max(100, Number(opcoes.timeout || 5000));
    const inicio = Date.now();

    return new Promise((resolve, reject) => {
      function procurar() {
        const elemento = document.querySelector(seletor);
        if (elemento) {
          resolve(elemento);
          return;
        }

        if (Date.now() - inicio >= limite) {
          reject(new Error(`Elemento não encontrado: ${seletor}`));
          return;
        }

        window.setTimeout(procurar, 80);
      }

      procurar();
    });
  }

  const api = Object.freeze({
    registrar,
    remover,
    aplicar,
    aplicarTodos: agendarAplicacao,
    normalizar,
    paginaAtiva,
    quandoElemento
  });

  window.CorpoNuAjustesRapidos = api;
  document.documentElement.dataset.corponuModoRapido = "ativo";

  function iniciar() {
    iniciado = true;
    atualizarObservador();
    agendarAplicacao();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }

  // ---------------------------------------------------------------------------
  // PAGAMENTOS — INTERFACE SIMPLES
  // Alteração somente visual. IDs, listeners, cálculos e gravações permanecem.
  // ---------------------------------------------------------------------------

  function injetarEstiloPagamentosSimples() {
    if (document.getElementById("styleCorpoNuPagamentosSimples")) return;

    const style = document.createElement("style");
    style.id = "styleCorpoNuPagamentosSimples";
    style.textContent = `
      #pagamentos.corponu-pagamentos-simples {
        --pag-surface: #ffffff;
        --pag-border: #dbe4ef;
        --pag-text: #172033;
        --pag-muted: #64748b;
        --pag-soft: #f7f9fc;
        --pag-primary: #5b34da;
        --pag-primary-soft: #f3efff;
        --pag-warning: #b45309;
        --pag-warning-soft: #fff8eb;
        --pag-ok: #15803d;
        --pag-ok-soft: #effaf3;
      }

      #pagamentos.corponu-pagamentos-simples > .pagamentos-relatorio-panel {
        padding: 20px;
        border: 1px solid var(--pag-border);
        border-radius: 20px;
        background: var(--pag-surface);
        box-shadow: 0 8px 28px rgba(15, 23, 42, .055);
      }

      #pagamentos.corponu-pagamentos-simples .pagamentos-relatorio-panel > .panel-header:first-child {
        align-items: center;
        margin: -20px -20px 18px;
        padding: 20px;
        border-bottom: 1px solid var(--pag-border);
        border-radius: 20px 20px 0 0;
        background: linear-gradient(135deg, #ffffff 0%, #faf8ff 100%);
      }

      #pagamentos.corponu-pagamentos-simples .pagamentos-relatorio-panel > .panel-header:first-child h3 {
        margin-bottom: 5px;
        color: var(--pag-text);
        font-size: clamp(20px, 2vw, 27px);
      }

      #pagamentos.corponu-pagamentos-simples .pagamentos-relatorio-panel > .panel-header:first-child p {
        max-width: 700px;
        color: var(--pag-muted);
        line-height: 1.5;
      }

      #pagamentos.corponu-pagamentos-simples .pagamentos-relatorio-panel > .panel-header:first-child .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
      }

      #pagamentos.corponu-pagamentos-simples .pagamentos-relatorio-panel > .panel-header:first-child .actions .btn {
        min-height: 40px;
        border-radius: 10px;
        font-weight: 800;
      }

      #pagamentos.corponu-pagamentos-simples #btnToggleGerenciarValores {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        color: #334155 !important;
      }

      #pagamentos.corponu-pagamentos-simples .corponu-area-pendencias-valores {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 16px;
        margin-bottom: 18px;
        padding: 17px 18px;
        border: 1px solid #f3d39a;
        border-radius: 16px;
        background: var(--pag-warning-soft);
      }

      #pagamentos.corponu-pagamentos-simples .corponu-area-pendencias-valores.sem-pendencias {
        border-color: #bbdfc5;
        background: var(--pag-ok-soft);
      }

      #pagamentos.corponu-pagamentos-simples .corponu-pendencias-icone {
        display: flex;
        width: 46px;
        height: 46px;
        align-items: center;
        justify-content: center;
        border-radius: 14px;
        background: #ffffff;
        color: var(--pag-warning);
        font-size: 23px;
        font-weight: 950;
        box-shadow: 0 3px 12px rgba(146, 64, 14, .08);
      }

      #pagamentos.corponu-pagamentos-simples .sem-pendencias .corponu-pendencias-icone {
        color: var(--pag-ok);
      }

      #pagamentos.corponu-pagamentos-simples .corponu-area-pendencias-valores h3 {
        margin: 2px 0 4px;
        color: var(--pag-text);
        font-size: 17px;
      }

      #pagamentos.corponu-pagamentos-simples .corponu-area-pendencias-valores p {
        margin: 0;
        color: #78541f;
        font-size: 12px;
        line-height: 1.5;
      }

      #pagamentos.corponu-pagamentos-simples .sem-pendencias p {
        color: #24613a;
      }

      #pagamentos.corponu-pagamentos-simples .corponu-pendencias-etapa {
        display: block;
        color: var(--pag-warning);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .06em;
        text-transform: uppercase;
      }

      #pagamentos.corponu-pagamentos-simples .sem-pendencias .corponu-pendencias-etapa {
        color: var(--pag-ok);
      }

      #pagamentos.corponu-pagamentos-simples .corponu-pendencias-acao {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      #pagamentos.corponu-pagamentos-simples .corponu-pendencias-numero {
        min-width: 52px;
        text-align: center;
      }

      #pagamentos.corponu-pagamentos-simples .corponu-pendencias-numero strong {
        display: block;
        color: var(--pag-warning);
        font-size: 25px;
        line-height: 1;
      }

      #pagamentos.corponu-pagamentos-simples .sem-pendencias .corponu-pendencias-numero strong {
        color: var(--pag-ok);
      }

      #pagamentos.corponu-pagamentos-simples .corponu-pendencias-numero small {
        color: var(--pag-muted);
        font-size: 9px;
        font-weight: 900;
        text-transform: uppercase;
      }

      #pagamentos.corponu-pagamentos-simples #btnCorpoNuAbrirPendencias {
        min-height: 42px;
        padding-inline: 16px;
        border-radius: 11px;
        background: #ffffff;
        border-color: #e2b668;
        color: #8a4a09;
        font-weight: 900;
      }

      #pagamentos.corponu-pagamentos-simples .sem-pendencias #btnCorpoNuAbrirPendencias {
        border-color: #a8d5b5;
        color: #166534;
      }

      #pagamentos.corponu-pagamentos-simples .corponu-secao-titulo {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        margin: 3px 0 11px;
      }

      #pagamentos.corponu-pagamentos-simples .corponu-secao-titulo h3 {
        margin: 0 0 3px;
        color: var(--pag-text);
        font-size: 15px;
      }

      #pagamentos.corponu-pagamentos-simples .corponu-secao-titulo p {
        margin: 0;
        color: var(--pag-muted);
        font-size: 11px;
      }

      #pagamentos.corponu-pagamentos-simples .pagamento-filtros-entregas {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(190px, 1fr)) !important;
        align-items: end;
        gap: 11px !important;
        margin: 0 0 16px !important;
        padding: 15px !important;
        border: 1px solid var(--pag-border);
        border-radius: 15px;
        background: var(--pag-soft);
      }

      #pagamentos.corponu-pagamentos-simples .pagamento-filtros-entregas > label {
        min-width: 0;
        color: #475569;
        font-size: 11px;
        font-weight: 850;
      }

      #pagamentos.corponu-pagamentos-simples .pagamento-filtros-entregas input,
      #pagamentos.corponu-pagamentos-simples .pagamento-filtros-entregas select {
        min-height: 42px;
        margin-top: 5px;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        background: #ffffff;
      }

      #pagamentos.corponu-pagamentos-simples .pagamento-acoes-principais {
        grid-column: 1 / -1;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding-top: 3px;
      }

      #pagamentos.corponu-pagamentos-simples .pagamento-acoes-principais #btnMarcarPagamentosFiltrados {
        margin-left: auto;
        min-height: 42px;
        border-radius: 10px;
      }

      #pagamentos.corponu-pagamentos-simples .pagamento-cards {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin: 0 0 16px;
      }

      #pagamentos.corponu-pagamentos-simples .pagamento-card {
        min-width: 0;
        padding: 13px 14px;
        border: 1px solid var(--pag-border);
        border-radius: 13px;
        background: #ffffff;
        box-shadow: none;
      }

      #pagamentos.corponu-pagamentos-simples .pagamento-card span {
        color: var(--pag-muted);
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
      }

      #pagamentos.corponu-pagamentos-simples .pagamento-card strong {
        margin-top: 5px;
        color: var(--pag-text);
        font-size: 21px;
      }

      #pagamentos.corponu-pagamentos-simples .pagamento-card.destaque {
        border-color: #d7c9ff;
        background: var(--pag-primary-soft);
      }

      #pagamentos.corponu-pagamentos-simples .pagamento-card.destaque strong {
        color: var(--pag-primary);
      }

      #pagamentos.corponu-pagamentos-simples .corponu-card-pendencia-original {
        display: none !important;
      }

      #pagamentos.corponu-pagamentos-simples details.corponu-pagamento-detalhes {
        margin: 12px 0;
        border: 1px solid var(--pag-border);
        border-radius: 14px;
        background: #ffffff;
        overflow: hidden;
      }

      #pagamentos.corponu-pagamentos-simples details.corponu-pagamento-detalhes > summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 50px;
        padding: 13px 15px;
        color: var(--pag-text);
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
        list-style: none;
        background: #fbfcfe;
      }

      #pagamentos.corponu-pagamentos-simples details.corponu-pagamento-detalhes > summary::-webkit-details-marker {
        display: none;
      }

      #pagamentos.corponu-pagamentos-simples details.corponu-pagamento-detalhes > summary::after {
        content: "Abrir";
        color: var(--pag-primary);
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
      }

      #pagamentos.corponu-pagamentos-simples details.corponu-pagamento-detalhes[open] > summary::after {
        content: "Recolher";
      }

      #pagamentos.corponu-pagamentos-simples .corponu-detalhes-corpo {
        padding: 0 12px 12px;
        border-top: 1px solid var(--pag-border);
      }

      #pagamentos.corponu-pagamentos-simples #corponuDetalhesConferencia .corponu-detalhes-corpo > * {
        margin-top: 12px;
      }

      #pagamentos.corponu-pagamentos-simples .table-wrap {
        border-radius: 10px;
      }

      #pagamentos.corponu-pagamentos-simples th {
        background: #f7f9fc;
        color: #526078;
        font-size: 10px;
        letter-spacing: .02em;
        text-transform: uppercase;
      }

      #pagamentos.corponu-pagamentos-simples td {
        color: #334155;
      }

      @media (max-width: 1050px) {
        #pagamentos.corponu-pagamentos-simples .pagamento-filtros-entregas {
          grid-template-columns: repeat(2, minmax(180px, 1fr)) !important;
        }

        #pagamentos.corponu-pagamentos-simples .pagamento-cards {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 760px) {
        #pagamentos.corponu-pagamentos-simples > .pagamentos-relatorio-panel {
          padding: 14px;
          border-radius: 15px;
        }

        #pagamentos.corponu-pagamentos-simples .pagamentos-relatorio-panel > .panel-header:first-child {
          align-items: flex-start;
          flex-direction: column;
          margin: -14px -14px 14px;
          padding: 16px 14px;
          border-radius: 15px 15px 0 0;
        }

        #pagamentos.corponu-pagamentos-simples .pagamentos-relatorio-panel > .panel-header:first-child .actions {
          width: 100%;
          justify-content: flex-start;
        }

        #pagamentos.corponu-pagamentos-simples .corponu-area-pendencias-valores {
          grid-template-columns: auto minmax(0, 1fr);
          padding: 14px;
        }

        #pagamentos.corponu-pagamentos-simples .corponu-pendencias-acao {
          grid-column: 1 / -1;
          justify-content: space-between;
          padding-top: 2px;
        }

        #pagamentos.corponu-pagamentos-simples .pagamento-filtros-entregas {
          grid-template-columns: 1fr !important;
          padding: 12px !important;
        }

        #pagamentos.corponu-pagamentos-simples .pagamento-acoes-principais {
          grid-column: 1;
        }

        #pagamentos.corponu-pagamentos-simples .pagamento-acoes-principais .btn {
          flex: 1 1 100%;
          margin-left: 0 !important;
        }
      }

      @media (max-width: 470px) {
        #pagamentos.corponu-pagamentos-simples .pagamento-cards {
          grid-template-columns: 1fr;
        }

        #pagamentos.corponu-pagamentos-simples .corponu-pendencias-acao {
          align-items: stretch;
          flex-direction: column;
        }

        #pagamentos.corponu-pagamentos-simples .corponu-pendencias-numero {
          text-align: left;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function definirTexto(elemento, texto) {
    if (elemento && elemento.textContent !== texto) elemento.textContent = texto;
  }

  function envolverElementoEmDetalhes(elemento, id, titulo, aberto = false) {
    if (!elemento || elemento.closest(`#${id}`)) return;

    const detalhes = document.createElement("details");
    detalhes.id = id;
    detalhes.className = "corponu-pagamento-detalhes";
    detalhes.open = aberto;

    const resumo = document.createElement("summary");
    resumo.textContent = titulo;

    const corpo = document.createElement("div");
    corpo.className = "corponu-detalhes-corpo";

    elemento.insertAdjacentElement("beforebegin", detalhes);
    detalhes.append(resumo, corpo);
    corpo.appendChild(elemento);
  }

  function localizarBlocoConferencia(pagina) {
    const botao = document.getElementById("btnAtualizarConferenciaPagamentoFinal");
    if (!botao || !pagina.contains(botao)) return null;

    let atual = botao.parentElement;
    const painelPrincipal = pagina.querySelector(".pagamentos-relatorio-panel");

    while (atual && atual !== pagina && atual !== painelPrincipal) {
      if (
        atual.querySelector("#confPagamentoItens") &&
        atual.querySelector("#confPagamentoSemValor") &&
        atual.querySelector("#alertasConferenciaPagamentoFinal")
      ) {
        return atual;
      }
      atual = atual.parentElement;
    }

    return null;
  }

  function criarAreaPendencias(pagina, cabecalho) {
    let area = document.getElementById("corponuAreaPendenciasValores");
    if (!area) {
      area = document.createElement("section");
      area.id = "corponuAreaPendenciasValores";
      area.className = "corponu-area-pendencias-valores";
      area.innerHTML = `
        <div class="corponu-pendencias-icone" aria-hidden="true">!</div>
        <div>
          <span class="corponu-pendencias-etapa">Comece por aqui</span>
          <h3>Pendências de valores</h3>
          <p id="corponuTextoPendenciasValores">Confira os serviços que ainda precisam de valor antes de gerar o pagamento.</p>
        </div>
        <div class="corponu-pendencias-acao">
          <div class="corponu-pendencias-numero">
            <strong id="corponuNumeroPendenciasValores">0</strong>
            <small>pendências</small>
          </div>
          <button class="btn" id="btnCorpoNuAbrirPendencias" type="button">Abrir pendências</button>
        </div>
      `;
      cabecalho.insertAdjacentElement("afterend", area);
    }

    const botao = area.querySelector("#btnCorpoNuAbrirPendencias");
    if (botao && botao.dataset.listenerPendencias !== "1") {
      botao.dataset.listenerPendencias = "1";
      botao.addEventListener("click", () => {
        const acesso = document.getElementById("btnAtualizarConferenciaPagamentoFinal");
        if (acesso) acesso.click();
      });
    }

    return area;
  }

  function atualizarAreaPendencias(area) {
    if (!area) return;

    const origem = document.getElementById("confPagamentoSemValor");
    const valorTexto = String(origem?.textContent || "0").replace(/\D+/g, "");
    const quantidade = Number(valorTexto || 0);
    const numero = area.querySelector("#corponuNumeroPendenciasValores");
    const texto = area.querySelector("#corponuTextoPendenciasValores");
    const icone = area.querySelector(".corponu-pendencias-icone");
    const botao = area.querySelector("#btnCorpoNuAbrirPendencias");

    definirTexto(numero, quantidade.toLocaleString("pt-BR"));
    area.classList.toggle("sem-pendencias", quantidade === 0);
    definirTexto(icone, quantidade === 0 ? "✓" : "!");
    definirTexto(
      texto,
      quantidade === 0
        ? "Tudo certo: não há lançamentos aguardando definição de valor."
        : `${quantidade.toLocaleString("pt-BR")} lançamento(s) precisam de valor antes do fechamento.`
    );
    definirTexto(botao, quantidade === 0 ? "Consultar pendências" : "Resolver pendências");

    const cardOriginal = origem?.parentElement;
    if (cardOriginal) cardOriginal.classList.add("corponu-card-pendencia-original");
  }

  function criarTituloFiltros(filtros) {
    if (!filtros || document.getElementById("corponuTituloFiltrosPagamento")) return;

    const titulo = document.createElement("div");
    titulo.id = "corponuTituloFiltrosPagamento";
    titulo.className = "corponu-secao-titulo";
    titulo.innerHTML = `
      <div>
        <h3>Filtre o que deseja pagar</h3>
        <p>Escolha o período, o processo ou a facção. Os filtros funcionam juntos.</p>
      </div>
    `;
    filtros.insertAdjacentElement("beforebegin", titulo);
  }

  function organizarBotoesCabecalho() {
    const manual = document.getElementById("btnPagamentoManualFinanceiro");
    const restantes = document.getElementById("btnRestantesPagamento");
    const valores = document.getElementById("btnToggleGerenciarValores");

    if (manual) definirTexto(manual, "Novo lançamento");
    if (valores) definirTexto(valores, "Tabela de valores");

    if (restantes) {
      const contador = restantes.querySelector("#contadorRestantesPagamento");
      const numero = contador?.textContent || "0";
      if (!restantes.dataset.rotuloSimples) {
        restantes.dataset.rotuloSimples = "1";
        restantes.childNodes.forEach(no => {
          if (no.nodeType === Node.TEXT_NODE) no.textContent = "Restantes ";
        });
      }
      if (contador) contador.textContent = numero;
    }
  }

  function organizarTabelas(pagina) {
    const tabelaResumo = pagina.querySelector("table.pagamento-table");
    const wrapResumo = tabelaResumo?.closest(".table-wrap");
    envolverElementoEmDetalhes(wrapResumo, "corponuDetalhesResumoPagamento", "Resumo por responsável, referência e processo", true);

    const tabelaLancamentos = pagina.querySelector("table.entregas-pagamento-table");
    const wrapLancamentos = tabelaLancamentos?.closest(".table-wrap");
    if (wrapLancamentos && !wrapLancamentos.closest("#corponuDetalhesLancamentosPagamento")) {
      const cabecalho = pagina.querySelector(".entregas-header");
      const detalhes = document.createElement("details");
      detalhes.id = "corponuDetalhesLancamentosPagamento";
      detalhes.className = "corponu-pagamento-detalhes";

      const resumo = document.createElement("summary");
      resumo.textContent = "Lançamentos detalhados e ações individuais";

      const corpo = document.createElement("div");
      corpo.className = "corponu-detalhes-corpo";

      const ancora = cabecalho || wrapLancamentos;
      ancora.insertAdjacentElement("beforebegin", detalhes);
      detalhes.append(resumo, corpo);
      if (cabecalho) corpo.appendChild(cabecalho);
      corpo.appendChild(wrapLancamentos);
    }
  }

  function organizarConferencia(pagina) {
    const bloco = localizarBlocoConferencia(pagina);
    if (!bloco || bloco.closest("#corponuDetalhesConferencia")) return;
    envolverElementoEmDetalhes(bloco, "corponuDetalhesConferencia", "Conferência avançada antes de confirmar pagamentos", false);
  }

  api.registrar("pagamentos-interface-simples", () => {
    const pagina = document.getElementById("pagamentos");
    if (!pagina) return;

    injetarEstiloPagamentosSimples();
    pagina.classList.add("corponu-pagamentos-simples");

    const painel = pagina.querySelector(".pagamentos-relatorio-panel");
    const cabecalho = painel?.querySelector(":scope > .panel-header:first-child");
    if (!painel || !cabecalho) return;

    const titulo = cabecalho.querySelector("h3");
    const descricao = cabecalho.querySelector("p");
    definirTexto(titulo, "Central de pagamentos");
    definirTexto(descricao, "Resolva pendências, filtre os lançamentos e gere o relatório para pagamento.");

    if (paginaAtiva() === "pagamentos") {
      definirTexto(document.getElementById("pageTitle"), "Pagamentos");
      definirTexto(document.getElementById("pageSubtitle"), "Organize valores pendentes, relatórios e confirmações em um só lugar.");
    }

    organizarBotoesCabecalho();

    const areaPendencias = criarAreaPendencias(pagina, cabecalho);
    atualizarAreaPendencias(areaPendencias);

    const filtros = pagina.querySelector(".pagamento-filtros-entregas");
    criarTituloFiltros(filtros);
    organizarTabelas(pagina);
    organizarConferencia(pagina);
  }, { observarDom: true });
})();