(() => {
  "use strict";

  const LOCAL_RELEASE = "2026-08-27-faccoes-aviso-chegada-sutia-262";
  const INTERVALO_VERIFICACAO = 60 * 1000;
  const RELOAD_KEY = "corponu_web_release_recarregada";

  if (window.__CORPONU_ATUALIZADOR_WEB__ === LOCAL_RELEASE) return;
  window.__CORPONU_ATUALIZADOR_WEB__ = LOCAL_RELEASE;
  window.CORPONU_RELEASE_VERSION = LOCAL_RELEASE;
  window.__corponuAutoUpdateIniciado = true;

  let verificando = false;
  let modulosAposLoginAgendados = false;
  let observerLogin = null;

  // A produção antiga carregava dezenas de módulos de todas as telas logo no boot.
  // O corpunuteste foi validado em Chromium real com carregamento sob demanda.
  // Esta versão traz a mesma arquitetura, mantendo os arquivos e o Firebase da produção.

  const MODULO_GRUPOS_FACCOES = [
    "corponu-faccoes-grupos-processos.js",
    "faccoes-grupos-processos",
    "Não foi possível carregar os grupos de processos das facções."
  ];

  const PACOTE_SUTIA_FACCOES = [
    ["corponu-componentes-consolidados-hotfix.js", "componentes-nao-informados", "Não foi possível proteger componentes ainda não informados."],
    ["corponu-reenvio-sutia-componentes.js", "reenvio-sutia-componentes", "Não foi possível conferir lateral e bojo no reenvio para Sutiã Completo."],
    ["corponu-sutia-912-fluxo-rapido.js", "sutia-912-fluxo-rapido", "Não foi possível ativar o fluxo rápido da referência 912."],
    ["corponu-sutia-completo-calculo.js", "sutia-completo-calculo", "Não foi possível carregar o cálculo automático do Sutiã Completo."],
    ["corponu-sutia-completo-chegada-rapida.js", "sutia-completo-chegada-rapida", "Não foi possível ativar a chegada rápida do Sutiã Completo."],
    ["corponu-sutia-completo-fallbacks-off.js", "sutia-completo-fallbacks-off", "Não foi possível desativar reconciliações antigas do Sutiã Completo."],
    ["corponu-sutia-completo-referencia-especial-integral.js", "sutia-especial-integral", "Não foi possível aplicar o valor integral da referência especial."],
    ["corponu-sutia-completo-compatibilidade.js", "sutia-completo-compatibilidade", "Não foi possível carregar a compatibilidade do Sutiã Completo."],
    ["corponu-sutia-completo-ponto-luz-411-206.js", "sutia-ponto-luz-411", "Não foi possível carregar a regra de ponto de luz da referência 411."],
    ["corponu-chegada-sem-componentes-duplicados.js", "chegada-sem-componentes-duplicados", "Não foi possível remover a conferência duplicada de componentes."],
    ["corponu-chegada-sutia-sync-legado.js", "chegada-sutia-definitiva", "Não foi possível carregar a chegada definitiva do Sutiã Completo."]
  ];

  const MODULOS_POR_PAGINA = Object.freeze({
    manejo: [
      MODULO_GRUPOS_FACCOES
    ],

    pagamentos: [
      ["corponu-remover-lancamento-manual-pagamentos.js", "remover-lancamento-manual-pagamentos", "Não foi possível ajustar o lançamento manual de Pagamentos."],
      ["corponu-pagamentos-interface.js", "pagamentos-interface", "Não foi possível carregar a organização visual de Pagamentos."],
      ["corponu-pagamentos-interface-fix.js", "pagamentos-interface-fix", "Não foi possível estabilizar a interface de Pagamentos."],
      ["corponu-pagamentos-detalhes-sutia-completo-257.js", "pagamentos-detalhes-sutia-completo-257", "Não foi possível carregar a memória detalhada do pagamento do Sutiã Completo."],
      ["corponu-pagamentos-manual-op-auto.js", "pagamentos-manual-op-auto", "Não foi possível carregar a busca automática da OP."],
      ["corponu-pagamento-manual-componentes.js", "pagamento-manual-componentes", "Não foi possível carregar os componentes do lançamento manual."],
      ["corponu-pagamento-manual-sutia-completo.js", "pagamento-manual-sutia-completo", "Não foi possível carregar a conferência do Sutiã Completo no lançamento manual."],
      ["corponu-pagamentos-filtro-op.js", "pagamentos-filtro-op", "Não foi possível carregar o filtro de OP em Pagamentos."],
      ["corponu-pagamentos-multifiltro.js", "pagamentos-multifiltro-processos", "Não foi possível carregar a seleção de múltiplos processos."],
      ["corponu-pagamentos-multifiltro-visual.js", "pagamentos-multifiltro-visual", "Não foi possível carregar o visual do multifiltro."],
      ["corponu-pagamentos-alerta-sem-valor.js", "pagamentos-alerta-sem-valor", "Não foi possível destacar pagamentos sem valor."],
      ["corponu-pagamentos-alerta-duplicidades.js", "pagamentos-alerta-duplicidades", "Não foi possível verificar duplicidades."],
      ["corponu-pendencias-modal-estavel.js", "pendencias-modal-estavel", "Não foi possível restaurar a abertura das pendências."],
      ["corponu-pendencias-valor-seguro.js", "pendencias-valor-seguro", "Não foi possível salvar valores pendentes com segurança."],
      ["corponu-verificacao-sutia-completo.js", "verificacao-sutia-completo-segura", "Não foi possível carregar a verificação do Sutiã Completo."],
      ["corponu-valores-pendentes-financeiro.js", "valores-pendentes-financeiro", "Não foi possível carregar Valores pendentes."],
      ["corponu-valores-pendentes-auth-214.js", "valores-pendentes-auth-214", "Não foi possível estabilizar a autenticação de Valores pendentes."],
      ["corponu-restantes-pendentes-filtro-op-225.js", "restantes-filtro-op", "Não foi possível carregar o filtro de OP dos Restantes pendentes."]
    ],

    faccoes: [
      MODULO_GRUPOS_FACCOES,
      ["corponu-faccoes-exclusao-pagamento-vinculado.js", "faccoes-exclusao-pagamento-vinculado", "Não foi possível vincular exclusão da facção ao pagamento."],
      ["corponu-faccao-cadastro-recolhido.js", "faccao-cadastro-recolhido", "Não foi possível carregar o cadastro recolhido de facção."],
      ["corponu-faccoes-lateral-alca-254.js", "faccoes-lateral-alca-254", "Não foi possível carregar a área nativa de Lateral e Alça."],
      ["corponu-faccoes-tres-abas-saida.js", "faccoes-tres-abas-saida", "Não foi possível carregar as abas de Facções."],
      ["corponu-revisao-lateral-bojo-fix.js", "revisao-lateral-bojo-fix", "Não foi possível proteger Revisão lateral e bojo."],
      ["corponu-revisao-responsaveis.js", "revisao-responsaveis", "Não foi possível carregar responsáveis da revisão."],
      ["corponu-revisao-faccoes-select.js", "revisao-faccoes-select", "Não foi possível carregar facções por processo na revisão."],
      ["corponu-revisao-limpar-apos-salvar.js", "revisao-limpar-apos-salvar", "Não foi possível limpar a revisão após salvar."],
      ["corponu-revisao-lista-estavel.js", "revisao-lista-estavel", "Não foi possível carregar a lista estável da revisão."],
      ...PACOTE_SUTIA_FACCOES
    ],

    processos: [
      ["corponu-processos-somente-valores.js", "processos-somente-valores", "Não foi possível simplificar Processos para gestão de valores."],
      ["corponu-sutia-completo-calculo.js", "sutia-completo-calculo", "Não foi possível carregar o cálculo do Sutiã Completo."],
      ["corponu-sutia-completo-referencia-especial-integral.js", "sutia-especial-integral", "Não foi possível carregar a regra da referência especial."]
    ]
  });

  const MODULOS_CRITICOS = [
    ["corponu-pagamento-antiduplicidade-isolada.js", "pagamento-antiduplicidade-isolada", "Não foi possível carregar a proteção contra pagamentos duplicados."]
  ];

  const MODULOS_APOS_LOGIN = [
    ["corponu-dual-mode.js", "dual-mode", "Não foi possível carregar o modo Sutiã/Calcinha."],
    ["corponu-dual-ready-bridge.js", "dual-ready-bridge", "Não foi possível sincronizar o carregamento do modo Sutiã/Calcinha."],
    ["corponu-manejo-calcinha-dedicado-253.js", "manejo-calcinha-filtros-253", "Não foi possível carregar o Manejo Calcinha 253."]
  ];

  function carregarScript(nomeArquivo, marcador, mensagemErro) {
    const existente = [...document.scripts].find(script => String(script.src || "").includes(nomeArquivo));
    if (existente) return existente;

    const script = document.createElement("script");
    script.src = `./${nomeArquivo}?v=${encodeURIComponent(LOCAL_RELEASE)}`;
    script.async = false;
    script.dataset.corponuModulo = marcador;
    if (nomeArquivo === "corponu-dual-mode.js") script.dataset.corponuDualMode = "1";
    script.onerror = () => console.error(mensagemErro);
    document.head.appendChild(script);
    return script;
  }

  function carregarGrupo(modulos) {
    (modulos || []).forEach(([arquivo, marcador, erro]) => carregarScript(arquivo, marcador, erro));
  }

  function carregarModulos() {
    carregarGrupo(MODULOS_CRITICOS);
  }

  function carregarModulosDaPagina(pagina) {
    const chave = String(pagina || "").trim();
    const modulos = MODULOS_POR_PAGINA[chave];
    if (!modulos?.length) return;
    carregarGrupo(modulos);
  }

  function appAutenticadoVisivel() {
    const shell = document.getElementById("appShell");
    if (!shell || shell.hidden || shell.classList.contains("hidden")) return false;
    return getComputedStyle(shell).display !== "none";
  }

  function carregarModulosAposLogin() {
    if (modulosAposLoginAgendados || !appAutenticadoVisivel()) return;
    modulosAposLoginAgendados = true;
    observerLogin?.disconnect();
    observerLogin = null;

    const executar = () => {
      carregarGrupo(MODULOS_APOS_LOGIN);
      const paginaAtiva = document.querySelector(".nav-btn.active[data-page]")?.dataset?.page;
      if (paginaAtiva) carregarModulosDaPagina(paginaAtiva);
    };

    if ("requestIdleCallback" in window) window.requestIdleCallback(executar, { timeout: 1000 });
    else window.setTimeout(executar, 150);
  }

  function instalarCarregamentoAposLogin() {
    const shell = document.getElementById("appShell");
    if (!shell) return;

    carregarModulosAposLogin();
    if (modulosAposLoginAgendados) return;

    observerLogin?.disconnect();
    observerLogin = new MutationObserver(carregarModulosAposLogin);
    observerLogin.observe(shell, { attributes: true, attributeFilter: ["class", "hidden", "style"] });
  }

  function instalarCarregamentoSobDemanda() {
    if (document.documentElement.dataset.corponuLazyModules === LOCAL_RELEASE) return;
    document.documentElement.dataset.corponuLazyModules = LOCAL_RELEASE;

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      const botaoPagina = alvo?.closest?.(".nav-btn[data-page]");
      if (botaoPagina) carregarModulosDaPagina(botaoPagina.dataset.page);

      const botaoAcao = alvo?.closest?.("button,[role='button'],a");
      const onclick = String(botaoAcao?.getAttribute?.("onclick") || "");
      const rotulo = String(botaoAcao?.textContent || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();

      if (onclick.includes("mandarParaFaccao") || rotulo.includes("ENVIAR PARA FACCAO")) {
        carregarScript(...MODULO_GRUPOS_FACCOES);
      }
    }, true);
  }

  function removerAvisosAntigos() {
    [
      "corponuToastAtualizacaoAutomatica",
      "toastAtualizacaoSistema",
      "toastAtualizadorCorpoNu",
      "corponuAutoUpdateRuntime203Status"
    ].forEach(id => document.getElementById(id)?.remove());
  }

  async function removerPwaAntigo() {
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
        const registros = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registros.map(registro => registro.unregister()));
      }
    } catch (error) {
      console.warn("Não foi possível remover o service worker antigo.", error);
    }

    try {
      if ("caches" in window) {
        const chaves = await caches.keys();
        await Promise.all(
          chaves
            .filter(chave => chave.startsWith("op-confeccao-") || chave.startsWith("corponu-"))
            .map(chave => caches.delete(chave))
        );
      }
    } catch (error) {
      console.warn("Não foi possível remover o cache antigo do PWA.", error);
    }
  }

  function recarregarUmaVez(versao) {
    const release = String(versao || "").trim();
    if (!release || release === LOCAL_RELEASE) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get("release") === release) return;

    const chave = `${RELOAD_KEY}_${release}`;
    try {
      const ultima = Number(sessionStorage.getItem(chave) || 0);
      if (Date.now() - ultima < 30000) return;
      sessionStorage.setItem(chave, String(Date.now()));
    } catch (_) {}

    url.searchParams.set("release", release);
    url.searchParams.set("t", String(Date.now()));
    window.location.replace(url.toString());
  }

  async function verificarRelease() {
    if (verificando) return;
    verificando = true;

    try {
      const resposta = await fetch(`corponu-release.json?ts=${Date.now()}`, { cache: "no-store" });
      if (!resposta.ok) return;
      const dados = await resposta.json();
      recarregarUmaVez(dados?.version);
    } catch (error) {
      console.debug("Não foi possível verificar a versão online do CorpoNu.", error);
    } finally {
      verificando = false;
    }
  }

  async function iniciar() {
    carregarModulos();
    instalarCarregamentoSobDemanda();
    instalarCarregamentoAposLogin();
    removerAvisosAntigos();

    await removerPwaAntigo();
    await verificarRelease();

    window.setInterval(verificarRelease, INTERVALO_VERIFICACAO);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) verificarRelease();
    });
    window.addEventListener("focus", verificarRelease);
    window.addEventListener("online", verificarRelease);
  }

  carregarModulos();
  instalarCarregamentoSobDemanda();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
