(() => {
  const APP_VERSION = "2026-07-29-chegada-manual-simplificada-op-1";
  const metaVersion = document.querySelector('meta[name="app-version"]');
  if (metaVersion) metaVersion.setAttribute("content", APP_VERSION);

  const STORAGE_KEY = "op_confeccao_app_version";
  const ATTEMPT_PREFIX = "op_confeccao_update_attempt_";
  let refreshing = false;
  let checkingVersion = false;

  function showUpdateToast(message) {
    let toast = document.getElementById("toastAtualizacaoSistema");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toastAtualizacaoSistema";
      toast.style.position = "fixed";
      toast.style.right = "18px";
      toast.style.bottom = "18px";
      toast.style.zIndex = "99999";
      toast.style.background = "#111827";
      toast.style.color = "#fff";
      toast.style.padding = "12px 14px";
      toast.style.borderRadius = "14px";
      toast.style.boxShadow = "0 12px 30px rgba(15, 23, 42, 0.25)";
      toast.style.fontFamily = "Arial, sans-serif";
      toast.style.fontSize = "13px";
      toast.style.fontWeight = "800";
      toast.style.maxWidth = "360px";
      toast.style.lineHeight = "1.35";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.remove(), 6500);
  }

  async function clearAppCaches() {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter(key => key.startsWith("op-confeccao-"))
            .map(key => caches.delete(key))
        );
      }
    } catch (error) {
      console.warn("Não foi possível limpar cache do sistema.", error);
    }
  }

  async function unregisterOldWorkers() {
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(reg => reg.unregister()));
      }
    } catch (error) {
      console.warn("Não foi possível remover service worker antigo.", error);
    }
  }

  window.limparVersaoSistema = async function limparVersaoSistema() {
    showUpdateToast("Limpando cache da versão. Aguarde...");
    await clearAppCaches();
    await unregisterOldWorkers();
    const url = new URL(window.location.href);
    url.searchParams.set("limparVersao", Date.now().toString());
    window.location.replace(url.toString());
  };

  function rememberVersion() {
    try {
      const previous = localStorage.getItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, APP_VERSION);
      if (previous && previous !== APP_VERSION) {
        showUpdateToast("Sistema atualizado para a versão mais recente.");
      }
    } catch (error) {
      console.warn("Não foi possível salvar versão do sistema.", error);
    }
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register(
        `sw.js?v=${encodeURIComponent(APP_VERSION)}`,
        { updateViaCache: "none" }
      );

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        const attemptedControllerReload = sessionStorage.getItem("op_confeccao_controller_reload");
        if (attemptedControllerReload === APP_VERSION) return;
        sessionStorage.setItem("op_confeccao_controller_reload", APP_VERSION);
        window.location.reload();
      });

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      setInterval(() => registration.update().catch(() => {}), 15 * 60 * 1000);
    } catch (error) {
      console.warn("Service Worker não registrado.", error);
    }
  }

  async function checkVersionFile() {
    if (checkingVersion) return;
    checkingVersion = true;
    try {
      const response = await fetch(`version.json?ts=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const remoteVersion = data?.version;
      if (!remoteVersion) return;

      if (remoteVersion === APP_VERSION) {
        sessionStorage.removeItem(`${ATTEMPT_PREFIX}${remoteVersion}`);
        return;
      }

      const attemptKey = `${ATTEMPT_PREFIX}${remoteVersion}`;
      if (sessionStorage.getItem(attemptKey) === "1") {
        showUpdateToast(
          "Atualização encontrada, mas o navegador ainda está segurando arquivo antigo. Use Ctrl+F5."
        );
        return;
      }

      sessionStorage.setItem(attemptKey, "1");
      showUpdateToast("Nova versão encontrada. Limpando cache e atualizando uma vez...");
      await clearAppCaches();
      await unregisterOldWorkers();

      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("v", remoteVersion);
        url.searchParams.set("t", Date.now().toString());
        window.location.replace(url.toString());
      }, 800);
    } catch (error) {
      console.warn("Não foi possível verificar atualização.", error);
    } finally {
      checkingVersion = false;
    }
  }

  // =========================================================
  // HOTFIX: CHEGADA MANUAL DE FACÇÃO
  // Fluxo: OP -> REF/quantidade -> processo -> facções permitidas
  // Esta correção não altera o salvamento existente no app.js.
  // =========================================================

  const FACCOES_POR_PROCESSO = Object.freeze({
    "ENCAPAR BOJO": [
      "DIVINA", "GRACIANE", "JESSICA", "LARISSA", "ALINE BATISTA",
      "DAIANY", "NAGILA", "DELMA", "GIRLAINE"
    ],
    "ALÇA": [
      "JANAINA", "IVONE", "LUANA", "KARYTA", "SIMEI", "SIMONE"
    ],
    "CALCINHA MONTAGEM": [
      "ANA FLAVIA", "KAUANE", "LIANA", "DAIANA", "LEIDIANE", "ANDREZA"
    ],
    "CALCINHA COMPLETA": [
      "LORENA", "JEAN", "SCHENEIDER", "DANIELA", "KAMILA", "LIANDRA",
      "JUZENI", "THEILLOR", "SILVANY", "LEONARDO", "MATHEUS", "BEATRIZ",
      "MARILIA", "DARLLEN", "RONEIDIA"
    ],
    "SUTIÃ MONTAGEM": [
      "LIVIA", "FRACEILDA", "MOCINHA", "NAYARA", "NAGILA", "GIRLAINE", "JHENIFER"
    ],
    "SUTIÃ COMPLETO": [
      "DANUBIA", "KAKA", "GISLAINY", "ITAMAR", "LUCIA", "GOIANIRA"
    ]
  });

  function normalizarComparacao(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function processoCanonico(valor) {
    const normalizado = normalizarComparacao(valor);
    const nomes = typeof getNomesProcessosFaccoesAtivos === "function"
      ? getNomesProcessosFaccoesAtivos()
      : Object.keys(FACCOES_POR_PROCESSO);
    return nomes.find(
      processo => normalizarComparacao(processo) === normalizado
    ) || "";
  }

  function mostrarAvisoFormulario(mensagem) {
    const toastPrincipal = document.getElementById("toast");
    if (toastPrincipal) {
      toastPrincipal.textContent = mensagem;
      toastPrincipal.classList.remove("hidden");
      clearTimeout(window.__toastTimerChegadaManual);
      window.__toastTimerChegadaManual = setTimeout(() => {
        toastPrincipal.classList.add("hidden");
      }, 4500);
      return;
    }
    showUpdateToast(mensagem);
  }

  function copiarAtributosBasicos(origem, destino) {
    destino.id = origem.id;
    destino.className = origem.className;
    destino.required = origem.required;
    destino.disabled = origem.disabled;
    destino.setAttribute("aria-label", origem.getAttribute("aria-label") || "");
  }

  function criarSelectProcesso(inputAtual) {
    if (!inputAtual || inputAtual.tagName === "SELECT") return inputAtual;

    const select = document.createElement("select");
    copiarAtributosBasicos(inputAtual, select);
    select.required = true;
    select.innerHTML = `
      <option value="">Selecione o processo realizado</option>
      ${(typeof getNomesProcessosFaccoesAtivos === "function" ? getNomesProcessosFaccoesAtivos() : Object.keys(FACCOES_POR_PROCESSO))
        .map(processo => `<option value="${processo}">${processo}</option>`)
        .join("")}
    `;
    inputAtual.replaceWith(select);
    return select;
  }

  function criarSelectFaccao(inputAtual) {
    if (!inputAtual || inputAtual.tagName === "SELECT") return inputAtual;

    const select = document.createElement("select");
    copiarAtributosBasicos(inputAtual, select);
    select.required = true;
    select.disabled = true;
    select.innerHTML = '<option value="">Escolha o processo primeiro</option>';
    inputAtual.replaceWith(select);
    return select;
  }

  function preencherFaccoesDoProcesso(processoSelect, faccaoSelect, grupoFaccao, ajudaFaccao) {
    const processo = processoCanonico(processoSelect?.value);
    const faccoes = typeof getFaccoesGerenciadasPorProcesso === "function"
      ? getFaccoesGerenciadasPorProcesso(processo)
      : (FACCOES_POR_PROCESSO[processo] || []);

    faccaoSelect.innerHTML = "";
    faccaoSelect.value = "";

    if (!processo) {
      faccaoSelect.disabled = true;
      faccaoSelect.innerHTML = '<option value="">Escolha o processo primeiro</option>';
      if (grupoFaccao) grupoFaccao.style.display = "none";
      if (ajudaFaccao) ajudaFaccao.textContent = "";
      return;
    }

    if (grupoFaccao) grupoFaccao.style.display = "block";

    if (!faccoes.length) {
      faccaoSelect.disabled = true;
      faccaoSelect.innerHTML = '<option value="">Nenhuma facção cadastrada para este processo</option>';
      if (ajudaFaccao) {
        ajudaFaccao.textContent = "Nenhuma facção está vinculada ao processo selecionado.";
      }
      return;
    }

    faccaoSelect.disabled = false;
    faccaoSelect.innerHTML = `
      <option value="">Selecione quem realizou o processo</option>
      ${faccoes.map(nome => `<option value="${nome}">${nome}</option>`).join("")}
    `;

    if (ajudaFaccao) {
      ajudaFaccao.textContent = `${faccoes.length} facção(ões) disponível(is) para ${processo}.`;
    }
  }

  function iniciarHotfixChegadaManual() {
    const form = document.getElementById("formChegadaManualFaccao");
    if (!form || form.dataset.hotfixCondicional === APP_VERSION) return;

    const inputProcesso = document.getElementById("chegadaManualProcesso");
    const inputFaccao = document.getElementById("chegadaManualFaccao");
    if (!inputProcesso || !inputFaccao) return;

    const grupoProcesso = inputProcesso.closest("label");
    const grupoFaccao = inputFaccao.closest("label");
    const processoSelect = criarSelectProcesso(inputProcesso);
    const faccaoSelect = criarSelectFaccao(inputFaccao);

    if (!processoSelect || !faccaoSelect || !grupoFaccao) return;

    form.dataset.hotfixCondicional = APP_VERSION;
    grupoFaccao.id = "grupoChegadaManualFaccao";
    grupoFaccao.style.display = "none";

    if (grupoProcesso && !document.getElementById("chegadaManualAjudaProcesso")) {
      const ajudaProcesso = document.createElement("small");
      ajudaProcesso.id = "chegadaManualAjudaProcesso";
      ajudaProcesso.className = "muted";
      ajudaProcesso.style.display = "block";
      ajudaProcesso.style.marginTop = "6px";
      ajudaProcesso.textContent = "Ao escolher o processo, aparecerão somente as facções que fazem esse serviço.";
      grupoProcesso.appendChild(ajudaProcesso);
    }

    let ajudaFaccao = document.getElementById("chegadaManualAjudaFaccao");
    if (!ajudaFaccao) {
      ajudaFaccao = document.createElement("small");
      ajudaFaccao.id = "chegadaManualAjudaFaccao";
      ajudaFaccao.className = "muted";
      ajudaFaccao.style.display = "block";
      ajudaFaccao.style.marginTop = "6px";
      grupoFaccao.appendChild(ajudaFaccao);
    }

    const atualizarFaccoes = () => {
      preencherFaccoesDoProcesso(processoSelect, faccaoSelect, grupoFaccao, ajudaFaccao);
    };

    const resetarCondicionais = () => {
      processoSelect.value = "";
      faccaoSelect.value = "";
      atualizarFaccoes();
    };

    processoSelect.addEventListener("change", atualizarFaccoes);

    const botaoAbrir = document.getElementById("btnAbrirChegadaManualFaccao");
    if (botaoAbrir) {
      botaoAbrir.addEventListener("click", () => {
        // O app.js reseta e abre o formulário primeiro; depois aplicamos o estado condicional.
        setTimeout(resetarCondicionais, 0);
      });
    }

    form.addEventListener("reset", () => setTimeout(resetarCondicionais, 0));

    // Validação em captura: roda antes do submit já existente no app.js.
    form.addEventListener("submit", event => {
      const processo = processoCanonico(processoSelect.value);
      const faccao = String(faccaoSelect.value || "").trim();
      const permitidas = typeof getFaccoesGerenciadasPorProcesso === "function"
        ? getFaccoesGerenciadasPorProcesso(processo)
        : (FACCOES_POR_PROCESSO[processo] || []);
      const faccaoPermitida = permitidas.some(
        nome => normalizarComparacao(nome) === normalizarComparacao(faccao)
      );

      if (!processo) {
        event.preventDefault();
        event.stopImmediatePropagation();
        mostrarAvisoFormulario("Selecione o processo realizado antes de continuar.");
        processoSelect.focus();
        return;
      }

      if (!faccao || !faccaoPermitida) {
        event.preventDefault();
        event.stopImmediatePropagation();
        mostrarAvisoFormulario("Selecione uma das facções permitidas para o processo escolhido.");
        faccaoSelect.focus();
        return;
      }

      // Entrega os nomes canônicos para a lógica original do app.js.
      processoSelect.value = processo;
      faccaoSelect.value = permitidas.find(
        nome => normalizarComparacao(nome) === normalizarComparacao(faccao)
      ) || faccao;

      const botaoSalvar = form.querySelector('button[type="submit"]');
      if (botaoSalvar && !botaoSalvar.disabled) {
        const textoOriginal = botaoSalvar.textContent;
        botaoSalvar.disabled = true;
        botaoSalvar.textContent = "Salvando...";
        setTimeout(() => {
          botaoSalvar.disabled = false;
          botaoSalvar.textContent = textoOriginal;
        }, 5000);
      }
    }, true);

    resetarCondicionais();
  }


  // =========================================================
  // HOTFIX: NECESSIDADE REPROCESSADA E CONFERIDA
  // - Corrige o caso em que a restauração terminava, mas algumas linhas
  //   continuavam visualmente vazias.
  // - Recupera valores presentes no documento atual, nos manejos antigos,
  //   nos dados originais da Lígia e em campos de compatibilidade.
  // - Linhas sem valor na própria planilha ficam identificadas como
  //   "NÃO INFORMADA NA PLANILHA" por placeholder, sem gravar texto falso.
  // - Confere no servidor o que foi efetivamente salvo antes de concluir.
  // =========================================================

  const LIGIA_ORIGINAL_URL = "dados-ligia-migracao.json";
  const TEXTO_NAO_INFORMADA = "NÃO INFORMADA NA PLANILHA";
  const necessidadesOriginaisPorOP = new Map();
  const opsPresentesNaBaseOriginal = new Set();
  let carregandoNecessidadesOriginais = null;
  let observerNecessidades = null;
  let aplicandoFallbackNecessidades = false;
  let restauracaoNecessidadesEmAndamento = false;
  let leitorNecessidadeOriginalApp = null;

  function normalizarNumeroOPNecessidade(valor) {
    return String(valor || "")
      .trim()
      .toUpperCase()
      .replace(/^OP\s*[-:]?\s*/i, "");
  }

  function limparNecessidade(valor) {
    return String(valor ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function primeiroTextoNecessidade(...valores) {
    for (const valor of valores.flat(Infinity)) {
      const texto = limparNecessidade(valor);
      if (texto && texto !== TEXTO_NAO_INFORMADA) return texto;
    }
    return "";
  }

  function necessidadesDosManejos(dados) {
    const candidatos = [];
    const setores = dados?.manejosSetores;
    if (setores && typeof setores === "object") {
      Object.values(setores).forEach(manejo => {
        if (!manejo || typeof manejo !== "object") return;
        candidatos.push(
          manejo.necessidade,
          manejo.necessidadeTexto,
          manejo.dataNecessidade,
          manejo.previsaoEntrega,
          manejo.dataPrevista,
          manejo.prazo
        );
      });
    }

    const manejoAntigo = dados?.manejo;
    if (manejoAntigo && typeof manejoAntigo === "object") {
      candidatos.push(
        manejoAntigo.necessidade,
        manejoAntigo.necessidadeTexto,
        manejoAntigo.dataNecessidade,
        manejoAntigo.previsaoEntrega,
        manejoAntigo.dataPrevista,
        manejoAntigo.prazo
      );
    }

    return candidatos;
  }

  function buscarNecessidadeEmEstrutura(dados, profundidade = 0, visitados = new WeakSet()) {
    if (!dados || typeof dados !== "object" || profundidade > 5) return "";
    if (visitados.has(dados)) return "";
    visitados.add(dados);

    const chavesAceitas = new Set([
      "necessidade",
      "necessidadetexto",
      "necessidadeoriginalligia",
      "datanecessidade",
      "previsaoentrega",
      "dataprevista",
      "dataentregaprevista",
      "prazonecessidade",
      "prazoproducao"
    ]);

    for (const [chave, valor] of Object.entries(dados)) {
      const chaveNormalizada = String(chave || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (chavesAceitas.has(chaveNormalizada)) {
        const texto = primeiroTextoNecessidade(valor);
        if (texto) return texto;
      }
    }

    for (const valor of Object.values(dados)) {
      if (!valor || typeof valor !== "object") continue;
      if (Array.isArray(valor)) {
        for (const item of valor.slice(0, 80)) {
          const encontrado = buscarNecessidadeEmEstrutura(item, profundidade + 1, visitados);
          if (encontrado) return encontrado;
        }
      } else {
        const encontrado = buscarNecessidadeEmEstrutura(valor, profundidade + 1, visitados);
        if (encontrado) return encontrado;
      }
    }

    return "";
  }

  function extrairNecessidadeCompativel(dados, numeroOP = "") {
    if (!dados || typeof dados !== "object") {
      return necessidadeOriginalDaOP(numeroOP);
    }

    return primeiroTextoNecessidade(
      dados.necessidade,
      dados.necessidadeTexto,
      dados.necessidadeOriginalLigia,
      ...necessidadesDosManejos(dados),
      dados.dataNecessidade,
      dados.previsaoEntrega,
      dados.dataPrevista,
      dados.dataEntregaPrevista,
      dados.prazoNecessidade,
      buscarNecessidadeEmEstrutura(dados),
      necessidadeOriginalDaOP(
        numeroOP ||
        dados.numeroOP ||
        dados.numeroOPExterno ||
        dados.id
      )
    );
  }

  function registrarNecessidadeOriginal(op) {
    if (!op || typeof op !== "object") return;

    const chaves = [op.id, op.numeroOP, op.numeroOPExterno]
      .map(normalizarNumeroOPNecessidade)
      .filter(Boolean);

    chaves.forEach(chave => opsPresentesNaBaseOriginal.add(chave));

    const necessidade = primeiroTextoNecessidade(
      op.necessidadeOriginalLigia,
      op.necessidade,
      op.necessidadeTexto,
      ...necessidadesDosManejos(op),
      op.dataNecessidade,
      op.previsaoEntrega,
      op.dataPrevista,
      op.dataEntregaPrevista,
      buscarNecessidadeEmEstrutura(op)
    );

    if (!necessidade) return;
    chaves.forEach(chave => {
      if (!necessidadesOriginaisPorOP.has(chave)) {
        necessidadesOriginaisPorOP.set(chave, necessidade);
      }
    });
  }

  async function carregarNecessidadesOriginais(forcar = false) {
    if (forcar) {
      necessidadesOriginaisPorOP.clear();
      opsPresentesNaBaseOriginal.clear();
    }
    if ((necessidadesOriginaisPorOP.size || opsPresentesNaBaseOriginal.size) && !forcar) {
      return necessidadesOriginaisPorOP;
    }
    if (carregandoNecessidadesOriginais) return carregandoNecessidadesOriginais;

    carregandoNecessidadesOriginais = (async () => {
      try {
        const response = await fetch(`${LIGIA_ORIGINAL_URL}?v=${encodeURIComponent(APP_VERSION)}&ts=${Date.now()}`, {
          cache: "no-store"
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const dados = await response.json();
        const ordens = Array.isArray(dados?.ordensProducao)
          ? dados.ordensProducao
          : (Array.isArray(dados?.ordens) ? dados.ordens : []);

        ordens.forEach(registrarNecessidadeOriginal);
        return necessidadesOriginaisPorOP;
      } catch (error) {
        console.warn("Não foi possível carregar as necessidades originais da Lígia.", error);
        return necessidadesOriginaisPorOP;
      } finally {
        carregandoNecessidadesOriginais = null;
      }
    })();

    return carregandoNecessidadesOriginais;
  }

  function necessidadeOriginalDaOP(numeroOP) {
    return necessidadesOriginaisPorOP.get(normalizarNumeroOPNecessidade(numeroOP)) || "";
  }

  function obterNumeroOPDaLinhaManejo(linha) {
    const primeiroInput = linha?.querySelector("td:first-child input");
    return normalizarNumeroOPNecessidade(
      primeiroInput?.value ||
      linha?.querySelector("td:first-child")?.textContent ||
      ""
    );
  }

  function limparEstiloNecessidade(input) {
    if (!input) return;
    delete input.dataset.necessidadeOriginalRecuperada;
    delete input.dataset.necessidadeSemOrigem;
    input.style.background = "";
    input.style.borderColor = "";
    input.style.color = "";
    input.style.fontStyle = "";
    input.placeholder = "Necessidade";
  }

  function marcarCampoNecessidadeRecuperado(input, valor) {
    if (!input || !valor) return;
    input.value = valor;
    input.dataset.necessidadeOriginalRecuperada = "1";
    delete input.dataset.necessidadeSemOrigem;
    input.placeholder = "Necessidade";
    input.title = "Necessidade recuperada dos dados originais ou de um campo antigo da OP.";
    input.style.background = "#fff8dc";
    input.style.borderColor = "#d6a800";
    input.style.color = "";
    input.style.fontStyle = "";
  }

  function marcarCampoNecessidadeSemOrigem(input) {
    if (!input || limparNecessidade(input.value)) return;
    delete input.dataset.necessidadeOriginalRecuperada;
    input.dataset.necessidadeSemOrigem = "1";
    input.placeholder = TEXTO_NAO_INFORMADA;
    input.title = "A coluna Necessidade estava vazia na planilha original. Digite o valor correto quando ele for definido.";
    input.style.background = "#f3f4f6";
    input.style.borderColor = "#cbd5e1";
    input.style.color = "#475569";
    input.style.fontStyle = "italic";
  }

  function instalarEventosCamposNecessidade() {
    if (document.__eventosNecessidadeHotfixInstalados) return;
    document.__eventosNecessidadeHotfixInstalados = true;

    document.addEventListener("input", event => {
      const input = event.target?.matches?.('input[id$="-necessidade"]') ? event.target : null;
      if (!input) return;
      if (limparNecessidade(input.value)) {
        limparEstiloNecessidade(input);
      } else {
        agendarFallbackVisualNecessidades();
      }
    }, true);
  }

  function aplicarFallbackNaTabelaManejo() {
    const tbody = document.getElementById("listaManejoInline");
    if (!tbody) return { recuperadas: 0, semOrigem: 0, preenchidas: 0 };

    const resumo = { recuperadas: 0, semOrigem: 0, preenchidas: 0 };

    tbody.querySelectorAll('tr[data-manejo-row="1"]').forEach(linha => {
      const input = linha.querySelector('input[id$="-necessidade"]');
      if (!input) return;

      const atual = limparNecessidade(input.value);
      if (atual) {
        resumo.preenchidas += 1;
        if (input.dataset.necessidadeSemOrigem === "1") limparEstiloNecessidade(input);
        return;
      }

      const numeroOP = obterNumeroOPDaLinhaManejo(linha);
      const original = necessidadeOriginalDaOP(numeroOP);

      if (original) {
        marcarCampoNecessidadeRecuperado(input, original);
        resumo.recuperadas += 1;
      } else {
        marcarCampoNecessidadeSemOrigem(input);
        resumo.semOrigem += 1;
      }
    });

    return resumo;
  }

  function aplicarFallbackNaTabelaOrdens() {
    const tbody = document.getElementById("listaOrdens");
    if (!tbody) return { recuperadas: 0, semOrigem: 0 };

    const resumo = { recuperadas: 0, semOrigem: 0 };

    tbody.querySelectorAll("tr").forEach(linha => {
      const celulas = linha.querySelectorAll("td");
      if (celulas.length < 2) return;

      const numeroOP = normalizarNumeroOPNecessidade(celulas[0].textContent || "");
      const alvo = celulas[1].querySelector("strong") || celulas[1];
      const atual = limparNecessidade(alvo.textContent || "").replace(/^-$/, "");
      if (atual && atual !== TEXTO_NAO_INFORMADA) return;

      const original = necessidadeOriginalDaOP(numeroOP);
      if (original) {
        alvo.textContent = original;
        celulas[1].title = "Necessidade recuperada visualmente dos dados originais.";
        celulas[1].style.background = "#fff8dc";
        celulas[1].style.color = "";
        resumo.recuperadas += 1;
      } else {
        alvo.textContent = TEXTO_NAO_INFORMADA;
        celulas[1].title = "A necessidade não foi informada na planilha original.";
        celulas[1].style.background = "#f3f4f6";
        celulas[1].style.color = "#64748b";
        resumo.semOrigem += 1;
      }
    });

    return resumo;
  }

  function atualizarDatalistsNecessidade() {
    const valores = [...new Set(necessidadesOriginaisPorOP.values())]
      .filter(Boolean)
      .sort((a, b) => {
        if (a === "URGENTE") return -1;
        if (b === "URGENTE") return 1;
        return a.localeCompare(b, "pt-BR", { numeric: true });
      });

    ["necessidadesOrdemList", "filtroManejoNecessidadeList"].forEach(id => {
      const datalist = document.getElementById(id);
      if (!datalist) return;

      const atuais = new Set(
        [...datalist.querySelectorAll("option")]
          .map(option => limparNecessidade(option.value))
          .filter(Boolean)
      );

      valores.forEach(valor => {
        if (atuais.has(valor)) return;
        const option = document.createElement("option");
        option.value = valor;
        datalist.appendChild(option);
        atuais.add(valor);
      });
    });
  }

  function resumoNecessidadesNaTela() {
    return {
      recuperadas: document.querySelectorAll('[data-necessidade-original-recuperada="1"]').length,
      semOrigem: document.querySelectorAll('[data-necessidade-sem-origem="1"]').length
    };
  }

  function aplicarFallbackVisualNecessidades() {
    if (aplicandoFallbackNecessidades) return;
    aplicandoFallbackNecessidades = true;

    try {
      aplicarFallbackNaTabelaManejo();
      aplicarFallbackNaTabelaOrdens();
      atualizarDatalistsNecessidade();
      atualizarStatusCorrecaoNecessidade();
    } finally {
      aplicandoFallbackNecessidades = false;
    }
  }

  function agendarFallbackVisualNecessidades() {
    clearTimeout(window.__timerFallbackNecessidades);
    window.__timerFallbackNecessidades = setTimeout(aplicarFallbackVisualNecessidades, 60);
  }

  function iniciarObservadorNecessidades() {
    if (observerNecessidades) return;

    const alvos = [
      document.getElementById("listaManejoInline"),
      document.getElementById("listaOrdens")
    ].filter(Boolean);

    if (!alvos.length) {
      setTimeout(iniciarObservadorNecessidades, 500);
      return;
    }

    observerNecessidades = new MutationObserver(agendarFallbackVisualNecessidades);
    alvos.forEach(alvo => observerNecessidades.observe(alvo, { childList: true, subtree: true }));
  }

  function atualizarStatusCorrecaoNecessidade(mensagem = "") {
    const status = document.getElementById("statusCorrecaoNecessidade");
    if (!status) return;

    if (mensagem) {
      status.textContent = mensagem;
      return;
    }

    const tela = resumoNecessidadesNaTela();
    if (tela.recuperadas || tela.semOrigem) {
      status.textContent =
        `${tela.recuperadas} recuperada(s) nesta tela; ` +
        `${tela.semOrigem} sem informação na planilha original.`;
      return;
    }

    if (opsPresentesNaBaseOriginal.size) {
      status.textContent =
        `${necessidadesOriginaisPorOP.size} OP(s) possuem necessidade na base original; ` +
        `${Math.max(opsPresentesNaBaseOriginal.size - necessidadesOriginaisPorOP.size, 0)} vieram sem esse campo.`;
      return;
    }

    status.textContent = "Aguardando leitura e conferência dos dados.";
  }

  function adicionarPainelCorrecaoNecessidade() {
    if (document.getElementById("painelCorrecaoNecessidade")) return;

    const referencia =
      document.querySelector("#manejo .manejo-soma-compacta") ||
      document.querySelector("#manejo .notice.small");

    if (!referencia) {
      setTimeout(adicionarPainelCorrecaoNecessidade, 500);
      return;
    }

    const painel = document.createElement("div");
    painel.id = "painelCorrecaoNecessidade";
    painel.style.display = "flex";
    painel.style.flexWrap = "wrap";
    painel.style.alignItems = "center";
    painel.style.gap = "10px";
    painel.style.margin = "10px 0";
    painel.style.padding = "10px 12px";
    painel.style.border = "1px solid #94a3b8";
    painel.style.borderRadius = "12px";
    painel.style.background = "#f8fafc";
    painel.innerHTML = `
      <div style="flex:1; min-width:260px;">
        <strong>Conferência da Necessidade</strong>
        <div id="statusCorrecaoNecessidade" style="font-size:12px; margin-top:3px; color:#334155;">
          Aguardando leitura e conferência dos dados.
        </div>
        <div style="font-size:11px; margin-top:4px; color:#64748b;">
          Amarelo: valor recuperado. Cinza: a planilha original não possuía necessidade informada.
        </div>
      </div>
      <button id="btnRestaurarNecessidadesOriginais" class="btn btn-primary" type="button">
        Reprocessar e conferir
      </button>
    `;

    referencia.insertAdjacentElement("afterend", painel);
    document
      .getElementById("btnRestaurarNecessidadesOriginais")
      ?.addEventListener("click", restaurarNecessidadesOriginaisNoFirebase);
  }

  async function obterFirebaseParaCorrecao() {
    const [firebaseApp, firestore] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
    ]);

    const appAtual = firebaseApp.getApp();
    return {
      firestore,
      db: firestore.getFirestore(appAtual)
    };
  }

  function necessidadeAtualOficial(dados) {
    return primeiroTextoNecessidade(
      dados?.necessidade,
      dados?.necessidadeTexto
    );
  }

  function candidatoRestauracaoDocumento(documento) {
    const dados = documento?.data?.() || {};
    const atual = necessidadeAtualOficial(dados);
    const numeroOP = normalizarNumeroOPNecessidade(
      dados.numeroOP ||
      dados.numeroOPExterno ||
      documento.id
    );

    if (atual) {
      return { atual, candidato: "", dados, numeroOP, origem: "atual" };
    }

    const candidatoDocumento = primeiroTextoNecessidade(
      dados.necessidadeOriginalLigia,
      ...necessidadesDosManejos(dados),
      dados.dataNecessidade,
      dados.previsaoEntrega,
      dados.dataPrevista,
      dados.dataEntregaPrevista,
      dados.prazoNecessidade,
      buscarNecessidadeEmEstrutura(dados)
    );

    if (candidatoDocumento) {
      return {
        atual: "",
        candidato: candidatoDocumento,
        dados,
        numeroOP,
        origem: "documento"
      };
    }

    const candidatoOriginal = necessidadeOriginalDaOP(numeroOP);
    return {
      atual: "",
      candidato: candidatoOriginal,
      dados,
      numeroOP,
      origem: candidatoOriginal ? "planilha" : "sem_origem"
    };
  }

  async function conferirSalvamentoNoServidor(firestore, db, idsEsperados) {
    if (!idsEsperados.size) return { confirmadas: 0, falharam: [] };

    const snapshot = typeof firestore.getDocsFromServer === "function"
      ? await firestore.getDocsFromServer(firestore.collection(db, "ordensProducao"))
      : await firestore.getDocs(firestore.collection(db, "ordensProducao"));

    let confirmadas = 0;
    const encontrados = new Set();

    snapshot.docs.forEach(documento => {
      if (!idsEsperados.has(documento.id)) return;
      encontrados.add(documento.id);
      if (necessidadeAtualOficial(documento.data())) confirmadas += 1;
    });

    const falharam = [...idsEsperados].filter(id => !encontrados.has(id));
    return { confirmadas, falharam };
  }

  async function restaurarNecessidadesOriginaisNoFirebase() {
    if (restauracaoNecessidadesEmAndamento) return;
    restauracaoNecessidadesEmAndamento = true;

    const botao = document.getElementById("btnRestaurarNecessidadesOriginais");
    const textoOriginalBotao = botao?.textContent || "Reprocessar e conferir";

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Lendo servidor...";
    }

    try {
      await carregarNecessidadesOriginais(true);
      const { firestore, db } = await obterFirebaseParaCorrecao();

      const snapshot = typeof firestore.getDocsFromServer === "function"
        ? await firestore.getDocsFromServer(firestore.collection(db, "ordensProducao"))
        : await firestore.getDocs(firestore.collection(db, "ordensProducao"));

      const restauraveis = [];
      let preservadas = 0;
      let semOrigem = 0;

      snapshot.docs.forEach(documento => {
        const resultado = candidatoRestauracaoDocumento(documento);

        if (resultado.atual) {
          preservadas += 1;
          return;
        }

        if (!resultado.candidato) {
          semOrigem += 1;
          return;
        }

        restauraveis.push({ documento, ...resultado });
      });

      atualizarStatusCorrecaoNecessidade(
        `${preservadas} já preenchida(s), ${restauraveis.length} recuperável(is) e ${semOrigem} sem informação na planilha.`
      );

      if (!restauraveis.length) {
        aplicarFallbackVisualNecessidades();
        showUpdateToast(
          semOrigem
            ? `Conferência concluída: ${semOrigem} OP(s) não tinham necessidade informada na planilha.`
            : "Conferência concluída: não há necessidades pendentes para restaurar."
        );
        return;
      }

      const confirmar = window.confirm(
        `Conferência concluída:\n\n` +
        `• ${preservadas} OP(s) já preenchida(s)\n` +
        `• ${restauraveis.length} OP(s) com valor recuperável\n` +
        `• ${semOrigem} OP(s) sem necessidade na planilha original\n\n` +
        `Deseja gravar apenas os ${restauraveis.length} valores recuperáveis?`
      );

      if (!confirmar) {
        atualizarStatusCorrecaoNecessidade(
          `Conferência mantida sem gravação. ${semOrigem} OP(s) não possuíam necessidade na planilha.`
        );
        aplicarFallbackVisualNecessidades();
        return;
      }

      let lote = firestore.writeBatch(db);
      let itensNoLote = 0;
      let enviados = 0;
      const idsEsperados = new Set();

      for (const item of restauraveis) {
        lote.set(item.documento.ref, {
          necessidade: item.candidato,
          necessidadeTexto: item.candidato,
          necessidadeManual: false,
          necessidadeRestauradaOriginal: true,
          necessidadeRestauradaOrigem: item.origem,
          necessidadeRestauradaVersao: APP_VERSION,
          necessidadeRestauradaEm: firestore.serverTimestamp(),
          atualizadoEm: firestore.serverTimestamp()
        }, { merge: true });

        idsEsperados.add(item.documento.id);
        itensNoLote += 1;
        enviados += 1;

        if (itensNoLote >= 400) {
          if (botao) botao.textContent = `Salvando ${enviados}/${restauraveis.length}...`;
          await lote.commit();
          lote = firestore.writeBatch(db);
          itensNoLote = 0;
        }
      }

      if (itensNoLote > 0) await lote.commit();

      if (botao) botao.textContent = "Confirmando gravação...";
      const verificacao = await conferirSalvamentoNoServidor(firestore, db, idsEsperados);

      const naoConfirmadas = Math.max(restauraveis.length - verificacao.confirmadas, 0);
      atualizarStatusCorrecaoNecessidade(
        `${verificacao.confirmadas} restauração(ões) confirmada(s) no servidor; ` +
        `${semOrigem} OP(s) não possuíam necessidade na planilha; ` +
        `${naoConfirmadas} não confirmada(s).`
      );

      if (naoConfirmadas > 0) {
        showUpdateToast(
          `${verificacao.confirmadas} salvas e confirmadas. ${naoConfirmadas} precisam de nova conferência.`
        );
      } else {
        showUpdateToast(
          `${verificacao.confirmadas} necessidade(s) restaurada(s). ` +
          `${semOrigem} OP(s) ficaram identificadas como não informadas na planilha.`
        );
      }

      if (typeof window.atualizarDadosServidorAgora === "function") {
        setTimeout(() => window.atualizarDadosServidorAgora(), 700);
      } else {
        setTimeout(() => window.location.reload(), 1200);
      }

      console.info("Reprocessamento de necessidades concluído.", {
        preservadas,
        restauraveis: restauraveis.length,
        confirmadas: verificacao.confirmadas,
        semOrigem,
        naoConfirmadas
      });
    } catch (error) {
      console.error("Erro ao reprocessar necessidades.", error);
      atualizarStatusCorrecaoNecessidade(
        "Erro na conferência. Nenhum valor preenchido foi sobrescrito."
      );
      showUpdateToast(
        "Não foi possível concluir a conferência. Confira a internet e as permissões do usuário."
      );
    } finally {
      restauracaoNecessidadesEmAndamento = false;
      if (botao) {
        botao.disabled = false;
        botao.textContent = textoOriginalBotao;
      }
    }
  }

  function instalarLeitorNecessidadeCompativel() {
    if (window.__leitorNecessidadeCompatibilidadeV2) return;
    if (typeof window.getNecessidadeDaOrdem !== "function") return;

    leitorNecessidadeOriginalApp = window.getNecessidadeDaOrdem;
    window.getNecessidadeDaOrdem = function getNecessidadeDaOrdemCompatibilidade(op, setor = "") {
      let atual = "";
      try {
        atual = leitorNecessidadeOriginalApp(op, setor);
      } catch (error) {
        console.warn("Falha no leitor original de necessidade.", error);
      }

      return primeiroTextoNecessidade(
        atual,
        extrairNecessidadeCompativel(op, op?.numeroOP || op?.id)
      );
    };

    window.__leitorNecessidadeCompatibilidadeV2 = true;
  }

  function protegerNecessidadeAntesDoSalvar(event) {
    const botao = event.target?.closest?.(".btn-save-manejo");
    if (!botao) return;

    const linha = botao.closest('tr[data-manejo-row="1"]');
    if (!linha) return;

    const input = linha.querySelector('input[id$="-necessidade"]');
    if (!input || limparNecessidade(input.value)) return;

    const original = necessidadeOriginalDaOP(obterNumeroOPDaLinhaManejo(linha));
    if (original) marcarCampoNecessidadeRecuperado(input, original);
  }

  async function iniciarHotfixNecessidade() {
    if (window.__hotfixNecessidadeSemBrancoV2Iniciado) {
      agendarFallbackVisualNecessidades();
      return;
    }
    window.__hotfixNecessidadeSemBrancoV2Iniciado = true;

    instalarLeitorNecessidadeCompativel();
    instalarEventosCamposNecessidade();
    document.getElementById("painelCorrecaoNecessidade")?.remove();
    iniciarObservadorNecessidades();
    document.addEventListener("click", protegerNecessidadeAntesDoSalvar, true);
    await carregarNecessidadesOriginais();
    instalarLeitorNecessidadeCompativel();
    aplicarFallbackVisualNecessidades();

    if (typeof window.atualizarManejoComSoma === "function") {
      setTimeout(() => {
        window.atualizarManejoComSoma();
        setTimeout(aplicarFallbackVisualNecessidades, 100);
      }, 150);
    }
  }


  // =========================================================
  // GESTÃO CENTRALIZADA DAS SUGESTÕES DE FASE DO MANEJO
  // - Remove o botão "+" das linhas para todos os usuários.
  // - Mantém o campo Fase livre para digitação e salvamento normal.
  // - Usa configuracoes/fasesManejo como lista oficial de sugestões.
  // - Somente administradores podem adicionar ou remover sugestões.
  // - A lista é atualizada em tempo real para todos os usuários.
  // =========================================================

  const FASES_CONFIG_COLECAO = "configuracoes";
  const FASES_CONFIG_DOCUMENTO = "fasesManejo";
  let fasesGerenciadas = [];
  let configuracaoFasesExiste = false;
  let usuarioEhAdminFases = false;
  let contextoFirebaseFases = null;
  let unsubscribeConfiguracaoFases = null;
  let unsubscribeAuthFases = null;
  let observerSugestoesFases = null;
  let timerAplicarSugestoesFases = null;
  let inicializacaoAutomaticaFasesTentada = false;
  let aplicandoSugestoesFasesNoDom = false;
  let bloqueioCliqueMaisFaseInstalado = false;
  const ID_ESTILO_SEM_MAIS_FASE = "estiloSemBotaoMaisFase";

  function normalizarFaseGerenciada(valor) {
    return String(valor || "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function chaveFaseGerenciada(valor) {
    return normalizarComparacao(normalizarFaseGerenciada(valor));
  }

  function ordenarFasesGerenciadas(lista) {
    const unicas = new Map();
    (Array.isArray(lista) ? lista : []).forEach(item => {
      const fase = normalizarFaseGerenciada(item);
      const chave = chaveFaseGerenciada(fase);
      if (fase && chave && !unicas.has(chave)) unicas.set(chave, fase);
    });
    return [...unicas.values()].sort((a, b) =>
      a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" })
    );
  }

  function escapeHtmlFases(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function injetarEstiloSemBotaoMaisFase() {
    if (document.getElementById(ID_ESTILO_SEM_MAIS_FASE)) return;

    const estilo = document.createElement("style");
    estilo.id = ID_ESTILO_SEM_MAIS_FASE;
    estilo.textContent = `
      /*
       * O app.js redesenha as linhas do Manejo durante filtros e digitação.
       * Por isso o botão antigo precisa nascer invisível, sem aguardar o
       * MutationObserver removê-lo depois.
       */
      #manejo .fase-plus > button,
      #manejo .fase-plus .btn-plus,
      #manejo button[onclick*="adicionarFaseSugestao"],
      #manejo button[title="Adicionar fase às sugestões"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        width: 0 !important;
        min-width: 0 !important;
        max-width: 0 !important;
        height: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        border: 0 !important;
        overflow: hidden !important;
      }

      #manejo .fase-plus {
        grid-template-columns: minmax(0, 1fr) !important;
        column-gap: 0 !important;
      }

      #manejo .fase-plus > input[id$="-fase"],
      #manejo .fase-plus > input[list="manejoFasesList"] {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        flex: 1 1 100% !important;
        grid-column: 1 / -1 !important;
      }
    `;
    (document.head || document.documentElement).appendChild(estilo);
  }

  function seletorBotaoMaisFase() {
    return [
      '#manejo .fase-plus > button',
      '#manejo .fase-plus .btn-plus',
      '#manejo button[onclick*="adicionarFaseSugestao"]',
      '#manejo button[title="Adicionar fase às sugestões"]'
    ].join(", ");
  }

  function bloquearCliqueNoMaisFaseAntigo(event) {
    const botao = event.target?.closest?.(seletorBotaoMaisFase());
    if (!botao) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    botao.remove();
  }

  function instalarBloqueioCliqueMaisFase() {
    if (bloqueioCliqueMaisFaseInstalado) return;
    bloqueioCliqueMaisFaseInstalado = true;
    document.addEventListener("pointerdown", bloquearCliqueNoMaisFaseAntigo, true);
    document.addEventListener("click", bloquearCliqueNoMaisFaseAntigo, true);
  }

  function removerPainelTemporarioNecessidade() {
    document.getElementById("painelCorrecaoNecessidade")?.remove();
  }

  function bloquearAdicaoLocalDeFase() {
    window.adicionarFaseSugestao = function adicionarFaseSugestaoSomenteAdmin() {
      mostrarAvisoFormulario(
        "As sugestões de fase são gerenciadas somente pelo administrador na aba Usuários."
      );
    };
  }

  function removerBotoesMaisDasFases() {
    injetarEstiloSemBotaoMaisFase();

    document
      .querySelectorAll(seletorBotaoMaisFase())
      .forEach(botao => botao.remove());

    document.querySelectorAll("#manejo .fase-plus").forEach(container => {
      const input = container.querySelector('input[id$="-fase"], input[list="manejoFasesList"]');
      if (input) {
        input.style.width = "100%";
        input.style.minWidth = "0";
        input.style.maxWidth = "100%";
        input.style.flex = "1 1 100%";
        input.title = "Digite a fase ou escolha uma sugestão cadastrada pelo administrador.";
      }
    });

    bloquearAdicaoLocalDeFase();
  }

  function opcoesAtuaisDoDatalistFases() {
    const lista = [];
    document.querySelectorAll("#manejoFasesList option").forEach(option => {
      lista.push(option.value || option.textContent || "");
    });

    try {
      const locais = JSON.parse(localStorage.getItem("fasesManejoExtras") || "[]");
      if (Array.isArray(locais)) lista.push(...locais);
    } catch (error) {
      console.warn("Não foi possível ler sugestões locais antigas de fases.", error);
    }

    return ordenarFasesGerenciadas(lista);
  }

  function valoresDatalistFases() {
    return [...document.querySelectorAll("#manejoFasesList option")]
      .map(option => normalizarFaseGerenciada(option.value || option.textContent || ""))
      .filter(Boolean);
  }

  function observarMudancasSugestoesFases() {
    if (!observerSugestoesFases || !document.body) return;
    observerSugestoesFases.observe(document.body, { childList: true, subtree: true });
  }

  function aplicarListaOficialNoDatalist() {
    if (aplicandoSugestoesFasesNoDom) return;
    aplicandoSugestoesFasesNoDom = true;

    // Evita que a remoção do botão e a atualização do datalist acionem o
    // próprio observador novamente em ciclo, o que causava instabilidade.
    observerSugestoesFases?.disconnect();

    try {
      removerPainelTemporarioNecessidade();
      removerBotoesMaisDasFases();

      if (!configuracaoFasesExiste) return;

      const datalist = document.getElementById("manejoFasesList");
      if (!datalist) return;

      const atuais = valoresDatalistFases();
      const oficiais = ordenarFasesGerenciadas(fasesGerenciadas);
      const iguais =
        atuais.length === oficiais.length &&
        atuais.every((item, indice) => chaveFaseGerenciada(item) === chaveFaseGerenciada(oficiais[indice]));

      if (!iguais) {
        datalist.innerHTML = oficiais
          .map(fase => `<option value="${escapeHtmlFases(fase)}"></option>`)
          .join("");
      }

      try {
        localStorage.removeItem("fasesManejoExtras");
      } catch (error) {
        console.warn("Não foi possível limpar sugestões locais antigas.", error);
      }
    } finally {
      aplicandoSugestoesFasesNoDom = false;
      observarMudancasSugestoesFases();
    }
  }

  function agendarAplicacaoSugestoesFases() {
    if (aplicandoSugestoesFasesNoDom) return;
    clearTimeout(timerAplicarSugestoesFases);
    timerAplicarSugestoesFases = setTimeout(aplicarListaOficialNoDatalist, 80);
  }

  function iniciarObservadorSugestoesFases() {
    if (observerSugestoesFases || !document.body) return;
    observerSugestoesFases = new MutationObserver(agendarAplicacaoSugestoesFases);
    observarMudancasSugestoesFases();
  }

  function renderListaAdminFases() {
    const lista = document.getElementById("listaSugestoesFasesAdmin");
    const contador = document.getElementById("contadorSugestoesFasesAdmin");
    const status = document.getElementById("statusSugestoesFasesAdmin");
    if (!lista) return;

    if (contador) contador.textContent = `${fasesGerenciadas.length} opção(ões)`;

    if (status) {
      status.textContent = configuracaoFasesExiste
        ? "Lista oficial sincronizada com todos os usuários."
        : "Preparando a lista inicial com as sugestões atuais do sistema.";
    }

    if (!fasesGerenciadas.length) {
      lista.innerHTML = `
        <div style="padding:14px; border:1px dashed #cbd5e1; border-radius:10px; color:#64748b; text-align:center;">
          Nenhuma sugestão cadastrada. Digite uma fase acima para começar.
        </div>
      `;
      return;
    }

    lista.innerHTML = fasesGerenciadas
      .map(fase => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:9px 10px; border:1px solid #e2e8f0; border-radius:10px; background:#fff;">
          <strong style="font-size:13px; overflow-wrap:anywhere;">${escapeHtmlFases(fase)}</strong>
          <button
            type="button"
            class="btn"
            data-remover-fase-admin="${escapeHtmlFases(fase)}"
            style="padding:7px 10px; color:#b91c1c; border-color:#fecaca; background:#fff7f7; flex:0 0 auto;"
            title="Remover esta sugestão"
          >
            Remover
          </button>
        </div>
      `)
      .join("");
  }

  function criarPainelAdminFases() {
    if (!usuarioEhAdminFases) {
      document.getElementById("painelSugestoesFasesAdmin")?.remove();
      return;
    }

    if (document.getElementById("painelSugestoesFasesAdmin")) {
      renderListaAdminFases();
      return;
    }

    const layout = document.querySelector("#usuarios .usuarios-layout");
    const formularioUsuario = document.getElementById("formUsuario");
    if (!layout || !formularioUsuario) {
      setTimeout(criarPainelAdminFases, 400);
      return;
    }

    const painel = document.createElement("section");
    painel.id = "painelSugestoesFasesAdmin";
    painel.className = "panel";
    painel.style.gridColumn = "1 / -1";
    painel.innerHTML = `
      <div class="panel-header" style="align-items:flex-start; gap:16px;">
        <div>
          <h3>Opções do filtro Fase — Sutiã</h3>
          <p>Somente o administrador define o que aparece no filtro múltiplo da coluna Fase e nas sugestões de edição do Sutiã.</p>
        </div>
        <span id="contadorSugestoesFasesAdmin" class="badge ok">0 sugestão(ões)</span>
      </div>
      <div class="notice small" style="margin-bottom:12px;">
        A lista abaixo controla o menu do filtro Fase. Os usuários ainda podem digitar uma fase livremente, mas ela só entra no filtro oficial quando o administrador cadastrá-la aqui.
      </div>
      <form id="formSugestaoFaseAdmin" style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-bottom:12px;">
        <label style="flex:1; min-width:240px;">
          Nova opção de fase
          <input id="novaSugestaoFaseAdmin" type="text" placeholder="Ex: ACABAMENTO, REVISÃO, COSTURA" autocomplete="off" maxlength="80" />
        </label>
        <button class="btn btn-primary" type="submit">Adicionar opção</button>
      </form>
      <div id="statusSugestoesFasesAdmin" style="font-size:12px; color:#64748b; margin-bottom:10px;">
        Carregando lista oficial...
      </div>
      <div id="listaSugestoesFasesAdmin" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:8px;"></div>
    `;

    formularioUsuario.insertAdjacentElement("afterend", painel);

    painel.querySelector("#formSugestaoFaseAdmin")?.addEventListener("submit", async event => {
      event.preventDefault();
      const input = document.getElementById("novaSugestaoFaseAdmin");
      const fase = normalizarFaseGerenciada(input?.value);
      if (!fase) {
        mostrarAvisoFormulario("Digite o nome da fase antes de adicionar.");
        input?.focus();
        return;
      }
      await adicionarSugestaoFaseAdmin(fase);
      if (input) input.value = "";
      input?.focus();
    });

    painel.querySelector("#listaSugestoesFasesAdmin")?.addEventListener("click", async event => {
      const botao = event.target?.closest?.("[data-remover-fase-admin]");
      if (!botao) return;
      const fase = botao.dataset.removerFaseAdmin || "";
      await removerSugestaoFaseAdmin(fase);
    });

    renderListaAdminFases();
  }

  async function registrarLogFaseAdmin(acao, fase) {
    if (!contextoFirebaseFases?.user || !contextoFirebaseFases?.perfil) return;
    const { firestore, db, user, perfil } = contextoFirebaseFases;
    try {
      await firestore.addDoc(firestore.collection(db, "logsAlteracoes"), {
        acao,
        tipoAlvo: "Sugestão de fase",
        alvoId: fase,
        detalhes: `${acao}: ${fase}`,
        usuarioUid: user.uid,
        usuarioNome: perfil.nome || "",
        usuarioEmail: perfil.email || user.email || "",
        usuarioTipo: perfil.tipo || "admin",
        criadoEm: firestore.serverTimestamp()
      });
    } catch (error) {
      console.warn("Não foi possível registrar o log da sugestão de fase.", error);
    }
  }

  async function alterarListaFasesComTransacao(transformar) {
    if (!usuarioEhAdminFases || !contextoFirebaseFases) {
      mostrarAvisoFormulario("Somente o administrador pode gerenciar sugestões de fases.");
      return null;
    }

    const { firestore, db, user } = contextoFirebaseFases;
    const referencia = firestore.doc(db, FASES_CONFIG_COLECAO, FASES_CONFIG_DOCUMENTO);

    return firestore.runTransaction(db, async transacao => {
      const snapshot = await transacao.get(referencia);
      const listaAtual = ordenarFasesGerenciadas(
        snapshot.exists() ? snapshot.data()?.sugestoes : fasesGerenciadas
      );
      const proximaLista = ordenarFasesGerenciadas(transformar(listaAtual));

      transacao.set(
        referencia,
        {
          sugestoes: proximaLista,
          atualizadoEm: firestore.serverTimestamp(),
          atualizadoPor: user.uid,
          versaoGerenciamento: APP_VERSION
        },
        { merge: true }
      );

      return proximaLista;
    });
  }

  async function adicionarSugestaoFaseAdmin(faseInformada) {
    const fase = normalizarFaseGerenciada(faseInformada);
    if (!fase) return;

    if (fasesGerenciadas.some(item => chaveFaseGerenciada(item) === chaveFaseGerenciada(fase))) {
      mostrarAvisoFormulario(`A fase "${fase}" já está cadastrada nas sugestões.`);
      return;
    }

    try {
      await alterarListaFasesComTransacao(lista => [...lista, fase]);
      await registrarLogFaseAdmin("Sugestão de fase adicionada", fase);
      showUpdateToast(`Sugestão "${fase}" adicionada para todos os usuários.`);
    } catch (error) {
      console.error("Erro ao adicionar sugestão de fase.", error);
      mostrarAvisoFormulario("Não foi possível adicionar a sugestão. Confira a internet e tente novamente.");
    }
  }

  async function removerSugestaoFaseAdmin(faseInformada) {
    const fase = normalizarFaseGerenciada(faseInformada);
    if (!fase) return;

    const confirmar = window.confirm(
      `Remover "${fase}" das sugestões de fase?\n\nIsso não altera as OPs que já possuem essa fase salva.`
    );
    if (!confirmar) return;

    try {
      await alterarListaFasesComTransacao(lista =>
        lista.filter(item => chaveFaseGerenciada(item) !== chaveFaseGerenciada(fase))
      );
      await registrarLogFaseAdmin("Sugestão de fase removida", fase);
      showUpdateToast(`Sugestão "${fase}" removida. As OPs antigas foram preservadas.`);
    } catch (error) {
      console.error("Erro ao remover sugestão de fase.", error);
      mostrarAvisoFormulario("Não foi possível remover a sugestão. Confira a internet e tente novamente.");
    }
  }

  async function criarListaInicialFasesSeNecessario() {
    if (
      inicializacaoAutomaticaFasesTentada ||
      !usuarioEhAdminFases ||
      configuracaoFasesExiste ||
      !contextoFirebaseFases
    ) return;

    inicializacaoAutomaticaFasesTentada = true;

    // Aguarda o app.js montar o datalist com as sugestões que já existiam.
    await new Promise(resolve => setTimeout(resolve, 1800));
    const atuais = opcoesAtuaisDoDatalistFases();

    try {
      const { firestore, db, user } = contextoFirebaseFases;
      const referencia = firestore.doc(db, FASES_CONFIG_COLECAO, FASES_CONFIG_DOCUMENTO);
      await firestore.runTransaction(db, async transacao => {
        const snapshot = await transacao.get(referencia);
        if (snapshot.exists()) return;
        transacao.set(referencia, {
          sugestoes: atuais,
          criadoEm: firestore.serverTimestamp(),
          criadoPor: user.uid,
          atualizadoEm: firestore.serverTimestamp(),
          atualizadoPor: user.uid,
          versaoGerenciamento: APP_VERSION
        });
      });

      if (atuais.length) {
        showUpdateToast(`${atuais.length} sugestão(ões) existente(s) centralizada(s) para o administrador.`);
      }
    } catch (error) {
      inicializacaoAutomaticaFasesTentada = false;
      console.error("Erro ao criar lista inicial de sugestões de fases.", error);
    }
  }

  function iniciarSnapshotConfiguracaoFases() {
    if (!contextoFirebaseFases) return;
    if (unsubscribeConfiguracaoFases) {
      unsubscribeConfiguracaoFases();
      unsubscribeConfiguracaoFases = null;
    }

    const { firestore, db } = contextoFirebaseFases;
    const referencia = firestore.doc(db, FASES_CONFIG_COLECAO, FASES_CONFIG_DOCUMENTO);
    unsubscribeConfiguracaoFases = firestore.onSnapshot(
      referencia,
      snapshot => {
        configuracaoFasesExiste = snapshot.exists();
        fasesGerenciadas = ordenarFasesGerenciadas(
          configuracaoFasesExiste ? snapshot.data()?.sugestoes : opcoesAtuaisDoDatalistFases()
        );
        aplicarListaOficialNoDatalist();
        criarPainelAdminFases();
        criarListaInicialFasesSeNecessario();
      },
      error => {
        console.error("Erro ao carregar sugestões centralizadas de fases.", error);
      }
    );
  }

  async function configurarUsuarioGestaoFases(user) {
    if (!user || !contextoFirebaseFases) {
      usuarioEhAdminFases = false;
      contextoFirebaseFases = contextoFirebaseFases
        ? { ...contextoFirebaseFases, user: null, perfil: null }
        : null;
      document.getElementById("painelSugestoesFasesAdmin")?.remove();
      if (unsubscribeConfiguracaoFases) {
        unsubscribeConfiguracaoFases();
        unsubscribeConfiguracaoFases = null;
      }
      return;
    }

    const { firestore, db } = contextoFirebaseFases;
    try {
      const perfilSnapshot = await firestore.getDoc(firestore.doc(db, "usuarios", user.uid));
      const perfil = perfilSnapshot.exists() ? perfilSnapshot.data() : {};
      usuarioEhAdminFases = perfil?.tipo === "admin" && perfil?.ativo !== false;
      contextoFirebaseFases = { ...contextoFirebaseFases, user, perfil };
      iniciarSnapshotConfiguracaoFases();
      criarPainelAdminFases();
    } catch (error) {
      usuarioEhAdminFases = false;
      console.error("Não foi possível validar o administrador das sugestões de fases.", error);
    }
  }

  async function conectarFirebaseGestaoFases(tentativa = 0) {
    if (contextoFirebaseFases?.auth) return;

    try {
      const [firebaseApp, firestore, firebaseAuth] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js")
      ]);

      const apps = firebaseApp.getApps();
      if (!apps.length) throw new Error("Firebase ainda não inicializado.");

      const appAtual = firebaseApp.getApp();
      const auth = firebaseAuth.getAuth(appAtual);
      const db = firestore.getFirestore(appAtual);
      contextoFirebaseFases = { firestore, firebaseAuth, auth, db, user: null, perfil: null };

      if (unsubscribeAuthFases) unsubscribeAuthFases();
      unsubscribeAuthFases = firebaseAuth.onAuthStateChanged(auth, configurarUsuarioGestaoFases);
    } catch (error) {
      if (tentativa < 20) {
        setTimeout(() => conectarFirebaseGestaoFases(tentativa + 1), 300);
        return;
      }
      console.error("Não foi possível iniciar a gestão das sugestões de fases.", error);
    }
  }

  function iniciarGestaoSugestoesFases() {
    injetarEstiloSemBotaoMaisFase();
    instalarBloqueioCliqueMaisFase();
    removerPainelTemporarioNecessidade();
    removerBotoesMaisDasFases();
    iniciarObservadorSugestoesFases();
    conectarFirebaseGestaoFases();
  }


  // =========================================================
  // HOTFIX: SETA DOS CAMPOS COM SUGESTÕES NO MANEJO
  // - Ao clicar na seta de um campo com datalist, limpa o valor atual.
  // - Abre imediatamente todas as sugestões disponíveis.
  // - Vale para os filtros do Manejo e para os campos de Fase.
  // - A digitação normal no restante do campo continua inalterada.
  // =========================================================

  let eventosSetaListasManejoInstalados = false;
  const AREA_SETA_LISTA_MANEJO_PX = 46;

  function campoComListaPertenceAoManejo(input) {
    if (!(input instanceof HTMLInputElement) || !input.hasAttribute("list")) return false;
    const areaManejo = document.getElementById("manejo");
    if (areaManejo?.contains(input)) return true;

    const identificacao = `${input.id || ""} ${input.name || ""} ${input.className || ""}`;
    return /manejo|fase/i.test(identificacao);
  }

  function existeListaDoCampo(input) {
    const idLista = input.getAttribute("list");
    return Boolean(idLista && document.getElementById(idLista));
  }

  function cliqueNaAreaDaSeta(input, event) {
    const retangulo = input.getBoundingClientRect();
    if (!retangulo.width) return false;

    const direcao = window.getComputedStyle(input).direction;
    if (direcao === "rtl") {
      return event.clientX <= retangulo.left + AREA_SETA_LISTA_MANEJO_PX;
    }
    return event.clientX >= retangulo.right - AREA_SETA_LISTA_MANEJO_PX;
  }

  function campoEhFiltroDoManejo(input) {
    if (input.closest("thead, .filters, .filtros, .filter-row, .filtros-manejo")) return true;
    const identificacao = `${input.id || ""} ${input.name || ""} ${input.className || ""}`;
    return /filtro|filter/i.test(identificacao);
  }

  function limparCampoAntesDeAbrirSugestoes(input) {
    if (!input.value) return;

    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    // Alguns filtros antigos escutam apenas o evento change.
    // Nos campos de fase não o disparamos para evitar qualquer salvamento antecipado.
    if (campoEhFiltroDoManejo(input)) {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function abrirListaDeSugestoes(input, event) {
    input.focus({ preventScroll: true });

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        // Só bloqueia a abertura nativa depois que o picker programático abriu com sucesso.
        event?.preventDefault?.();
        return;
      } catch (error) {
        console.debug("O navegador usará a abertura nativa da lista.", error);
      }
    }

    // Fallback para navegadores que não disponibilizam showPicker em campos com datalist.
    // Sem preventDefault, o clique nativo na seta continua abrindo a lista já limpa.
    setTimeout(() => {
      try {
        input.focus({ preventScroll: true });
        input.showPicker?.();
      } catch (_) {}
    }, 0);
  }

  function tratarCliqueNaSetaDoManejo(event) {
    const input = event.target?.closest?.('input[list]');
    if (!input) return;
    if (!campoComListaPertenceAoManejo(input)) return;
    if (!existeListaDoCampo(input)) return;
    if (input.disabled || input.readOnly) return;
    if (!cliqueNaAreaDaSeta(input, event)) return;

    limparCampoAntesDeAbrirSugestoes(input);
    abrirListaDeSugestoes(input, event);
  }

  function tratarAtalhoDeAberturaDaLista(event) {
    const input = event.target?.closest?.('input[list]');
    if (!input || !campoComListaPertenceAoManejo(input) || !existeListaDoCampo(input)) return;

    const pediuAbrirLista =
      (event.altKey && event.key === "ArrowDown") ||
      event.key === "F4";
    if (!pediuAbrirLista) return;

    event.preventDefault();
    limparCampoAntesDeAbrirSugestoes(input);
    abrirListaDeSugestoes(input, event);
  }

  function iniciarSetasListasManejo() {
    if (eventosSetaListasManejoInstalados) return;
    eventosSetaListasManejoInstalados = true;

    // Captura antes dos eventos do app.js para que o valor antigo não limite o datalist.
    document.addEventListener("pointerdown", tratarCliqueNaSetaDoManejo, true);
    document.addEventListener("keydown", tratarAtalhoDeAberturaDaLista, true);
  }


  // =========================================================
  // IMPORTAÇÃO SEGURA: NOVA TABELA DE VALORES DA PRODUÇÃO
  // - Lê valores-processos-corponu-2026.json.
  // - Adiciona somente combinações REF + PROCESSO + SETOR ausentes.
  // - Nunca sobrescreve valores já cadastrados, inclusive ENCAPAR BOJO.
  // - Ignora referências sem preço informado e exibe um resumo.
  // - Execução manual e exclusiva do administrador.
  // =========================================================

  const ARQUIVO_VALORES_PROCESSOS = "valores-processos-corponu-2026.json";
  const ID_PAINEL_IMPORTACAO_VALORES = "painelImportacaoTabelaValoresCorpoNu";
  const ID_BOTAO_IMPORTACAO_VALORES = "btnImportarTabelaValoresCorpoNu";
  let contextoImportacaoValores = null;
  let usuarioEhAdminImportacaoValores = false;
  let unsubscribeAuthImportacaoValores = null;
  let tabelaValoresPlanilhaCache = null;
  let importacaoTabelaValoresEmAndamento = false;

  const ALIASES_PROCESSO_IMPORTACAO = Object.freeze({
    "CALCINHA PRONTA": "CALCINHA COMPLETA",
    "CALCINHA COMPLETA": "CALCINHA COMPLETA",
    "MONTAGEM CALCINHA": "CALCINHA MONTAGEM",
    "CALCINHA MONTAGEM": "CALCINHA MONTAGEM",
    "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
    "SUTIÃ MONTAGEM": "SUTIÃ MONTAGEM",
    "BOJO ENCAPADO": "ENCAPAR BOJO",
    "ENCAPAR BOJO": "ENCAPAR BOJO",
    "ENCAPAR BOJOS": "ENCAPAR BOJO"
  });

  function processoCanonicoImportacaoValores(valor) {
    const chave = normalizarComparacao(valor);
    return ALIASES_PROCESSO_IMPORTACAO[chave] || String(valor || "").trim().toUpperCase();
  }

  function referenciaCanonicaImportacaoValores(valor) {
    return String(valor || "").trim().toUpperCase();
  }

  function setorCanonicoImportacaoValores(valor, processo = "") {
    const informado = String(valor || "").trim().toLowerCase();
    if (informado) return informado;

    const processoCanonico = processoCanonicoImportacaoValores(processo);
    if (processoCanonico === "ENCAPAR BOJO") return "bojo";
    if (processoCanonico.includes("CALCINHA")) return "calcinha";
    if (processoCanonico.includes("SUTIÃ")) return "sutia";
    return "bojo";
  }

  function labelSetorImportacaoValores(setor) {
    const mapa = {
      bojo: "Bojo",
      alca: "Alça",
      renda: "Renda",
      sutia: "Sutiã",
      calcinha: "Calcinha"
    };
    return mapa[String(setor || "").toLowerCase()] || String(setor || "");
  }

  function chaveRegistroImportacaoValores(referencia, processo, setor) {
    return [
      referenciaCanonicaImportacaoValores(referencia),
      processoCanonicoImportacaoValores(processo),
      setorCanonicoImportacaoValores(setor, processo)
    ].join("__");
  }

  function docIdSeguroImportacaoValores(valor) {
    return String(valor || "")
      .trim()
      .replaceAll("/", "-")
      .replaceAll("\\", "-")
      .replaceAll("#", "-")
      .replaceAll("?", "-");
  }

  async function carregarTabelaValoresPlanilha(forcar = false) {
    if (tabelaValoresPlanilhaCache && !forcar) return tabelaValoresPlanilhaCache;

    const response = await fetch(
      `${ARQUIVO_VALORES_PROCESSOS}?v=${encodeURIComponent(APP_VERSION)}&ts=${Date.now()}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(`Não foi possível abrir ${ARQUIVO_VALORES_PROCESSOS} (HTTP ${response.status}).`);
    }

    const dados = await response.json();
    if (!Array.isArray(dados?.processos)) {
      throw new Error("O arquivo da tabela de valores está inválido.");
    }

    tabelaValoresPlanilhaCache = dados;
    return dados;
  }

  function totalRegistrosTabelaValores(dados) {
    return (dados?.processos || []).reduce(
      (total, grupo) => total + (Array.isArray(grupo?.valores) ? grupo.valores.length : 0),
      0
    );
  }

  function criarResumoProcessosTabelaValores(dados) {
    return (dados?.processos || []).map(grupo => {
      const total = Array.isArray(grupo?.valores) ? grupo.valores.length : 0;
      return `${grupo.processo}: ${total}`;
    }).join(" • ");
  }

  function atualizarStatusPainelImportacaoValores(mensagem, tipo = "normal") {
    const status = document.getElementById("statusImportacaoTabelaValoresCorpoNu");
    if (!status) return;

    status.textContent = mensagem;
    status.style.color = tipo === "erro"
      ? "#b91c1c"
      : tipo === "sucesso"
        ? "#166534"
        : "#475569";
  }

  async function criarPainelImportacaoValores() {
    const existente = document.getElementById(ID_PAINEL_IMPORTACAO_VALORES);

    if (!usuarioEhAdminImportacaoValores) {
      existente?.remove();
      return;
    }

    const alvo = document.querySelector("#painelGerenciarValores .importar-valores-box");
    if (!alvo) {
      setTimeout(criarPainelImportacaoValores, 500);
      return;
    }

    if (existente) return;

    const painel = document.createElement("div");
    painel.id = ID_PAINEL_IMPORTACAO_VALORES;
    painel.style.border = "2px solid #16a34a";
    painel.style.borderRadius = "14px";
    painel.style.padding = "16px";
    painel.style.marginBottom = "16px";
    painel.style.background = "#f0fdf4";
    painel.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;">
        <div style="min-width:240px;flex:1;">
          <strong style="display:block;font-size:16px;color:#14532d;">Importar nova tabela de valores</strong>
          <span style="display:block;margin-top:5px;color:#475569;line-height:1.45;">
            Importa Montagem Calcinha, Sutiã Montagem, Calcinha Completa e Encapar Bojo.
            <strong>Nenhum valor já existente será alterado.</strong>
          </span>
          <small id="resumoImportacaoTabelaValoresCorpoNu" style="display:block;margin-top:7px;color:#64748b;">
            Conferindo arquivo da planilha...
          </small>
          <small id="statusImportacaoTabelaValoresCorpoNu" style="display:block;margin-top:7px;color:#475569;"></small>
        </div>
        <button class="btn btn-success" id="${ID_BOTAO_IMPORTACAO_VALORES}" type="button">
          Importar valores ausentes
        </button>
      </div>
    `;

    alvo.prepend(painel);
    document.getElementById(ID_BOTAO_IMPORTACAO_VALORES)
      ?.addEventListener("click", importarTabelaValoresCorpoNu);

    try {
      const dados = await carregarTabelaValoresPlanilha();
      const total = totalRegistrosTabelaValores(dados);
      const pendentes = Array.isArray(dados?.pendentesSemValor) ? dados.pendentesSemValor.length : 0;
      const resumo = document.getElementById("resumoImportacaoTabelaValoresCorpoNu");
      if (resumo) {
        resumo.textContent =
          `${total} valores válidos • ${criarResumoProcessosTabelaValores(dados)}`
          + (pendentes ? ` • ${pendentes} referência(s) sem preço serão ignoradas.` : "");
      }
    } catch (error) {
      console.error("Erro ao preparar tabela de valores.", error);
      atualizarStatusPainelImportacaoValores(
        "Não foi possível abrir o arquivo de valores. Confirme se ele foi enviado ao GitHub.",
        "erro"
      );
    }
  }

  async function registrarLogImportacaoTabelaValores(resumo) {
    if (!contextoImportacaoValores?.user) return;

    const { firestore, db, user } = contextoImportacaoValores;
    try {
      await firestore.addDoc(firestore.collection(db, "logsAlteracoes"), {
        acao: "precos_referencia_importados_sem_sobrescrever",
        entidade: "precosReferencia",
        entidadeId: "importacao-planilha-valores-2026",
        detalhes: resumo,
        usuarioUid: user.uid,
        usuarioId: user.uid,
        usuarioEmail: user.email || "",
        versao: APP_VERSION,
        criadoEm: firestore.serverTimestamp()
      });
    } catch (error) {
      console.warn("Valores importados, mas não foi possível registrar o log.", error);
    }
  }

  async function importarTabelaValoresCorpoNu() {
    if (importacaoTabelaValoresEmAndamento) return;

    if (!usuarioEhAdminImportacaoValores || !contextoImportacaoValores?.user) {
      mostrarAvisoFormulario("Somente o administrador pode importar a tabela de valores.");
      return;
    }

    const botao = document.getElementById(ID_BOTAO_IMPORTACAO_VALORES);
    const textoOriginal = botao?.textContent || "Importar valores ausentes";

    try {
      const dados = await carregarTabelaValoresPlanilha(true);
      const totalPlanilha = totalRegistrosTabelaValores(dados);
      const confirmacao = window.confirm(
        `Importar ${totalPlanilha} valores da nova tabela?\n\n`
        + "Segurança desta importação:\n"
        + "• adiciona somente valores que ainda não existem;\n"
        + "• não altera nenhum valor já cadastrado;\n"
        + "• os valores atuais de ENCAPAR BOJO serão preservados;\n"
        + "• referências sem preço serão ignoradas."
      );
      if (!confirmacao) return;

      importacaoTabelaValoresEmAndamento = true;
      if (botao) {
        botao.disabled = true;
        botao.textContent = "Conferindo valores...";
      }
      atualizarStatusPainelImportacaoValores("Lendo valores já cadastrados no Firebase...");

      const { firestore, db, user } = contextoImportacaoValores;
      const snapshot = await firestore.getDocs(
        firestore.collection(db, "precosReferencia")
      );

      const chavesExistentes = new Set();
      const referenciasProcessosExistentes = new Set();
      const idsExistentes = new Set();

      snapshot.docs.forEach(documento => {
        idsExistentes.add(documento.id);
        const valor = documento.data() || {};
        const referencia = referenciaCanonicaImportacaoValores(valor.referencia);
        const processo = processoCanonicoImportacaoValores(valor.processo);
        chavesExistentes.add(
          chaveRegistroImportacaoValores(referencia, processo, valor.setor)
        );
        if (referencia && processo) {
          referenciasProcessosExistentes.add(`${referencia}__${processo}`);
        }
      });

      const candidatos = [];
      const porProcesso = {};

      (dados.processos || []).forEach(grupo => {
        const processo = processoCanonicoImportacaoValores(grupo.processo);
        const setor = setorCanonicoImportacaoValores(grupo.setor, processo);
        porProcesso[processo] = porProcesso[processo] || { adicionados: 0, preservados: 0 };

        (grupo.valores || []).forEach(registro => {
          const referencia = referenciaCanonicaImportacaoValores(registro.referencia);
          const valor = Number(registro.valor || 0);
          if (!referencia || !Number.isFinite(valor) || valor <= 0) return;

          const chave = chaveRegistroImportacaoValores(referencia, processo, setor);
          const id = docIdSeguroImportacaoValores(`${referencia}-${setor}-${processo}`);

          const chaveReferenciaProcesso = `${referencia}__${processo}`;
          if (
            chavesExistentes.has(chave) ||
            referenciasProcessosExistentes.has(chaveReferenciaProcesso) ||
            idsExistentes.has(id)
          ) {
            porProcesso[processo].preservados += 1;
            return;
          }

          chavesExistentes.add(chave);
          referenciasProcessosExistentes.add(chaveReferenciaProcesso);
          idsExistentes.add(id);
          candidatos.push({
            id,
            referencia,
            processo,
            setor,
            setorLabel: grupo.setorLabel || labelSetorImportacaoValores(setor),
            valor
          });
          porProcesso[processo].adicionados += 1;
        });
      });

      if (botao) botao.textContent = "Salvando valores...";
      atualizarStatusPainelImportacaoValores(
        `${candidatos.length} valor(es) novo(s) serão adicionados; os existentes permanecerão intactos.`
      );

      let batch = firestore.writeBatch(db);
      let noLote = 0;
      let totalAdicionado = 0;

      for (const item of candidatos) {
        batch.set(
          firestore.doc(db, "precosReferencia", item.id),
          {
            referencia: item.referencia,
            processo: item.processo,
            setor: item.setor,
            setorLabel: item.setorLabel,
            valor: item.valor,
            ativo: true,
            origemImportacao: "Pasta1 (1)(1).xlsx",
            versaoImportacao: APP_VERSION,
            criadoPor: user.uid,
            criadoEm: firestore.serverTimestamp(),
            atualizadoPor: user.uid,
            atualizadoEm: firestore.serverTimestamp()
          },
          { merge: false }
        );

        noLote += 1;
        totalAdicionado += 1;

        if (noLote >= 400) {
          await batch.commit();
          batch = firestore.writeBatch(db);
          noLote = 0;
        }
      }

      if (noLote > 0) await batch.commit();

      const totalPreservado = Object.values(porProcesso)
        .reduce((total, item) => total + Number(item.preservados || 0), 0);
      const semValor = Array.isArray(dados.pendentesSemValor)
        ? dados.pendentesSemValor
        : [];

      const resumoProcessos = Object.entries(porProcesso)
        .map(([processo, item]) =>
          `${processo}: ${item.adicionados} novo(s), ${item.preservados} preservado(s)`
        )
        .join(" | ");

      await registrarLogImportacaoTabelaValores(
        `${totalAdicionado} adicionados | ${totalPreservado} preservados | `
        + `${semValor.length} sem preço | ${resumoProcessos}`
      );

      atualizarStatusPainelImportacaoValores(
        `${totalAdicionado} valor(es) adicionados, ${totalPreservado} preservados e `
        + `${semValor.length} sem preço ignorados. ${resumoProcessos}`,
        "sucesso"
      );

      showUpdateToast(
        totalAdicionado
          ? `${totalAdicionado} novos valores importados. Nenhum valor existente foi alterado.`
          : "A tabela já estava cadastrada. Nenhum valor existente foi alterado."
      );

      setTimeout(() => {
        document.getElementById("btnAtualizarServidor")?.click();
      }, 500);
    } catch (error) {
      console.error("Erro ao importar tabela de valores.", error);
      atualizarStatusPainelImportacaoValores(
        `Erro ao importar: ${error?.message || "falha desconhecida"}`,
        "erro"
      );
      mostrarAvisoFormulario(
        "Não foi possível importar os valores. Confira os arquivos, a internet e a permissão de administrador."
      );
    } finally {
      importacaoTabelaValoresEmAndamento = false;
      if (botao) {
        botao.disabled = false;
        botao.textContent = textoOriginal;
      }
    }
  }

  async function configurarUsuarioImportacaoValores(user) {
    if (!contextoImportacaoValores) return;

    if (!user) {
      usuarioEhAdminImportacaoValores = false;
      contextoImportacaoValores = { ...contextoImportacaoValores, user: null, perfil: null };
      document.getElementById(ID_PAINEL_IMPORTACAO_VALORES)?.remove();
      return;
    }

    const { firestore, db } = contextoImportacaoValores;
    try {
      const perfilSnapshot = await firestore.getDoc(
        firestore.doc(db, "usuarios", user.uid)
      );
      const perfil = perfilSnapshot.exists() ? perfilSnapshot.data() : {};
      usuarioEhAdminImportacaoValores = perfil?.tipo === "admin" && perfil?.ativo !== false;
      contextoImportacaoValores = { ...contextoImportacaoValores, user, perfil };
      criarPainelImportacaoValores();
    } catch (error) {
      usuarioEhAdminImportacaoValores = false;
      console.error("Não foi possível validar o administrador para importar valores.", error);
    }
  }

  async function conectarFirebaseImportacaoValores(tentativa = 0) {
    if (contextoImportacaoValores?.auth) return;

    try {
      const [firebaseApp, firestore, firebaseAuth] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js")
      ]);

      if (!firebaseApp.getApps().length) {
        throw new Error("Firebase ainda não inicializado.");
      }

      const appAtual = firebaseApp.getApp();
      const auth = firebaseAuth.getAuth(appAtual);
      const db = firestore.getFirestore(appAtual);
      contextoImportacaoValores = {
        firestore,
        firebaseAuth,
        auth,
        db,
        user: null,
        perfil: null
      };

      if (unsubscribeAuthImportacaoValores) unsubscribeAuthImportacaoValores();
      unsubscribeAuthImportacaoValores = firebaseAuth.onAuthStateChanged(
        auth,
        configurarUsuarioImportacaoValores
      );
    } catch (error) {
      if (tentativa < 20) {
        setTimeout(() => conectarFirebaseImportacaoValores(tentativa + 1), 300);
        return;
      }
      console.error("Não foi possível iniciar a importação da tabela de valores.", error);
    }
  }

  function iniciarImportacaoValoresPlanilha() {
    conectarFirebaseImportacaoValores();
    criarPainelImportacaoValores();
  }

  window.importarTabelaValoresCorpoNu = importarTabelaValoresCorpoNu;

  // =========================================================
  // MOVIMENTAÇÕES REGISTRADAS PELO USUÁRIO — ABA FACÇÕES
  // - Botão próprio na aba Facções.
  // - Cada usuário visualiza somente as chegadas que registrou.
  // - Permite corrigir chegada e recalcular o pagamento pendente.
  // - Permite desfazer/excluir a chegada e remover o pagamento pendente.
  // - Pagamentos já pagos ficam bloqueados e exigem o administrador.
  // =========================================================

  const ID_PAINEL_MOV_USUARIO = "painelMovimentacoesRegistradasUsuario";
  const ID_MODAL_MOV_USUARIO = "modalEditarMovimentacaoUsuario";
  const ID_ESTILO_MOV_USUARIO = "estiloMovimentacoesRegistradasUsuario";
  let contextoMovUsuario = null;
  let unsubscribeAuthMovUsuario = null;
  let movimentosRegistradosUsuario = [];
  let pagamentosMovUsuario = [];
  let painelMovUsuarioAberto = false;
  let carregandoMovUsuario = false;
  let movimentoEmEdicaoUsuario = null;

  function escapeHtmlMovUsuario(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizarTextoMovUsuario(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function normalizarReferenciaMovUsuario(valor) {
    return String(valor || "").trim().replace(/\.0+$/, "").toUpperCase();
  }

  function docIdSeguroMovUsuario(valor) {
    return normalizarTextoMovUsuario(valor)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 180) || `registro-${Date.now()}`;
  }

  function numeroSeguroMovUsuario(valor, padrao = 0) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : padrao;
  }

  function formatarMoedaMovUsuario(valor) {
    return numeroSeguroMovUsuario(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function dataBRMovUsuario(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "-";
    const partes = texto.slice(0, 10).split("-");
    if (partes.length !== 3) return texto;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function timestampMovUsuario(valor) {
    if (!valor) return 0;
    if (typeof valor.toMillis === "function") return valor.toMillis();
    if (typeof valor.seconds === "number") return valor.seconds * 1000;
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? 0 : data.getTime();
  }

  function movimentoManualUsuario(mov) {
    return Boolean(mov?.origemManual || mov?.origem === "chegada_manual_faccao");
  }

  function movimentoPertenceAoUsuario(mov, uid) {
    if (!mov || !uid || !mov.dataChegada || mov.excluido === true) return false;
    if (mov.tipoDestino !== "faccao") return false;
    const proprietarioExplicito = [
      mov.chegadaRegistradaPor,
      mov.chegadaPor,
      mov.retornoRegistradoPor
    ].some(valor => String(valor || "") === uid);
    const manualDoUsuario = movimentoManualUsuario(mov) && String(mov.criadoPor || "") === uid;
    const pagamentoDoUsuario = pagamentosMovUsuario.some(item =>
      String(item.movimentacaoId || "") === String(mov.id || "") &&
      String(item.criadoPor || "") === uid
    );
    const legadoAindaRetornado =
      String(mov.atualizadoPor || "") === uid &&
      String(mov.status || "retornou") === "retornou" &&
      mov.bipado !== true &&
      mov.encaminhado !== true;
    return proprietarioExplicito || manualDoUsuario || pagamentoDoUsuario || legadoAindaRetornado;
  }

  function pagamentosDaMovimentacaoUsuario(movId) {
    return pagamentosMovUsuario.filter(item => String(item.movimentacaoId || "") === String(movId || ""));
  }

  function pagamentoPagoDaMovimentacao(movId) {
    return pagamentosDaMovimentacaoUsuario(movId)
      .some(item => String(item.statusPagamento || "pendente") === "pago");
  }

  function resumoPagamentoMovUsuario(movId) {
    const itens = pagamentosDaMovimentacaoUsuario(movId);
    if (!itens.length) return { label: "Não gerado", classe: "warning", total: 0, pago: false };
    const pago = itens.some(item => String(item.statusPagamento || "") === "pago");
    const semValor = itens.some(item => String(item.statusPagamento || "") === "sem_valor" || item.valorPendente === true);
    const total = itens.reduce((soma, item) => soma + numeroSeguroMovUsuario(item.total), 0);
    if (pago) return { label: `Pago — ${formatarMoedaMovUsuario(total)}`, classe: "ok", total, pago: true };
    if (semValor) return { label: "Pendente de valor", classe: "warning", total, pago: false };
    return { label: `Pendente — ${formatarMoedaMovUsuario(total)}`, classe: "info", total, pago: false };
  }

  function injetarEstiloMovUsuario() {
    if (document.getElementById(ID_ESTILO_MOV_USUARIO)) return;
    const style = document.createElement("style");
    style.id = ID_ESTILO_MOV_USUARIO;
    style.textContent = `
      #${ID_PAINEL_MOV_USUARIO} {
        margin: 14px 0 18px;
        border: 1px solid #cbd5e1;
        border-radius: 16px;
        background: #f8fafc;
        overflow: hidden;
      }
      #${ID_PAINEL_MOV_USUARIO}.hidden { display: none !important; }
      #${ID_PAINEL_MOV_USUARIO} .mov-usuario-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        border-bottom: 1px solid #e2e8f0;
        background: #ffffff;
      }
      #${ID_PAINEL_MOV_USUARIO} .mov-usuario-header h3 { margin: 0 0 3px; }
      #${ID_PAINEL_MOV_USUARIO} .mov-usuario-header p { margin: 0; color: #64748b; font-size: 13px; }
      #${ID_PAINEL_MOV_USUARIO} .mov-usuario-toolbar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        padding: 12px 16px;
      }
      #${ID_PAINEL_MOV_USUARIO} .mov-usuario-toolbar input { min-width: 240px; flex: 1; }
      #${ID_PAINEL_MOV_USUARIO} .mov-usuario-resumo {
        padding: 0 16px 12px;
        font-size: 12px;
        color: #475569;
      }
      #${ID_PAINEL_MOV_USUARIO} .table-wrap { margin: 0 16px 16px; background: #fff; }
      #${ID_PAINEL_MOV_USUARIO} .badge.warning,
      #${ID_MODAL_MOV_USUARIO} .badge.warning { background: #fef3c7; color: #92400e; }
      #${ID_PAINEL_MOV_USUARIO} .badge.info,
      #${ID_MODAL_MOV_USUARIO} .badge.info { background: #dbeafe; color: #1e40af; }
      #${ID_PAINEL_MOV_USUARIO} .badge.ok,
      #${ID_MODAL_MOV_USUARIO} .badge.ok { background: #dcfce7; color: #166534; }
      #${ID_MODAL_MOV_USUARIO} .mov-usuario-readonly {
        background: #f1f5f9 !important;
        color: #475569 !important;
      }
      #${ID_MODAL_MOV_USUARIO} .mov-usuario-alerta {
        padding: 10px 12px;
        border-radius: 10px;
        background: #fff7ed;
        color: #9a3412;
        font-size: 12px;
        margin-bottom: 10px;
      }
      @media (max-width: 760px) {
        #${ID_PAINEL_MOV_USUARIO} .mov-usuario-header { align-items: flex-start; flex-direction: column; }
        #${ID_PAINEL_MOV_USUARIO} .mov-usuario-toolbar input { min-width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function criarBotaoMovUsuario() {
    if (document.getElementById("btnMovimentacoesRegistradasUsuario")) return;
    const btnChegada = document.getElementById("btnAbrirChegadaManualFaccao");
    const actions = btnChegada?.parentElement;
    if (!actions) {
      setTimeout(criarBotaoMovUsuario, 400);
      return;
    }
    const botao = document.createElement("button");
    botao.id = "btnMovimentacoesRegistradasUsuario";
    botao.type = "button";
    botao.className = "btn btn-primary";
    botao.textContent = "Movimentações registradas";
    botao.addEventListener("click", alternarPainelMovUsuario);
    btnChegada.insertAdjacentElement("afterend", botao);
  }

  function criarPainelMovUsuario() {
    if (document.getElementById(ID_PAINEL_MOV_USUARIO)) return;
    const cards = document.querySelector("#faccoes .faccoes-cards");
    if (!cards) {
      setTimeout(criarPainelMovUsuario, 400);
      return;
    }
    const painel = document.createElement("div");
    painel.id = ID_PAINEL_MOV_USUARIO;
    painel.className = "hidden";
    painel.innerHTML = `
      <div class="mov-usuario-header">
        <div>
          <h3>Movimentações registradas por mim</h3>
          <p>Consulte, corrija ou desfaça somente as chegadas registradas pelo seu usuário.</p>
        </div>
        <button id="btnFecharMovimentacoesUsuario" class="btn" type="button">Fechar</button>
      </div>
      <div class="mov-usuario-toolbar">
        <input id="buscaMovimentacoesUsuario" class="search" type="text" placeholder="Buscar OP, referência, facção ou processo..." />
        <button id="btnAtualizarMovimentacoesUsuario" class="btn" type="button">Atualizar lista</button>
      </div>
      <div id="resumoMovimentacoesUsuario" class="mov-usuario-resumo">Abra a lista para carregar seus registros.</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>OP</th>
              <th>REF</th>
              <th>Facção</th>
              <th>Processo</th>
              <th>Qtd. recebida</th>
              <th>Chegada</th>
              <th>Pagamento</th>
              <th>Tipo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="listaMovimentacoesUsuario">
            <tr><td colspan="9" class="empty">Clique em “Movimentações registradas” para carregar.</td></tr>
          </tbody>
        </table>
      </div>
    `;
    cards.insertAdjacentElement("afterend", painel);
    painel.querySelector("#btnFecharMovimentacoesUsuario")?.addEventListener("click", fecharPainelMovUsuario);
    painel.querySelector("#btnAtualizarMovimentacoesUsuario")?.addEventListener("click", carregarMovimentacoesUsuario);
    painel.querySelector("#buscaMovimentacoesUsuario")?.addEventListener("input", renderMovimentacoesUsuario);
    painel.querySelector("#listaMovimentacoesUsuario")?.addEventListener("click", event => {
      const editar = event.target.closest("[data-editar-mov-usuario]");
      if (editar) abrirModalEditarMovUsuario(editar.dataset.editarMovUsuario);
      const excluir = event.target.closest("[data-excluir-mov-usuario]");
      if (excluir) excluirChegadaMovUsuario(excluir.dataset.excluirMovUsuario);
    });
  }

  function criarModalMovUsuario() {
    if (document.getElementById(ID_MODAL_MOV_USUARIO)) return;
    const modal = document.createElement("div");
    modal.id = ID_MODAL_MOV_USUARIO;
    modal.className = "modal-backdrop hidden";
    modal.innerHTML = `
      <div class="modal-card chegada-modal-card" style="max-width:820px;">
        <div class="modal-header">
          <div>
            <h3>Editar chegada registrada</h3>
            <p>Ao salvar, o pagamento pendente será recalculado automaticamente.</p>
          </div>
          <button id="btnFecharModalMovUsuario" class="modal-close" type="button">×</button>
        </div>
        <form id="formEditarMovUsuario" class="form movimentacao-form">
          <input id="editarMovUsuarioId" type="hidden" />
          <div id="alertaEditarMovUsuario" class="mov-usuario-alerta hidden"></div>
          <div class="form-grid three">
            <label>OP<input id="editarMovUsuarioOP" type="text" required /></label>
            <label>Referência<input id="editarMovUsuarioRef" type="text" required /></label>
            <label>Cor<input id="editarMovUsuarioCor" type="text" required /></label>
          </div>
          <div class="form-grid two">
            <label>Processo<input id="editarMovUsuarioProcesso" type="text" required /></label>
            <label>Facção<input id="editarMovUsuarioFaccao" type="text" required /></label>
          </div>
          <div class="form-grid three">
            <label>Data de envio<input id="editarMovUsuarioDataEnvio" type="date" /></label>
            <label>Data de chegada<input id="editarMovUsuarioDataChegada" type="date" required /></label>
            <label>Quantidade recebida<input id="editarMovUsuarioQuantidade" type="number" min="1" step="1" required /></label>
          </div>
          <label>Desconto por defeito (R$)<input id="editarMovUsuarioDefeito" type="number" min="0" step="0.01" value="0" /></label>
          <label>Observação da chegada<textarea id="editarMovUsuarioObs" rows="2" placeholder="Opcional"></textarea></label>
          <div id="resumoPagamentoEditarMovUsuario" class="notice small"></div>
          <div class="actions">
            <button id="btnSalvarEditarMovUsuario" class="btn btn-primary" type="submit">Salvar correção</button>
            <button id="btnCancelarEditarMovUsuario" class="btn" type="button">Cancelar</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("#btnFecharModalMovUsuario")?.addEventListener("click", fecharModalEditarMovUsuario);
    modal.querySelector("#btnCancelarEditarMovUsuario")?.addEventListener("click", fecharModalEditarMovUsuario);
    modal.querySelector("#formEditarMovUsuario")?.addEventListener("submit", salvarEdicaoMovUsuario);
    modal.addEventListener("click", event => {
      if (event.target === modal) fecharModalEditarMovUsuario();
    });
  }

  async function alternarPainelMovUsuario() {
    criarPainelMovUsuario();
    const painel = document.getElementById(ID_PAINEL_MOV_USUARIO);
    if (!painel) return;
    painelMovUsuarioAberto = painel.classList.contains("hidden");
    painel.classList.toggle("hidden", !painelMovUsuarioAberto);
    const botao = document.getElementById("btnMovimentacoesRegistradasUsuario");
    if (botao) botao.textContent = painelMovUsuarioAberto ? "Ocultar movimentações" : "Movimentações registradas";
    if (painelMovUsuarioAberto) await carregarMovimentacoesUsuario();
  }

  function fecharPainelMovUsuario() {
    painelMovUsuarioAberto = false;
    document.getElementById(ID_PAINEL_MOV_USUARIO)?.classList.add("hidden");
    const botao = document.getElementById("btnMovimentacoesRegistradasUsuario");
    if (botao) botao.textContent = "Movimentações registradas";
  }

  async function consultarPorCampoMovUsuario(campo, uid) {
    const { firestore, db } = contextoMovUsuario;
    try {
      return await firestore.getDocs(
        firestore.query(
          firestore.collection(db, "movimentacoesProducao"),
          firestore.where(campo, "==", uid)
        )
      );
    } catch (error) {
      console.warn(`Falha ao consultar movimentações por ${campo}.`, error);
      return null;
    }
  }

  async function carregarPagamentosMovUsuario(uid) {
    const { firestore, db } = contextoMovUsuario;
    const snapshot = await firestore.getDocs(
      firestore.query(
        firestore.collection(db, "entregasPagamento"),
        firestore.where("criadoPor", "==", uid)
      )
    );
    pagamentosMovUsuario = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  }

  async function marcarProprietarioChegadaLegada(movimentos, uid) {
    const candidatos = movimentos.filter(mov =>
      !mov.chegadaRegistradaPor && movimentoPertenceAoUsuario(mov, uid)
    );
    if (!candidatos.length) return;
    const { firestore, db } = contextoMovUsuario;
    let batch = firestore.writeBatch(db);
    let quantidade = 0;
    for (const mov of candidatos) {
      batch.set(firestore.doc(db, "movimentacoesProducao", mov.id), {
        chegadaRegistradaPor: uid,
        chegadaRegistradaEm: mov.atualizadoEm || mov.criadoEm || firestore.serverTimestamp(),
        proprietarioChegadaMigradoEm: firestore.serverTimestamp(),
        proprietarioChegadaMigradoVersao: APP_VERSION
      }, { merge: true });
      quantidade += 1;
      if (quantidade >= 400) {
        await batch.commit();
        batch = firestore.writeBatch(db);
        quantidade = 0;
      }
    }
    if (quantidade) await batch.commit();
    candidatos.forEach(mov => { mov.chegadaRegistradaPor = uid; });
  }

  async function carregarMovimentacoesUsuario() {
    if (!contextoMovUsuario?.user || carregandoMovUsuario) return;
    carregandoMovUsuario = true;
    const tbody = document.getElementById("listaMovimentacoesUsuario");
    const resumo = document.getElementById("resumoMovimentacoesUsuario");
    const botao = document.getElementById("btnAtualizarMovimentacoesUsuario");
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="empty">Carregando suas movimentações...</td></tr>';
    if (resumo) resumo.textContent = "Conferindo movimentações e pagamentos do seu usuário...";
    if (botao) botao.disabled = true;
    try {
      const uid = contextoMovUsuario.user.uid;
      await carregarPagamentosMovUsuario(uid);
      const [porChegada, porAtualizacao, porCriacao] = await Promise.all([
        consultarPorCampoMovUsuario("chegadaRegistradaPor", uid),
        consultarPorCampoMovUsuario("atualizadoPor", uid),
        consultarPorCampoMovUsuario("criadoPor", uid)
      ]);
      const mapa = new Map();
      [porChegada, porAtualizacao, porCriacao].filter(Boolean).forEach(snapshot => {
        snapshot.docs.forEach(item => mapa.set(item.id, { id: item.id, ...item.data() }));
      });
      const idsPagamentos = [...new Set(
        pagamentosMovUsuario.map(item => String(item.movimentacaoId || "")).filter(Boolean)
      )].filter(id => !mapa.has(id));
      if (idsPagamentos.length) {
        const snapshotsPagamentos = await Promise.all(idsPagamentos.map(id =>
          contextoMovUsuario.firestore.getDoc(
            contextoMovUsuario.firestore.doc(contextoMovUsuario.db, "movimentacoesProducao", id)
          ).catch(() => null)
        ));
        snapshotsPagamentos.filter(item => item?.exists?.()).forEach(item => {
          mapa.set(item.id, { id: item.id, ...item.data() });
        });
      }
      movimentosRegistradosUsuario = [...mapa.values()]
        .filter(mov => movimentoPertenceAoUsuario(mov, uid))
        .sort((a, b) => {
          const dataB = String(b.dataChegada || "").localeCompare(String(a.dataChegada || ""));
          return dataB || timestampMovUsuario(b.atualizadoEm || b.criadoEm) - timestampMovUsuario(a.atualizadoEm || a.criadoEm);
        });
      await marcarProprietarioChegadaLegada(movimentosRegistradosUsuario, uid);
      renderMovimentacoesUsuario();
    } catch (error) {
      console.error("Erro ao carregar movimentações registradas pelo usuário.", error);
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="empty">Não foi possível carregar. Publique as regras novas do Firebase e tente novamente.</td></tr>';
      if (resumo) resumo.textContent = "Erro ao consultar movimentações ou pagamentos do usuário.";
    } finally {
      carregandoMovUsuario = false;
      if (botao) botao.disabled = false;
    }
  }

  function renderMovimentacoesUsuario() {
    const tbody = document.getElementById("listaMovimentacoesUsuario");
    const resumo = document.getElementById("resumoMovimentacoesUsuario");
    if (!tbody) return;
    const busca = normalizarTextoMovUsuario(document.getElementById("buscaMovimentacoesUsuario")?.value);
    const filtrados = movimentosRegistradosUsuario.filter(mov => {
      if (!busca) return true;
      return normalizarTextoMovUsuario([
        mov.numeroOP, mov.referencia, mov.cor, mov.destino, mov.processo,
        mov.dataChegada, mov.observacaoChegada, mov.observacoes
      ].join(" ")).includes(busca);
    });
    const totalPecas = filtrados.reduce((soma, mov) => soma + numeroSeguroMovUsuario(mov.quantidadeRecebida || mov.quantidadeEnviada), 0);
    const totalPagamentos = filtrados.reduce((soma, mov) => soma + resumoPagamentoMovUsuario(mov.id).total, 0);
    if (resumo) {
      resumo.innerHTML = `<strong>${filtrados.length}</strong> registro(s) | <strong>${totalPecas.toLocaleString("pt-BR")}</strong> peça(s) | pagamentos exibidos: <strong>${escapeHtmlMovUsuario(formatarMoedaMovUsuario(totalPagamentos))}</strong>`;
    }
    if (!filtrados.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty">Nenhuma chegada registrada por este usuário foi encontrada.</td></tr>';
      return;
    }
    tbody.innerHTML = filtrados.map(mov => {
      const pagamento = resumoPagamentoMovUsuario(mov.id);
      const manual = movimentoManualUsuario(mov);
      const fluxoPosterior = mov.status === "encaminhado" || Boolean(mov.movimentacaoDestinoId);
      const finalizado = mov.status === "finalizado" || mov.bipado === true;
      const bloqueadoExcluir = pagamento.pago || fluxoPosterior || finalizado;
      return `
        <tr>
          <td><strong>${escapeHtmlMovUsuario(mov.numeroOP || "-")}</strong></td>
          <td>${escapeHtmlMovUsuario(mov.referencia || "-")}</td>
          <td><strong>${escapeHtmlMovUsuario(mov.destino || "-")}</strong></td>
          <td>${escapeHtmlMovUsuario(mov.processo || "-")}</td>
          <td><strong>${numeroSeguroMovUsuario(mov.quantidadeRecebida || mov.quantidadeEnviada).toLocaleString("pt-BR")}</strong></td>
          <td>${escapeHtmlMovUsuario(dataBRMovUsuario(mov.dataChegada))}</td>
          <td><span class="badge ${pagamento.classe}">${escapeHtmlMovUsuario(pagamento.label)}</span></td>
          <td><span class="badge ${manual ? "info" : "ok"}">${manual ? "Manual" : "Retorno"}</span></td>
          <td>
            <button class="btn btn-sm" type="button" data-editar-mov-usuario="${escapeHtmlMovUsuario(mov.id)}" ${pagamento.pago || fluxoPosterior ? `disabled title="${pagamento.pago ? "Pagamento já pago" : "A etapa já foi encaminhada"}"` : ""}>Editar</button>
            <button class="btn btn-sm btn-danger" type="button" data-excluir-mov-usuario="${escapeHtmlMovUsuario(mov.id)}" ${bloqueadoExcluir ? `disabled title="${pagamento.pago ? "Pagamento já pago" : fluxoPosterior ? "A etapa já foi encaminhada" : "A movimentação já foi bipada"}"` : ""}>${manual ? "Excluir" : "Desfazer chegada"}</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function definirCampoSomenteLeitura(id, readonly) {
    const campo = document.getElementById(id);
    if (!campo) return;
    campo.readOnly = readonly;
    campo.classList.toggle("mov-usuario-readonly", readonly);
  }

  function abrirModalEditarMovUsuario(id) {
    criarModalMovUsuario();
    const mov = movimentosRegistradosUsuario.find(item => item.id === id);
    if (!mov) {
      mostrarAvisoFormulario("Movimentação não encontrada. Atualize a lista.");
      return;
    }
    const pagamento = resumoPagamentoMovUsuario(id);
    if (pagamento.pago) {
      mostrarAvisoFormulario("Esse pagamento já foi marcado como pago. Peça ao administrador para reabrir antes de corrigir.");
      return;
    }
    if (mov.status === "encaminhado" || mov.movimentacaoDestinoId) {
      mostrarAvisoFormulario("Essa etapa já foi encaminhada para outro local. A correção precisa ser feita pelo administrador para não quebrar o rastreamento.");
      return;
    }
    movimentoEmEdicaoUsuario = mov;
    const manual = movimentoManualUsuario(mov);
    document.getElementById("editarMovUsuarioId").value = mov.id;
    document.getElementById("editarMovUsuarioOP").value = mov.numeroOP || "";
    document.getElementById("editarMovUsuarioRef").value = mov.referencia || "";
    document.getElementById("editarMovUsuarioCor").value = mov.cor || "";
    document.getElementById("editarMovUsuarioProcesso").value = mov.processo || "";
    document.getElementById("editarMovUsuarioFaccao").value = mov.destino || "";
    document.getElementById("editarMovUsuarioDataEnvio").value = mov.dataEnvio || "";
    document.getElementById("editarMovUsuarioDataChegada").value = mov.dataChegada || "";
    document.getElementById("editarMovUsuarioQuantidade").value = numeroSeguroMovUsuario(mov.quantidadeRecebida || mov.quantidadeEnviada);
    document.getElementById("editarMovUsuarioDefeito").value = numeroSeguroMovUsuario(mov.descontoDefeito ?? mov.defeito);
    document.getElementById("editarMovUsuarioObs").value = mov.observacaoChegada || mov.observacoes || "";
    [
      "editarMovUsuarioOP", "editarMovUsuarioRef", "editarMovUsuarioCor",
      "editarMovUsuarioProcesso", "editarMovUsuarioFaccao", "editarMovUsuarioDataEnvio"
    ].forEach(campo => definirCampoSomenteLeitura(campo, !manual));
    const qtd = document.getElementById("editarMovUsuarioQuantidade");
    if (qtd) qtd.max = manual ? "" : String(numeroSeguroMovUsuario(mov.quantidadeEnviada));
    const alerta = document.getElementById("alertaEditarMovUsuario");
    if (alerta) {
      alerta.classList.toggle("hidden", manual);
      alerta.textContent = manual
        ? ""
        : `Esta é uma chegada de uma remessa já enviada. OP, referência, processo, facção e envio permanecem protegidos; você pode corrigir somente os dados da chegada.`;
    }
    const resumo = document.getElementById("resumoPagamentoEditarMovUsuario");
    if (resumo) resumo.innerHTML = `<strong>Pagamento atual:</strong> ${escapeHtmlMovUsuario(pagamento.label)}. Ao salvar, o pagamento pendente será substituído pelo valor corrigido.`;
    document.getElementById(ID_MODAL_MOV_USUARIO)?.classList.remove("hidden");
    document.getElementById("editarMovUsuarioDataChegada")?.focus();
  }

  function fecharModalEditarMovUsuario() {
    movimentoEmEdicaoUsuario = null;
    document.getElementById(ID_MODAL_MOV_USUARIO)?.classList.add("hidden");
    document.getElementById("formEditarMovUsuario")?.reset();
  }

  async function buscarPrecoMovUsuario(referencia, processo) {
    const { firestore, db } = contextoMovUsuario;
    const refNormalizada = normalizarReferenciaMovUsuario(referencia);
    const procNormalizado = normalizarTextoMovUsuario(processo);
    let docs = [];
    try {
      const exato = await firestore.getDocs(
        firestore.query(
          firestore.collection(db, "precosReferencia"),
          firestore.where("referencia", "==", refNormalizada)
        )
      );
      docs = exato.docs;
    } catch (error) {
      console.warn("Consulta exata de preço falhou; usando leitura de compatibilidade.", error);
    }
    if (!docs.length) {
      const todos = await firestore.getDocs(firestore.collection(db, "precosReferencia"));
      docs = todos.docs;
    }
    const candidatos = docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => item.ativo !== false)
      .filter(item => normalizarReferenciaMovUsuario(item.referencia) === refNormalizada)
      .filter(item => normalizarTextoMovUsuario(item.processo || item.servicoNome) === procNormalizado);
    return candidatos[0] || null;
  }

  function montarPagamentoMovUsuario(mov, preco, uid, firestore) {
    const quantidade = Math.max(numeroSeguroMovUsuario(mov.quantidadeRecebida), 0);
    const descontoDefeito = Math.max(numeroSeguroMovUsuario(mov.descontoDefeito), 0);
    const pagamentoReenvio = Boolean(mov.movimentacaoOrigemId || mov.reenvio || mov.origem === "movimentacao");
    if (!preco) {
      return {
        id: docIdSeguroMovUsuario(`mov-${mov.id}-sem-valor`),
        dados: {
          origem: "movimentacao",
          movimentacaoId: mov.id,
          movimentacaoOrigemId: mov.movimentacaoOrigemId || "",
          pagamentoReenvio,
          opId: mov.opId || "",
          numeroOP: mov.numeroOP || "",
          referencia: mov.referencia || "",
          cor: mov.cor || "",
          produtoNome: mov.produtoNome || "",
          faccao: mov.destino || "",
          precoReferenciaId: "",
          processo: mov.processo || "",
          processoMovimentacao: mov.processo || "",
          servicoId: "",
          servicoNome: mov.processo || "",
          setor: mov.setor || "sutia",
          setorLabel: String(mov.setor || "sutia").toLowerCase() === "calcinha" ? "Calcinha" : "Sutiã",
          dataEntrega: mov.dataChegada,
          quantidade,
          falta: numeroSeguroMovUsuario(mov.falta),
          descontoDefeito,
          subtotal: 0,
          valorUnitario: 0,
          total: 0,
          statusPagamento: "sem_valor",
          valorPendente: true,
          avisoPagamento: `Adicionar valor para Ref. ${mov.referencia || "-"} + ${mov.processo || "-"}.`,
          observacoes: "Pagamento recalculado após correção da chegada; ainda não existe valor para REF + PROCESSO.",
          criadoPor: uid,
          criadoEm: firestore.serverTimestamp(),
          atualizadoPor: uid,
          atualizadoEm: firestore.serverTimestamp(),
          corrigidoPeloUsuario: true,
          versaoCorrecao: APP_VERSION
        }
      };
    }
    const valorUnitario = numeroSeguroMovUsuario(preco.valor);
    const subtotal = quantidade * valorUnitario;
    const total = Math.max(subtotal - descontoDefeito, 0);
    return {
      id: docIdSeguroMovUsuario(`mov-${mov.id}-${preco.id}`),
      dados: {
        origem: "movimentacao",
        movimentacaoId: mov.id,
        movimentacaoOrigemId: mov.movimentacaoOrigemId || "",
        pagamentoReenvio,
        opId: mov.opId || "",
        numeroOP: mov.numeroOP || "",
        referencia: mov.referencia || "",
        cor: mov.cor || "",
        produtoNome: mov.produtoNome || "",
        faccao: mov.destino || "",
        precoReferenciaId: preco.id,
        processo: preco.processo || mov.processo || "",
        processoMovimentacao: mov.processo || preco.processo || "",
        servicoId: preco.id,
        servicoNome: preco.processo || mov.processo || "",
        setor: preco.setor || mov.setor || "sutia",
        setorLabel: preco.setorLabel || (String(preco.setor || mov.setor).toLowerCase() === "calcinha" ? "Calcinha" : "Sutiã"),
        dataEntrega: mov.dataChegada,
        quantidade,
        falta: numeroSeguroMovUsuario(mov.falta),
        descontoDefeito,
        subtotal,
        valorUnitario,
        total,
        statusPagamento: "pendente",
        valorPendente: false,
        observacoes: "Pagamento recalculado automaticamente após correção da chegada pelo usuário responsável.",
        criadoPor: uid,
        criadoEm: firestore.serverTimestamp(),
        atualizadoPor: uid,
        atualizadoEm: firestore.serverTimestamp(),
        corrigidoPeloUsuario: true,
        versaoCorrecao: APP_VERSION
      }
    };
  }

  async function registrarLogMovUsuario(acao, mov, detalhes) {
    if (!contextoMovUsuario?.user) return;
    const { firestore, db, user, perfil } = contextoMovUsuario;
    try {
      await firestore.addDoc(firestore.collection(db, "logsAlteracoes"), {
        acao,
        tipoAlvo: "movimentacaoProducao",
        alvoId: mov.id,
        detalhes,
        usuarioUid: user.uid,
        usuarioNome: perfil?.nome || "",
        usuarioEmail: perfil?.email || user.email || "",
        usuarioTipo: perfil?.tipo || "usuario",
        criadoEm: firestore.serverTimestamp()
      });
    } catch (error) {
      console.warn("Não foi possível registrar o log da correção de chegada.", error);
    }
  }

  async function salvarEdicaoMovUsuario(event) {
    event.preventDefault();
    if (!contextoMovUsuario?.user || !movimentoEmEdicaoUsuario) return;
    const mov = movimentoEmEdicaoUsuario;
    if (pagamentoPagoDaMovimentacao(mov.id)) {
      mostrarAvisoFormulario("O pagamento já foi marcado como pago. Solicite ao administrador que reabra o pagamento.");
      return;
    }
    const manual = movimentoManualUsuario(mov);
    const numeroOP = String(document.getElementById("editarMovUsuarioOP")?.value || "").trim();
    const referencia = normalizarReferenciaMovUsuario(document.getElementById("editarMovUsuarioRef")?.value);
    const cor = normalizarTextoMovUsuario(document.getElementById("editarMovUsuarioCor")?.value);
    const processo = normalizarTextoMovUsuario(document.getElementById("editarMovUsuarioProcesso")?.value);
    const faccao = normalizarTextoMovUsuario(document.getElementById("editarMovUsuarioFaccao")?.value);
    const dataEnvio = document.getElementById("editarMovUsuarioDataEnvio")?.value || "";
    const dataChegada = document.getElementById("editarMovUsuarioDataChegada")?.value || "";
    const quantidadeRecebida = Math.max(0, Math.floor(numeroSeguroMovUsuario(document.getElementById("editarMovUsuarioQuantidade")?.value)));
    const descontoDefeito = Math.max(0, numeroSeguroMovUsuario(document.getElementById("editarMovUsuarioDefeito")?.value));
    const observacao = String(document.getElementById("editarMovUsuarioObs")?.value || "").trim();
    if (!numeroOP || !referencia || !cor || !processo || !faccao || !dataChegada || quantidadeRecebida <= 0) {
      mostrarAvisoFormulario("Preencha os dados obrigatórios e informe uma quantidade recebida maior que zero.");
      return;
    }
    const quantidadeEnviada = manual ? quantidadeRecebida : numeroSeguroMovUsuario(mov.quantidadeEnviada);
    if (!manual && quantidadeRecebida > quantidadeEnviada) {
      mostrarAvisoFormulario("A quantidade recebida não pode ser maior que a quantidade enviada.");
      return;
    }
    const falta = Math.max(quantidadeEnviada - quantidadeRecebida, 0);
    const uid = contextoMovUsuario.user.uid;
    const { firestore, db } = contextoMovUsuario;
    const botao = document.getElementById("btnSalvarEditarMovUsuario");
    if (botao) { botao.disabled = true; botao.textContent = "Salvando..."; }
    try {
      const pagamentosAntigos = pagamentosDaMovimentacaoUsuario(mov.id);
      if (pagamentosAntigos.some(item => String(item.statusPagamento || "") === "pago")) {
        throw new Error("Pagamento já pago");
      }
      const movAtualizada = {
        ...mov,
        numeroOP: manual ? numeroOP : mov.numeroOP,
        referencia: manual ? referencia : mov.referencia,
        cor: manual ? cor : mov.cor,
        processo: manual ? processo : mov.processo,
        destino: manual ? faccao : mov.destino,
        dataEnvio: manual ? dataEnvio : mov.dataEnvio,
        dataEnvioNaoInformada: manual ? !dataEnvio : mov.dataEnvioNaoInformada,
        dataChegada,
        quantidadeEnviada,
        quantidadeRecebida,
        falta,
        descontoDefeito,
        defeito: descontoDefeito,
        status: manual ? "retornou" : (mov.status || "retornou"),
        observacaoChegada: observacao,
        ...(manual ? { observacoes: observacao || "Chegada manual corrigida pelo usuário responsável." } : {})
      };
      const preco = await buscarPrecoMovUsuario(movAtualizada.referencia, movAtualizada.processo);
      const pagamentoNovo = montarPagamentoMovUsuario(movAtualizada, preco, uid, firestore);
      const batch = firestore.writeBatch(db);
      batch.set(firestore.doc(db, "movimentacoesProducao", mov.id), {
        numeroOP: movAtualizada.numeroOP,
        referencia: movAtualizada.referencia,
        cor: movAtualizada.cor,
        processo: movAtualizada.processo,
        destino: movAtualizada.destino,
        dataEnvio: movAtualizada.dataEnvio || "",
        dataEnvioNaoInformada: !movAtualizada.dataEnvio,
        dataChegada,
        quantidadeEnviada,
        quantidadeRecebida,
        falta,
        descontoDefeito,
        defeito: descontoDefeito,
        status: movAtualizada.status,
        observacaoChegada: observacao,
        ...(manual ? { observacoes: movAtualizada.observacoes } : {}),
        chegadaRegistradaPor: uid,
        chegadaRegistradaEm: mov.chegadaRegistradaEm || firestore.serverTimestamp(),
        chegadaEditadaPor: uid,
        chegadaEditadaEm: firestore.serverTimestamp(),
        atualizadoPor: uid,
        atualizadoEm: firestore.serverTimestamp(),
        versaoUltimaCorrecaoChegada: APP_VERSION
      }, { merge: true });
      pagamentosAntigos.forEach(item => {
        if (item.id !== pagamentoNovo.id) {
          batch.delete(firestore.doc(db, "entregasPagamento", item.id));
        }
      });
      batch.set(
        firestore.doc(db, "entregasPagamento", pagamentoNovo.id),
        pagamentoNovo.dados,
        { merge: false }
      );
      await batch.commit();
      await registrarLogMovUsuario(
        "chegada_corrigida_pelo_responsavel",
        mov,
        `OP ${movAtualizada.numeroOP} | ${movAtualizada.destino} | ${movAtualizada.processo} | recebido ${quantidadeRecebida} | falta ${falta}`
      );
      fecharModalEditarMovUsuario();
      showUpdateToast(preco
        ? `Chegada corrigida e pagamento recalculado: ${formatarMoedaMovUsuario(pagamentoNovo.dados.total)}.`
        : "Chegada corrigida. O pagamento ficou pendente de valor para esta referência e processo.");
      await carregarMovimentacoesUsuario();
      setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 400);
    } catch (error) {
      console.error("Erro ao corrigir chegada e pagamento.", error);
      mostrarAvisoFormulario(
        String(error?.message || "").includes("pago")
          ? "O pagamento já está pago e não pode ser alterado pelo usuário. Procure o administrador."
          : "Não foi possível salvar a correção. Confira as regras do Firebase e tente novamente."
      );
    } finally {
      if (botao) { botao.disabled = false; botao.textContent = "Salvar correção"; }
    }
  }

  async function excluirChegadaMovUsuario(id) {
    if (!contextoMovUsuario?.user) return;
    const mov = movimentosRegistradosUsuario.find(item => item.id === id);
    if (!mov) return;
    if (pagamentoPagoDaMovimentacao(id)) {
      mostrarAvisoFormulario("O pagamento já foi marcado como pago. Solicite ao administrador que reabra antes de excluir.");
      return;
    }
    if (mov.status === "encaminhado" || mov.movimentacaoDestinoId) {
      mostrarAvisoFormulario("Essa etapa já foi encaminhada. Somente o administrador pode desfazer sem quebrar o rastreamento.");
      return;
    }
    if (mov.status === "finalizado" || mov.bipado === true) {
      mostrarAvisoFormulario("Essa movimentação já foi bipada. Somente o administrador pode desfazer a chegada.");
      return;
    }
    const manual = movimentoManualUsuario(mov);
    const mensagem = manual
      ? `Excluir a chegada manual da OP ${mov.numeroOP || "-"}?\n\nO registro será cancelado e o pagamento pendente será removido.`
      : `Desfazer a chegada da OP ${mov.numeroOP || "-"}?\n\nA remessa voltará para “Em facção” e o pagamento pendente será removido.`;
    if (!window.confirm(mensagem)) return;
    const uid = contextoMovUsuario.user.uid;
    const { firestore, db } = contextoMovUsuario;
    try {
      const pagamentos = pagamentosDaMovimentacaoUsuario(id);
      if (pagamentos.some(item => String(item.statusPagamento || "") === "pago")) {
        throw new Error("Pagamento já pago");
      }
      const batch = firestore.writeBatch(db);
      if (manual) {
        batch.set(firestore.doc(db, "movimentacoesProducao", id), {
          tipoDestino: "faccao_cancelada",
          tipoDestinoLabel: "Facção cancelada",
          status: "cancelado",
          excluido: true,
          chegadaCanceladaPor: uid,
          chegadaCanceladaEm: firestore.serverTimestamp(),
          motivoCancelamentoChegada: "Exclusão solicitada pelo usuário que registrou a chegada manual.",
          atualizadoPor: uid,
          atualizadoEm: firestore.serverTimestamp(),
          versaoUltimaCorrecaoChegada: APP_VERSION
        }, { merge: true });
      } else {
        batch.set(firestore.doc(db, "movimentacoesProducao", id), {
          dataChegada: firestore.deleteField(),
          quantidadeRecebida: 0,
          falta: 0,
          descontoDefeito: 0,
          defeito: 0,
          observacaoChegada: firestore.deleteField(),
          status: "em_andamento",
          chegadaRegistradaPor: firestore.deleteField(),
          chegadaRegistradaEm: firestore.deleteField(),
          chegadaDesfeitaPor: uid,
          chegadaDesfeitaEm: firestore.serverTimestamp(),
          atualizadoPor: uid,
          atualizadoEm: firestore.serverTimestamp(),
          versaoUltimaCorrecaoChegada: APP_VERSION
        }, { merge: true });
      }
      pagamentos.forEach(item => batch.delete(firestore.doc(db, "entregasPagamento", item.id)));
      await batch.commit();
      await registrarLogMovUsuario(
        manual ? "chegada_manual_excluida_pelo_responsavel" : "chegada_desfeita_pelo_responsavel",
        mov,
        `OP ${mov.numeroOP || "-"} | ${mov.destino || "-"} | ${mov.processo || "-"} | pagamento pendente removido`
      );
      showUpdateToast(manual
        ? "Chegada manual excluída e pagamento pendente removido."
        : "Chegada desfeita. A remessa voltou para a facção e o pagamento pendente foi removido.");
      await carregarMovimentacoesUsuario();
      setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 400);
    } catch (error) {
      console.error("Erro ao excluir/desfazer chegada.", error);
      mostrarAvisoFormulario(
        String(error?.message || "").includes("pago")
          ? "O pagamento já está pago e não pode ser excluído pelo usuário. Procure o administrador."
          : "Não foi possível excluir/desfazer a chegada. Confira as regras do Firebase e tente novamente."
      );
    }
  }

  async function marcarChegadaNormalAposSalvar(id, dataEsperada, tentativa = 0) {
    if (!contextoMovUsuario?.user || !id) return;
    const { firestore, db, user } = contextoMovUsuario;
    try {
      const ref = firestore.doc(db, "movimentacoesProducao", id);
      const snapshot = await firestore.getDoc(ref);
      if (!snapshot.exists()) return;
      const dados = snapshot.data();
      if (!dados.dataChegada || (dataEsperada && dados.dataChegada !== dataEsperada)) {
        if (tentativa < 5) setTimeout(() => marcarChegadaNormalAposSalvar(id, dataEsperada, tentativa + 1), 500);
        return;
      }
      await firestore.setDoc(ref, {
        chegadaRegistradaPor: user.uid,
        chegadaRegistradaEm: dados.chegadaRegistradaEm || firestore.serverTimestamp(),
        atualizadoPor: user.uid,
        atualizadoEm: firestore.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.warn("Não foi possível identificar automaticamente o responsável pela chegada.", error);
    }
  }

  async function marcarChegadaManualAposSalvar(dadosEsperados, tentativa = 0) {
    if (!contextoMovUsuario?.user) return;
    const { firestore, db, user } = contextoMovUsuario;
    try {
      const snapshot = await firestore.getDocs(
        firestore.query(
          firestore.collection(db, "movimentacoesProducao"),
          firestore.where("criadoPor", "==", user.uid)
        )
      );
      const candidatos = snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .filter(item => movimentoManualUsuario(item) && item.dataChegada)
        .filter(item => normalizarTextoMovUsuario(item.numeroOP) === normalizarTextoMovUsuario(dadosEsperados.numeroOP))
        .filter(item => normalizarTextoMovUsuario(item.processo) === normalizarTextoMovUsuario(dadosEsperados.processo))
        .filter(item => normalizarTextoMovUsuario(item.destino) === normalizarTextoMovUsuario(dadosEsperados.faccao))
        .filter(item => String(item.dataChegada || "") === String(dadosEsperados.dataChegada || ""));
      for (const item of candidatos) {
        await firestore.setDoc(firestore.doc(db, "movimentacoesProducao", item.id), {
          chegadaRegistradaPor: user.uid,
          chegadaRegistradaEm: item.chegadaRegistradaEm || firestore.serverTimestamp(),
          atualizadoPor: user.uid,
          atualizadoEm: firestore.serverTimestamp()
        }, { merge: true });
      }
      if (!candidatos.length && tentativa < 5) {
        setTimeout(() => marcarChegadaManualAposSalvar(dadosEsperados, tentativa + 1), 500);
      }
    } catch (error) {
      console.warn("Não foi possível identificar automaticamente a chegada manual.", error);
    }
  }

  function instalarCapturaResponsavelChegada() {
    const formNormal = document.getElementById("formChegadaMovimentacao");
    if (formNormal && !formNormal.dataset.capturaResponsavelChegada) {
      formNormal.dataset.capturaResponsavelChegada = APP_VERSION;
      formNormal.addEventListener("submit", () => {
        const id = document.getElementById("chegadaMovimentacaoId")?.value || "";
        const data = document.getElementById("chegadaData")?.value || "";
        setTimeout(() => marcarChegadaNormalAposSalvar(id, data), 700);
      }, true);
    }
    const formManual = document.getElementById("formChegadaManualFaccao");
    if (formManual && !formManual.dataset.capturaResponsavelChegada) {
      formManual.dataset.capturaResponsavelChegada = APP_VERSION;
      formManual.addEventListener("submit", () => {
        const dados = {
          numeroOP: document.getElementById("chegadaManualOP")?.value || "",
          processo: document.getElementById("chegadaManualProcesso")?.value || "",
          faccao: document.getElementById("chegadaManualFaccao")?.value || "",
          dataChegada: document.getElementById("chegadaManualDataChegada")?.value || ""
        };
        setTimeout(() => marcarChegadaManualAposSalvar(dados), 900);
      }, true);
    }
  }

  async function configurarUsuarioMovUsuario(user) {
    if (!contextoMovUsuario) return;
    if (!user) {
      contextoMovUsuario = { ...contextoMovUsuario, user: null, perfil: null };
      movimentosRegistradosUsuario = [];
      pagamentosMovUsuario = [];
      fecharPainelMovUsuario();
      return;
    }
    const { firestore, db } = contextoMovUsuario;
    try {
      const perfilSnapshot = await firestore.getDoc(firestore.doc(db, "usuarios", user.uid));
      const perfil = perfilSnapshot.exists() ? perfilSnapshot.data() : {};
      contextoMovUsuario = { ...contextoMovUsuario, user, perfil };
      criarBotaoMovUsuario();
      criarPainelMovUsuario();
      criarModalMovUsuario();
      instalarCapturaResponsavelChegada();
    } catch (error) {
      console.error("Não foi possível iniciar as movimentações registradas do usuário.", error);
    }
  }

  async function conectarFirebaseMovUsuario(tentativa = 0) {
    if (contextoMovUsuario?.auth) return;
    try {
      const [firebaseApp, firestore, firebaseAuth] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js")
      ]);
      if (!firebaseApp.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const appAtual = firebaseApp.getApp();
      const auth = firebaseAuth.getAuth(appAtual);
      const db = firestore.getFirestore(appAtual);
      contextoMovUsuario = { firestore, firebaseAuth, auth, db, user: null, perfil: null };
      if (unsubscribeAuthMovUsuario) unsubscribeAuthMovUsuario();
      unsubscribeAuthMovUsuario = firebaseAuth.onAuthStateChanged(auth, configurarUsuarioMovUsuario);
    } catch (error) {
      if (tentativa < 20) {
        setTimeout(() => conectarFirebaseMovUsuario(tentativa + 1), 300);
        return;
      }
      console.error("Não foi possível iniciar a função Movimentações registradas.", error);
    }
  }

  function iniciarMovimentacoesRegistradasUsuario() {
    injetarEstiloMovUsuario();
    criarBotaoMovUsuario();
    criarPainelMovUsuario();
    criarModalMovUsuario();
    instalarCapturaResponsavelChegada();
    conectarFirebaseMovUsuario();
  }


  // ---------------------------------------------------------------------------
  // HOTFIX: permitir que usuários comuns corrijam o local das OPs no Manejo.
  // O app principal mantém o fluxo original para administradores. Para usuário
  // comum, este listener em modo de captura salva a mesma correção com histórico.
  // ---------------------------------------------------------------------------
  const LOCAIS_AJUSTE_USUARIO_LABELS = {
    MANEJO_AGUARDANDO_DESTINO: "Manejo / aguardando destino",
    DISPONIVEL_CASA: "Disponível casa",
    EM_FACCAO: "Em facção / aguardando chegada",
    EM_CELULA: "Em célula",
    RELATORIO_CELULAS: "Relatório células",
    FINALIZADO_BIPADO: "Finalizado / bipado",
    CANCELADA: "Cancelada"
  };

  function textoAjusteUsuario(valor) {
    return String(valor ?? "").trim().replace(/\s+/g, " ");
  }

  function textoNormalizadoAjusteUsuario(valor) {
    return textoAjusteUsuario(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function docIdSeguroAjusteUsuario(valor) {
    return textoNormalizadoAjusteUsuario(valor)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 180) || `registro-${Date.now()}`;
  }

  function setorDaOrdemAjusteUsuario(ordem) {
    const texto = textoNormalizadoAjusteUsuario([
      ordem?.tipoPeca,
      ordem?.tipoPecaLabel,
      ordem?.produtoNome,
      ordem?.observacoes,
      ordem?.pendencia
    ].filter(Boolean).join(" "));

    if (texto.includes("calcinha")) return "calcinha";
    if (texto.includes("sutia")) return "sutia";
    if (ordem?.manejosSetores?.calcinha && !ordem?.manejosSetores?.sutia) return "calcinha";
    return "sutia";
  }

  function mostrarAvisoAjusteUsuario(mensagem, tipo = "info") {
    const toastPrincipal = document.getElementById("toast");
    if (toastPrincipal) {
      toastPrincipal.textContent = mensagem;
      toastPrincipal.classList.remove("hidden");
      toastPrincipal.dataset.tipo = tipo;
      clearTimeout(mostrarAvisoAjusteUsuario.timer);
      mostrarAvisoAjusteUsuario.timer = setTimeout(() => {
        toastPrincipal.classList.add("hidden");
      }, 4200);
      return;
    }
    showUpdateToast(mensagem);
  }

  function perfilComumPodeAjustarLocal() {
    const perfil = contextoMovUsuario?.perfil;
    const user = contextoMovUsuario?.user;
    const tipo = String(perfil?.tipo || "").trim().toLowerCase();
    const ativoTexto = String(perfil?.ativo ?? "true").trim().toLowerCase();
    const estaInativo = perfil?.ativo === false || ativoTexto === "false" || ativoTexto === "inativo";
    return Boolean(user && tipo !== "admin" && !estaInativo);
  }

  async function salvarAjusteLocalComoUsuario(event) {
    const form = event.currentTarget;
    const perfil = contextoMovUsuario?.perfil;
    const user = contextoMovUsuario?.user;

    // Administrador continua usando a função original do app.js.
    if (String(perfil?.tipo || "").trim().toLowerCase() === "admin") return;

    // Evita que a função antiga mostre "Apenas admin" enquanto o perfil carrega.
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!user || !perfil) {
      mostrarAvisoAjusteUsuario("Aguarde o carregamento do seu usuário e tente novamente.", "warning");
      return;
    }
    if (!perfilComumPodeAjustarLocal()) {
      mostrarAvisoAjusteUsuario("Seu usuário não possui permissão ativa para corrigir o local.", "warning");
      return;
    }
    if (form.dataset.salvandoLocalUsuario === "1") return;

    const { firestore, db } = contextoMovUsuario;
    const ordemId = textoAjusteUsuario(document.getElementById("ajusteMigracaoOpId")?.value);
    const local = textoAjusteUsuario(document.getElementById("ajusteMigracaoLocal")?.value).toUpperCase();
    const destino = textoAjusteUsuario(document.getElementById("ajusteMigracaoDestino")?.value).toUpperCase();
    const processo = textoAjusteUsuario(document.getElementById("ajusteMigracaoProcesso")?.value).toUpperCase();
    const dataEnvio = document.getElementById("ajusteMigracaoDataEnvio")?.value || "";
    const dataChegada = document.getElementById("ajusteMigracaoDataChegada")?.value || "";
    const proximoDestino = textoAjusteUsuario(document.getElementById("ajusteMigracaoProximoDestino")?.value).toUpperCase();
    const motivo = textoAjusteUsuario(document.getElementById("ajusteMigracaoMotivo")?.value);

    if (!ordemId) {
      mostrarAvisoAjusteUsuario("OP não encontrada para a correção.", "warning");
      return;
    }
    if (!LOCAIS_AJUSTE_USUARIO_LABELS[local]) {
      mostrarAvisoAjusteUsuario("Selecione um local válido.", "warning");
      return;
    }
    if (!motivo) {
      mostrarAvisoAjusteUsuario("Informe o motivo da correção.", "warning");
      document.getElementById("ajusteMigracaoMotivo")?.focus();
      return;
    }
    if (["EM_FACCAO", "EM_CELULA"].includes(local) && !destino) {
      mostrarAvisoAjusteUsuario("Informe a facção ou célula de destino.", "warning");
      document.getElementById("ajusteMigracaoDestino")?.focus();
      return;
    }

    const botaoSalvar = form.querySelector('button[type="submit"]');
    const textoBotao = botaoSalvar?.textContent || "Salvar correção";
    form.dataset.salvandoLocalUsuario = "1";
    if (botaoSalvar) {
      botaoSalvar.disabled = true;
      botaoSalvar.textContent = "Salvando...";
    }

    try {
      const ordemRef = firestore.doc(db, "ordensProducao", ordemId);
      const ordemSnap = await firestore.getDoc(ordemRef);
      if (!ordemSnap.exists()) throw new Error("OP não encontrada no servidor.");

      const ordem = { id: ordemSnap.id, ...ordemSnap.data() };
      const setor = setorDaOrdemAjusteUsuario(ordem);
      const ocultarDoManejo = ["RELATORIO_CELULAS", "FINALIZADO_BIPADO", "CANCELADA"].includes(local);
      const timestamp = firestore.serverTimestamp();

      const patch = {
        statusMigracaoLigia: local,
        localAtualMigracao: local,
        destinoAtualMigracao: destino,
        processoAtualMigracao: processo,
        dataEnvioAtualMigracao: dataEnvio,
        dataChegadaAtualMigracao: dataChegada,
        proximoDestinoMigracao: proximoDestino,
        ocultarDoManejo,
        ajusteManualMigracao: true,
        ultimoMotivoAjusteMigracao: motivo,
        relatorioMigracao: ocultarDoManejo ? LOCAIS_AJUSTE_USUARIO_LABELS[local] : "",
        atualizadoPor: user.uid,
        atualizadoEm: timestamp
      };

      if (!ocultarDoManejo) {
        const manejoExistente = ordem?.manejosSetores?.[setor] || {};
        const faseCorrigida = processo || (
          local === "DISPONIVEL_CASA" ? "DISPONÍVEL P CASA" :
          local === "EM_FACCAO" ? "AGUARDANDO CHEGADA FACÇÃO" :
          local === "EM_CELULA" ? "PRODUÇÃO / CÉLULA" :
          "AGUARDANDO DESTINO"
        );
        const manejoCorrigido = {
          ...manejoExistente,
          fase: faseCorrigida,
          data: dataEnvio || manejoExistente.data || "",
          chegada: dataChegada || manejoExistente.chegada || "",
          faccao: local === "EM_FACCAO" ? destino : (manejoExistente.faccao || ""),
          celu: local === "EM_CELULA" ? destino : (manejoExistente.celu || ""),
          proximoDestino,
          processoAtualMigracao: processo,
          statusMigracao: local,
          observacoes: [
            manejoExistente.observacoes || "",
            `Ajustado manualmente por ${perfil.nome || user.email || "usuário"}: ${motivo}`
          ].filter(Boolean).join(" | ")
        };

        patch.manejosSetores = { [setor]: manejoCorrigido };
        patch.manejoStatusSetores = { [setor]: "organizada" };
        patch.bipadoSetores = { [setor]: false };
      }

      const batch = firestore.writeBatch(db);
      const ajusteRef = firestore.doc(firestore.collection(db, "ajustesMigracao"));
      const logRef = firestore.doc(firestore.collection(db, "logsAlteracoes"));

      batch.set(ordemRef, patch, { merge: true });
      batch.set(ajusteRef, {
        opId: ordemId,
        numeroOP: ordem.numeroOP || "",
        referencia: ordem.referencia || "",
        antes: {
          statusMigracaoLigia: ordem.statusMigracaoLigia || "",
          localAtualMigracao: ordem.localAtualMigracao || "",
          destinoAtualMigracao: ordem.destinoAtualMigracao || "",
          processoAtualMigracao: ordem.processoAtualMigracao || ""
        },
        depois: {
          statusMigracaoLigia: local,
          localAtualMigracao: local,
          destinoAtualMigracao: destino,
          processoAtualMigracao: processo,
          dataEnvioAtualMigracao: dataEnvio,
          dataChegadaAtualMigracao: dataChegada,
          proximoDestinoMigracao: proximoDestino,
          ocultarDoManejo
        },
        motivo,
        criadoPor: user.uid,
        criadoPorNome: perfil.nome || user.email || "Usuário",
        criadoPorTipo: perfil.tipo || "usuario",
        criadoEm: firestore.serverTimestamp()
      });

      if (["EM_FACCAO", "EM_CELULA"].includes(local) && destino) {
        const tipoDestino = local === "EM_CELULA" ? "celula" : "faccao";
        const movId = docIdSeguroAjusteUsuario(
          `ajuste-${ordem.numeroOP || ordem.id}-${tipoDestino}-${destino}-${Date.now()}`
        );
        batch.set(firestore.doc(db, "movimentacoesProducao", movId), {
          origem: "ajuste_migracao",
          ajusteMigracaoId: ajusteRef.id,
          opId: ordemId,
          numeroOP: ordem.numeroOP || "",
          referencia: ordem.referencia || "",
          cor: ordem.cor || "",
          produtoNome: ordem.produtoNome || "",
          tipoDestino,
          tipoDestinoLabel: tipoDestino === "faccao" ? "Facção" : "Célula",
          destino,
          destinoId: docIdSeguroAjusteUsuario(destino),
          processo: tipoDestino === "celula" ? "CÉLULA INTERNA" : (processo || "PROCESSO A DEFINIR"),
          setor,
          setorLabel: setor === "calcinha" ? "Calcinha" : "Sutiã",
          quantidadeEnviada: Number(ordem.quantidade || 0),
          dataEnvio,
          dataChegada,
          falta: 0,
          quantidadeRecebida: dataChegada ? Number(ordem.quantidade || 0) : 0,
          status: dataChegada ? "retornou" : "em_andamento",
          observacoes: `Criado por correção de local. Motivo: ${motivo}`,
          criadoPor: user.uid,
          criadoPorNome: perfil.nome || user.email || "Usuário",
          criadoEm: firestore.serverTimestamp(),
          atualizadoPor: user.uid,
          atualizadoEm: firestore.serverTimestamp()
        }, { merge: true });
      }

      batch.set(logRef, {
        acao: "ajuste_migracao_op",
        tipoAlvo: "ordensProducao",
        alvoId: ordemId,
        detalhes: `OP ${ordem.numeroOP || ordemId} | ${local} | ${destino || "sem destino"} | ${motivo}`,
        usuarioUid: user.uid,
        usuarioNome: perfil.nome || user.email || "Usuário",
        usuarioEmail: user.email || perfil.email || "",
        usuarioTipo: perfil.tipo || "usuario",
        criadoEm: firestore.serverTimestamp()
      });

      await batch.commit();

      document.getElementById("modalAjusteMigracao")?.classList.add("hidden");
      form.reset();
      mostrarAvisoAjusteUsuario("Local corrigido e registrado no histórico.", "success");
    } catch (error) {
      console.error("Erro ao corrigir local como usuário comum:", error);
      const mensagem = String(error?.code || error?.message || "");
      if (mensagem.includes("permission-denied")) {
        mostrarAvisoAjusteUsuario("Permissão negada. Publique o novo firebase-rules.txt no Firestore.", "error");
      } else {
        mostrarAvisoAjusteUsuario("Não foi possível salvar a correção do local.", "error");
      }
    } finally {
      delete form.dataset.salvandoLocalUsuario;
      if (botaoSalvar) {
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = textoBotao;
      }
    }
  }

  function iniciarEdicaoLocalUsuarios() {
    const form = document.getElementById("formAjusteMigracao");
    if (!form || form.dataset.hotfixEdicaoLocalUsuarios === "1") return;
    form.dataset.hotfixEdicaoLocalUsuarios = "1";
    form.addEventListener("submit", salvarAjusteLocalComoUsuario, true);
  }



  // ---------------------------------------------------------------------------
  // HOTFIX VISUAL: exibir "Mover / editar local" para usuários comuns.
  // A versão anterior liberou o salvamento, mas algumas renderizações do app.js
  // ainda escondiam a opção. Este bloco garante a ação no menu e na própria linha.
  // ---------------------------------------------------------------------------
  function usuarioComumAtivoPodeVerEditarLocal() {
    return perfilComumPodeAjustarLocal();
  }

  function extrairOrdemIdDoKebab(botao) {
    const codigo = String(botao?.getAttribute("onclick") || "");
    const match = codigo.match(/toggleMenuAcoesManejo\s*\(\s*event\s*,\s*['\"]([^'\"]+)['\"]\s*\)/i);
    return match?.[1] || "";
  }

  function abrirEdicaoLocalUsuarioPelaInterface(ordemId) {
    if (!ordemId) {
      mostrarAvisoAjusteUsuario("Não foi possível identificar a OP desta linha.", "error");
      return;
    }

    window.fecharMenusAcoesManejo?.();
    if (typeof window.abrirModalAjusteMigracao !== "function") {
      mostrarAvisoAjusteUsuario("A tela de edição de local ainda não foi carregada.", "error");
      return;
    }

    window.abrirModalAjusteMigracao(ordemId);
  }

  function injetarEstiloBotaoEditarLocalUsuario() {
    if (document.getElementById("hotfix-editar-local-usuario-style")) return;
    const style = document.createElement("style");
    style.id = "hotfix-editar-local-usuario-style";
    style.textContent = `
      #listaManejoInline .btn-editar-local-usuario {
        min-width: 34px;
        height: 34px;
        padding: 0 9px;
        border: 0;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        font-weight: 800;
        background: #2563eb;
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      #listaManejoInline .btn-editar-local-usuario:hover {
        filter: brightness(.94);
      }
      #listaManejoInline .btn-editar-local-usuario:focus-visible {
        outline: 3px solid rgba(37, 99, 235, .28);
        outline-offset: 2px;
      }
      #menu-acoes-manejo-global .btn-menu-editar-local-usuario {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      #listaRastreamento .btn-editar-local-rastreamento-usuario {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        margin: 2px 5px 2px 0;
        white-space: nowrap;
      }
      #listaRastreamento .rastreamento-historico-head .btn-editar-local-rastreamento-usuario {
        margin-left: auto;
      }
    `;
    document.head.appendChild(style);
  }

  function garantirBotaoEditarLocalNasLinhas() {
    if (!usuarioComumAtivoPodeVerEditarLocal()) return;

    document.querySelectorAll("#listaManejoInline .manejo-actions-inline").forEach(container => {
      if (container.querySelector(".btn-editar-local-usuario")) return;

      const kebab = container.querySelector(".btn-kebab");
      const ordemId = extrairOrdemIdDoKebab(kebab);
      if (!ordemId) return;

      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "btn-editar-local-usuario";
      botao.textContent = "✎";
      botao.title = "Mover / editar local";
      botao.setAttribute("aria-label", "Mover ou editar o local desta OP");
      botao.dataset.ordemId = ordemId;
      botao.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        abrirEdicaoLocalUsuarioPelaInterface(ordemId);
      });

      const menuWrap = container.querySelector(".action-menu-wrap");
      container.insertBefore(botao, menuWrap || null);
    });
  }

  function garantirOpcaoEditarLocalNoMenu() {
    if (!usuarioComumAtivoPodeVerEditarLocal()) return;

    const menu = document.getElementById("menu-acoes-manejo-global");
    if (!menu || !menu.classList.contains("open")) return;

    const ordemId = String(menu.dataset.ordemId || "");
    if (!ordemId) return;

    const botaoExistente = [...menu.querySelectorAll("button")].find(botao =>
      /mover\s*\/\s*editar\s*local|editar\s*local/i.test(String(botao.textContent || ""))
    );

    if (botaoExistente) {
      botaoExistente.classList.remove("hidden", "admin-only");
      botaoExistente.classList.add("btn-menu-editar-local-usuario");
      botaoExistente.disabled = false;
      botaoExistente.removeAttribute("hidden");
      botaoExistente.style.removeProperty("display");
      botaoExistente.style.removeProperty("visibility");
      botaoExistente.style.removeProperty("opacity");
      return;
    }

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn-menu-editar-local-usuario";
    botao.textContent = "Mover / editar local";
    botao.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      abrirEdicaoLocalUsuarioPelaInterface(ordemId);
    });

    const botaoHistorico = [...menu.querySelectorAll("button")].find(item =>
      /hist[oó]rico|rastreamento/i.test(String(item.textContent || ""))
    );
    menu.insertBefore(botao, botaoHistorico || null);
  }

  function obterNumeroOPLinhaRastreamento(linha) {
    if (!linha) return "";
    const primeiraCelula = linha.querySelector(":scope > td:first-child");
    const forte = primeiraCelula?.querySelector("strong")?.textContent || primeiraCelula?.textContent || "";
    return String(forte).replace(/\s+/g, " ").trim();
  }

  function criarBotaoEditarLocalRastreamento(ordemIdOuNumero) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn btn-sm btn-primary btn-editar-local-rastreamento-usuario";
    botao.textContent = "Editar local";
    botao.title = "Mover ou corrigir o local desta OP";
    botao.setAttribute("aria-label", `Editar local da OP ${ordemIdOuNumero}`);
    botao.dataset.ordemId = String(ordemIdOuNumero || "");
    botao.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      abrirEdicaoLocalUsuarioPelaInterface(ordemIdOuNumero);
    });
    return botao;
  }

  function garantirBotaoEditarLocalNoRastreamento() {
    if (!usuarioComumAtivoPodeVerEditarLocal()) return;
    const tbody = document.getElementById("listaRastreamento");
    if (!tbody) return;

    // Linhas principais: funciona tanto na listagem geral quanto na busca global por OP.
    tbody.querySelectorAll("tr").forEach(linha => {
      if (linha.classList.contains("rastreamento-historico-row")) return;
      const celulas = linha.querySelectorAll(":scope > td");
      if (celulas.length < 12) return;
      const acoes = celulas[celulas.length - 1];
      if (!acoes || acoes.querySelector(".btn-editar-local-rastreamento-usuario")) return;

      const numeroOP = obterNumeroOPLinhaRastreamento(linha);
      if (!numeroOP || /nenhuma|carregando/i.test(numeroOP)) return;

      // Se por alguma razão o app já exibiu o botão nativo, apenas garante que ele permaneça visível.
      const nativo = [...acoes.querySelectorAll("button")].find(item =>
        /editar\s*local|mover\s*\/\s*editar/i.test(String(item.textContent || ""))
      );
      if (nativo) {
        nativo.classList.remove("hidden", "admin-only");
        nativo.classList.add("btn-editar-local-rastreamento-usuario");
        nativo.disabled = false;
        nativo.removeAttribute("hidden");
        nativo.style.removeProperty("display");
        nativo.style.removeProperty("visibility");
        nativo.style.removeProperty("opacity");
        return;
      }

      acoes.insertBefore(criarBotaoEditarLocalRastreamento(numeroOP), acoes.firstChild);
    });

    // Quando uma OP específica é pesquisada, também libera o botão dentro do histórico detalhado.
    tbody.querySelectorAll(".rastreamento-historico-card").forEach(card => {
      const cabecalho = card.querySelector(".rastreamento-historico-head");
      if (!cabecalho || cabecalho.querySelector(".btn-editar-local-rastreamento-usuario")) return;
      const texto = String(cabecalho.querySelector("strong")?.textContent || "");
      const match = texto.match(/\bOP\s+([^\s|]+)/i);
      const numeroOP = match?.[1] || "";
      if (!numeroOP) return;
      cabecalho.appendChild(criarBotaoEditarLocalRastreamento(numeroOP));
    });
  }

  function iniciarExibicaoEditarLocalUsuarios() {
    injetarEstiloBotaoEditarLocalUsuario();

    const atualizar = () => {
      garantirBotaoEditarLocalNasLinhas();
      garantirOpcaoEditarLocalNoMenu();
      garantirBotaoEditarLocalNoRastreamento();
    };

    if (!document.documentElement.dataset.hotfixExibirEditarLocalUsuario) {
      document.documentElement.dataset.hotfixExibirEditarLocalUsuario = "1";

      document.addEventListener("click", event => {
        if (event.target.closest("#listaManejoInline .btn-kebab")) {
          setTimeout(garantirOpcaoEditarLocalNoMenu, 0);
          setTimeout(garantirOpcaoEditarLocalNoMenu, 40);
        }
        if (event.target.closest('[data-page="rastreamento"], #buscaRastreamento, #btnAtualizarServidor')) {
          setTimeout(garantirBotaoEditarLocalNoRastreamento, 0);
          setTimeout(garantirBotaoEditarLocalNoRastreamento, 120);
          setTimeout(garantirBotaoEditarLocalNoRastreamento, 600);
        }
      }, true);

      document.addEventListener("input", event => {
        if (event.target?.id === "buscaRastreamento") {
          setTimeout(garantirBotaoEditarLocalNoRastreamento, 0);
          setTimeout(garantirBotaoEditarLocalNoRastreamento, 120);
        }
      }, true);

      const observer = new MutationObserver(() => atualizar());
      observer.observe(document.body, { childList: true, subtree: true });
    }

    atualizar();
    setTimeout(atualizar, 150);
    setTimeout(atualizar, 700);
    setTimeout(atualizar, 1800);
  }



  // =========================================================
  // FILTROS ACUMULATIVOS DO MANEJO — LÓGICA TIPO EXCEL
  // - Permite marcar várias opções dentro da mesma coluna.
  // - Opções da mesma coluna usam OU.
  // - Colunas diferentes usam E.
  // - Mantém a digitação simples já existente.
  // - Recalcula totais e impressão conforme as linhas visíveis.
  // =========================================================

  const CONFIG_FILTROS_EXCEL_MANEJO = Object.freeze([
    { id: "filtroManejoReferencia", campo: "referencia", label: "Referência", coluna: 1 },
    { id: "filtroManejoLinhaCalcinha", campo: "linhaCalcinha", label: "Linha", coluna: 2 },
    { id: "filtroManejoSilk", campo: "silk", label: "Silk", coluna: 3 },
    { id: "filtroManejoDataTecido", campo: "dataTecido", label: "Tecido", coluna: 4 },
    { id: "filtroManejoFase", campo: "fase", label: "Fase", coluna: 5 },
    { id: "filtroManejoQuantidade", campo: "quantidade", label: "Quantidade", coluna: 6 },
    { id: "filtroManejoCor", campo: "cor", label: "Cor", coluna: 7 },
    { id: "filtroManejoNecessidade", campo: "necessidade", label: "Necessidade", coluna: 8 },
    { id: "filtroManejoStatus", campo: "status", label: "Status", coluna: 9 }
  ]);

  const selecoesFiltrosExcelManejo = new Map();
  const setoresManejoComRenderCompleto = new Set();
  let popupFiltroExcelManejo = null;
  let configPopupFiltroExcelManejo = null;
  let observerFiltrosExcelManejo = null;
  let rafAplicacaoFiltrosExcelManejo = 0;
  let eventosFiltrosExcelManejoInstalados = false;
  let aplicandoFiltrosExcelManejo = false;

  function normalizarFiltroExcelManejo(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function escaparHtmlFiltroExcelManejo(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatarNumeroFiltroExcelManejo(valor) {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })
      .format(Number(valor || 0));
  }

  function configFiltroExcelPorId(id) {
    return CONFIG_FILTROS_EXCEL_MANEJO.find(item => item.id === id) || null;
  }

  function getSetSelecaoFiltroExcel(id) {
    if (!selecoesFiltrosExcelManejo.has(id)) {
      selecoesFiltrosExcelManejo.set(id, new Set());
    }
    return selecoesFiltrosExcelManejo.get(id);
  }

  function haSelecaoAcumulativaManejo() {
    return CONFIG_FILTROS_EXCEL_MANEJO.some(config => getSetSelecaoFiltroExcel(config.id).size > 0);
  }

  function setorAtualFiltroExcelManejo() {
    return document.querySelector(".manejo-setor-btn.active")?.dataset?.setor || "sutia";
  }

  function opcoesDoDatalistFiltroExcel(campo) {
    const listId = campo?.dataset?.excelListId || campo?.getAttribute?.("list") || "";
    if (!listId) return [];
    const datalist = document.getElementById(listId);
    if (!datalist) return [];
    return [...datalist.querySelectorAll("option")]
      .map(option => String(option.value || option.textContent || "").trim())
      .filter(Boolean);
  }

  function valorLinhaFiltroExcel(linha, config) {
    if (!linha || !config) return "";
    const celula = linha.cells?.[config.coluna];

    if (config.campo === "referencia") {
      return celula?.querySelector("input")?.value || celula?.textContent || "";
    }
    if (config.campo === "linhaCalcinha") {
      const seletor = celula?.querySelector("select.corponu-manejo-line-select, select");
      if (seletor) {
        if (seletor.value === "cotton_line") return "Cotton Line";
        if (seletor.value === "corpo_nu") return "Corpo Nu";
        return "A definir";
      }
      const valor = celula?.querySelector("input")?.value || celula?.textContent || "";
      return String(valor).trim() || "A definir";
    }
    if (config.campo === "silk" || config.campo === "dataTecido") {
      const valores = [...(celula?.querySelectorAll("input") || [])]
        .map(input => String(input.value || "").trim())
        .filter(Boolean);
      return valores.join(" ").trim();
    }
    if (config.campo === "fase") {
      return celula?.querySelector('input[id$="-fase"]')?.value
        || linha.dataset.fase
        || celula?.textContent
        || "";
    }
    if (config.campo === "quantidade") {
      return linha.dataset.qti || celula?.querySelector("input")?.value || celula?.textContent || "";
    }
    if (config.campo === "cor") {
      return linha.dataset.cor || celula?.querySelector("input")?.value || celula?.textContent || "";
    }
    if (config.campo === "necessidade") {
      return celula?.querySelector("input, textarea")?.value || celula?.textContent || "";
    }
    if (config.campo === "status") {
      return linha.dataset.status || celula?.textContent || "";
    }
    return celula?.textContent || "";
  }

  function listaOficialFasesParaFiltroExcel() {
    const tipo = setorAtualFiltroExcelManejo() === "calcinha" ? "calcinha" : "sutia";
    const lista = tipo === "calcinha" ? fasesCalcinhaGerenciadas : fasesGerenciadas;
    const oficiais = ordenarFasesGerenciadas(Array.isArray(lista) ? lista : []);
    if (oficiais.length) return oficiais;

    // Enquanto a restauração inicial ainda não terminou, não deixa o filtro vazio.
    const cacheHistorico = window.__fasesHistoricasCorpoNu?.[tipo] || [];
    const valoresDaTela = [...document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")]
      .map(linha => String(valorLinhaFiltroExcel(linha, { campo: "fase", coluna: 4 }) || "").trim())
      .filter(valor => valor && normalizarFiltroExcelManejo(valor) !== normalizarFiltroExcelManejo("Sem fase"));
    return ordenarFasesGerenciadas([...cacheHistorico, ...valoresDaTela]);
  }

  function limparSelecoesFaseForaDaListaOficial(opcoesOficiais) {
    const set = getSetSelecaoFiltroExcel("filtroManejoFase");
    if (!set.size) return;
    const permitidas = new Set(
      ["Campo vazio", ...opcoesOficiais].map(normalizarFiltroExcelManejo)
    );
    [...set].forEach(item => {
      if (!permitidas.has(normalizarFiltroExcelManejo(item))) set.delete(item);
    });
    const config = configFiltroExcelPorId("filtroManejoFase");
    if (config) atualizarIndicadorFiltroExcel(config);
  }

  function coletarOpcoesFiltroExcel(config) {
    // A coluna Fase usa somente a lista oficial administrada na aba Usuários.
    // Valores históricos das OPs continuam salvos, mas não entram automaticamente no menu.
    if (config.campo === "fase") {
      const oficiais = listaOficialFasesParaFiltroExcel();
      limparSelecoesFaseForaDaListaOficial(oficiais);
      return ["Campo vazio", ...oficiais];
    }

    const campo = document.getElementById(config.id);
    const valores = [];

    if (campo instanceof HTMLSelectElement) {
      valores.push(...[...campo.options]
        .filter(option => option.value)
        .map(option => String(option.value || option.textContent || "").trim()));
    } else {
      valores.push(...opcoesDoDatalistFiltroExcel(campo));
    }

    document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")
      .forEach(linha => {
        const valor = String(valorLinhaFiltroExcel(linha, config) || "").trim();
        if (valor) valores.push(valor);
      });

    const selecionadas = [...getSetSelecaoFiltroExcel(config.id)];
    valores.push(...selecionadas);

    const especiaisPorCampo = {
      referencia: ["Campo vazio"],
      linhaCalcinha: ["Cotton Line", "Corpo Nu", "A definir"],
      silk: ["Preenchido", "Campo vazio", "Sem silk"],
      dataTecido: ["Preenchido", "Campo vazio", "Sem tecido"],
      quantidade: ["Campo vazio"],
      cor: ["Campo vazio"],
      necessidade: ["URGENTE", "Campo vazio", "Sem necessidade"]
    };
    valores.unshift(...(especiaisPorCampo[config.campo] || []));

    const vistos = new Set();
    return valores
      .map(valor => String(valor || "").trim())
      .filter(valor => {
        const chave = normalizarFiltroExcelManejo(valor);
        if (!chave || vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
      })
      .sort((a, b) => {
        const especiais = especiaisPorCampo[config.campo] || [];
        const ia = especiais.findIndex(item => normalizarFiltroExcelManejo(item) === normalizarFiltroExcelManejo(a));
        const ib = especiais.findIndex(item => normalizarFiltroExcelManejo(item) === normalizarFiltroExcelManejo(b));
        if (ia >= 0 || ib >= 0) {
          if (ia < 0) return 1;
          if (ib < 0) return -1;
          return ia - ib;
        }
        return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
      });
  }

  function opcaoFiltroExcelCombina(config, opcaoOriginal, valorOriginal) {
    const opcao = normalizarFiltroExcelManejo(opcaoOriginal);
    const valor = normalizarFiltroExcelManejo(valorOriginal);

    const vazios = new Set([
      "CAMPO VAZIO", "VAZIO", "SEM PREENCHIMENTO", "SEM PREENCHER",
      "NAO PREENCHIDO", "EM BRANCO", "SEM SILK", "SEM TECIDO", "SEM NECESSIDADE"
    ]);
    const preenchidos = new Set([
      "PREENCHIDO", "PREENCHIDA", "PREENCHIDOS", "COM PREENCHIMENTO",
      "COM SILK", "SILK PREENCHIDO"
    ]);

    if (vazios.has(opcao)) return !valor;
    if (preenchidos.has(opcao)) return Boolean(valor);
    if (config.campo === "necessidade" && opcao === "URGENTE") {
      return valor.includes("URGENTE");
    }
    return valor === opcao;
  }

  function linhaCombinaSelecoesExcel(linha) {
    return CONFIG_FILTROS_EXCEL_MANEJO.every(config => {
      const selecionadas = getSetSelecaoFiltroExcel(config.id);
      if (!selecionadas.size) return true;
      const valor = valorLinhaFiltroExcel(linha, config);
      return [...selecionadas].some(opcao => opcaoFiltroExcelCombina(config, opcao, valor));
    });
  }

  function atualizarIndicadorFiltroExcel(config) {
    const campo = document.getElementById(config.id);
    const botao = document.querySelector(`.btn-filtro-excel-manejo[data-filtro-id="${config.id}"]`);
    if (!campo || !botao) return;

    const selecionadas = getSetSelecaoFiltroExcel(config.id);
    const badge = botao.querySelector(".filtro-excel-count");
    botao.classList.toggle("ativo", selecionadas.size > 0);
    botao.setAttribute(
      "aria-label",
      selecionadas.size
        ? `${config.label}: ${selecionadas.size} opções selecionadas`
        : `Selecionar várias opções de ${config.label}`
    );
    botao.title = botao.getAttribute("aria-label");
    if (badge) {
      badge.textContent = selecionadas.size ? String(selecionadas.size) : "";
      badge.hidden = !selecionadas.size;
    }

    if (selecionadas.size) {
      campo.dataset.excelSelecaoAtiva = "1";
      campo.dataset.excelInterno = "1";
      campo.value = "";
      delete campo.dataset.excelInterno;
      campo.placeholder = selecionadas.size === 1
        ? [...selecionadas][0]
        : `${selecionadas.size} selecionados`;
      campo.classList.add("filtro-excel-ativo");
    } else {
      delete campo.dataset.excelSelecaoAtiva;
      campo.placeholder = campo.dataset.excelPlaceholderOriginal || campo.placeholder || "Todos";
      campo.classList.remove("filtro-excel-ativo");
    }
  }

  function atualizarTodosIndicadoresFiltroExcel() {
    CONFIG_FILTROS_EXCEL_MANEJO.forEach(atualizarIndicadorFiltroExcel);
  }

  function garantirRenderCompletoFiltrosExcel() {
    if (!haSelecaoAcumulativaManejo()) return;
    const setor = setorAtualFiltroExcelManejo();
    if (setoresManejoComRenderCompleto.has(setor)) return;

    const chave = `manejo-${setor}`;
    if (typeof window.mostrarTodosRenderTabela !== "function") {
      setTimeout(garantirRenderCompletoFiltrosExcel, 250);
      return;
    }

    setoresManejoComRenderCompleto.add(setor);
    try {
      window.mostrarTodosRenderTabela(chave);
    } catch (error) {
      setoresManejoComRenderCompleto.delete(setor);
      console.warn("Não foi possível ampliar a renderização do Manejo.", error);
    }
  }

  function criarLinhaResumoAgrupadoFiltroExcel(tbody, grupos, labelVazio) {
    if (!tbody) return;
    tbody.innerHTML = "";
    const ordenados = [...grupos.entries()]
      .sort((a, b) => b[1].pecas - a[1].pecas || a[0].localeCompare(b[0], "pt-BR", { numeric: true }));

    if (!ordenados.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="3" class="empty">${escaparHtmlFiltroExcelManejo(labelVazio)}</td>`;
      tbody.appendChild(tr);
      return;
    }

    ordenados.forEach(([nome, dados]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escaparHtmlFiltroExcelManejo(nome)}</td>
        <td>${formatarNumeroFiltroExcelManejo(dados.ops)}</td>
        <td>${formatarNumeroFiltroExcelManejo(dados.pecas)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function textoFiltrosExcelAtivos() {
    const partes = [];
    const busca = document.getElementById("buscaManejoLinha")?.value?.trim();
    const op = document.getElementById("filtroManejoOP")?.value?.trim();
    if (busca) partes.push(`Busca: ${busca}`);
    if (op) partes.push(`OP: ${op}`);

    CONFIG_FILTROS_EXCEL_MANEJO.forEach(config => {
      const campo = document.getElementById(config.id);
      const selecionadas = [...getSetSelecaoFiltroExcel(config.id)];
      if (selecionadas.length) {
        const exibidas = selecionadas.length > 4
          ? `${selecionadas.slice(0, 4).join(", ")} +${selecionadas.length - 4}`
          : selecionadas.join(", ");
        partes.push(`${config.label}: ${exibidas}`);
      } else if (campo?.value) {
        const label = campo instanceof HTMLSelectElement
          ? campo.selectedOptions?.[0]?.textContent || campo.value
          : campo.value;
        partes.push(`${config.label}: ${label}`);
      }
    });

    const ordenacao = document.getElementById("filtroManejoOrdenacao");
    if (ordenacao?.value && ordenacao.value !== "padrao") {
      partes.push(`Ordenação: ${ordenacao.selectedOptions?.[0]?.textContent || ordenacao.value}`);
    }
    return partes.length ? `Filtro: ${partes.join(" + ")}` : "Filtro: todos os registros";
  }

  function atualizarResumoPelasLinhasExcel(linhasVisiveis) {
    const totalOps = linhasVisiveis.length;
    let totalPecas = 0;
    let totalFalta = 0;
    let organizadas = 0;
    let pendentes = 0;
    const fases = new Map();
    const cores = new Map();

    linhasVisiveis.forEach(linha => {
      const qti = Number(String(linha.dataset.qti || "0").replace(",", ".")) || 0;
      const falta = Number(String(linha.dataset.falta || "0").replace(",", ".")) || 0;
      const status = normalizarFiltroExcelManejo(linha.dataset.status || "PENDENTE");
      const fase = String(valorLinhaFiltroExcel(linha, configFiltroExcelPorId("filtroManejoFase")) || "Sem fase").trim() || "Sem fase";
      const cor = String(valorLinhaFiltroExcel(linha, configFiltroExcelPorId("filtroManejoCor")) || "Sem cor").trim() || "Sem cor";

      totalPecas += qti;
      totalFalta += falta;
      if (status === "ORGANIZADA" || status === "BIPADO") organizadas += 1;
      else if (status === "PENDENTE") pendentes += 1;

      const grupoFase = fases.get(fase) || { ops: 0, pecas: 0 };
      grupoFase.ops += 1;
      grupoFase.pecas += qti;
      fases.set(fase, grupoFase);

      const grupoCor = cores.get(cor) || { ops: 0, pecas: 0 };
      grupoCor.ops += 1;
      grupoCor.pecas += qti;
      cores.set(cor, grupoCor);
    });

    const setText = (id, valor) => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.textContent = valor;
    };
    setText("somaManejoOps", formatarNumeroFiltroExcelManejo(totalOps));
    setText("somaManejoPecas", formatarNumeroFiltroExcelManejo(totalPecas));
    setText("somaManejoFalta", formatarNumeroFiltroExcelManejo(totalFalta));
    setText("somaManejoStatus", `${formatarNumeroFiltroExcelManejo(organizadas)} org. | ${formatarNumeroFiltroExcelManejo(pendentes)} pend.`);
    setText("somaManejoPecasCompacto", `${formatarNumeroFiltroExcelManejo(totalPecas)} peças`);
    setText("somaManejoFiltroAtivo", textoFiltrosExcelAtivos());
    setText(
      "somaManejoResumoCompacto",
      `${formatarNumeroFiltroExcelManejo(totalOps)} OPs | ${formatarNumeroFiltroExcelManejo(totalFalta)} falta | ${formatarNumeroFiltroExcelManejo(organizadas)} org. | ${formatarNumeroFiltroExcelManejo(pendentes)} pend.`
    );

    criarLinhaResumoAgrupadoFiltroExcel(document.getElementById("somaManejoFases"), fases, "Nenhuma fase nos filtros atuais.");
    criarLinhaResumoAgrupadoFiltroExcel(document.getElementById("somaManejoCores"), cores, "Nenhuma cor nos filtros atuais.");
  }

  function controlarMensagemSemResultadoFiltroExcel(linhasVisiveis) {
    const tbody = document.getElementById("listaManejoInline");
    if (!tbody) return;
    let aviso = document.getElementById("filtrosExcelManejoSemResultado");

    if (linhasVisiveis.length || !haSelecaoAcumulativaManejo()) {
      aviso?.remove();
      return;
    }

    if (!aviso) {
      aviso = document.createElement("tr");
      aviso.id = "filtrosExcelManejoSemResultado";
      aviso.innerHTML = `
        <td colspan="10" class="empty">
          Nenhuma peça corresponde à combinação selecionada. Use a seta dos filtros para ajustar as opções.
        </td>
      `;
      tbody.appendChild(aviso);
    }
  }

  function aplicarFiltrosExcelManejo() {
    if (aplicandoFiltrosExcelManejo) return;
    aplicandoFiltrosExcelManejo = true;
    try {
      const linhas = [...document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")];
      const ativo = haSelecaoAcumulativaManejo();
      const visiveis = [];

      linhas.forEach(linha => {
        const mostrar = !ativo || linhaCombinaSelecoesExcel(linha);
        linha.hidden = !mostrar;
        linha.classList.toggle("linha-oculta-filtro-excel", !mostrar);
        if (mostrar) visiveis.push(linha);
      });

      controlarMensagemSemResultadoFiltroExcel(visiveis);
      if (ativo) atualizarResumoPelasLinhasExcel(visiveis);
    } finally {
      aplicandoFiltrosExcelManejo = false;
    }
  }

  function agendarAplicacaoFiltrosExcelManejo() {
    cancelAnimationFrame(rafAplicacaoFiltrosExcelManejo);
    rafAplicacaoFiltrosExcelManejo = requestAnimationFrame(() => {
      garantirRenderCompletoFiltrosExcel();
      aplicarFiltrosExcelManejo();
    });
  }

  function fecharPopupFiltroExcelManejo() {
    popupFiltroExcelManejo?.remove();
    popupFiltroExcelManejo = null;
    configPopupFiltroExcelManejo = null;
  }

  function atualizarEstadoSelecionarTudoPopup() {
    if (!popupFiltroExcelManejo) return;
    const caixas = [...popupFiltroExcelManejo.querySelectorAll('.filtro-excel-opcao input[type="checkbox"]')]
      .filter(input => !input.closest(".filtro-excel-opcao")?.hidden);
    const todos = popupFiltroExcelManejo.querySelector("#filtroExcelSelecionarTodos");
    if (!todos) return;
    const marcadas = caixas.filter(input => input.checked).length;
    todos.checked = caixas.length > 0 && marcadas === caixas.length;
    todos.indeterminate = marcadas > 0 && marcadas < caixas.length;
  }

  function filtrarOpcoesPopupFiltroExcel(termo) {
    if (!popupFiltroExcelManejo) return;
    const busca = normalizarFiltroExcelManejo(termo);
    popupFiltroExcelManejo.querySelectorAll(".filtro-excel-opcao").forEach(label => {
      const texto = normalizarFiltroExcelManejo(label.dataset.valor || label.textContent);
      label.hidden = Boolean(busca && !texto.includes(busca));
    });
    atualizarEstadoSelecionarTudoPopup();
  }

  function posicionarPopupFiltroExcel(botao) {
    if (!popupFiltroExcelManejo || !botao) return;
    const rect = botao.getBoundingClientRect();
    const largura = Math.min(360, Math.max(280, window.innerWidth - 24));
    let esquerda = rect.right - largura;
    esquerda = Math.max(12, Math.min(esquerda, window.innerWidth - largura - 12));
    let topo = rect.bottom + 8;
    const alturaEstimada = Math.min(520, window.innerHeight - 24);
    if (topo + alturaEstimada > window.innerHeight && rect.top > alturaEstimada / 2) {
      topo = Math.max(12, rect.top - alturaEstimada - 8);
    }
    popupFiltroExcelManejo.style.width = `${largura}px`;
    popupFiltroExcelManejo.style.left = `${esquerda}px`;
    popupFiltroExcelManejo.style.top = `${topo}px`;
  }

  function abrirPopupFiltroExcelManejo(config, botao) {
    fecharPopupFiltroExcelManejo();
    configPopupFiltroExcelManejo = config;
    const opcoes = coletarOpcoesFiltroExcel(config);
    const selecionadasAtuais = getSetSelecaoFiltroExcel(config.id);

    const popup = document.createElement("div");
    popup.id = "popupFiltroExcelManejo";
    popup.className = "popup-filtro-excel-manejo";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-label", `Filtrar ${config.label}`);
    popup.innerHTML = `
      <div class="filtro-excel-cabecalho">
        <div>
          <strong>${escaparHtmlFiltroExcelManejo(config.label)}</strong>
          <small>${config.campo === "fase" ? "Opções definidas pelo administrador" : "Marque uma ou mais opções"}</small>
        </div>
        <button type="button" class="filtro-excel-fechar" aria-label="Fechar">×</button>
      </div>
      <input class="filtro-excel-busca" type="search" placeholder="Pesquisar nas opções..." autocomplete="off" />
      <label class="filtro-excel-selecionar-todos">
        <input id="filtroExcelSelecionarTodos" type="checkbox" />
        <span>Selecionar tudo</span>
      </label>
      <div class="filtro-excel-lista">
        ${opcoes.length ? opcoes.map((opcao, indice) => {
          const marcada = [...selecionadasAtuais]
            .some(item => normalizarFiltroExcelManejo(item) === normalizarFiltroExcelManejo(opcao));
          return `
            <label class="filtro-excel-opcao" data-valor="${escaparHtmlFiltroExcelManejo(opcao)}">
              <input type="checkbox" value="${escaparHtmlFiltroExcelManejo(opcao)}" ${marcada ? "checked" : ""} />
              <span>${escaparHtmlFiltroExcelManejo(opcao)}</span>
            </label>
          `;
        }).join("") : '<div class="filtro-excel-vazio">Nenhuma opção disponível neste setor.</div>'}
      </div>
      <div class="filtro-excel-rodape">
        <button type="button" class="btn-filtro-excel-limpar">Limpar</button>
        <div>
          <button type="button" class="btn-filtro-excel-cancelar">Cancelar</button>
          <button type="button" class="btn-filtro-excel-aplicar">Aplicar</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
    popupFiltroExcelManejo = popup;
    posicionarPopupFiltroExcel(botao);
    atualizarEstadoSelecionarTudoPopup();

    popup.querySelector(".filtro-excel-fechar")?.addEventListener("click", fecharPopupFiltroExcelManejo);
    popup.querySelector(".btn-filtro-excel-cancelar")?.addEventListener("click", fecharPopupFiltroExcelManejo);
    popup.querySelector(".filtro-excel-busca")?.addEventListener("input", event => {
      filtrarOpcoesPopupFiltroExcel(event.target.value);
    });
    popup.querySelector(".filtro-excel-lista")?.addEventListener("change", atualizarEstadoSelecionarTudoPopup);
    popup.querySelector("#filtroExcelSelecionarTodos")?.addEventListener("change", event => {
      popup.querySelectorAll('.filtro-excel-opcao:not([hidden]) input[type="checkbox"]')
        .forEach(input => { input.checked = event.target.checked; });
      atualizarEstadoSelecionarTudoPopup();
    });
    popup.querySelector(".btn-filtro-excel-limpar")?.addEventListener("click", () => {
      popup.querySelectorAll('.filtro-excel-opcao input[type="checkbox"]')
        .forEach(input => { input.checked = false; });
      atualizarEstadoSelecionarTudoPopup();
    });
    popup.querySelector(".btn-filtro-excel-aplicar")?.addEventListener("click", () => {
      const marcadas = [...popup.querySelectorAll('.filtro-excel-opcao input[type="checkbox"]:checked')]
        .map(input => String(input.value || "").trim())
        .filter(Boolean);
      const totalOpcoes = popup.querySelectorAll('.filtro-excel-opcao input[type="checkbox"]').length;
      const set = getSetSelecaoFiltroExcel(config.id);
      set.clear();
      // Marcar todas equivale a não restringir a coluna.
      if (marcadas.length && marcadas.length < totalOpcoes) {
        marcadas.forEach(valor => set.add(valor));
      }

      const campo = document.getElementById(config.id);
      if (campo) {
        campo.dataset.excelInterno = "1";
        campo.value = "";
        campo.dispatchEvent(new Event("input", { bubbles: true }));
        campo.dispatchEvent(new Event("change", { bubbles: true }));
        delete campo.dataset.excelInterno;
      }
      atualizarIndicadorFiltroExcel(config);
      fecharPopupFiltroExcelManejo();
      garantirRenderCompletoFiltrosExcel();
      setTimeout(agendarAplicacaoFiltrosExcelManejo, 40);
      setTimeout(agendarAplicacaoFiltrosExcelManejo, 180);
    });

    setTimeout(() => popup.querySelector(".filtro-excel-busca")?.focus(), 0);
  }

  function injetarEstilosFiltrosExcelManejo() {
    if (document.getElementById("estilosFiltrosExcelManejo")) return;
    const style = document.createElement("style");
    style.id = "estilosFiltrosExcelManejo";
    style.textContent = `
      .manejo-filter-row th.filtro-excel-host {
        position: relative;
        min-width: 115px;
      }
      .manejo-filter-row th.filtro-excel-host > input,
      .manejo-filter-row th.filtro-excel-host > select {
        width: 100%;
        padding-right: 44px !important;
      }
      .manejo-filter-row th.filtro-excel-host > input.filtro-excel-ativo,
      .manejo-filter-row th.filtro-excel-host > select.filtro-excel-ativo {
        border-color: #2563eb !important;
        background: #eff6ff !important;
        font-weight: 800;
      }
      .btn-filtro-excel-manejo {
        position: absolute;
        right: 5px;
        top: 50%;
        transform: translateY(-50%);
        width: 34px;
        height: 30px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
        color: #334155;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 2px;
        cursor: pointer;
        z-index: 3;
        font-weight: 900;
        box-shadow: 0 1px 2px rgba(15, 23, 42, .08);
      }
      .btn-filtro-excel-manejo:hover,
      .btn-filtro-excel-manejo:focus-visible {
        border-color: #2563eb;
        color: #1d4ed8;
        outline: none;
      }
      .btn-filtro-excel-manejo.ativo {
        background: #2563eb;
        border-color: #2563eb;
        color: #ffffff;
      }
      .filtro-excel-count {
        min-width: 15px;
        height: 15px;
        padding: 0 3px;
        border-radius: 999px;
        background: #ffffff;
        color: #1d4ed8;
        font-size: 9px;
        line-height: 15px;
        text-align: center;
      }
      .popup-filtro-excel-manejo {
        position: fixed;
        z-index: 2147483000;
        max-height: min(520px, calc(100vh - 24px));
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        background: #ffffff;
        box-shadow: 0 24px 60px rgba(15, 23, 42, .28);
        font-family: Arial, sans-serif;
        color: #0f172a;
      }
      .filtro-excel-cabecalho,
      .filtro-excel-rodape,
      .filtro-excel-rodape > div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .filtro-excel-cabecalho strong { display: block; font-size: 15px; }
      .filtro-excel-cabecalho small { display: block; margin-top: 2px; color: #64748b; }
      .filtro-excel-fechar {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 8px;
        background: #f1f5f9;
        cursor: pointer;
        font-size: 20px;
      }
      .filtro-excel-busca {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        padding: 10px 11px;
        font-size: 13px;
      }
      .filtro-excel-selecionar-todos,
      .filtro-excel-opcao {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 8px 9px;
        border-radius: 8px;
        cursor: pointer;
        user-select: none;
      }
      .filtro-excel-selecionar-todos {
        background: #eff6ff;
        color: #1d4ed8;
        font-weight: 800;
      }
      .filtro-excel-opcao:hover { background: #f8fafc; }
      .filtro-excel-opcao input,
      .filtro-excel-selecionar-todos input {
        width: 17px;
        height: 17px;
        accent-color: #2563eb;
        flex: 0 0 auto;
      }
      .filtro-excel-lista {
        min-height: 70px;
        max-height: 290px;
        overflow: auto;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 4px;
      }
      .filtro-excel-vazio { padding: 18px 10px; text-align: center; color: #64748b; }
      .filtro-excel-rodape {
        padding-top: 4px;
        border-top: 1px solid #e2e8f0;
      }
      .filtro-excel-rodape button {
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        padding: 9px 12px;
        background: #ffffff;
        font-weight: 800;
        cursor: pointer;
      }
      .filtro-excel-rodape .btn-filtro-excel-aplicar {
        background: #2563eb;
        border-color: #2563eb;
        color: #ffffff;
      }
      .filtro-excel-rodape .btn-filtro-excel-limpar { color: #b91c1c; }
      #avisoFiltrosExcelManejo {
        margin: 8px 0 10px;
        padding: 9px 12px;
        border: 1px solid #bfdbfe;
        border-radius: 10px;
        background: #eff6ff;
        color: #1e40af;
        font-size: 12px;
        font-weight: 700;
      }
      tr.linha-oculta-filtro-excel { display: none !important; }
      @media (max-width: 780px) {
        .popup-filtro-excel-manejo {
          left: 10px !important;
          right: 10px !important;
          top: 10px !important;
          width: auto !important;
          max-height: calc(100vh - 20px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function prepararControleFiltroExcel(config) {
    const campo = document.getElementById(config.id);
    if (!campo || campo.dataset.excelFiltroPreparado === "1") return;
    const th = campo.closest("th");
    if (!th) return;

    campo.dataset.excelFiltroPreparado = "1";
    campo.dataset.excelPlaceholderOriginal = campo.placeholder || "Todos";
    if (campo instanceof HTMLInputElement && campo.hasAttribute("list")) {
      campo.dataset.excelListId = campo.getAttribute("list") || "";
      campo.removeAttribute("list");
    }
    th.classList.add("filtro-excel-host");

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn-filtro-excel-manejo";
    botao.dataset.filtroId = config.id;
    botao.innerHTML = '<span aria-hidden="true">▾</span><span class="filtro-excel-count" hidden></span>';
    botao.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      abrirPopupFiltroExcelManejo(config, botao);
    });
    th.appendChild(botao);

    campo.addEventListener("input", () => {
      if (campo.dataset.excelInterno === "1") return;
      const set = getSetSelecaoFiltroExcel(config.id);
      if (set.size) {
        set.clear();
        atualizarIndicadorFiltroExcel(config);
      }
      setTimeout(agendarAplicacaoFiltrosExcelManejo, 30);
    });
    campo.addEventListener("change", () => {
      if (campo.dataset.excelInterno === "1") return;
      const set = getSetSelecaoFiltroExcel(config.id);
      if (set.size) {
        set.clear();
        atualizarIndicadorFiltroExcel(config);
      }
      setTimeout(agendarAplicacaoFiltrosExcelManejo, 30);
    });

    atualizarIndicadorFiltroExcel(config);
  }

  function inserirAvisoFiltrosExcelManejo() {
    if (document.getElementById("avisoFiltrosExcelManejo")) return;
    const tabela = document.querySelector("#manejo .manejo-inline-table");
    const wrap = tabela?.closest(".table-wrap");
    if (!wrap) return;
    const aviso = document.createElement("div");
    aviso.id = "avisoFiltrosExcelManejo";
    aviso.innerHTML = "Filtros acumulativos: use a seta ▾ para marcar várias opções. Dentro da mesma coluna vale <strong>OU</strong>; entre colunas vale <strong>E</strong>.";
    wrap.before(aviso);
  }

  function limparSelecoesFiltrosExcelManejo() {
    selecoesFiltrosExcelManejo.forEach(set => set.clear());
    fecharPopupFiltroExcelManejo();
    atualizarTodosIndicadoresFiltroExcel();
    document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")
      .forEach(linha => {
        linha.hidden = false;
        linha.classList.remove("linha-oculta-filtro-excel");
      });
    document.getElementById("filtrosExcelManejoSemResultado")?.remove();
  }

  function textoDaCelulaParaImpressao(linha, indice) {
    const celula = linha.cells?.[indice];
    if (!celula) return "";
    if (indice === 2) {
      const seletor = celula.querySelector("select");
      if (seletor?.value === "cotton_line") return "Cotton Line";
      if (seletor?.value === "corpo_nu") return "Corpo Nu";
      return celula.querySelector("input")?.value || "A definir";
    }
    if (indice === 3 || indice === 4) {
      return [...celula.querySelectorAll("input")]
        .map(input => String(input.value || "").trim())
        .filter(Boolean)
        .join(" / ");
    }
    return celula.querySelector("input, textarea, select")?.value
      || celula.textContent?.trim()
      || "";
  }

  function imprimirManejoComFiltrosExcel() {
    const linhas = [...document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")]
      .filter(linha => !linha.hidden && !linha.classList.contains("linha-oculta-filtro-excel"));
    const janela = window.open("", "_blank", "width=1200,height=820");
    if (!janela) {
      showUpdateToast("O navegador bloqueou a janela de impressão. Libere pop-ups e tente novamente.");
      return;
    }

    const calcinha = setorAtualFiltroExcelManejo() === "calcinha";
    const colunas = calcinha
      ? [
          { label: "OP", indice: 0 },
          { label: "REF", indice: 1 },
          { label: "LINHA", indice: 2 },
          { label: "FASE", indice: 5 },
          { label: "QTI", indice: 6 },
          { label: "COR", indice: 7 },
          { label: "NECESSIDADE", indice: 8 },
          { label: "STATUS", indice: 9 }
        ]
      : [
          { label: "OP", indice: 0 },
          { label: "REF", indice: 1 },
          { label: "LINHA", indice: 2 },
          { label: "SILK", indice: 3 },
          { label: "TECIDO", indice: 4 },
          { label: "FASE", indice: 5 },
          { label: "QTI", indice: 6 },
          { label: "COR", indice: 7 },
          { label: "NECESSIDADE", indice: 8 },
          { label: "STATUS", indice: 9 }
        ];
    const cabecalhos = colunas.map(item => item.label);
    const corpo = linhas.map(linha => {
      const valores = colunas.map(item => textoDaCelulaParaImpressao(linha, item.indice));
      return `<tr>${valores.map(valor => `<td>${escaparHtmlFiltroExcelManejo(valor || "-")}</td>`).join("")}</tr>`;
    }).join("");
    const setor = calcinha ? "Calcinha" : "Sutiã";

    janela.document.write(`
      <!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Manejo ${setor}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#111827;margin:24px}h1{font-size:22px;margin:0 0 6px}p{margin:0 0 16px;color:#475569;font-size:12px}
        table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left;vertical-align:top}th{background:#e2e8f0}
        @page{size:landscape;margin:10mm}
      </style></head><body>
      <h1>Manejo ${setor} — itens filtrados</h1>
      <p>${escaparHtmlFiltroExcelManejo(textoFiltrosExcelAtivos())} • ${linhas.length} OP(s)</p>
      <table><thead><tr>${cabecalhos.map(item => `<th>${item}</th>`).join("")}</tr></thead><tbody>${corpo || `<tr><td colspan="${cabecalhos.length}">Nenhum item encontrado.</td></tr>`}</tbody></table>
      </body></html>
    `);
    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 250);
  }

  function instalarEventosGlobaisFiltrosExcelManejo() {
    if (eventosFiltrosExcelManejoInstalados) return;
    eventosFiltrosExcelManejoInstalados = true;

    document.addEventListener("pointerdown", event => {
      if (!popupFiltroExcelManejo) return;
      if (popupFiltroExcelManejo.contains(event.target)) return;
      if (event.target.closest?.(".btn-filtro-excel-manejo")) return;
      fecharPopupFiltroExcelManejo();
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && popupFiltroExcelManejo) fecharPopupFiltroExcelManejo();
    }, true);

    document.addEventListener("click", event => {
      if (event.target.closest("#btnLimparFiltrosManejo")) {
        limparSelecoesFiltrosExcelManejo();
        setTimeout(agendarAplicacaoFiltrosExcelManejo, 80);
      }
      const setorBtn = event.target.closest(".manejo-setor-btn");
      if (setorBtn) {
        limparSelecoesFiltrosExcelManejo();
        setTimeout(() => {
          prepararFiltrosExcelManejo();
          agendarAplicacaoFiltrosExcelManejo();
        }, 100);
      }
    }, true);

    document.addEventListener("click", event => {
      const botaoImprimir = event.target.closest("#btnImprimirManejoFiltrado");
      if (!botaoImprimir || !haSelecaoAcumulativaManejo()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      imprimirManejoComFiltrosExcel();
    }, true);

    document.addEventListener("input", event => {
      if (event.target?.closest?.("#listaManejoInline")) {
        setTimeout(agendarAplicacaoFiltrosExcelManejo, 20);
      }
    }, true);

    window.addEventListener("resize", () => {
      const botao = configPopupFiltroExcelManejo
        ? document.querySelector(`.btn-filtro-excel-manejo[data-filtro-id="${configPopupFiltroExcelManejo.id}"]`)
        : null;
      if (botao) posicionarPopupFiltroExcel(botao);
    });
  }

  function iniciarObserverFiltrosExcelManejo() {
    if (observerFiltrosExcelManejo) return;
    const alvo = document.getElementById("listaManejoInline");
    if (!alvo) {
      setTimeout(iniciarObserverFiltrosExcelManejo, 300);
      return;
    }
    observerFiltrosExcelManejo = new MutationObserver(() => {
      prepararFiltrosExcelManejo();
      agendarAplicacaoFiltrosExcelManejo();
    });
    observerFiltrosExcelManejo.observe(alvo, { childList: true, subtree: true });
  }

  function prepararFiltrosExcelManejo() {
    injetarEstilosFiltrosExcelManejo();
    CONFIG_FILTROS_EXCEL_MANEJO.forEach(prepararControleFiltroExcel);
    inserirAvisoFiltrosExcelManejo();
    atualizarTodosIndicadoresFiltroExcel();
  }

  function iniciarFiltrosExcelManejo() {
    prepararFiltrosExcelManejo();
    instalarEventosGlobaisFiltrosExcelManejo();
    iniciarObserverFiltrosExcelManejo();
    setTimeout(prepararFiltrosExcelManejo, 250);
    setTimeout(prepararFiltrosExcelManejo, 900);
    setTimeout(agendarAplicacaoFiltrosExcelManejo, 1000);
  }


  function iniciarSistemaDuploSutiaCalcinha() {
    if (document.querySelector('script[data-corponu-dual-mode="1"]')) return;
    const script = document.createElement("script");
    script.src = `corponu-dual-mode.js?v=${encodeURIComponent(APP_VERSION)}`;
    script.dataset.corponuDualMode = "1";
    script.async = true;
    script.onerror = () => showUpdateToast("Não foi possível carregar o módulo Sutiã/Calcinha. O fluxo antigo continua disponível.");
    document.head.appendChild(script);
  }

  function iniciarAuditoriaCompletaOP() {
    if (document.querySelector('script[data-corponu-auditoria-op="1"]')) return;
    const script = document.createElement("script");
    script.src = `corponu-auditoria-op.js?v=${encodeURIComponent(APP_VERSION)}`;
    script.dataset.corponuAuditoriaOp = "1";
    script.async = true;
    script.onerror = () => showUpdateToast("Não foi possível carregar o histórico completo da OP. O restante do sistema continua disponível.");
    document.head.appendChild(script);
  }


  // =========================================================
  // HOTFIX: NÃO EXIBIR "CHEGADA" QUANDO A FACÇÃO JÁ RETORNOU
  // - O botão aparece somente enquanto a movimentação estiver em andamento.
  // - Remove o botão também após filtros, atualização em tempo real ou nova renderização.
  // - Mantém Bipar, Reenviar facção e Mandar célula conforme as regras atuais.
  // =========================================================
  let observerChegadaFaccaoRetornada = null;
  let aplicandoChegadaFaccaoRetornada = false;

  function linhaFaccaoJaRetornou(linha) {
    if (!linha) return false;
    const badge = linha.querySelector('.badge');
    const status = normalizarComparacao(badge?.textContent || '');
    return status === 'RETORNOU' ||
      status === 'RETORNO' ||
      Boolean(linha.querySelector('.badge.bipado'));
  }

  function removerBotoesChegadaDeRetornadas() {
    if (aplicandoChegadaFaccaoRetornada) return;
    aplicandoChegadaFaccaoRetornada = true;
    try {
      const tabela = document.getElementById('listaFaccoesMovimentacoes');
      if (!tabela) return;

      tabela.querySelectorAll('tr').forEach(linha => {
        const retornou = linhaFaccaoJaRetornou(linha);
        linha.dataset.faccaoRetornou = retornou ? '1' : '0';
        if (!retornou) return;

        linha.querySelectorAll('button[onclick*="registrarChegadaMovimentacao"]').forEach(botao => {
          botao.remove();
        });
      });
    } finally {
      aplicandoChegadaFaccaoRetornada = false;
    }
  }

  function injetarEstiloChegadaFaccaoRetornada() {
    if (document.getElementById('styleSemChegadaFaccaoRetornada')) return;
    const style = document.createElement('style');
    style.id = 'styleSemChegadaFaccaoRetornada';
    style.textContent = `
      #listaFaccoesMovimentacoes tr[data-faccao-retornou="1"]
      button[onclick*="registrarChegadaMovimentacao"],
      #listaFaccoesMovimentacoes tr:has(.badge.bipado)
      button[onclick*="registrarChegadaMovimentacao"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function iniciarSemChegadaFaccaoRetornada() {
    injetarEstiloChegadaFaccaoRetornada();
    removerBotoesChegadaDeRetornadas();

    const tabela = document.getElementById('listaFaccoesMovimentacoes');
    if (!tabela) {
      setTimeout(iniciarSemChegadaFaccaoRetornada, 300);
      return;
    }

    if (!tabela.dataset.bloqueioCliqueChegadaRetornada) {
      tabela.dataset.bloqueioCliqueChegadaRetornada = APP_VERSION;
      tabela.addEventListener('click', event => {
        const botao = event.target?.closest?.('button[onclick*="registrarChegadaMovimentacao"]');
        if (!botao) return;
        const linha = botao.closest('tr');
        if (!linhaFaccaoJaRetornou(linha)) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        botao.remove();
        mostrarAvisoFormulario('Esta movimentação já retornou. Use Movimentações registradas para corrigir a chegada.');
      }, true);
    }

    if (observerChegadaFaccaoRetornada) observerChegadaFaccaoRetornada.disconnect();
    observerChegadaFaccaoRetornada = new MutationObserver(() => {
      queueMicrotask(removerBotoesChegadaDeRetornadas);
    });
    observerChegadaFaccaoRetornada.observe(tabela, { childList: true, subtree: true });

    setTimeout(removerBotoesChegadaDeRetornadas, 100);
    setTimeout(removerBotoesChegadaDeRetornadas, 600);
  }


  // =========================================================
  // TRAVAS OPERACIONAIS CONTRA DUPLICIDADE
  // - Impede o mesmo envio de OP para facção duas vezes.
  // - Impede registrar novamente uma chegada já concluída.
  // - Impede chegada manual idêntica e pagamento manual idêntico.
  // - Usa uma trava temporária no Firestore para proteger contra
  //   dois usuários/abas confirmando a mesma operação ao mesmo tempo.
  // =========================================================
  let contextoTravasDuplicidadePromise = null;
  const TEMPO_TRAVA_DUPLICIDADE_MS = 45 * 1000;

  async function obterContextoTravasDuplicidade() {
    if (contextoTravasDuplicidadePromise) return contextoTravasDuplicidadePromise;

    contextoTravasDuplicidadePromise = (async () => {
      const [firebaseApp, firestore, firebaseAuth] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js")
      ]);

      if (!firebaseApp.getApps().length) {
        throw new Error("Firebase ainda não foi inicializado.");
      }

      const appAtual = firebaseApp.getApp();
      return {
        firestore,
        firebaseAuth,
        auth: firebaseAuth.getAuth(appAtual),
        db: firestore.getFirestore(appAtual)
      };
    })().catch(error => {
      contextoTravasDuplicidadePromise = null;
      throw error;
    });

    return contextoTravasDuplicidadePromise;
  }

  function hashTravaDuplicidade(texto) {
    const valor = String(texto || "");
    let hash1 = 2166136261;
    let hash2 = 5381;

    for (let indice = 0; indice < valor.length; indice += 1) {
      const codigo = valor.charCodeAt(indice);
      hash1 ^= codigo;
      hash1 = Math.imul(hash1, 16777619);
      hash2 = ((hash2 << 5) + hash2) ^ codigo;
    }

    return `${(hash1 >>> 0).toString(36)}${(hash2 >>> 0).toString(36)}`;
  }

  function timestampTravaEmMs(valor) {
    if (!valor) return 0;
    if (typeof valor.toMillis === "function") return valor.toMillis();
    if (Number.isFinite(Number(valor.seconds))) {
      return (Number(valor.seconds) * 1000) + Math.floor(Number(valor.nanoseconds || 0) / 1000000);
    }
    const convertido = new Date(valor).getTime();
    return Number.isFinite(convertido) ? convertido : 0;
  }

  function textoChaveTrava(...partes) {
    return partes
      .flat(Infinity)
      .map(valor => normalizarComparacao(valor))
      .filter(Boolean)
      .join("|");
  }

  function setorPeloProcessoDuplicidade(processo, setorInformado = "") {
    const setor = normalizarComparacao(setorInformado).toLowerCase();
    if (setor) return setor;

    const processoNormalizado = normalizarComparacao(processo);
    if (processoNormalizado.includes("CALCINHA")) return "calcinha";
    if (processoNormalizado.includes("BOJO")) return "sutia";
    if (processoNormalizado.includes("SUTIA")) return "sutia";
    if (processoNormalizado.includes("ALCA")) return "sutia";
    return "sutia";
  }

  function movimentoValidoParaDuplicidade(movimento) {
    if (!movimento || typeof movimento !== "object") return false;
    if (movimento.excluido === true || movimento.cancelado === true) return false;

    const status = normalizarComparacao(movimento.status);
    const tipo = normalizarComparacao(movimento.tipoDestino);
    if (["CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA"].includes(status)) return false;
    if (["FACCAO_CANCELADA", "CANCELADO", "CANCELADA"].includes(tipo)) return false;
    return true;
  }

  function movimentoEmAndamentoDuplicidade(movimento) {
    if (!movimentoValidoParaDuplicidade(movimento)) return false;
    const status = normalizarComparacao(movimento.status);
    return !status || ["EM_ANDAMENTO", "EM ANDAMENTO", "AGUARDANDO_CHEGADA", "AGUARDANDO CHEGADA"].includes(status);
  }

  function formatarResumoMovimentoDuplicado(movimento) {
    if (!movimento) return "movimentação já existente";
    const partes = [
      movimento.destino ? `facção ${movimento.destino}` : "",
      movimento.processo ? `processo ${movimento.processo}` : "",
      movimento.dataEnvio ? `envio ${movimento.dataEnvio}` : "",
      movimento.dataChegada ? `chegada ${movimento.dataChegada}` : "",
      movimento.status ? `status ${movimento.status}` : ""
    ].filter(Boolean);
    return partes.join(" | ") || "movimentação já existente";
  }

  async function carregarMovimentacoesServidorDuplicidade({ opId = "", numeroOP = "" } = {}) {
    const { firestore, db } = await obterContextoTravasDuplicidade();
    const colecao = firestore.collection(db, "movimentacoesProducao");
    const documentos = new Map();

    if (opId) {
      const snapshot = await firestore.getDocs(
        firestore.query(colecao, firestore.where("opId", "==", String(opId)))
      );
      snapshot.docs.forEach(item => documentos.set(item.id, { id: item.id, ...item.data() }));
    }

    if (numeroOP) {
      const numeroLimpo = String(numeroOP).trim();
      const valoresNumero = [numeroLimpo];
      if (/^\d+(?:[.,]\d+)?$/.test(numeroLimpo)) {
        const numeroConvertido = Number(numeroLimpo.replace(",", "."));
        if (Number.isFinite(numeroConvertido)) valoresNumero.push(numeroConvertido);
      }
      for (const valorNumero of [...new Set(valoresNumero)]) {
        const snapshot = await firestore.getDocs(
          firestore.query(colecao, firestore.where("numeroOP", "==", valorNumero))
        );
        snapshot.docs.forEach(item => documentos.set(item.id, { id: item.id, ...item.data() }));
      }
    }

    return [...documentos.values()];
  }

  async function carregarPagamentosMovimentacaoDuplicidade(movimentacaoId) {
    if (!movimentacaoId) return [];
    const { firestore, db } = await obterContextoTravasDuplicidade();
    const snapshot = await firestore.getDocs(
      firestore.query(
        firestore.collection(db, "entregasPagamento"),
        firestore.where("movimentacaoId", "==", String(movimentacaoId))
      )
    );
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  }

  async function adquirirTravaTemporariaDuplicidade(tipo, chave, detalhes = {}) {
    const { firestore, auth, db } = await obterContextoTravasDuplicidade();
    const usuario = auth.currentUser;
    if (!usuario) throw new Error("Usuário não autenticado.");

    const chaveCompleta = textoChaveTrava(tipo, chave);
    const travaId = `trava-${String(tipo || "operacao").replace(/[^a-z0-9_-]/gi, "-")}-${hashTravaDuplicidade(chaveCompleta)}`;
    const travaRef = firestore.doc(db, "travasOperacionais", travaId);
    const agora = Date.now();
    const expiraEm = firestore.Timestamp.fromMillis(agora + TEMPO_TRAVA_DUPLICIDADE_MS);

    await firestore.runTransaction(db, async transacao => {
      const atual = await transacao.get(travaRef);
      if (atual.exists()) {
        const dadosAtuais = atual.data() || {};
        const validade = timestampTravaEmMs(dadosAtuais.expiraEm);
        if (validade > agora) {
          const erro = new Error("Outra aba ou usuário já está confirmando esta mesma operação.");
          erro.codigoTravaDuplicidade = "EM_USO";
          throw erro;
        }
      }

      transacao.set(travaRef, {
        tipo: String(tipo || "operacao"),
        chaveHash: hashTravaDuplicidade(chaveCompleta),
        chaveResumo: chaveCompleta.slice(0, 700),
        detalhes,
        criadoPor: usuario.uid,
        criadoEm: firestore.serverTimestamp(),
        expiraEm,
        versaoSistema: APP_VERSION
      });
    });

    return { firestore, db, ref: travaRef, uid: usuario.uid };
  }

  async function liberarTravaTemporariaDuplicidade(trava) {
    if (!trava?.ref || !trava?.firestore) return;
    try {
      await trava.firestore.deleteDoc(trava.ref);
    } catch (error) {
      console.warn("A trava temporária será liberada automaticamente quando expirar.", error);
    }
  }

  function mostrarBloqueioDuplicidade(mensagem) {
    mostrarAvisoFormulario(mensagem);
    showUpdateToast(mensagem);
  }

  function alterarEstadoBotaoTrava(form, verificando, texto = "Verificando...") {
    const botao = form?.querySelector('button[type="submit"]');
    if (!botao) return;

    if (verificando) {
      if (!botao.dataset.textoAntesTrava) botao.dataset.textoAntesTrava = botao.textContent || "Salvar";
      botao.disabled = true;
      botao.textContent = texto;
      return;
    }

    botao.disabled = false;
    if (botao.dataset.textoAntesTrava) {
      botao.textContent = botao.dataset.textoAntesTrava;
      delete botao.dataset.textoAntesTrava;
    }
  }

  function reenviarSubmitOriginalComTrava(form) {
    form.dataset.travaDuplicidadeLiberada = "1";
    const evento = typeof SubmitEvent === "function"
      ? new SubmitEvent("submit", { bubbles: true, cancelable: true })
      : new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(evento);
  }

  async function esperarConfirmacaoOperacao(verificador, limiteMs = 14000) {
    const inicio = Date.now();
    while ((Date.now() - inicio) < limiteMs) {
      try {
        if (await verificador()) return true;
      } catch (error) {
        console.warn("Falha temporária ao conferir conclusão da operação.", error);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return false;
  }

  function instalarTravaEmFormulario(form, prepararOperacao) {
    if (!form || form.dataset.travaDuplicidadeInstalada === APP_VERSION) return;
    form.dataset.travaDuplicidadeInstalada = APP_VERSION;

    form.addEventListener("submit", async event => {
      if (form.dataset.travaDuplicidadeLiberada === "1") {
        delete form.dataset.travaDuplicidadeLiberada;
        return;
      }

      let operacao;
      try {
        operacao = prepararOperacao();
      } catch (error) {
        console.error("Erro ao ler dados para trava de duplicidade.", error);
        return;
      }

      // Quando o formulário ainda está incompleto, a validação original continua responsável.
      if (!operacao?.deveVerificar) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (form.dataset.travaDuplicidadeVerificando === "1") {
        mostrarBloqueioDuplicidade("Aguarde: esta operação já está sendo conferida.");
        return;
      }

      form.dataset.travaDuplicidadeVerificando = "1";
      alterarEstadoBotaoTrava(form, true);
      let trava = null;

      try {
        const resultado = await operacao.verificarDuplicidade();
        if (resultado?.duplicado) {
          mostrarBloqueioDuplicidade(resultado.mensagem || "Esta operação já foi registrada.");
          return;
        }

        trava = await adquirirTravaTemporariaDuplicidade(
          operacao.tipoTrava,
          operacao.chaveTrava,
          operacao.detalhesTrava || {}
        );

        // Segunda conferência depois de adquirir a trava. Isso fecha a janela entre
        // a primeira leitura e o início efetivo da gravação.
        const reconferencia = await operacao.verificarDuplicidade();
        if (reconferencia?.duplicado) {
          mostrarBloqueioDuplicidade(reconferencia.mensagem || "Esta operação acabou de ser registrada em outra aba.");
          return;
        }

        alterarEstadoBotaoTrava(form, false);
        reenviarSubmitOriginalComTrava(form);

        const travaParaLiberar = trava;
        trava = null;
        void (async () => {
          try {
            await esperarConfirmacaoOperacao(operacao.confirmarConclusao, 14000);
          } finally {
            await liberarTravaTemporariaDuplicidade(travaParaLiberar);
          }
        })();
      } catch (error) {
        console.error("Operação bloqueada pela trava de duplicidade.", error);
        if (error?.codigoTravaDuplicidade === "EM_USO") {
          mostrarBloqueioDuplicidade("Outra aba ou usuário já está registrando exatamente esta operação. Aguarde alguns segundos e atualize a tela.");
        } else if (String(error?.code || "").includes("permission-denied")) {
          mostrarBloqueioDuplicidade("Não foi possível ativar a trava. Publique o novo firebase-rules.txt antes de continuar.");
        } else {
          mostrarBloqueioDuplicidade("Não foi possível confirmar se já existe um registro igual. A operação foi bloqueada por segurança; verifique a internet e tente novamente.");
        }
      } finally {
        if (trava) await liberarTravaTemporariaDuplicidade(trava);
        delete form.dataset.travaDuplicidadeVerificando;
        alterarEstadoBotaoTrava(form, false);
      }
    }, true);
  }

  function dadosEnvioFaccaoParaTrava() {
    const form = document.getElementById("formMovimentacaoProducao");
    if (!form) return { deveVerificar: false };

    const tipoDestino = String(document.getElementById("movimentacaoTipoDestino")?.value || "").toLowerCase();
    const opId = String(document.getElementById("movimentacaoOrdemId")?.value || "").trim();
    const processo = String(
      document.getElementById("movimentacaoProcessoSelect")?.value ||
      document.getElementById("movimentacaoProcesso")?.value || ""
    ).trim();
    const destino = String(document.getElementById("movimentacaoDestino")?.value || "").trim();
    const quantidade = Math.max(0, Number(document.getElementById("movimentacaoQuantidade")?.value || 0));
    const titulo = String(document.getElementById("modalMovimentacaoTitulo")?.textContent || "");
    const reenvio = normalizarComparacao(titulo).includes("REENVIAR");
    const setor = setorPeloProcessoDuplicidade(processo);

    if (tipoDestino !== "faccao" || !opId || !processo || !destino || quantidade <= 0) {
      return { deveVerificar: false };
    }

    const chaveTrava = reenvio
      ? textoChaveTrava("REENVIO", opId, setor, processo, destino)
      : textoChaveTrava("ENVIO_INICIAL", opId, setor);

    const encontrarDuplicado = async () => {
      const movimentos = await carregarMovimentacoesServidorDuplicidade({ opId });
      const candidatos = movimentos
        .filter(mov => normalizarComparacao(mov.tipoDestino) === "FACCAO")
        .filter(movimentoValidoParaDuplicidade)
        .filter(mov => setorPeloProcessoDuplicidade(mov.processo, mov.setor) === setor);

      let duplicado = null;
      if (reenvio) {
        duplicado = candidatos.find(mov =>
          movimentoEmAndamentoDuplicidade(mov) &&
          normalizarComparacao(mov.destino) === normalizarComparacao(destino) &&
          normalizarComparacao(mov.processo) === normalizarComparacao(processo)
        ) || candidatos.find(movimentoEmAndamentoDuplicidade);
      } else {
        duplicado = candidatos[0] || null;
      }

      if (!duplicado) return { duplicado: false };

      return {
        duplicado: true,
        mensagem: reenvio
          ? `Esta OP já possui um reenvio de facção em andamento (${formatarResumoMovimentoDuplicado(duplicado)}). Registre a chegada dessa etapa antes de reenviar novamente.`
          : `Esta OP já foi enviada para facção (${formatarResumoMovimentoDuplicado(duplicado)}). Para uma nova etapa, use o botão Reenviar facção depois da chegada; não faça outro envio pelo Manejo.`
      };
    };

    return {
      deveVerificar: true,
      tipoTrava: reenvio ? "reenvio-faccao" : "envio-faccao",
      chaveTrava,
      detalhesTrava: { opId, processo, destino, quantidade, setor, reenvio },
      verificarDuplicidade: encontrarDuplicado,
      confirmarConclusao: async () => {
        const movimentos = await carregarMovimentacoesServidorDuplicidade({ opId });
        return movimentos.some(mov =>
          normalizarComparacao(mov.tipoDestino) === "FACCAO" &&
          movimentoValidoParaDuplicidade(mov) &&
          setorPeloProcessoDuplicidade(mov.processo, mov.setor) === setor &&
          normalizarComparacao(mov.destino) === normalizarComparacao(destino) &&
          normalizarComparacao(mov.processo) === normalizarComparacao(processo) &&
          Number(mov.quantidadeEnviada || 0) === quantidade
        );
      }
    };
  }

  function dadosChegadaNormalParaTrava() {
    const id = String(document.getElementById("chegadaMovimentacaoId")?.value || "").trim();
    const dataChegada = String(document.getElementById("chegadaData")?.value || "").trim();
    if (!id || !dataChegada) return { deveVerificar: false };

    const verificarDuplicidade = async () => {
      const { firestore, db } = await obterContextoTravasDuplicidade();
      const snapshot = await firestore.getDoc(firestore.doc(db, "movimentacoesProducao", id));
      if (!snapshot.exists()) {
        return { duplicado: true, mensagem: "A movimentação não existe mais. Atualize a tela antes de continuar." };
      }

      const mov = snapshot.data() || {};
      const status = normalizarComparacao(mov.status);
      const pagamentos = await carregarPagamentosMovimentacaoDuplicidade(id);
      const pagamentoValido = pagamentos.find(item =>
        !item.excluido && !["CANCELADO", "EXCLUIDO"].includes(normalizarComparacao(item.statusPagamento))
      );

      if (mov.dataChegada || ["RETORNOU", "FINALIZADO", "ENCAMINHADO"].includes(status) || mov.bipado === true) {
        return {
          duplicado: true,
          mensagem: pagamentoValido
            ? "A chegada e o pagamento desta movimentação já foram registrados. Use Movimentações registradas para corrigir ou excluir."
            : "A chegada desta movimentação já foi registrada. Use Movimentações registradas para corrigir e reconstruir o pagamento, se necessário."
        };
      }

      if (pagamentoValido) {
        return {
          duplicado: true,
          mensagem: "Já existe um pagamento ligado a esta movimentação. A nova chegada foi bloqueada para não duplicar o financeiro; revise em Movimentações registradas."
        };
      }

      return { duplicado: false };
    };

    return {
      deveVerificar: true,
      tipoTrava: "chegada-faccao",
      chaveTrava: textoChaveTrava("CHEGADA", id),
      detalhesTrava: { movimentacaoId: id, dataChegada },
      verificarDuplicidade,
      confirmarConclusao: async () => {
        const { firestore, db } = await obterContextoTravasDuplicidade();
        const snapshot = await firestore.getDoc(firestore.doc(db, "movimentacoesProducao", id));
        if (!snapshot.exists()) return false;
        const mov = snapshot.data() || {};
        return Boolean(mov.dataChegada) || normalizarComparacao(mov.status) === "RETORNOU";
      }
    };
  }

  function dadosChegadaManualParaTrava() {
    const numeroOP = String(document.getElementById("chegadaManualOP")?.value || "").trim();
    const referencia = String(document.getElementById("chegadaManualRef")?.value || "").trim();
    const quantidade = Math.max(0, Number(document.getElementById("chegadaManualQuantidade")?.value || 0));
    const processo = String(document.getElementById("chegadaManualProcesso")?.value || "").trim();
    const faccao = String(document.getElementById("chegadaManualFaccao")?.value || "").trim();
    const dataChegada = String(document.getElementById("chegadaManualDataChegada")?.value || "").trim();

    if (!numeroOP || !referencia || quantidade <= 0 || !processo || !faccao || !dataChegada) {
      return { deveVerificar: false };
    }

    const corresponde = mov =>
      normalizarComparacao(mov.tipoDestino) === "FACCAO" &&
      movimentoValidoParaDuplicidade(mov) &&
      normalizarComparacao(mov.numeroOP) === normalizarComparacao(numeroOP) &&
      normalizarComparacao(mov.referencia) === normalizarComparacao(referencia) &&
      normalizarComparacao(mov.destino) === normalizarComparacao(faccao) &&
      normalizarComparacao(mov.processo) === normalizarComparacao(processo) &&
      String(mov.dataChegada || "") === dataChegada &&
      Number(mov.quantidadeRecebida || mov.quantidadeEnviada || 0) === quantidade;

    const verificarDuplicidade = async () => {
      const movimentos = await carregarMovimentacoesServidorDuplicidade({ numeroOP });
      const duplicado = movimentos.find(corresponde);
      if (!duplicado) return { duplicado: false };

      const pagamentos = await carregarPagamentosMovimentacaoDuplicidade(duplicado.id);
      return {
        duplicado: true,
        mensagem: pagamentos.length
          ? `Esta chegada manual já existe e já possui pagamento (OP ${numeroOP}, ${faccao}, ${processo}, ${quantidade} peças em ${dataChegada}). Use Movimentações registradas para corrigir.`
          : `Esta chegada manual já existe (OP ${numeroOP}, ${faccao}, ${processo}, ${quantidade} peças em ${dataChegada}). Não será criado outro registro; corrija em Movimentações registradas.`
      };
    };

    return {
      deveVerificar: true,
      tipoTrava: "chegada-manual-faccao",
      chaveTrava: textoChaveTrava(numeroOP, referencia, faccao, processo, dataChegada, quantidade),
      detalhesTrava: { numeroOP, referencia, faccao, processo, dataChegada, quantidade },
      verificarDuplicidade,
      confirmarConclusao: async () => {
        const movimentos = await carregarMovimentacoesServidorDuplicidade({ numeroOP });
        return movimentos.some(corresponde);
      }
    };
  }

  function extrairNumeroOPPagamentoDuplicidade(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    return texto.split(/\s+-\s+/)[0]?.trim() || texto;
  }

  function dadosPagamentoManualParaTrava() {
    const idAtual = String(document.getElementById("entregaPagamentoId")?.value || "").trim();
    // Edição do próprio pagamento continua permitida.
    if (idAtual) return { deveVerificar: false };

    const numeroOP = extrairNumeroOPPagamentoDuplicidade(document.getElementById("entregaOP")?.value || "");
    const precoId = String(document.getElementById("entregaPreco")?.value || "").trim();
    const faccao = String(document.getElementById("entregaFaccao")?.value || "").trim();
    const dataEntrega = String(document.getElementById("entregaData")?.value || "").trim();
    const quantidade = Math.max(0, Number(document.getElementById("entregaQuantidade")?.value || 0));

    if (!numeroOP || !precoId || !faccao || !dataEntrega || quantidade <= 0) {
      return { deveVerificar: false };
    }

    const corresponde = item =>
      normalizarComparacao(item.numeroOP) === normalizarComparacao(numeroOP) &&
      normalizarComparacao(item.faccao) === normalizarComparacao(faccao) &&
      String(item.precoReferenciaId || item.servicoId || "") === precoId &&
      String(item.dataEntrega || "") === dataEntrega &&
      Number(item.quantidade || 0) === quantidade &&
      !item.excluido &&
      !["CANCELADO", "EXCLUIDO"].includes(normalizarComparacao(item.statusPagamento));

    const consultarPagamentos = async () => {
      const { firestore, db } = await obterContextoTravasDuplicidade();
      const colecao = firestore.collection(db, "entregasPagamento");
      const documentos = new Map();
      const valoresNumero = [numeroOP];
      if (/^\d+(?:[.,]\d+)?$/.test(numeroOP)) {
        const numeroConvertido = Number(numeroOP.replace(",", "."));
        if (Number.isFinite(numeroConvertido)) valoresNumero.push(numeroConvertido);
      }
      for (const valorNumero of [...new Set(valoresNumero)]) {
        const snapshot = await firestore.getDocs(
          firestore.query(colecao, firestore.where("numeroOP", "==", valorNumero))
        );
        snapshot.docs.forEach(item => documentos.set(item.id, { id: item.id, ...item.data() }));
      }
      return [...documentos.values()];
    };

    const verificarDuplicidade = async () => {
      const pagamentos = await consultarPagamentos();
      const duplicado = pagamentos.find(corresponde);
      return duplicado
        ? {
            duplicado: true,
            mensagem: `Já existe um pagamento igual para a OP ${numeroOP}, facção ${faccao}, mesma data, processo e quantidade. Edite o pagamento existente em vez de cadastrar outro.`
          }
        : { duplicado: false };
    };

    return {
      deveVerificar: true,
      tipoTrava: "pagamento-manual",
      chaveTrava: textoChaveTrava(numeroOP, precoId, faccao, dataEntrega, quantidade),
      detalhesTrava: { numeroOP, precoId, faccao, dataEntrega, quantidade },
      verificarDuplicidade,
      confirmarConclusao: async () => {
        const pagamentos = await consultarPagamentos();
        return pagamentos.some(corresponde);
      }
    };
  }

  function iniciarTravasDuplicidadeFaccaoPagamento() {
    instalarTravaEmFormulario(
      document.getElementById("formMovimentacaoProducao"),
      dadosEnvioFaccaoParaTrava
    );
    instalarTravaEmFormulario(
      document.getElementById("formChegadaMovimentacao"),
      dadosChegadaNormalParaTrava
    );
    instalarTravaEmFormulario(
      document.getElementById("formChegadaManualFaccao"),
      dadosChegadaManualParaTrava
    );
    instalarTravaEmFormulario(
      document.getElementById("formEntregaPagamento"),
      dadosPagamentoManualParaTrava
    );

    // Alguns painéis são renderizados depois do login; tenta novamente sem
    // duplicar eventos, pois cada formulário recebe uma marca de instalação.
    setTimeout(() => {
      instalarTravaEmFormulario(document.getElementById("formMovimentacaoProducao"), dadosEnvioFaccaoParaTrava);
      instalarTravaEmFormulario(document.getElementById("formChegadaMovimentacao"), dadosChegadaNormalParaTrava);
      instalarTravaEmFormulario(document.getElementById("formChegadaManualFaccao"), dadosChegadaManualParaTrava);
      instalarTravaEmFormulario(document.getElementById("formEntregaPagamento"), dadosPagamentoManualParaTrava);
    }, 1200);
  }


  // =========================================================
  // REVISÃO FINAL: PAGAMENTOS + RELATÓRIO COM PIX
  // - Acrescenta conferência financeira antes do fechamento.
  // - Exibe pagamentos sem valor e possíveis duplicidades.
  // - Impede marcar pagamento sem valor como pago.
  // - Gera relatório detalhado por facção com PIX, titular,
  //   cidade, telefone, OPs, descontos e totais.
  // =========================================================
  let cachePagamentoFinal = {
    expiraEm: 0,
    pagamentos: [],
    faccoes: []
  };
  let carregandoConferenciaPagamentoFinal = false;
  let observerTabelaPagamentoFinal = null;
  let aplicandoTabelaPagamentoFinal = false;
  let timerConferenciaPagamentoFinal = null;

  function escapeHtmlPagamentoFinal(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizarNomePagamentoFinal(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatarMoedaPagamentoFinal(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function formatarNumeroPagamentoFinal(valor, casas = 0) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas
    });
  }

  function dataPagamentoFinalBR(valor) {
    const texto = String(valor || "").trim();
    const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return texto || "-";
  }

  function statusPagamentoFinal(item) {
    if (item?.valorPendente === true || String(item?.statusPagamento || "") === "sem_valor") {
      return "sem_valor";
    }
    return String(item?.statusPagamento || "pendente").toLowerCase();
  }

  function pagamentoAtivoFinal(item) {
    const status = statusPagamentoFinal(item);
    return !item?.excluido && !["cancelado", "excluido"].includes(status);
  }

  function pontuarCadastroFaccaoPagamentoFinal(faccao) {
    let pontos = 0;
    if (faccao?.ativo !== false) pontos += 15;
    if (!faccao?.cadastroPendente) pontos += 12;
    if (faccao?.chavePix || faccao?.pix) pontos += 10;
    if (faccao?.titularPix || faccao?.titular) pontos += 5;
    if (faccao?.cidade) pontos += 3;
    if (faccao?.celular || faccao?.telefone) pontos += 3;
    return pontos;
  }

  function extrairTitularPixPagamentoFinal(faccao) {
    const direto = String(
      faccao?.titularPix ||
      faccao?.titular ||
      faccao?.nomeTitularPix ||
      faccao?.dadosPagamento?.titular ||
      ""
    ).trim();
    if (direto) return direto;

    const observacoes = String(faccao?.observacoes || "");
    const match = observacoes.match(/Titular\s*PIX\s*:\s*([^|;\n]+)/i);
    return match?.[1]?.trim() || "";
  }

  function dadosCadastroFaccaoPagamentoFinal(nome, faccoes) {
    const chave = normalizarNomePagamentoFinal(nome);
    const candidatas = (faccoes || [])
      .filter(item => {
        const atual = normalizarNomePagamentoFinal(item?.nome);
        if (!atual || !chave) return false;
        if (atual === chave) return true;
        if (atual.includes(chave) || chave.includes(atual)) {
          return Math.abs(atual.length - chave.length) <= 18;
        }
        return false;
      })
      .sort((a, b) => pontuarCadastroFaccaoPagamentoFinal(b) - pontuarCadastroFaccaoPagamentoFinal(a));

    const faccao = candidatas[0] || {};
    return {
      nome: faccao.nome || nome || "SEM FACÇÃO",
      cidade: faccao.cidade || "",
      chavePix: String(
        faccao.chavePix ||
        faccao.pix ||
        faccao.dadosPagamento?.pix ||
        ""
      ).trim(),
      titularPix: extrairTitularPixPagamentoFinal(faccao),
      celular: String(faccao.celular || faccao.telefone || faccao.whatsapp || "").trim(),
      observacoes: String(faccao.observacoes || "").trim(),
      cadastroEncontrado: Boolean(candidatas.length)
    };
  }

  async function carregarDadosPagamentoFinal(forcar = false) {
    const agora = Date.now();
    if (!forcar && cachePagamentoFinal.expiraEm > agora) return cachePagamentoFinal;

    const contexto = await obterContextoTravasDuplicidade();
    const { firestore, db, auth } = contexto;
    const usuario = auth.currentUser;
    if (!usuario) throw new Error("Usuário ainda não autenticado.");

    const perfilSnap = await firestore.getDoc(
      firestore.doc(db, "usuarios", usuario.uid)
    );
    const perfil = perfilSnap.exists() ? perfilSnap.data() : {};
    const ehAdminAtivo = perfil?.tipo === "admin" && perfil?.ativo === true;

    const pagamentosRef = firestore.collection(db, "entregasPagamento");
    const consultaPagamentos = ehAdminAtivo
      ? pagamentosRef
      : firestore.query(pagamentosRef, firestore.where("criadoPor", "==", usuario.uid));

    const [pagamentosSnap, faccoesSnap] = await Promise.all([
      firestore.getDocs(consultaPagamentos),
      firestore.getDocs(firestore.collection(db, "faccoes"))
    ]);

    cachePagamentoFinal = {
      expiraEm: agora + 20 * 1000,
      pagamentos: pagamentosSnap.docs.map(item => ({ id: item.id, ...item.data() })),
      faccoes: faccoesSnap.docs.map(item => ({ id: item.id, ...item.data() })),
      usuarioUid: usuario.uid,
      ehAdmin: ehAdminAtivo
    };
    return cachePagamentoFinal;
  }

  function filtrosPagamentoFinal() {
    return {
      inicio: String(document.getElementById("pagamentoDataInicio")?.value || ""),
      fim: String(document.getElementById("pagamentoDataFim")?.value || ""),
      faccao: String(document.getElementById("pagamentoFiltroFaccao")?.value || ""),
      referencia: String(document.getElementById("pagamentoFiltroReferencia")?.value || ""),
      precoId: String(document.getElementById("pagamentoFiltroPreco")?.value || ""),
      status: String(document.getElementById("pagamentoFiltroStatus")?.value || "pendente")
    };
  }

  function filtrarPagamentosFinal(pagamentos, filtros = filtrosPagamentoFinal()) {
    return (pagamentos || []).filter(item => {
      if (!pagamentoAtivoFinal(item)) return false;
      const data = String(item.dataEntrega || "");
      if (filtros.inicio && data < filtros.inicio) return false;
      if (filtros.fim && data > filtros.fim) return false;
      if (filtros.faccao && String(item.faccao || "") !== filtros.faccao) return false;
      if (
        filtros.referencia &&
        normalizarNomePagamentoFinal(item.referencia) !== normalizarNomePagamentoFinal(filtros.referencia)
      ) return false;
      if (
        filtros.precoId &&
        String(item.precoReferenciaId || item.servicoId || "") !== filtros.precoId
      ) return false;

      const status = statusPagamentoFinal(item);
      if (filtros.status === "sem_valor" && status !== "sem_valor") return false;
      if (filtros.status === "pendente" && status !== "pendente") return false;
      if (filtros.status === "pago" && status !== "pago") return false;
      return true;
    });
  }

  function chaveDuplicidadePagamentoFinal(item) {
    if (item?.movimentacaoId) {
      return [
        "MOV",
        String(item.movimentacaoId),
        String(item.precoReferenciaId || item.servicoId || ""),
        normalizarNomePagamentoFinal(item.processo || item.servicoNome)
      ].join("|");
    }
    return [
      "MANUAL",
      normalizarNomePagamentoFinal(item?.numeroOP),
      normalizarNomePagamentoFinal(item?.referencia),
      normalizarNomePagamentoFinal(item?.faccao),
      normalizarNomePagamentoFinal(item?.processo || item?.servicoNome),
      String(item?.dataEntrega || ""),
      Number(item?.quantidade || 0)
    ].join("|");
  }

  function detectarDuplicidadesPagamentoFinal(pagamentos) {
    const mapa = new Map();
    (pagamentos || []).filter(pagamentoAtivoFinal).forEach(item => {
      const chave = chaveDuplicidadePagamentoFinal(item);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(item);
    });
    return [...mapa.entries()]
      .filter(([, itens]) => itens.length > 1)
      .map(([chave, itens]) => ({ chave, itens }));
  }

  function garantirOpcaoSemValorPagamentoFinal() {
    const select = document.getElementById("pagamentoFiltroStatus");
    if (!select) return;
    const pendente = [...select.options].find(option => option.value === "pendente");
    if (pendente) pendente.textContent = "Pendentes com valor";
    if (![...select.options].some(option => option.value === "sem_valor")) {
      const option = document.createElement("option");
      option.value = "sem_valor";
      option.textContent = "Pendentes sem valor";
      const todas = [...select.options].find(item => item.value === "");
      select.insertBefore(option, todas || null);
    }
  }

  function injetarEstilosPagamentoFinal() {
    if (document.getElementById("stylePagamentoFinalPix")) return;
    const style = document.createElement("style");
    style.id = "stylePagamentoFinalPix";
    style.textContent = `
      #painelConferenciaPagamentoFinal {
        margin: 12px 0 14px;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        background: linear-gradient(135deg, #f8fafc, #eef2ff);
        padding: 14px;
      }
      #painelConferenciaPagamentoFinal .pagamento-final-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }
      #painelConferenciaPagamentoFinal h4 { margin: 0; font-size: 15px; }
      #painelConferenciaPagamentoFinal p { margin: 3px 0 0; color: #475569; font-size: 12px; }
      .pagamento-final-cards {
        display: grid;
        grid-template-columns: repeat(5, minmax(120px, 1fr));
        gap: 8px;
      }
      .pagamento-final-card {
        background: #fff;
        border: 1px solid #dbeafe;
        border-radius: 10px;
        padding: 9px;
      }
      .pagamento-final-card span { display: block; color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; }
      .pagamento-final-card strong { display: block; margin-top: 4px; font-size: 17px; color: #0f172a; }
      .pagamento-final-card.alerta { border-color: #fdba74; background: #fff7ed; }
      .pagamento-final-card.erro { border-color: #fca5a5; background: #fef2f2; }
      #alertasConferenciaPagamentoFinal { margin-top: 9px; }
      .pagamento-final-ok, .pagamento-final-aviso {
        border-radius: 9px;
        padding: 9px 10px;
        font-size: 12px;
        line-height: 1.45;
      }
      .pagamento-final-ok { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
      .pagamento-final-aviso { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
      .badge-pagamento-sem-valor {
        display: inline-flex !important;
        background: #fff7ed !important;
        color: #9a3412 !important;
        border: 1px solid #fdba74 !important;
      }
      #btnImprimirPagamento { white-space: nowrap; }
      @media (max-width: 900px) {
        .pagamento-final-cards { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
        #painelConferenciaPagamentoFinal .pagamento-final-header { align-items: flex-start; flex-direction: column; }
      }
    `;
    document.head.appendChild(style);
  }

  function inserirPainelConferenciaPagamentoFinal() {
    if (document.getElementById("painelConferenciaPagamentoFinal")) return;
    const filtros = document.querySelector("#pagamentos .pagamento-filtros");
    if (!filtros) return;

    const painel = document.createElement("div");
    painel.id = "painelConferenciaPagamentoFinal";
    painel.innerHTML = `
      <div class="pagamento-final-header">
        <div>
          <h4>Conferência antes do pagamento</h4>
          <p>Verifica valores pendentes, possíveis duplicidades e dados PIX das facções.</p>
        </div>
        <button class="btn btn-sm" id="btnAtualizarConferenciaPagamentoFinal" type="button">Conferir agora</button>
      </div>
      <div class="pagamento-final-cards">
        <div class="pagamento-final-card"><span>Itens filtrados</span><strong id="confPagamentoItens">0</strong></div>
        <div class="pagamento-final-card"><span>Total filtrado</span><strong id="confPagamentoTotal">R$ 0,00</strong></div>
        <div class="pagamento-final-card alerta"><span>Sem valor na base</span><strong id="confPagamentoSemValor">0</strong></div>
        <div class="pagamento-final-card alerta"><span>Facções sem PIX</span><strong id="confPagamentoSemPix">0</strong></div>
        <div class="pagamento-final-card erro"><span>Possíveis duplicidades</span><strong id="confPagamentoDuplicados">0</strong></div>
      </div>
      <div id="alertasConferenciaPagamentoFinal"><div class="pagamento-final-ok">Aguardando conferência.</div></div>
    `;
    filtros.insertAdjacentElement("afterend", painel);
  }

  function setTextoPagamentoFinal(id, texto) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = texto;
  }

  async function atualizarConferenciaPagamentoFinal(forcar = false) {
    if (carregandoConferenciaPagamentoFinal) return;
    carregandoConferenciaPagamentoFinal = true;
    const alertasBox = document.getElementById("alertasConferenciaPagamentoFinal");
    if (alertasBox) alertasBox.innerHTML = `<div class="pagamento-final-ok">Conferindo dados financeiros...</div>`;

    try {
      const dados = await carregarDadosPagamentoFinal(forcar);
      const filtrados = filtrarPagamentosFinal(dados.pagamentos);
      const semValorBase = dados.pagamentos.filter(item => pagamentoAtivoFinal(item) && statusPagamentoFinal(item) === "sem_valor");
      const duplicidades = detectarDuplicidadesPagamentoFinal(dados.pagamentos);
      const nomesFaccoesFiltradas = [...new Set(filtrados.map(item => String(item.faccao || "SEM FACÇÃO")))];
      const semPix = nomesFaccoesFiltradas.filter(nome => {
        const cadastro = dadosCadastroFaccaoPagamentoFinal(nome, dados.faccoes);
        return !cadastro.chavePix;
      });
      const total = filtrados.reduce((soma, item) => soma + Number(item.total || 0), 0);

      setTextoPagamentoFinal("confPagamentoItens", filtrados.length.toLocaleString("pt-BR"));
      setTextoPagamentoFinal("confPagamentoTotal", formatarMoedaPagamentoFinal(total));
      setTextoPagamentoFinal("confPagamentoSemValor", semValorBase.length.toLocaleString("pt-BR"));
      setTextoPagamentoFinal("confPagamentoSemPix", semPix.length.toLocaleString("pt-BR"));
      setTextoPagamentoFinal("confPagamentoDuplicados", duplicidades.length.toLocaleString("pt-BR"));

      const avisos = [];
      if (semValorBase.length) {
        avisos.push(`${semValorBase.length} pagamento(s) estão sem valor cadastrado. Use o filtro “Pendentes sem valor” antes de fechar o período.`);
      }
      if (semPix.length) {
        avisos.push(`Sem PIX cadastrado no filtro atual: ${semPix.slice(0, 8).join(", ")}${semPix.length > 8 ? "..." : ""}.`);
      }
      if (duplicidades.length) {
        avisos.push(`${duplicidades.length} possível(is) duplicidade(s) foram identificadas. Revise antes de marcar como pago.`);
      }

      if (alertasBox) {
        alertasBox.innerHTML = avisos.length
          ? `<div class="pagamento-final-aviso"><strong>Atenção:</strong><br>${avisos.map(item => `• ${escapeHtmlPagamentoFinal(item)}`).join("<br>")}</div>`
          : `<div class="pagamento-final-ok"><strong>Conferência concluída:</strong> os pagamentos filtrados possuem valor, não há duplicidade aparente e as facções exibidas possuem PIX cadastrado.</div>`;
      }
      aprimorarTabelaEntregasPagamentoFinal(dados.pagamentos);
    } catch (error) {
      console.error("Erro na conferência final de pagamentos.", error);
      if (alertasBox) {
        alertasBox.innerHTML = `<div class="pagamento-final-aviso">Não foi possível concluir a conferência. Verifique a conexão e as permissões.</div>`;
      }
    } finally {
      carregandoConferenciaPagamentoFinal = false;
    }
  }

  function agendarConferenciaPagamentoFinal(forcar = false) {
    clearTimeout(timerConferenciaPagamentoFinal);
    timerConferenciaPagamentoFinal = setTimeout(() => atualizarConferenciaPagamentoFinal(forcar), 160);
  }

  function idPagamentoPeloBotaoFinal(botao) {
    const onclick = String(botao?.getAttribute("onclick") || "");
    const match = onclick.match(/alternarStatusEntregaPagamento\(['"]([^'"]+)['"]\)/);
    return match?.[1] || "";
  }

  function aprimorarTabelaEntregasPagamentoFinal(pagamentos = cachePagamentoFinal.pagamentos) {
    if (aplicandoTabelaPagamentoFinal) return;
    const tbody = document.getElementById("listaEntregasPagamento");
    if (!tbody) return;
    aplicandoTabelaPagamentoFinal = true;
    try {
      const mapa = new Map((pagamentos || []).map(item => [String(item.id), item]));
      tbody.querySelectorAll("tr").forEach(linha => {
        const botao = linha.querySelector('button[onclick*="alternarStatusEntregaPagamento"]');
        const id = idPagamentoPeloBotaoFinal(botao);
        if (!id) return;
        const item = mapa.get(id);
        if (!item) return;
        const status = statusPagamentoFinal(item);
        if (status !== "sem_valor") return;

        const badge = linha.querySelector(".badge");
        if (badge) {
          badge.textContent = "Sem valor";
          badge.classList.add("badge-pagamento-sem-valor");
        }
        if (botao) {
          botao.textContent = "Cadastrar valor";
          botao.title = "Cadastre o valor da referência e processo antes de pagar.";
          botao.classList.remove("btn-success");
          botao.classList.add("btn-warning");
        }
      });
    } finally {
      aplicandoTabelaPagamentoFinal = false;
    }
  }

  function instalarObserverTabelaPagamentoFinal() {
    const tbody = document.getElementById("listaEntregasPagamento");
    if (!tbody) {
      setTimeout(instalarObserverTabelaPagamentoFinal, 400);
      return;
    }
    if (observerTabelaPagamentoFinal) observerTabelaPagamentoFinal.disconnect();
    observerTabelaPagamentoFinal = new MutationObserver(() => {
      queueMicrotask(() => aprimorarTabelaEntregasPagamentoFinal());
    });
    observerTabelaPagamentoFinal.observe(tbody, { childList: true, subtree: true });
  }

  function textoFiltrosRelatorioPagamentoFinal() {
    const filtros = filtrosPagamentoFinal();
    const partes = [];
    if (filtros.inicio || filtros.fim) {
      partes.push(`Período: ${filtros.inicio ? dataPagamentoFinalBR(filtros.inicio) : "início"} até ${filtros.fim ? dataPagamentoFinalBR(filtros.fim) : "hoje"}`);
    }
    if (filtros.faccao) partes.push(`Facção: ${filtros.faccao}`);
    if (filtros.referencia) partes.push(`Referência: ${filtros.referencia}`);
    const processoTexto = document.getElementById("pagamentoFiltroPreco")?.selectedOptions?.[0]?.textContent || "";
    if (filtros.precoId && processoTexto) partes.push(`Processo: ${processoTexto}`);
    const statusTexto = document.getElementById("pagamentoFiltroStatus")?.selectedOptions?.[0]?.textContent || "Todas";
    partes.push(`Pagamento: ${statusTexto}`);
    return partes.join(" | ");
  }

  function agruparPorFaccaoPagamentoFinal(pagamentos) {
    const mapa = new Map();
    [...(pagamentos || [])]
      .sort((a, b) => {
        const faccao = String(a.faccao || "").localeCompare(String(b.faccao || ""), "pt-BR", { numeric: true });
        if (faccao) return faccao;
        const data = String(a.dataEntrega || "").localeCompare(String(b.dataEntrega || ""));
        if (data) return data;
        return String(a.numeroOP || "").localeCompare(String(b.numeroOP || ""), "pt-BR", { numeric: true });
      })
      .forEach(item => {
        const nome = String(item.faccao || "SEM FACÇÃO");
        if (!mapa.has(nome)) mapa.set(nome, []);
        mapa.get(nome).push(item);
      });
    return [...mapa.entries()].map(([faccao, itens]) => ({ faccao, itens }));
  }

  async function imprimirRelatorioPagamentoFinal() {
    try {
      const dados = await carregarDadosPagamentoFinal(true);
      const pagamentos = filtrarPagamentosFinal(dados.pagamentos);
      if (!pagamentos.length) {
        mostrarAvisoFormulario("Não há pagamentos para os filtros selecionados.");
        return;
      }

      const grupos = agruparPorFaccaoPagamentoFinal(pagamentos);
      const totalPecas = pagamentos.reduce((soma, item) => soma + Number(item.quantidade || 0), 0);
      const totalGeral = pagamentos.reduce((soma, item) => soma + Number(item.total || 0), 0);
      const semValor = pagamentos.filter(item => statusPagamentoFinal(item) === "sem_valor");
      const duplicidades = detectarDuplicidadesPagamentoFinal(pagamentos);
      const impressoEm = new Date().toLocaleString("pt-BR");
      const filtro = textoFiltrosRelatorioPagamentoFinal();

      const secoes = grupos.map(({ faccao, itens }, indice) => {
        const cadastro = dadosCadastroFaccaoPagamentoFinal(faccao, dados.faccoes);
        const totalFaccao = itens.reduce((soma, item) => soma + Number(item.total || 0), 0);
        const pecasFaccao = itens.reduce((soma, item) => soma + Number(item.quantidade || 0), 0);
        const linhas = itens.map(item => {
          const status = statusPagamentoFinal(item);
          const subtotal = Number(item.subtotal ?? (Number(item.quantidade || 0) * Number(item.valorUnitario || 0)));
          const desconto = Number(item.descontoDefeito || 0);
          return `
            <tr class="${status === "sem_valor" ? "sem-valor" : ""}">
              <td>${escapeHtmlPagamentoFinal(dataPagamentoFinalBR(item.dataEntrega))}</td>
              <td><strong>${escapeHtmlPagamentoFinal(item.numeroOP || "-")}</strong></td>
              <td>${escapeHtmlPagamentoFinal(item.referencia || "-")}</td>
              <td>${escapeHtmlPagamentoFinal(item.processo || item.servicoNome || "-")}${item.pagamentoReenvio ? `<br><small>Reenvio</small>` : ""}</td>
              <td class="num">${formatarNumeroPagamentoFinal(item.quantidade)}</td>
              <td class="num">${formatarNumeroPagamentoFinal(item.falta)}</td>
              <td class="num">${formatarMoedaPagamentoFinal(item.valorUnitario)}</td>
              <td class="num">${formatarMoedaPagamentoFinal(subtotal)}</td>
              <td class="num">${formatarMoedaPagamentoFinal(desconto)}</td>
              <td class="num"><strong>${formatarMoedaPagamentoFinal(item.total)}</strong></td>
              <td>${status === "pago" ? "Pago" : status === "sem_valor" ? "SEM VALOR" : "Pendente"}</td>
            </tr>
          `;
        }).join("");

        return `
          <section class="faccao-section ${indice ? "quebra" : ""}">
            <div class="faccao-header">
              <div>
                <h2>${escapeHtmlPagamentoFinal(cadastro.nome || faccao)}</h2>
                <div class="faccao-meta">
                  <span><strong>Cidade:</strong> ${escapeHtmlPagamentoFinal(cadastro.cidade || "Não cadastrada")}</span>
                  <span><strong>Telefone:</strong> ${escapeHtmlPagamentoFinal(cadastro.celular || "Não cadastrado")}</span>
                </div>
              </div>
              <div class="pix-box ${cadastro.chavePix ? "" : "pix-ausente"}">
                <span>CHAVE PIX</span>
                <strong>${escapeHtmlPagamentoFinal(cadastro.chavePix || "NÃO CADASTRADA")}</strong>
                <small>Titular: ${escapeHtmlPagamentoFinal(cadastro.titularPix || "Não informado")}</small>
              </div>
            </div>
            <div class="faccao-resumo">
              <div><span>Lançamentos</span><strong>${itens.length.toLocaleString("pt-BR")}</strong></div>
              <div><span>Peças</span><strong>${pecasFaccao.toLocaleString("pt-BR")}</strong></div>
              <div><span>Total da facção</span><strong>${formatarMoedaPagamentoFinal(totalFaccao)}</strong></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Data</th><th>OP</th><th>Ref.</th><th>Processo</th><th>Qtd.</th><th>Falta</th>
                  <th>Valor unit.</th><th>Subtotal</th><th>Desconto</th><th>Total</th><th>Status</th>
                </tr>
              </thead>
              <tbody>${linhas}</tbody>
            </table>
            <div class="assinaturas">
              <div>Conferido pela empresa</div>
              <div>Responsável da facção</div>
            </div>
          </section>
        `;
      }).join("");

      const html = `
        <!doctype html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <title>Relatório de Pagamento de Facções</title>
            <style>
              * { box-sizing: border-box; }
              body { margin: 16px; font-family: Arial, sans-serif; color: #0f172a; font-size: 10.5px; }
              .doc-header { display:flex; justify-content:space-between; gap:20px; border-bottom:3px solid #111827; padding-bottom:10px; }
              .doc-header h1 { margin:0; font-size:22px; }
              .muted { color:#64748b; }
              .filtro { margin:10px 0; padding:8px 10px; border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc; }
              .geral { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:10px 0 14px; }
              .geral div, .faccao-resumo div { border:1px solid #cbd5e1; border-radius:8px; padding:8px; }
              .geral span, .faccao-resumo span { display:block; color:#64748b; font-size:9px; text-transform:uppercase; font-weight:bold; }
              .geral strong, .faccao-resumo strong { display:block; margin-top:3px; font-size:15px; }
              .alerta { padding:8px 10px; margin:8px 0; border:1px solid #fdba74; background:#fff7ed; color:#9a3412; border-radius:8px; }
              .faccao-section { margin-top:14px; }
              .faccao-section.quebra { page-break-before:always; }
              .faccao-header { display:flex; align-items:stretch; justify-content:space-between; gap:12px; margin-bottom:8px; }
              .faccao-header h2 { margin:0; font-size:18px; }
              .faccao-meta { display:flex; gap:18px; margin-top:5px; }
              .pix-box { min-width:280px; border:2px solid #16a34a; background:#f0fdf4; border-radius:10px; padding:8px 10px; }
              .pix-box.pix-ausente { border-color:#dc2626; background:#fef2f2; }
              .pix-box span { display:block; font-size:9px; font-weight:bold; color:#475569; }
              .pix-box strong { display:block; margin:3px 0; font-size:14px; word-break:break-all; }
              .pix-box small { color:#475569; }
              .faccao-resumo { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:8px; }
              table { width:100%; border-collapse:collapse; }
              th, td { border:1px solid #cbd5e1; padding:5px; vertical-align:top; }
              th { background:#e2e8f0; text-align:left; font-size:9px; }
              td.num { text-align:right; white-space:nowrap; }
              tr.sem-valor td { background:#fff7ed; color:#9a3412; }
              .assinaturas { display:grid; grid-template-columns:1fr 1fr; gap:60px; margin-top:32px; }
              .assinaturas div { border-top:1px solid #334155; padding-top:5px; text-align:center; color:#475569; }
              @page { size:landscape; margin:9mm; }
              @media print { body { margin:0; } }
            </style>
          </head>
          <body>
            <div class="doc-header">
              <div>
                <h1>Relatório de Pagamento de Facções</h1>
                <div class="muted">Sistema OP Confecção — CorpoNu</div>
              </div>
              <div class="muted">Impresso em:<br><strong>${escapeHtmlPagamentoFinal(impressoEm)}</strong></div>
            </div>
            <div class="filtro"><strong>${escapeHtmlPagamentoFinal(filtro)}</strong></div>
            <div class="geral">
              <div><span>Facções</span><strong>${grupos.length.toLocaleString("pt-BR")}</strong></div>
              <div><span>Lançamentos</span><strong>${pagamentos.length.toLocaleString("pt-BR")}</strong></div>
              <div><span>Peças</span><strong>${totalPecas.toLocaleString("pt-BR")}</strong></div>
              <div><span>Total geral</span><strong>${formatarMoedaPagamentoFinal(totalGeral)}</strong></div>
            </div>
            ${semValor.length ? `<div class="alerta"><strong>Atenção:</strong> ${semValor.length} lançamento(s) estão sem valor e aparecem destacados no relatório. Não finalize o pagamento desses itens.</div>` : ""}
            ${duplicidades.length ? `<div class="alerta"><strong>Atenção:</strong> ${duplicidades.length} possível(is) duplicidade(s) foram encontradas nos dados impressos. Confira antes do pagamento.</div>` : ""}
            ${secoes}
            <script>window.addEventListener("load", () => { window.focus(); window.print(); });<\/script>
          </body>
        </html>
      `;

      const janela = window.open("", "_blank");
      if (!janela) {
        mostrarAvisoFormulario("O navegador bloqueou a impressão. Permita pop-ups para este site.");
        return;
      }
      janela.document.open();
      janela.document.write(html);
      janela.document.close();
    } catch (error) {
      console.error("Erro ao gerar relatório final de pagamento.", error);
      mostrarAvisoFormulario("Não foi possível gerar o relatório. Verifique a conexão e tente novamente.");
    }
  }

  async function perfilAdminPagamentoFinal(contexto) {
    const usuario = contexto.auth.currentUser;
    if (!usuario) return { ok: false, usuario: null, perfil: null };
    const snap = await contexto.firestore.getDoc(
      contexto.firestore.doc(contexto.db, "usuarios", usuario.uid)
    );
    const perfil = snap.exists() ? snap.data() : null;
    return {
      ok: Boolean(perfil && perfil.ativo === true && perfil.tipo === "admin"),
      usuario,
      perfil
    };
  }

  async function fecharPagamentosFiltradosSeguro() {
    try {
      const contexto = await obterContextoTravasDuplicidade();
      const acesso = await perfilAdminPagamentoFinal(contexto);
      if (!acesso.ok) {
        mostrarAvisoFormulario("Apenas administrador ativo pode fechar pagamentos.");
        return;
      }

      const dados = await carregarDadosPagamentoFinal(true);
      const filtrados = filtrarPagamentosFinal(dados.pagamentos)
        .filter(item => statusPagamentoFinal(item) !== "pago");

      if (!filtrados.length) {
        mostrarAvisoFormulario("Nenhum pagamento pendente foi encontrado no filtro atual.");
        return;
      }

      const semValor = filtrados.filter(item => statusPagamentoFinal(item) === "sem_valor");
      if (semValor.length) {
        mostrarAvisoFormulario(`Fechamento bloqueado: ${semValor.length} lançamento(s) estão sem valor cadastrado. Cadastre os valores antes de marcar como pago.`);
        return;
      }

      const duplicidades = detectarDuplicidadesPagamentoFinal(filtrados);
      if (duplicidades.length) {
        mostrarAvisoFormulario(`Fechamento bloqueado: foram encontradas ${duplicidades.length} possível(is) duplicidade(s). Revise os registros antes de pagar.`);
        return;
      }

      if (filtrados.length > 450) {
        mostrarAvisoFormulario("O filtro possui mais de 450 lançamentos. Reduza o período ou selecione uma facção para garantir um fechamento único e seguro.");
        return;
      }

      const total = filtrados.reduce((soma, item) => soma + Number(item.total || 0), 0);
      const confirmar = window.confirm(
        `Marcar ${filtrados.length} pagamento(s) como pagos?\n\nTotal: ${formatarMoedaPagamentoFinal(total)}\n\nEsta ação ficará registrada na auditoria.`
      );
      if (!confirmar) return;

      const batch = contexto.firestore.writeBatch(contexto.db);
      filtrados.forEach(item => {
        batch.set(
          contexto.firestore.doc(contexto.db, "entregasPagamento", item.id),
          {
            statusPagamento: "pago",
            pagoEm: contexto.firestore.serverTimestamp(),
            pagoPor: acesso.usuario.uid,
            atualizadoPor: acesso.usuario.uid,
            atualizadoEm: contexto.firestore.serverTimestamp()
          },
          { merge: true }
        );
      });
      await batch.commit();

      try {
        await contexto.firestore.addDoc(
          contexto.firestore.collection(contexto.db, "logsAlteracoes"),
          {
            acao: "pagamentos_filtrados_fechados_seguro",
            tipoAlvo: "entregaPagamento",
            alvoId: "lote",
            detalhes: `${filtrados.length} pagamentos | ${formatarMoedaPagamentoFinal(total)} | ${textoFiltrosRelatorioPagamentoFinal()}`,
            usuarioUid: acesso.usuario.uid,
            usuarioNome: acesso.perfil.nome || "",
            usuarioEmail: acesso.perfil.email || acesso.usuario.email || "",
            usuarioTipo: acesso.perfil.tipo || "admin",
            criadoEm: contexto.firestore.serverTimestamp()
          }
        );
      } catch (errorLog) {
        console.warn("Pagamento fechado, mas o log adicional não foi criado.", errorLog);
      }

      cachePagamentoFinal.expiraEm = 0;
      mostrarAvisoFormulario(`${filtrados.length} pagamento(s) marcados como pagos. Total: ${formatarMoedaPagamentoFinal(total)}.`);
      setTimeout(() => atualizarConferenciaPagamentoFinal(true), 700);
    } catch (error) {
      console.error("Erro no fechamento seguro dos pagamentos.", error);
      mostrarAvisoFormulario("Não foi possível fechar os pagamentos. Nenhuma alteração adicional deve ser feita até conferir a conexão.");
    }
  }

  async function alternarPagamentoIndividualSeguro(id) {
    try {
      const contexto = await obterContextoTravasDuplicidade();
      const acesso = await perfilAdminPagamentoFinal(contexto);
      if (!acesso.ok) {
        mostrarAvisoFormulario("Apenas administrador ativo pode alterar pagamentos.");
        return;
      }

      const referencia = contexto.firestore.doc(contexto.db, "entregasPagamento", id);
      const snapshot = await contexto.firestore.getDoc(referencia);
      if (!snapshot.exists()) {
        mostrarAvisoFormulario("Pagamento não encontrado. Atualize a tela e tente novamente.");
        return;
      }
      const item = { id: snapshot.id, ...snapshot.data() };
      const statusAtual = statusPagamentoFinal(item);

      if (statusAtual === "sem_valor") {
        mostrarAvisoFormulario(`Pagamento da OP ${item.numeroOP || "-"} bloqueado: cadastre o valor de ${item.referencia || "-"} + ${item.processo || item.servicoNome || "processo"} antes de pagar.`);
        return;
      }

      const dados = await carregarDadosPagamentoFinal(true);
      if (statusAtual !== "pago") {
        const chave = chaveDuplicidadePagamentoFinal(item);
        const repetidos = dados.pagamentos.filter(outro =>
          String(outro.id) !== String(item.id) &&
          pagamentoAtivoFinal(outro) &&
          chaveDuplicidadePagamentoFinal(outro) === chave
        );
        if (repetidos.length) {
          mostrarAvisoFormulario(`Pagamento bloqueado: existe outro lançamento possivelmente duplicado para a OP ${item.numeroOP || "-"}. Revise antes de pagar.`);
          return;
        }
      }

      const novoStatus = statusAtual === "pago" ? "pendente" : "pago";
      const acao = novoStatus === "pago" ? "marcar como pago" : "reabrir como pendente";
      if (!window.confirm(`${acao.charAt(0).toUpperCase() + acao.slice(1)} o pagamento da OP ${item.numeroOP || "-"}?\n\nValor: ${formatarMoedaPagamentoFinal(item.total)}`)) {
        return;
      }

      await contexto.firestore.setDoc(referencia, {
        statusPagamento: novoStatus,
        pagoEm: novoStatus === "pago" ? contexto.firestore.serverTimestamp() : null,
        pagoPor: novoStatus === "pago" ? acesso.usuario.uid : "",
        atualizadoPor: acesso.usuario.uid,
        atualizadoEm: contexto.firestore.serverTimestamp()
      }, { merge: true });

      try {
        await contexto.firestore.addDoc(
          contexto.firestore.collection(contexto.db, "logsAlteracoes"),
          {
            acao: novoStatus === "pago" ? "entrega_pagamento_paga_segura" : "entrega_pagamento_reaberta_segura",
            tipoAlvo: "entregaPagamento",
            alvoId: id,
            detalhes: `OP ${item.numeroOP || "-"} | ${item.faccao || "-"} | ${item.processo || item.servicoNome || "-"} | ${formatarMoedaPagamentoFinal(item.total)}`,
            usuarioUid: acesso.usuario.uid,
            usuarioNome: acesso.perfil.nome || "",
            usuarioEmail: acesso.perfil.email || acesso.usuario.email || "",
            usuarioTipo: acesso.perfil.tipo || "admin",
            criadoEm: contexto.firestore.serverTimestamp()
          }
        );
      } catch (erroLog) {
        console.warn("Pagamento alterado, mas o log adicional não foi criado.", erroLog);
      }

      cachePagamentoFinal.expiraEm = 0;
      mostrarAvisoFormulario(novoStatus === "pago" ? "Pagamento marcado como pago." : "Pagamento reaberto como pendente.");
      setTimeout(() => atualizarConferenciaPagamentoFinal(true), 500);
    } catch (error) {
      console.error("Erro ao alterar pagamento individual com segurança.", error);
      mostrarAvisoFormulario("Não foi possível alterar o pagamento. Atualize a tela e tente novamente.");
    }
  }

  function instalarEventosPagamentoFinal() {
    if (document.documentElement.dataset.pagamentoFinalEventos === APP_VERSION) return;
    document.documentElement.dataset.pagamentoFinalEventos = APP_VERSION;

    document.addEventListener("click", event => {
      const imprimir = event.target?.closest?.("#btnImprimirPagamento");
      if (imprimir) {
        event.preventDefault();
        event.stopImmediatePropagation();
        imprimirRelatorioPagamentoFinal();
        return;
      }

      const fechar = event.target?.closest?.("#btnMarcarPagamentosFiltrados");
      if (fechar) {
        event.preventDefault();
        event.stopImmediatePropagation();
        fecharPagamentosFiltradosSeguro();
        return;
      }

      const atualizar = event.target?.closest?.("#btnAtualizarConferenciaPagamentoFinal");
      if (atualizar) {
        event.preventDefault();
        cachePagamentoFinal.expiraEm = 0;
        atualizarConferenciaPagamentoFinal(true);
        return;
      }

      const pagarIndividual = event.target?.closest?.('#listaEntregasPagamento button[onclick*="alternarStatusEntregaPagamento"]');
      if (pagarIndividual) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const id = idPagamentoPeloBotaoFinal(pagarIndividual);
        if (id) alternarPagamentoIndividualSeguro(id);
      }
    }, true);

    document.addEventListener("change", event => {
      if (event.target?.closest?.("#pagamentos") && [
        "pagamentoDataInicio",
        "pagamentoDataFim",
        "pagamentoFiltroFaccao",
        "pagamentoFiltroReferencia",
        "pagamentoFiltroPreco",
        "pagamentoFiltroStatus"
      ].includes(event.target.id)) {
        agendarConferenciaPagamentoFinal(false);
      }
    }, true);

    document.addEventListener("click", event => {
      const nav = event.target?.closest?.('[data-page="pagamentos"], [data-target="pagamentos"], a[href="#pagamentos"]');
      if (nav) setTimeout(() => agendarConferenciaPagamentoFinal(true), 500);
    }, true);
  }

  function iniciarRevisaoFinalPagamentos() {
    injetarEstilosPagamentoFinal();
    garantirOpcaoSemValorPagamentoFinal();
    inserirPainelConferenciaPagamentoFinal();
    instalarEventosPagamentoFinal();
    instalarObserverTabelaPagamentoFinal();

    const botaoImprimir = document.getElementById("btnImprimirPagamento");
    if (botaoImprimir) {
      botaoImprimir.textContent = "Relatório completo com PIX";
      botaoImprimir.title = "Imprime um relatório separado por facção com chave PIX, titular, contato, OPs, descontos e totais.";
    }

    setTimeout(() => {
      garantirOpcaoSemValorPagamentoFinal();
      inserirPainelConferenciaPagamentoFinal();
      aprimorarTabelaEntregasPagamentoFinal();
      agendarConferenciaPagamentoFinal(true);
    }, 1200);
  }


  // =========================================================
  // HOTFIX: TELAS EXCLUSIVAS DE GERENCIAMENTO
  // - Gerenciar valores abre como uma tela própria sobre Pagamentos.
  // - Gerenciar facções abre como uma tela própria sobre Facções.
  // - Preserva os painéis, formulários, IDs e eventos originais do app.js.
  // =========================================================
  const TELAS_EXCLUSIVAS_GERENCIAMENTO = Object.freeze({
    valores: {
      painelId: "painelGerenciarValores",
      botaoId: "btnToggleGerenciarValores",
      botaoFecharId: "btnFecharGerenciarValores",
      titulo: "Gerenciar valores",
      subtitulo: "Cadastre e organize valores por referência e processo sem misturar com o fechamento de pagamentos.",
      voltar: "Voltar para pagamentos",
      textoBotaoPrincipal: "Gerenciar valores"
    },
    faccoes: {
      painelId: "painelGerenciarFaccoes",
      botaoId: "btnToggleGerenciarFaccoes",
      botaoFecharId: "",
      titulo: "Gerenciar facções",
      subtitulo: "Cadastre, edite e organize as facções em uma área separada da movimentação operacional.",
      voltar: "Voltar para facções",
      textoBotaoPrincipal: "Gerenciar facções"
    }
  });

  let telaExclusivaGerenciamentoAtiva = "";
  let observerTelasExclusivasGerenciamento = null;
  let overflowAnteriorTelaExclusiva = "";

  function injetarEstilosTelasExclusivasGerenciamento() {
    if (document.getElementById("styleTelasExclusivasGerenciamento")) return;

    const style = document.createElement("style");
    style.id = "styleTelasExclusivasGerenciamento";
    style.textContent = `
      body.gerenciamento-exclusivo-aberto {
        overflow: hidden !important;
      }

      #painelGerenciarValores.painel-tela-exclusiva-ativo,
      #painelGerenciarFaccoes.painel-tela-exclusiva-ativo {
        position: fixed !important;
        inset: 0 !important;
        z-index: 100000 !important;
        display: block !important;
        width: 100vw !important;
        max-width: none !important;
        height: 100vh !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 24px 40px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: #f8fafc !important;
        box-shadow: none !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
      }

      .gerenciamento-exclusivo-toolbar {
        position: sticky;
        top: 0;
        z-index: 20;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 16px;
        min-height: 82px;
        margin: 0 -24px 22px;
        padding: 14px 24px;
        border-bottom: 1px solid #dbe3ee;
        background: rgba(248, 250, 252, 0.97);
        backdrop-filter: blur(12px);
        box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
      }

      .gerenciamento-exclusivo-toolbar .btn-voltar-gerenciamento {
        min-width: 150px;
        min-height: 42px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 10px 14px;
        background: #ffffff;
        color: #0f172a;
        font-weight: 800;
        cursor: pointer;
      }

      .gerenciamento-exclusivo-toolbar .btn-voltar-gerenciamento:hover {
        background: #f1f5f9;
      }

      .gerenciamento-exclusivo-titulo {
        min-width: 0;
      }

      .gerenciamento-exclusivo-titulo strong {
        display: block;
        color: #0f172a;
        font-size: 22px;
        line-height: 1.15;
      }

      .gerenciamento-exclusivo-titulo span {
        display: block;
        margin-top: 4px;
        color: #64748b;
        font-size: 13px;
        line-height: 1.35;
      }

      #painelGerenciarValores.painel-tela-exclusiva-ativo > .panel-header,
      #painelGerenciarFaccoes.painel-tela-exclusiva-ativo > .panel-subheader {
        margin-top: 0 !important;
      }

      #painelGerenciarValores.painel-tela-exclusiva-ativo .valores-workspace,
      #painelGerenciarFaccoes.painel-tela-exclusiva-ativo .table-wrap {
        width: 100%;
      }

      @media (max-width: 780px) {
        #painelGerenciarValores.painel-tela-exclusiva-ativo,
        #painelGerenciarFaccoes.painel-tela-exclusiva-ativo {
          padding: 0 12px 28px !important;
        }

        .gerenciamento-exclusivo-toolbar {
          grid-template-columns: 1fr;
          gap: 10px;
          margin: 0 -12px 16px;
          padding: 12px;
        }

        .gerenciamento-exclusivo-toolbar .btn-voltar-gerenciamento {
          width: 100%;
        }

        .gerenciamento-exclusivo-titulo strong {
          font-size: 19px;
        }
      }

      @media print {
        .gerenciamento-exclusivo-toolbar {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getConfiguracaoTelaExclusivaPorPainel(painel) {
    if (!painel) return null;
    return Object.entries(TELAS_EXCLUSIVAS_GERENCIAMENTO)
      .find(([, config]) => config.painelId === painel.id) || null;
  }

  function garantirToolbarTelaExclusiva(chave, config, painel) {
    let toolbar = painel.querySelector(":scope > .gerenciamento-exclusivo-toolbar");
    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.className = "gerenciamento-exclusivo-toolbar";
      toolbar.innerHTML = `
        <button class="btn-voltar-gerenciamento" type="button"></button>
        <div class="gerenciamento-exclusivo-titulo">
          <strong></strong>
          <span></span>
        </div>
      `;
      painel.insertBefore(toolbar, painel.firstChild);
    }

    const botaoVoltar = toolbar.querySelector(".btn-voltar-gerenciamento");
    const titulo = toolbar.querySelector("strong");
    const subtitulo = toolbar.querySelector("span");

    if (botaoVoltar) {
      botaoVoltar.textContent = `← ${config.voltar}`;
      botaoVoltar.dataset.fecharTelaGerenciamento = chave;
    }
    if (titulo) titulo.textContent = config.titulo;
    if (subtitulo) subtitulo.textContent = config.subtitulo;

    return toolbar;
  }

  function abrirTelaExclusivaGerenciamento(chave, opcoes = {}) {
    const config = TELAS_EXCLUSIVAS_GERENCIAMENTO[chave];
    if (!config) return false;

    const painel = document.getElementById(config.painelId);
    if (!painel) return false;

    if (
      telaExclusivaGerenciamentoAtiva &&
      telaExclusivaGerenciamentoAtiva !== chave
    ) {
      fecharTelaExclusivaGerenciamento(telaExclusivaGerenciamentoAtiva, {
        manterFoco: false
      });
    }

    injetarEstilosTelasExclusivasGerenciamento();
    garantirToolbarTelaExclusiva(chave, config, painel);

    painel.classList.remove("hidden");
    painel.classList.add("painel-tela-exclusiva-ativo");
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-modal", "true");
    painel.setAttribute("aria-label", config.titulo);

    if (!document.body.classList.contains("gerenciamento-exclusivo-aberto")) {
      overflowAnteriorTelaExclusiva = document.body.style.overflow || "";
    }
    document.body.classList.add("gerenciamento-exclusivo-aberto");
    document.body.style.overflow = "hidden";

    telaExclusivaGerenciamentoAtiva = chave;

    const botaoPrincipal = document.getElementById(config.botaoId);
    if (botaoPrincipal) {
      botaoPrincipal.textContent = config.textoBotaoPrincipal;
      botaoPrincipal.setAttribute("aria-expanded", "true");
    }

    if (config.botaoFecharId) {
      const botaoFecharOriginal = document.getElementById(config.botaoFecharId);
      if (botaoFecharOriginal) {
        botaoFecharOriginal.textContent = config.voltar;
        botaoFecharOriginal.title = config.voltar;
      }
    }

    if (opcoes.rolarTopo !== false) {
      painel.scrollTop = 0;
    }

    setTimeout(() => {
      painel.querySelector(".btn-voltar-gerenciamento")?.focus({ preventScroll: true });
    }, 40);

    return true;
  }

  function fecharTelaExclusivaGerenciamento(chave = telaExclusivaGerenciamentoAtiva, opcoes = {}) {
    const config = TELAS_EXCLUSIVAS_GERENCIAMENTO[chave];
    if (!config) return false;

    const painel = document.getElementById(config.painelId);
    if (painel) {
      painel.classList.remove("painel-tela-exclusiva-ativo");
      painel.classList.add("hidden");
      painel.removeAttribute("role");
      painel.removeAttribute("aria-modal");
      painel.removeAttribute("aria-label");
    }

    const botaoPrincipal = document.getElementById(config.botaoId);
    if (botaoPrincipal) {
      botaoPrincipal.textContent = config.textoBotaoPrincipal;
      botaoPrincipal.setAttribute("aria-expanded", "false");
    }

    if (config.botaoFecharId) {
      const botaoFecharOriginal = document.getElementById(config.botaoFecharId);
      if (botaoFecharOriginal) {
        botaoFecharOriginal.textContent = "Ocultar valores";
        botaoFecharOriginal.title = "";
      }
    }

    if (telaExclusivaGerenciamentoAtiva === chave) {
      telaExclusivaGerenciamentoAtiva = "";
    }

    const aindaAberta = Object.values(TELAS_EXCLUSIVAS_GERENCIAMENTO).some(item => {
      return document.getElementById(item.painelId)?.classList.contains("painel-tela-exclusiva-ativo");
    });

    if (!aindaAberta) {
      document.body.classList.remove("gerenciamento-exclusivo-aberto");
      document.body.style.overflow = overflowAnteriorTelaExclusiva;
    }

    if (opcoes.manterFoco !== false) {
      setTimeout(() => botaoPrincipal?.focus({ preventScroll: true }), 20);
    }

    return true;
  }

  function sincronizarPainelComoTelaExclusiva(chave) {
    const config = TELAS_EXCLUSIVAS_GERENCIAMENTO[chave];
    const painel = config ? document.getElementById(config.painelId) : null;
    if (!painel) return;

    if (!painel.classList.contains("hidden")) {
      abrirTelaExclusivaGerenciamento(chave, { rolarTopo: false });
    }
  }

  function instalarEventosTelasExclusivasGerenciamento() {
    if (document.__eventosTelasExclusivasGerenciamentoInstalados) return;
    document.__eventosTelasExclusivasGerenciamentoInstalados = true;

    document.addEventListener("click", event => {
      const alvo = event.target?.closest?.(
        "#btnToggleGerenciarValores, #btnToggleGerenciarFaccoes"
      );
      if (!alvo) return;

      const chave = alvo.id === "btnToggleGerenciarValores" ? "valores" : "faccoes";

      // O listener original do app.js abre e prepara o painel primeiro.
      // Em seguida, transformamos o mesmo painel em uma tela exclusiva.
      setTimeout(() => sincronizarPainelComoTelaExclusiva(chave), 0);
    });

    document.addEventListener("click", event => {
      const botaoVoltar = event.target?.closest?.("[data-fechar-tela-gerenciamento]");
      if (botaoVoltar) {
        event.preventDefault();
        event.stopPropagation();
        fecharTelaExclusivaGerenciamento(
          botaoVoltar.dataset.fecharTelaGerenciamento || telaExclusivaGerenciamentoAtiva
        );
        return;
      }

      const fecharValores = event.target?.closest?.("#btnFecharGerenciarValores");
      if (fecharValores && telaExclusivaGerenciamentoAtiva === "valores") {
        setTimeout(() => fecharTelaExclusivaGerenciamento("valores"), 0);
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape" || !telaExclusivaGerenciamentoAtiva) return;
      event.preventDefault();
      fecharTelaExclusivaGerenciamento(telaExclusivaGerenciamentoAtiva);
    });
  }

  function instalarObserverTelasExclusivasGerenciamento() {
    if (observerTelasExclusivasGerenciamento) return;

    observerTelasExclusivasGerenciamento = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        const painel = mutation.target;
        const entrada = getConfiguracaoTelaExclusivaPorPainel(painel);
        if (!entrada) return;

        const [chave] = entrada;
        if (
          !painel.classList.contains("hidden") &&
          !painel.classList.contains("painel-tela-exclusiva-ativo")
        ) {
          setTimeout(() => abrirTelaExclusivaGerenciamento(chave, {
            rolarTopo: false
          }), 0);
        }

        if (
          painel.classList.contains("hidden") &&
          painel.classList.contains("painel-tela-exclusiva-ativo")
        ) {
          painel.classList.remove("painel-tela-exclusiva-ativo");
          if (telaExclusivaGerenciamentoAtiva === chave) {
            telaExclusivaGerenciamentoAtiva = "";
            document.body.classList.remove("gerenciamento-exclusivo-aberto");
            document.body.style.overflow = overflowAnteriorTelaExclusiva;
          }
        }
      });
    });

    Object.values(TELAS_EXCLUSIVAS_GERENCIAMENTO).forEach(config => {
      const painel = document.getElementById(config.painelId);
      if (painel) {
        observerTelasExclusivasGerenciamento.observe(painel, {
          attributes: true,
          attributeFilter: ["class"]
        });
      }
    });
  }

  function iniciarTelasExclusivasGerenciamento() {
    injetarEstilosTelasExclusivasGerenciamento();
    instalarEventosTelasExclusivasGerenciamento();
    instalarObserverTelasExclusivasGerenciamento();

    Object.entries(TELAS_EXCLUSIVAS_GERENCIAMENTO).forEach(([chave, config]) => {
      const painel = document.getElementById(config.painelId);
      const botao = document.getElementById(config.botaoId);

      if (painel && !painel.classList.contains("hidden")) {
        abrirTelaExclusivaGerenciamento(chave, { rolarTopo: false });
      }

      if (botao) {
        botao.setAttribute("aria-haspopup", "dialog");
        botao.setAttribute("aria-expanded", "false");
        botao.title = `${config.titulo} em uma tela exclusiva`;
      }
    });
  }



  // =========================================================
  // INTERFACE SEGURA DA TELA DE PAGAMENTOS
  // Apenas organiza elementos estáticos uma vez.
  // Não usa MutationObserver, não altera cálculos e não consulta o Firebase.
  // =========================================================
  function injetarEstilosTelaPagamentosSegura() {
    if (document.getElementById("styleTelaPagamentosSegura")) return;

    const style = document.createElement("style");
    style.id = "styleTelaPagamentosSegura";
    style.textContent = `
      #pagamentos.pagamentos-ui-segura {
        --pag-cor-fundo: #f3f6fb;
        --pag-cor-card: #ffffff;
        --pag-cor-borda: #dbe3ee;
        --pag-cor-texto: #0f172a;
        --pag-cor-muted: #64748b;
        --pag-cor-roxo: #7c3aed;
        --pag-cor-verde: #15803d;
      }

      #pagamentos.pagamentos-ui-segura > .pagamentos-relatorio-panel {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      #pagamentos.pagamentos-ui-segura .pagamentos-relatorio-panel > .panel-header:first-child {
        order: 1;
        align-items: center;
        margin: 0 !important;
        padding: 20px;
        border: 1px solid var(--pag-cor-borda);
        border-radius: 18px;
        background: linear-gradient(135deg, #ffffff 0%, #f7f3ff 100%);
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
      }

      #pagamentos.pagamentos-ui-segura .pagamentos-relatorio-panel > .panel-header:first-child h3 {
        font-size: 22px;
        color: var(--pag-cor-texto);
      }

      #pagamentos.pagamentos-ui-segura .pagamentos-relatorio-panel > .panel-header:first-child p {
        max-width: 760px;
        line-height: 1.45;
      }

      #pagamentos.pagamentos-ui-segura #btnToggleGerenciarValores {
        min-height: 42px;
        white-space: nowrap;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-filtros-entregas {
        order: 2;
        display: grid !important;
        grid-template-columns: repeat(6, minmax(130px, 1fr));
        gap: 12px !important;
        align-items: end;
        margin: 0 !important;
        padding: 18px !important;
        border: 1px solid var(--pag-cor-borda) !important;
        border-radius: 18px !important;
        background: var(--pag-cor-card) !important;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
      }

      #pagamentos.pagamentos-ui-segura .pagamento-filtros-entregas::before {
        content: "1. Selecione o período e os filtros";
        grid-column: 1 / -1;
        color: var(--pag-cor-texto);
        font-size: 16px;
        font-weight: 900;
        line-height: 1.2;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-filtros-entregas label {
        min-width: 0;
        color: #334155;
        font-size: 12px;
        font-weight: 900;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-filtros-entregas input,
      #pagamentos.pagamentos-ui-segura .pagamento-filtros-entregas select {
        min-height: 42px;
        padding: 10px 11px;
        border-color: #cbd5e1;
        border-radius: 11px;
        font-size: 13px;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-acoes-principais {
        grid-column: 1 / -1;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 10px;
        padding-top: 4px;
        border-top: 1px solid #eef2f7;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-acoes-principais .btn {
        min-height: 42px;
      }

      #pagamentos.pagamentos-ui-segura #btnLimparFiltrosPagamento {
        margin-right: auto;
        color: #475569;
        background: #f8fafc;
      }

      #pagamentos.pagamentos-ui-segura #btnMarcarPagamentosFiltrados {
        background: #15803d;
        border-color: #15803d;
      }

      #pagamentos.pagamentos-ui-segura #btnImprimirPagamento {
        background: #0f172a;
        border-color: #0f172a;
        color: #ffffff;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-cards {
        order: 3;
        display: grid !important;
        grid-template-columns: repeat(4, minmax(160px, 1fr));
        gap: 12px !important;
        margin: 0 !important;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-card {
        min-height: 104px;
        padding: 17px !important;
        border: 1px solid var(--pag-cor-borda) !important;
        border-radius: 16px !important;
        background: var(--pag-cor-card) !important;
        box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
      }

      #pagamentos.pagamentos-ui-segura .pagamento-card span {
        color: var(--pag-cor-muted);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-card strong {
        margin-top: 8px;
        color: var(--pag-cor-texto);
        font-size: 25px;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-card.destaque {
        border-color: rgba(124, 58, 237, .35) !important;
        background: linear-gradient(135deg, #ffffff 0%, #f3e8ff 100%) !important;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-card.destaque strong {
        color: #6d28d9;
      }

      #pagamentos.pagamentos-ui-segura #painelConferenciaPagamentoFinal {
        order: 4;
        margin: 0 !important;
        padding: 17px !important;
        border-radius: 18px !important;
        box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
      }

      #pagamentos.pagamentos-ui-segura #painelConferenciaPagamentoFinal .pagamento-final-header h4::before {
        content: "2. ";
      }

      #pagamentos.pagamentos-ui-segura .pagamento-resumo-faccoes-wrap {
        order: 5;
        position: relative;
        margin: 0 !important;
        padding: 56px 14px 14px;
        border: 1px solid var(--pag-cor-borda);
        border-radius: 18px;
        background: var(--pag-cor-card);
        box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
      }

      #pagamentos.pagamentos-ui-segura .pagamento-resumo-faccoes-wrap::before {
        content: "3. Resumo por facção e processo";
        position: absolute;
        top: 18px;
        left: 18px;
        color: var(--pag-cor-texto);
        font-size: 16px;
        font-weight: 900;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-resumo-faccoes-wrap::after {
        content: "Confira os totais agrupados antes de fechar ou imprimir.";
        position: absolute;
        top: 39px;
        left: 18px;
        color: var(--pag-cor-muted);
        font-size: 11px;
      }

      #pagamentos.pagamentos-ui-segura .entregas-header {
        order: 6;
        margin: 2px 0 -6px !important;
        padding: 17px 18px !important;
        border: 1px solid var(--pag-cor-borda);
        border-radius: 18px 18px 0 0;
        background: #ffffff;
      }

      #pagamentos.pagamentos-ui-segura .entregas-header h3::before {
        content: "4. ";
      }

      #pagamentos.pagamentos-ui-segura .pagamento-lancamentos-wrap {
        order: 7;
        margin: -16px 0 0 !important;
        padding: 12px;
        border: 1px solid var(--pag-cor-borda);
        border-top: 0;
        border-radius: 0 0 18px 18px;
        background: #ffffff;
        box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
      }

      #pagamentos.pagamentos-ui-segura .pagamento-resumo-faccoes-wrap table,
      #pagamentos.pagamentos-ui-segura .pagamento-lancamentos-wrap table {
        border-collapse: separate;
        border-spacing: 0;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-resumo-faccoes-wrap thead th,
      #pagamentos.pagamentos-ui-segura .pagamento-lancamentos-wrap thead th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #eef2ff;
        color: #334155;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .025em;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-resumo-faccoes-wrap tbody tr:nth-child(even),
      #pagamentos.pagamentos-ui-segura .pagamento-lancamentos-wrap tbody tr:nth-child(even) {
        background: #fafbfe;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-resumo-faccoes-wrap tbody tr:hover,
      #pagamentos.pagamentos-ui-segura .pagamento-lancamentos-wrap tbody tr:hover {
        background: #f5f3ff;
      }

      #pagamentos.pagamentos-ui-segura .pagamento-lancamentos-wrap {
        max-height: 58vh;
        overflow: auto;
      }

      @media (max-width: 1280px) {
        #pagamentos.pagamentos-ui-segura .pagamento-filtros-entregas {
          grid-template-columns: repeat(3, minmax(150px, 1fr));
        }
        #pagamentos.pagamentos-ui-segura .pagamento-cards {
          grid-template-columns: repeat(2, minmax(160px, 1fr));
        }
      }

      @media (max-width: 780px) {
        #pagamentos.pagamentos-ui-segura .pagamentos-relatorio-panel > .panel-header:first-child {
          align-items: stretch;
          flex-direction: column;
        }
        #pagamentos.pagamentos-ui-segura #btnToggleGerenciarValores {
          width: 100%;
        }
        #pagamentos.pagamentos-ui-segura .pagamento-filtros-entregas {
          grid-template-columns: 1fr;
          padding: 14px !important;
        }
        #pagamentos.pagamentos-ui-segura .pagamento-acoes-principais {
          display: grid;
          grid-template-columns: 1fr;
        }
        #pagamentos.pagamentos-ui-segura #btnLimparFiltrosPagamento {
          margin-right: 0;
        }
        #pagamentos.pagamentos-ui-segura .pagamento-acoes-principais .btn {
          width: 100%;
        }
        #pagamentos.pagamentos-ui-segura .pagamento-cards {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 480px) {
        #pagamentos.pagamentos-ui-segura .pagamento-cards {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function organizarTelaPagamentosSegura() {
    const pagina = document.getElementById("pagamentos");
    const painel = pagina?.querySelector(".pagamentos-relatorio-panel");
    const filtros = painel?.querySelector(".pagamento-filtros-entregas");
    if (!pagina || !painel || !filtros) return;

    injetarEstilosTelaPagamentosSegura();
    pagina.classList.add("pagamentos-ui-segura");

    if (!filtros.querySelector(".pagamento-acoes-principais")) {
      const botoes = [
        document.getElementById("btnLimparFiltrosPagamento"),
        document.getElementById("btnMarcarPagamentosFiltrados"),
        document.getElementById("btnImprimirPagamento")
      ].filter(Boolean);

      if (botoes.length) {
        const acoes = document.createElement("div");
        acoes.className = "pagamento-acoes-principais";
        botoes.forEach(botao => acoes.appendChild(botao));
        filtros.appendChild(acoes);
      }
    }

    painel.querySelectorAll(":scope > .table-wrap").forEach(wrap => {
      if (wrap.querySelector(".pagamento-table")) {
        wrap.classList.add("pagamento-resumo-faccoes-wrap");
      }
      if (wrap.querySelector(".entregas-pagamento-table")) {
        wrap.classList.add("pagamento-lancamentos-wrap");
      }
    });

    const btnLimpar = document.getElementById("btnLimparFiltrosPagamento");
    const btnPagar = document.getElementById("btnMarcarPagamentosFiltrados");
    const btnImprimir = document.getElementById("btnImprimirPagamento");
    const btnValores = document.getElementById("btnToggleGerenciarValores");

    if (btnLimpar) btnLimpar.textContent = "Limpar filtros";
    if (btnPagar) btnPagar.textContent = "Confirmar pagamentos filtrados";
    if (btnImprimir) btnImprimir.textContent = "Gerar relatório com PIX";
    if (btnValores) btnValores.textContent = "Valores por processo";
  }

  function iniciarTelaPagamentosSegura() {
    organizarTelaPagamentosSegura();

    if (document.__eventoTelaPagamentosSeguraInstalado) return;
    document.__eventoTelaPagamentosSeguraInstalado = true;

    document.addEventListener("click", event => {
      const navPagamentos = event.target?.closest?.('.nav-btn[data-page="pagamentos"]');
      if (!navPagamentos) return;
      setTimeout(organizarTelaPagamentosSegura, 80);
    });
  }



  // =========================================================
  // CONTROLE SEPARADO DE SUGESTÕES: SUTIÃ E CALCINHA
  // - Mantém configuracoes/fasesManejo como lista oficial do Sutiã.
  // - Cria configuracoes/fasesManejoCalcinha para a Calcinha.
  // - Não usa MutationObserver de DOM; aplica a lista por eventos pontuais.
  // =========================================================
  const FASES_CALCINHA_CONFIG_DOCUMENTO = "fasesManejoCalcinha";
  const ID_DATALIST_FASES_CALCINHA = "manejoFasesListCalcinha";
  const ID_PAINEL_FASES_CALCINHA = "painelSugestoesFasesCalcinhaAdmin";
  let fasesCalcinhaGerenciadas = [];
  let configuracaoFasesCalcinhaExiste = false;
  let usuarioEhAdminFasesCalcinha = false;
  let contextoFirebaseFasesCalcinha = null;
  let unsubscribeConfiguracaoFasesCalcinha = null;
  let unsubscribeAuthFasesCalcinha = null;
  let eventosFasesCalcinhaInstalados = false;
  let tentativasPainelFasesCalcinha = 0;

  function garantirDatalistFasesCalcinha() {
    let datalist = document.getElementById(ID_DATALIST_FASES_CALCINHA);
    if (datalist) return datalist;
    datalist = document.createElement("datalist");
    datalist.id = ID_DATALIST_FASES_CALCINHA;
    (document.body || document.documentElement).appendChild(datalist);
    return datalist;
  }

  function renderDatalistFasesCalcinha() {
    const datalist = garantirDatalistFasesCalcinha();
    const lista = ordenarFasesGerenciadas(fasesCalcinhaGerenciadas);
    const atual = [...datalist.querySelectorAll("option")]
      .map(option => normalizarFaseGerenciada(option.value || option.textContent || ""));
    const igual = atual.length === lista.length && atual.every((item, indice) =>
      chaveFaseGerenciada(item) === chaveFaseGerenciada(lista[indice])
    );
    if (!igual) {
      datalist.innerHTML = lista
        .map(fase => `<option value="${escapeHtmlFases(fase)}"></option>`)
        .join("");
    }
  }

  function tipoManejoAtualSugestoes() {
    const peloBody = String(document.body?.dataset?.corponuManejoTipo || "").toLowerCase();
    if (peloBody === "calcinha" || peloBody === "sutia") return peloBody;
    const setor = String(document.querySelector(".manejo-setor-btn.active")?.dataset?.setor || "").toLowerCase();
    return setor === "calcinha" ? "calcinha" : "sutia";
  }

  function campoFaseDoManejo(elemento) {
    if (!(elemento instanceof HTMLInputElement)) return false;
    if (!elemento.closest("#manejo")) return false;
    return elemento.id.endsWith("-fase") ||
      elemento.getAttribute("list") === "manejoFasesList" ||
      elemento.getAttribute("list") === ID_DATALIST_FASES_CALCINHA;
  }

  function aplicarListaCorretaNosCamposFaseManejo() {
    const tipo = tipoManejoAtualSugestoes();
    const listaId = tipo === "calcinha" ? ID_DATALIST_FASES_CALCINHA : "manejoFasesList";
    if (tipo === "calcinha") renderDatalistFasesCalcinha();

    document.querySelectorAll('#manejo input[id$="-fase"], #manejo input[list="manejoFasesList"], #manejo input[list="manejoFasesListCalcinha"]')
      .forEach(input => {
        input.setAttribute("list", listaId);
        input.dataset.listaFaseTipo = tipo;
        input.title = tipo === "calcinha"
          ? "Digite a fase da calcinha ou escolha uma sugestão cadastrada pelo administrador."
          : "Digite a fase do sutiã ou escolha uma sugestão cadastrada pelo administrador.";
      });
  }

  function agendarAplicacaoListaPorSetor() {
    [40, 180, 500, 950].forEach(delay => {
      setTimeout(aplicarListaCorretaNosCamposFaseManejo, delay);
    });
  }

  function ajustarTituloPainelSugestoesSutia() {
    const painel = document.getElementById("painelSugestoesFasesAdmin");
    if (!painel) return false;
    const titulo = painel.querySelector(".panel-header h3");
    const descricao = painel.querySelector(".panel-header p");
    const aviso = painel.querySelector(".notice.small");
    if (titulo) titulo.textContent = "Opções do filtro Fase — Sutiã";
    if (descricao) descricao.textContent = "Gerencie as opções mostradas no filtro múltiplo da coluna Fase e nas sugestões de edição do Sutiã.";
    if (aviso) aviso.innerHTML = "Esta lista controla diretamente o filtro mostrado na tabela. Os usuários podem digitar livremente, mas a opção só entra no filtro oficial do <strong>Sutiã</strong> quando o administrador adicioná-la aqui.";
    painel.dataset.tipoSugestoesFase = "sutia";
    return true;
  }

  function renderListaAdminFasesCalcinha() {
    const lista = document.getElementById("listaSugestoesFasesCalcinhaAdmin");
    const contador = document.getElementById("contadorSugestoesFasesCalcinhaAdmin");
    const status = document.getElementById("statusSugestoesFasesCalcinhaAdmin");
    if (!lista) return;

    if (contador) contador.textContent = `${fasesCalcinhaGerenciadas.length} opção(ões)`;
    if (status) {
      status.textContent = configuracaoFasesCalcinhaExiste
        ? "Lista oficial da Calcinha sincronizada com todos os usuários."
        : "A lista da Calcinha ainda está vazia. Adicione as sugestões desejadas.";
    }

    if (!fasesCalcinhaGerenciadas.length) {
      lista.innerHTML = `
        <div style="padding:14px;border:1px dashed #c4b5fd;border-radius:10px;color:#6b21a8;text-align:center;background:#faf5ff;">
          Nenhuma sugestão de calcinha cadastrada.
        </div>
      `;
      return;
    }

    lista.innerHTML = fasesCalcinhaGerenciadas.map(fase => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 10px;border:1px solid #e9d5ff;border-radius:10px;background:#fff;">
        <strong style="font-size:13px;overflow-wrap:anywhere;">${escapeHtmlFases(fase)}</strong>
        <button type="button" class="btn" data-remover-fase-calcinha-admin="${escapeHtmlFases(fase)}"
          style="padding:7px 10px;color:#b91c1c;border-color:#fecaca;background:#fff7f7;flex:0 0 auto;">
          Remover
        </button>
      </div>
    `).join("");
  }

  function criarPainelAdminFasesCalcinha() {
    ajustarTituloPainelSugestoesSutia();

    if (!usuarioEhAdminFasesCalcinha) {
      document.getElementById(ID_PAINEL_FASES_CALCINHA)?.remove();
      return;
    }

    const existente = document.getElementById(ID_PAINEL_FASES_CALCINHA);
    if (existente) {
      renderListaAdminFasesCalcinha();
      return;
    }

    const formularioUsuario = document.getElementById("formUsuario");
    const painelSutia = document.getElementById("painelSugestoesFasesAdmin");
    if (!formularioUsuario) {
      if (tentativasPainelFasesCalcinha < 15) {
        tentativasPainelFasesCalcinha += 1;
        setTimeout(criarPainelAdminFasesCalcinha, 350);
      }
      return;
    }

    const painel = document.createElement("section");
    painel.id = ID_PAINEL_FASES_CALCINHA;
    painel.className = "panel";
    painel.style.gridColumn = "1 / -1";
    painel.style.borderColor = "#c4b5fd";
    painel.style.background = "linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)";
    painel.innerHTML = `
      <div class="panel-header" style="align-items:flex-start;gap:16px;">
        <div>
          <h3>Opções do filtro Fase — Calcinha</h3>
          <p>Gerencie as opções mostradas no filtro múltiplo da coluna Fase e nas sugestões de edição da Calcinha.</p>
        </div>
        <span id="contadorSugestoesFasesCalcinhaAdmin" class="badge ok">0 sugestão(ões)</span>
      </div>
      <div class="notice small" style="margin-bottom:12px;border-color:#c4b5fd;background:#faf5ff;">
        Esta lista controla diretamente o filtro mostrado na tabela. Os usuários podem digitar livremente, mas a opção só entra no filtro oficial da <strong>Calcinha</strong> quando o administrador adicioná-la aqui.
      </div>
      <form id="formSugestaoFaseCalcinhaAdmin" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px;">
        <label style="flex:1;min-width:240px;">
          Nova opção de fase da calcinha
          <input id="novaSugestaoFaseCalcinhaAdmin" type="text" placeholder="Ex: MONTAGEM, REVISÃO, ACABAMENTO" autocomplete="off" maxlength="80" />
        </label>
        <button class="btn btn-primary" type="submit">Adicionar opção</button>
      </form>
      <div id="statusSugestoesFasesCalcinhaAdmin" style="font-size:12px;color:#64748b;margin-bottom:10px;">Carregando lista oficial...</div>
      <div id="listaSugestoesFasesCalcinhaAdmin" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;"></div>
    `;

    if (painelSutia?.parentElement) painelSutia.insertAdjacentElement("afterend", painel);
    else formularioUsuario.insertAdjacentElement("afterend", painel);

    painel.querySelector("#formSugestaoFaseCalcinhaAdmin")?.addEventListener("submit", async event => {
      event.preventDefault();
      const input = document.getElementById("novaSugestaoFaseCalcinhaAdmin");
      const fase = normalizarFaseGerenciada(input?.value);
      if (!fase) {
        mostrarAvisoFormulario("Digite o nome da fase da calcinha antes de adicionar.");
        input?.focus();
        return;
      }
      await adicionarSugestaoFaseCalcinhaAdmin(fase);
      if (input) input.value = "";
      input?.focus();
    });

    painel.querySelector("#listaSugestoesFasesCalcinhaAdmin")?.addEventListener("click", async event => {
      const botao = event.target?.closest?.("[data-remover-fase-calcinha-admin]");
      if (!botao) return;
      await removerSugestaoFaseCalcinhaAdmin(botao.dataset.removerFaseCalcinhaAdmin || "");
    });

    renderListaAdminFasesCalcinha();
  }

  async function registrarLogFaseCalcinhaAdmin(acao, fase) {
    if (!contextoFirebaseFasesCalcinha?.user || !contextoFirebaseFasesCalcinha?.perfil) return;
    const { firestore, db, user, perfil } = contextoFirebaseFasesCalcinha;
    try {
      await firestore.addDoc(firestore.collection(db, "logsAlteracoes"), {
        acao,
        tipoAlvo: "Sugestão de fase da Calcinha",
        alvoId: fase,
        detalhes: `${acao}: ${fase}`,
        usuarioUid: user.uid,
        usuarioNome: perfil.nome || "",
        usuarioEmail: perfil.email || user.email || "",
        usuarioTipo: perfil.tipo || "admin",
        criadoEm: firestore.serverTimestamp()
      });
    } catch (error) {
      console.warn("Não foi possível registrar o log da sugestão da calcinha.", error);
    }
  }

  async function alterarListaFasesCalcinhaComTransacao(transformar) {
    if (!usuarioEhAdminFasesCalcinha || !contextoFirebaseFasesCalcinha) {
      mostrarAvisoFormulario("Somente o administrador pode gerenciar sugestões da calcinha.");
      return null;
    }

    const { firestore, db, user } = contextoFirebaseFasesCalcinha;
    const referencia = firestore.doc(db, "configuracoes", FASES_CALCINHA_CONFIG_DOCUMENTO);
    return firestore.runTransaction(db, async transacao => {
      const snapshot = await transacao.get(referencia);
      const listaAtual = ordenarFasesGerenciadas(
        snapshot.exists() ? snapshot.data()?.sugestoes : fasesCalcinhaGerenciadas
      );
      const proximaLista = ordenarFasesGerenciadas(transformar(listaAtual));
      transacao.set(referencia, {
        sugestoes: proximaLista,
        atualizadoEm: firestore.serverTimestamp(),
        atualizadoPor: user.uid,
        versaoGerenciamento: APP_VERSION,
        tipoPeca: "calcinha"
      }, { merge: true });
      return proximaLista;
    });
  }

  async function adicionarSugestaoFaseCalcinhaAdmin(faseInformada) {
    const fase = normalizarFaseGerenciada(faseInformada);
    if (!fase) return;
    if (fasesCalcinhaGerenciadas.some(item => chaveFaseGerenciada(item) === chaveFaseGerenciada(fase))) {
      mostrarAvisoFormulario(`A fase "${fase}" já está cadastrada para a Calcinha.`);
      return;
    }
    try {
      await alterarListaFasesCalcinhaComTransacao(lista => [...lista, fase]);
      await registrarLogFaseCalcinhaAdmin("Sugestão de fase da Calcinha adicionada", fase);
      showUpdateToast(`Sugestão "${fase}" adicionada para o manejo de calcinhas.`);
    } catch (error) {
      console.error("Erro ao adicionar sugestão da calcinha.", error);
      mostrarAvisoFormulario("Não foi possível adicionar a sugestão da calcinha.");
    }
  }

  async function removerSugestaoFaseCalcinhaAdmin(faseInformada) {
    const fase = normalizarFaseGerenciada(faseInformada);
    if (!fase) return;
    if (!window.confirm(`Remover "${fase}" das sugestões da Calcinha?\n\nAs OPs antigas não serão alteradas.`)) return;
    try {
      await alterarListaFasesCalcinhaComTransacao(lista =>
        lista.filter(item => chaveFaseGerenciada(item) !== chaveFaseGerenciada(fase))
      );
      await registrarLogFaseCalcinhaAdmin("Sugestão de fase da Calcinha removida", fase);
      showUpdateToast(`Sugestão "${fase}" removida da Calcinha.`);
    } catch (error) {
      console.error("Erro ao remover sugestão da calcinha.", error);
      mostrarAvisoFormulario("Não foi possível remover a sugestão da calcinha.");
    }
  }

  function iniciarSnapshotConfiguracaoFasesCalcinha() {
    if (!contextoFirebaseFasesCalcinha) return;
    unsubscribeConfiguracaoFasesCalcinha?.();
    const { firestore, db } = contextoFirebaseFasesCalcinha;
    const referencia = firestore.doc(db, "configuracoes", FASES_CALCINHA_CONFIG_DOCUMENTO);
    unsubscribeConfiguracaoFasesCalcinha = firestore.onSnapshot(referencia, snapshot => {
      configuracaoFasesCalcinhaExiste = snapshot.exists();
      fasesCalcinhaGerenciadas = ordenarFasesGerenciadas(
        snapshot.exists() ? snapshot.data()?.sugestoes : []
      );
      renderDatalistFasesCalcinha();
      criarPainelAdminFasesCalcinha();
      if (tipoManejoAtualSugestoes() === "calcinha") agendarAplicacaoListaPorSetor();
    }, error => {
      console.error("Erro ao carregar sugestões da Calcinha.", error);
    });
  }

  async function configurarUsuarioGestaoFasesCalcinha(user) {
    if (!user || !contextoFirebaseFasesCalcinha) {
      usuarioEhAdminFasesCalcinha = false;
      document.getElementById(ID_PAINEL_FASES_CALCINHA)?.remove();
      unsubscribeConfiguracaoFasesCalcinha?.();
      unsubscribeConfiguracaoFasesCalcinha = null;
      return;
    }
    const { firestore, db } = contextoFirebaseFasesCalcinha;
    try {
      const perfilSnapshot = await firestore.getDoc(firestore.doc(db, "usuarios", user.uid));
      const perfil = perfilSnapshot.exists() ? perfilSnapshot.data() : {};
      usuarioEhAdminFasesCalcinha = perfil?.tipo === "admin" && perfil?.ativo !== false;
      contextoFirebaseFasesCalcinha = { ...contextoFirebaseFasesCalcinha, user, perfil };
      iniciarSnapshotConfiguracaoFasesCalcinha();
      criarPainelAdminFasesCalcinha();
    } catch (error) {
      usuarioEhAdminFasesCalcinha = false;
      console.error("Não foi possível validar o administrador das sugestões da Calcinha.", error);
    }
  }

  async function conectarFirebaseGestaoFasesCalcinha(tentativa = 0) {
    if (contextoFirebaseFasesCalcinha?.auth) return;
    try {
      const [firebaseApp, firestore, firebaseAuth] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js")
      ]);
      const apps = firebaseApp.getApps();
      if (!apps.length) throw new Error("Firebase ainda não inicializado.");
      const appAtual = firebaseApp.getApp();
      const auth = firebaseAuth.getAuth(appAtual);
      const db = firestore.getFirestore(appAtual);
      contextoFirebaseFasesCalcinha = { firestore, firebaseAuth, auth, db, user: null, perfil: null };
      unsubscribeAuthFasesCalcinha?.();
      unsubscribeAuthFasesCalcinha = firebaseAuth.onAuthStateChanged(auth, configurarUsuarioGestaoFasesCalcinha);
    } catch (error) {
      if (tentativa < 20) {
        setTimeout(() => conectarFirebaseGestaoFasesCalcinha(tentativa + 1), 300);
        return;
      }
      console.error("Não foi possível iniciar a gestão das sugestões da Calcinha.", error);
    }
  }

  function instalarEventosSugestoesPorTipo() {
    if (eventosFasesCalcinhaInstalados) return;
    eventosFasesCalcinhaInstalados = true;

    document.addEventListener("focusin", event => {
      if (!campoFaseDoManejo(event.target)) return;
      const tipo = tipoManejoAtualSugestoes();
      event.target.setAttribute("list", tipo === "calcinha" ? ID_DATALIST_FASES_CALCINHA : "manejoFasesList");
    }, true);

    document.addEventListener("click", event => {
      if (event.target?.closest?.(".manejo-setor-btn")) agendarAplicacaoListaPorSetor();
      if (event.target?.closest?.('.nav-btn[data-page="manejo"]')) agendarAplicacaoListaPorSetor();
      if (event.target?.closest?.('.nav-btn[data-page="usuarios"]')) {
        [80, 350, 800].forEach(delay => setTimeout(() => {
          ajustarTituloPainelSugestoesSutia();
          criarPainelAdminFasesCalcinha();
        }, delay));
      }
    }, true);
  }

  function iniciarGestaoSugestoesSeparadasSutiaCalcinha() {
    garantirDatalistFasesCalcinha();
    instalarEventosSugestoesPorTipo();
    conectarFirebaseGestaoFasesCalcinha();
    [150, 600, 1400].forEach(delay => setTimeout(() => {
      ajustarTituloPainelSugestoesSutia();
      criarPainelAdminFasesCalcinha();
      aplicarListaCorretaNosCamposFaseManejo();
    }, delay));
  }




  // =========================================================
  // RESTAURAÇÃO SEGURA DAS OPÇÕES ANTIGAS DO FILTRO FASE
  // - Recupera fases já usadas nas OPs e sugestões antigas locais.
  // - Separa Sutiã e Calcinha.
  // - Faz apenas merge: nunca apaga nem substitui a lista atual.
  // - Sem MutationObserver e sem alterar dados das OPs.
  // =========================================================
  const MARCADOR_RESTAURACAO_FASES_ANTIGAS = "restauracaoFiltrosAntigos20260729V2";
  let restauracaoFasesAntigasEmAndamento = false;
  let restauracaoFasesAntigasAutomaticaTentada = false;
  let eventosRestauracaoFasesAntigasInstalados = false;

  function adicionarFaseAoConjunto(conjunto, valor) {
    const fase = normalizarFaseGerenciada(valor);
    const chave = chaveFaseGerenciada(fase);
    if (!fase || !chave) return;
    if (["SEM FASE", "CAMPO VAZIO", "TODAS", "TODOS"].includes(chave)) return;
    conjunto.add(fase);
  }

  function lerSugestoesLocaisAntigas() {
    try {
      const lista = JSON.parse(localStorage.getItem("fasesManejoExtras") || "[]");
      return Array.isArray(lista) ? lista : [];
    } catch (error) {
      return [];
    }
  }

  function lerOpcoesAtuaisDosDatalists() {
    const ids = ["manejoFasesList", "manejoFasesListCalcinha"];
    return ids.flatMap(id => {
      const datalist = document.getElementById(id);
      if (!datalist) return [];
      return [...datalist.querySelectorAll("option")]
        .map(option => option.value || option.textContent || "")
        .filter(Boolean);
    });
  }

  function coletarFasesDocumentoOrdem(dados, sutia, calcinha) {
    if (!dados || typeof dados !== "object") return;

    const setores = dados.manejosSetores || {};
    adicionarFaseAoConjunto(sutia, setores?.sutia?.fase);
    adicionarFaseAoConjunto(sutia, setores?.bojo?.fase);
    adicionarFaseAoConjunto(calcinha, setores?.calcinha?.fase);

    adicionarFaseAoConjunto(sutia, dados?.manejoSutia?.fase);
    adicionarFaseAoConjunto(calcinha, dados?.manejoCalcinha?.fase);
    adicionarFaseAoConjunto(sutia, dados?.sutia?.fase);
    adicionarFaseAoConjunto(calcinha, dados?.calcinha?.fase);
    adicionarFaseAoConjunto(sutia, dados?.faseSutia);
    adicionarFaseAoConjunto(calcinha, dados?.faseCalcinha);

    // O campo legado "manejo" pertence à estrutura antiga, anterior à separação.
    // Ele é preservado no Sutiã, que era o manejo original do sistema.
    adicionarFaseAoConjunto(sutia, dados?.manejo?.fase);

    const tipo = normalizarComparacao(
      dados?.tipoPeca || dados?.setor || dados?.manejoSetor || dados?.categoria || ""
    );
    if (tipo.includes("CALCINHA")) adicionarFaseAoConjunto(calcinha, dados?.fase);
    else if (tipo.includes("SUTIA") || tipo.includes("SUTIÃ") || tipo.includes("BOJO")) {
      adicionarFaseAoConjunto(sutia, dados?.fase);
    }
  }

  function coletarFasesVisiveisDoManejo(sutia, calcinha) {
    const tipo = tipoManejoAtualSugestoes() === "calcinha" ? "calcinha" : "sutia";
    document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']").forEach(linha => {
      const valor = linha.querySelector('input[id$="-fase"]')?.value || linha.dataset.fase || "";
      adicionarFaseAoConjunto(tipo === "calcinha" ? calcinha : sutia, valor);
    });
  }

  async function coletarTodasFasesAntigasDoSistema() {
    const sutia = new Set();
    const calcinha = new Set();

    // Preserva sugestões antigas do navegador em ambas as listas.
    // Como eram globais antes da separação, o administrador decide depois onde mantê-las.
    [...lerSugestoesLocaisAntigas(), ...lerOpcoesAtuaisDosDatalists()].forEach(fase => {
      adicionarFaseAoConjunto(sutia, fase);
      adicionarFaseAoConjunto(calcinha, fase);
    });
    coletarFasesVisiveisDoManejo(sutia, calcinha);

    const contexto = contextoFirebaseFasesCalcinha || contextoFirebaseFases;
    if (!contexto?.firestore || !contexto?.db) {
      throw new Error("Firebase ainda não está pronto para recuperar as fases antigas.");
    }

    const { firestore, db } = contexto;
    const snapshot = await firestore.getDocs(firestore.collection(db, "ordensProducao"));
    snapshot.forEach(documento => coletarFasesDocumentoOrdem(documento.data(), sutia, calcinha));

    const resultado = {
      sutia: ordenarFasesGerenciadas([...sutia]),
      calcinha: ordenarFasesGerenciadas([...calcinha])
    };
    window.__fasesHistoricasCorpoNu = resultado;
    return resultado;
  }

  async function mesclarFasesRecuperadasNoDocumento(documentoId, recuperadas, tipoPeca, forcar = false) {
    const contexto = contextoFirebaseFasesCalcinha || contextoFirebaseFases;
    const { firestore, db, user } = contexto;
    const referencia = firestore.doc(db, "configuracoes", documentoId);

    return firestore.runTransaction(db, async transacao => {
      const snapshot = await transacao.get(referencia);
      const dadosAtuais = snapshot.exists() ? snapshot.data() : {};
      const listaAtual = ordenarFasesGerenciadas(dadosAtuais?.sugestoes || []);

      if (!forcar && dadosAtuais?.[MARCADOR_RESTAURACAO_FASES_ANTIGAS] === true && listaAtual.length) {
        return { lista: listaAtual, adicionadas: 0, ignorado: true };
      }

      const chavesAtuais = new Set(listaAtual.map(chaveFaseGerenciada));
      const novas = ordenarFasesGerenciadas(recuperadas)
        .filter(fase => !chavesAtuais.has(chaveFaseGerenciada(fase)));
      const listaFinal = ordenarFasesGerenciadas([...listaAtual, ...novas]);

      transacao.set(referencia, {
        sugestoes: listaFinal,
        [MARCADOR_RESTAURACAO_FASES_ANTIGAS]: true,
        restauradoEm: firestore.serverTimestamp(),
        restauradoPor: user?.uid || "",
        atualizadoEm: firestore.serverTimestamp(),
        atualizadoPor: user?.uid || "",
        versaoGerenciamento: APP_VERSION,
        tipoPeca
      }, { merge: true });

      return { lista: listaFinal, adicionadas: novas.length, ignorado: false };
    });
  }

  function atualizarStatusRestauracaoFases(mensagem, tipo = "normal") {
    ["statusSugestoesFasesAdmin", "statusSugestoesFasesCalcinhaAdmin"].forEach(id => {
      const elemento = document.getElementById(id);
      if (!elemento) return;
      elemento.textContent = mensagem;
      elemento.style.color = tipo === "erro" ? "#b91c1c" : tipo === "sucesso" ? "#166534" : "#475569";
    });
  }

  async function restaurarOpcoesAntigasFases({ manual = false } = {}) {
    if (restauracaoFasesAntigasEmAndamento) return;
    if (!usuarioEhAdminFases && !usuarioEhAdminFasesCalcinha) return;
    if (!contextoFirebaseFasesCalcinha?.user && !contextoFirebaseFases?.user) return;

    restauracaoFasesAntigasEmAndamento = true;
    atualizarStatusRestauracaoFases("Recuperando todas as opções antigas das OPs...", "normal");
    document.querySelectorAll("[data-restaurar-fases-antigas]").forEach(btn => {
      btn.disabled = true;
      btn.dataset.textoAnterior = btn.textContent;
      btn.textContent = "Recuperando...";
    });

    try {
      const recuperadas = await coletarTodasFasesAntigasDoSistema();
      if (!recuperadas.sutia.length && !recuperadas.calcinha.length) {
        throw new Error("Nenhuma fase antiga foi encontrada nas OPs.");
      }

      const [resultadoSutia, resultadoCalcinha] = await Promise.all([
        mesclarFasesRecuperadasNoDocumento("fasesManejo", recuperadas.sutia, "sutia", manual),
        mesclarFasesRecuperadasNoDocumento(FASES_CALCINHA_CONFIG_DOCUMENTO, recuperadas.calcinha, "calcinha", manual)
      ]);

      const totalAdicionado = resultadoSutia.adicionadas + resultadoCalcinha.adicionadas;
      atualizarStatusRestauracaoFases(
        totalAdicionado
          ? `${totalAdicionado} opção(ões) antiga(s) recuperada(s). Agora você pode organizá-las e remover apenas o que não deseja.`
          : "As opções antigas já estavam recuperadas. Nenhum item foi apagado.",
        "sucesso"
      );
      showUpdateToast(
        totalAdicionado
          ? `Filtros antigos restaurados: ${resultadoSutia.adicionadas} do Sutiã e ${resultadoCalcinha.adicionadas} da Calcinha.`
          : "Todas as opções antigas já estão disponíveis para gerenciamento."
      );
    } catch (error) {
      console.error("Erro ao restaurar opções antigas de fase.", error);
      atualizarStatusRestauracaoFases(
        "Não foi possível recuperar as opções antigas agora. Use o botão Recuperar opções antigas novamente.",
        "erro"
      );
      if (manual) mostrarAvisoFormulario("Não foi possível recuperar as opções antigas. Confira a internet e tente novamente.");
    } finally {
      restauracaoFasesAntigasEmAndamento = false;
      document.querySelectorAll("[data-restaurar-fases-antigas]").forEach(btn => {
        btn.disabled = false;
        btn.textContent = btn.dataset.textoAnterior || "Recuperar opções antigas";
      });
    }
  }

  function garantirBotoesRestauracaoFasesAntigas() {
    const configuracoes = [
      { painel: "painelSugestoesFasesAdmin", tipo: "sutia" },
      { painel: ID_PAINEL_FASES_CALCINHA, tipo: "calcinha" }
    ];

    configuracoes.forEach(config => {
      const painel = document.getElementById(config.painel);
      if (!painel || painel.querySelector(`[data-restaurar-fases-antigas="${config.tipo}"]`)) return;
      const cabecalho = painel.querySelector(".panel-header");
      if (!cabecalho) return;

      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "btn";
      botao.dataset.restaurarFasesAntigas = config.tipo;
      botao.textContent = "Recuperar opções antigas";
      botao.title = "Busca nas OPs todas as fases usadas anteriormente e adiciona somente as que estão faltando.";
      botao.style.marginLeft = "auto";
      botao.style.whiteSpace = "nowrap";
      cabecalho.appendChild(botao);
    });
  }

  function instalarEventosRestauracaoFasesAntigas() {
    if (eventosRestauracaoFasesAntigasInstalados) return;
    eventosRestauracaoFasesAntigasInstalados = true;

    document.addEventListener("click", event => {
      const botao = event.target?.closest?.("[data-restaurar-fases-antigas]");
      if (botao) {
        event.preventDefault();
        restaurarOpcoesAntigasFases({ manual: true });
        return;
      }

      if (event.target?.closest?.('.nav-btn[data-page="usuarios"]')) {
        [80, 300, 700].forEach(delay => setTimeout(garantirBotoesRestauracaoFasesAntigas, delay));
      }
    }, true);
  }

  function iniciarRestauracaoFasesAntigas() {
    instalarEventosRestauracaoFasesAntigas();
    [350, 900, 1800, 3000].forEach(delay => setTimeout(() => {
      garantirBotoesRestauracaoFasesAntigas();
      if (
        !restauracaoFasesAntigasAutomaticaTentada &&
        (usuarioEhAdminFases || usuarioEhAdminFasesCalcinha) &&
        (contextoFirebaseFasesCalcinha?.user || contextoFirebaseFases?.user)
      ) {
        restauracaoFasesAntigasAutomaticaTentada = true;
        restaurarOpcoesAntigasFases({ manual: false });
      }
    }, delay));
  }



  // =========================================================
  // GERENCIAR VALORES — INTERFACE ORGANIZADA E SEGURA
  // Aplicação pontual, sem MutationObserver e sem alterar a lógica financeira.
  // =========================================================
  function injetarEstilosGerenciarValoresOrganizado() {
    if (document.getElementById("styleGerenciarValoresOrganizadoSeguro")) return;

    const style = document.createElement("style");
    style.id = "styleGerenciarValoresOrganizadoSeguro";
    style.textContent = `
      #painelGerenciarValores.gerenciar-valores-organizado > .panel-header {
        display: none !important;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .importar-valores-box,
      #painelGerenciarValores.gerenciar-valores-organizado #painelImportacaoTabelaValoresCorpoNu {
        display: none !important;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .valores-workspace {
        display: grid !important;
        grid-template-columns: minmax(250px, 300px) minmax(0, 1fr) !important;
        align-items: start !important;
        gap: 18px !important;
        max-width: 1500px;
        margin: 0 auto;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .valores-sidebar {
        position: sticky;
        top: 104px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px !important;
        border: 1px solid #dbe3ee;
        border-radius: 16px;
        background: #ffffff;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      }

      #painelGerenciarValores.gerenciar-valores-organizado .valores-main {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 0;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .valores-step-card,
      #painelGerenciarValores.gerenciar-valores-organizado .valores-step-card.horizontal {
        margin: 0 !important;
        padding: 14px 16px !important;
        border: 1px solid #ddd6fe !important;
        border-radius: 14px !important;
        background: #f5f3ff !important;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .valores-toolbox {
        display: grid;
        gap: 10px;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .processos-valores-title {
        margin-top: 2px;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .processos-valores-list {
        max-height: 44vh;
        overflow: auto;
        padding-right: 4px;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .valores-cards {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(120px, 1fr)) !important;
        gap: 10px !important;
        margin: 0 !important;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .valores-cards .processo-card {
        min-height: 86px;
        padding: 14px !important;
        border-radius: 14px !important;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .valores-form-organizado {
        display: grid !important;
        grid-template-columns: minmax(150px, 0.8fr) minmax(210px, 1.4fr) minmax(150px, 0.8fr) auto !important;
        align-items: end !important;
        gap: 12px !important;
        padding: 18px !important;
        border: 1px solid #dbe3ee !important;
        border-radius: 16px !important;
        background: #ffffff !important;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
      }

      #painelGerenciarValores.gerenciar-valores-organizado .valores-form-organizado .actions {
        display: flex;
        flex-wrap: nowrap;
        gap: 8px;
        margin: 0 !important;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .precos-referencia-wrap {
        max-height: 54vh;
        overflow: auto;
        border: 1px solid #dbe3ee;
        border-radius: 14px;
        background: #ffffff;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .gerenciar-valores-avancado {
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: #ffffff;
        overflow: hidden;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .gerenciar-valores-avancado > summary {
        cursor: pointer;
        list-style: none;
        padding: 14px 16px;
        color: #475569;
        font-size: 13px;
        font-weight: 800;
        user-select: none;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .gerenciar-valores-avancado > summary::-webkit-details-marker {
        display: none;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .gerenciar-valores-avancado > summary::before {
        content: "▸";
        display: inline-block;
        margin-right: 8px;
        transition: transform .15s ease;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .gerenciar-valores-avancado[open] > summary::before {
        transform: rotate(90deg);
      }

      #painelGerenciarValores.gerenciar-valores-organizado .gerenciar-valores-avancado-conteudo {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        padding: 0 14px 14px;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .gerenciar-valores-avancado .valores-novo-processo,
      #painelGerenciarValores.gerenciar-valores-organizado .gerenciar-valores-avancado .valor-processo-editor {
        margin: 0 !important;
        height: 100%;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .gerenciar-valores-intro {
        max-width: 1500px;
        margin: 0 auto 16px;
        padding: 14px 16px;
        border: 1px solid #bfdbfe;
        border-radius: 14px;
        background: #eff6ff;
        color: #1e3a8a;
        line-height: 1.45;
      }

      #painelGerenciarValores.gerenciar-valores-organizado .gerenciar-valores-intro strong {
        display: block;
        margin-bottom: 3px;
        color: #1e40af;
      }

      @media (max-width: 1050px) {
        #painelGerenciarValores.gerenciar-valores-organizado .valores-workspace {
          grid-template-columns: 1fr !important;
        }

        #painelGerenciarValores.gerenciar-valores-organizado .valores-sidebar {
          position: static;
        }

        #painelGerenciarValores.gerenciar-valores-organizado .processos-valores-list {
          max-height: 240px;
        }

        #painelGerenciarValores.gerenciar-valores-organizado .valores-form-organizado {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }

      @media (max-width: 700px) {
        #painelGerenciarValores.gerenciar-valores-organizado .valores-cards,
        #painelGerenciarValores.gerenciar-valores-organizado .gerenciar-valores-avancado-conteudo,
        #painelGerenciarValores.gerenciar-valores-organizado .valores-form-organizado {
          grid-template-columns: 1fr !important;
        }

        #painelGerenciarValores.gerenciar-valores-organizado .valores-form-organizado .actions {
          flex-wrap: wrap;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function organizarGerenciarValoresUmaVez() {
    const painel = document.getElementById("painelGerenciarValores");
    if (!painel) return;

    injetarEstilosGerenciarValoresOrganizado();
    painel.classList.add("gerenciar-valores-organizado");

    if (!painel.querySelector(".gerenciar-valores-intro")) {
      const intro = document.createElement("div");
      intro.className = "gerenciar-valores-intro";
      intro.innerHTML = `
        <strong>Gerenciamento simplificado</strong>
        Escolha um processo, cadastre ou edite o valor da referência e consulte a lista abaixo.
        As ferramentas de importação foram retiradas desta tela porque os valores já estão cadastrados.
      `;

      const toolbar = painel.querySelector(".gerenciamento-exclusivo-toolbar");
      if (toolbar) toolbar.insertAdjacentElement("afterend", intro);
      else painel.prepend(intro);
    }

    const etapaCadastro = painel.querySelector(".valores-step-card.horizontal strong");
    if (etapaCadastro) etapaCadastro.textContent = "2. Cadastrar ou editar valor por referência";

    const textoEtapaCadastro = painel.querySelector(".valores-step-card.horizontal span");
    if (textoEtapaCadastro) {
      textoEtapaCadastro.textContent = "Escolha o processo, informe a referência e o valor por peça.";
    }

    const tituloTabela = document.getElementById("tituloTabelaValores");
    if (tituloTabela) tituloTabela.textContent = "3. Valores cadastrados";

    const caixaImportacao = painel.querySelector(".importar-valores-box");
    if (caixaImportacao) {
      caixaImportacao.hidden = true;
      caixaImportacao.setAttribute("aria-hidden", "true");
    }

    document.getElementById("painelImportacaoTabelaValoresCorpoNu")?.remove();

    if (!painel.querySelector(".gerenciar-valores-avancado")) {
      const criarProcesso = painel.querySelector(".valores-novo-processo");
      const renomearProcesso = painel.querySelector(".valor-processo-editor");
      const valoresMain = painel.querySelector(".valores-main");

      if (valoresMain && (criarProcesso || renomearProcesso)) {
        const detalhes = document.createElement("details");
        detalhes.className = "gerenciar-valores-avancado";
        detalhes.innerHTML = `
          <summary>Opções avançadas: criar ou renomear processo</summary>
          <div class="gerenciar-valores-avancado-conteudo"></div>
        `;

        const conteudo = detalhes.querySelector(".gerenciar-valores-avancado-conteudo");
        if (criarProcesso) conteudo.appendChild(criarProcesso);
        if (renomearProcesso) conteudo.appendChild(renomearProcesso);
        valoresMain.prepend(detalhes);
      }
    }
  }

  function iniciarGerenciarValoresOrganizadoSeguro() {
    organizarGerenciarValoresUmaVez();

    const botaoAbrir = document.getElementById("btnToggleGerenciarValores");
    if (botaoAbrir && !botaoAbrir.dataset.organizacaoValoresSegura) {
      botaoAbrir.dataset.organizacaoValoresSegura = "1";
      botaoAbrir.addEventListener("click", () => {
        [0, 80, 250].forEach(atraso => setTimeout(organizarGerenciarValoresUmaVez, atraso));
      });
    }

    [150, 700, 1600].forEach(atraso => setTimeout(organizarGerenciarValoresUmaVez, atraso));
  }




  // =========================================================
  // HOTFIX: BOTÃO CONCLUIR INTELIGENTE NO MANEJO
  // - Linhas já salvas ficam sem o botão verde para evitar clique duplicado.
  // - Ao alterar qualquer campo editável da linha, o botão reaparece.
  // - Após salvamento confirmado, o botão some novamente.
  // - Não usa MutationObserver e não altera o Firestore ou a lógica original.
  // =========================================================
  let salvarManejoLinhaOriginalConcluirInteligente = null;

  function injetarEstilosConcluirInteligenteManejo() {
    if (document.getElementById('styleConcluirInteligenteManejo')) return;

    const style = document.createElement('style');
    style.id = 'styleConcluirInteligenteManejo';
    style.textContent = `
      #listaManejoInline tr.manejo-row-saved:not(.manejo-row-dirty) .btn-save-manejo {
        display: none !important;
      }

      #listaManejoInline tr.manejo-row-dirty .btn-save-manejo,
      #listaManejoInline tr.manejo-row-pending .btn-save-manejo {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
      }

      #listaManejoInline .btn-save-manejo[data-salvando-manejo="1"] {
        display: inline-flex !important;
        opacity: .7;
        cursor: wait !important;
        pointer-events: none !important;
      }

      #listaManejoInline tr.manejo-row-dirty {
        box-shadow: inset 4px 0 0 #16a34a;
      }
    `;
    document.head.appendChild(style);
  }

  function encontrarLinhaManejoPorOrdemIdConcluirInteligente(ordemId) {
    const botoes = document.querySelectorAll('#listaManejoInline .btn-save-manejo');
    const trechoAspasSimples = `salvarManejoLinha('${String(ordemId)}')`;
    const trechoAspasDuplas = `salvarManejoLinha(\"${String(ordemId)}\")`;

    for (const botao of botoes) {
      const onclick = String(botao.getAttribute('onclick') || '');
      if (onclick.includes(trechoAspasSimples) || onclick.includes(trechoAspasDuplas)) {
        return botao.closest('tr[data-manejo-row="1"]');
      }
    }
    return null;
  }

  function marcarLinhaManejoAlteradaConcluirInteligente(linha) {
    if (!linha) return;
    linha.classList.add('manejo-row-dirty');

    const botao = linha.querySelector('.btn-save-manejo');
    if (botao) {
      botao.hidden = false;
      botao.disabled = false;
      botao.removeAttribute('data-salvando-manejo');
      botao.textContent = '✓';
      botao.title = 'Concluir alterações desta linha';
      botao.setAttribute('aria-label', 'Concluir alterações desta linha');
    }
  }

  function campoEditavelDaLinhaManejoConcluirInteligente(alvo) {
    if (!alvo?.matches?.('input, select, textarea')) return false;
    if (!alvo.closest?.('#listaManejoInline tr[data-manejo-row="1"]')) return false;
    if (alvo.disabled || alvo.readOnly || alvo.classList.contains('manejo-readonly')) return false;
    return true;
  }

  function instalarEventosConcluirInteligenteManejo() {
    if (document.__eventosConcluirInteligenteManejo) return;
    document.__eventosConcluirInteligenteManejo = true;

    const tratarAlteracao = event => {
      const alvo = event.target;
      if (!campoEditavelDaLinhaManejoConcluirInteligente(alvo)) return;
      marcarLinhaManejoAlteradaConcluirInteligente(
        alvo.closest('tr[data-manejo-row="1"]')
      );
    };

    document.addEventListener('input', tratarAlteracao, true);
    document.addEventListener('change', tratarAlteracao, true);
  }

  function textoToastConcluirInteligente() {
    return String(document.getElementById('toast')?.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function salvamentoManejoFoiConfirmadoConcluirInteligente(texto) {
    const valor = String(texto || '').toLowerCase();
    return valor.includes('manejo') && valor.includes('salvo');
  }

  function instalarWrapperSalvarManejoConcluirInteligente() {
    if (window.__salvarManejoConcluirInteligenteInstalado) return true;
    if (typeof window.salvarManejoLinha !== 'function') return false;

    salvarManejoLinhaOriginalConcluirInteligente = window.salvarManejoLinha;

    window.salvarManejoLinha = async function salvarManejoLinhaConcluirInteligente(ordemId) {
      let linha = encontrarLinhaManejoPorOrdemIdConcluirInteligente(ordemId);
      let botao = linha?.querySelector('.btn-save-manejo') || null;

      if (botao?.dataset.salvandoManejo === '1') return;

      if (botao) {
        botao.dataset.salvandoManejo = '1';
        botao.disabled = true;
        botao.textContent = '…';
        botao.title = 'Salvando alterações';
      }

      let retorno;
      try {
        retorno = await salvarManejoLinhaOriginalConcluirInteligente.apply(this, arguments);
      } finally {
        // A função original trata os erros internamente e informa o resultado pelo toast.
        await new Promise(resolve => setTimeout(resolve, 120));
        const mensagem = textoToastConcluirInteligente();
        const sucesso = salvamentoManejoFoiConfirmadoConcluirInteligente(mensagem);

        // A linha pode ter sido renderizada novamente pelo snapshot do Firestore.
        linha = encontrarLinhaManejoPorOrdemIdConcluirInteligente(ordemId) || linha;
        botao = linha?.querySelector('.btn-save-manejo') || botao;

        if (sucesso && linha) {
          linha.classList.remove('manejo-row-dirty', 'manejo-row-pending');
          linha.classList.add('manejo-row-saved');
          if (botao) {
            botao.removeAttribute('data-salvando-manejo');
            botao.disabled = false;
            botao.textContent = '✓';
            botao.title = 'Concluir alterações desta linha';
            botao.setAttribute('aria-label', 'Concluir alterações desta linha');
          }
        } else if (linha) {
          // Validação, permissão ou erro: mantém o botão disponível para correção.
          marcarLinhaManejoAlteradaConcluirInteligente(linha);
        } else if (botao) {
          botao.removeAttribute('data-salvando-manejo');
          botao.disabled = false;
          botao.textContent = '✓';
        }
      }
      return retorno;
    };

    window.__salvarManejoConcluirInteligenteInstalado = true;
    return true;
  }

  function iniciarConcluirInteligenteManejo() {
    injetarEstilosConcluirInteligenteManejo();
    instalarEventosConcluirInteligenteManejo();

    // Tentativas finitas apenas para aguardar a exportação da função pelo app.js.
    [0, 120, 450, 1200].forEach(atraso => {
      setTimeout(instalarWrapperSalvarManejoConcluirInteligente, atraso);
    });
  }


  // =========================================================
  // PROCESSOS DAS FACÇÕES — VISUALIZAÇÃO E GERENCIAMENTO
  // - Mostra cartões de processos na aba Facções.
  // - Ao clicar, mostra quais facções executam o processo.
  // - Somente o administrador cria, renomeia, exclui e altera vínculos.
  // - A configuração oficial também controla os destinos do Manejo e
  //   da Chegada Manual, evitando listas diferentes em cada tela.
  // - Sem MutationObserver: apenas listeners do Firebase e eventos diretos.
  // =========================================================

  const PROCESSOS_FACCOES_CONFIG_COLECAO = "configuracoes";
  const PROCESSOS_FACCOES_CONFIG_DOCUMENTO = "processosFaccoes";
  const PROCESSOS_FACCOES_ORDEM_PADRAO = [
    "ENCAPAR BOJO",
    "ALÇA",
    "CALCINHA MONTAGEM",
    "CALCINHA COMPLETA",
    "SUTIÃ MONTAGEM",
    "SUTIÃ COMPLETO"
  ];

  let contextoProcessosFaccoes = null;
  let unsubscribeAuthProcessosFaccoes = null;
  let unsubscribeConfigProcessosFaccoes = null;
  let unsubscribeListaFaccoesProcessos = null;
  let usuarioEhAdminProcessosFaccoes = false;
  let configuracaoProcessosFaccoesExiste = false;
  let inicializacaoProcessosFaccoesTentada = false;
  let processosFaccoesConfigurados = [];
  let faccoesCadastroProcessos = [];
  let processoFaccaoSelecionado = "";
  let painelProcessosFaccoesIniciado = false;
  let eventosProcessosFaccoesInstalados = false;

  function escapeHtmlProcessosFaccoes(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizarNomeProcessoGerenciado(valor) {
    const texto = String(valor || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
    const semAcento = normalizarComparacao(texto);
    const aliases = {
      "BOJO": "ENCAPAR BOJO",
      "ENCAPAR": "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      "ALCA": "ALÇA",
      "ALCAS": "ALÇA",
      "ALÇAS": "ALÇA",
      "MONTAGEM CALCINHA": "CALCINHA MONTAGEM",
      "CALCINHA PRONTA": "CALCINHA COMPLETA",
      "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
      "SUTIA COMPLETO": "SUTIÃ COMPLETO"
    };
    return aliases[texto] || aliases[semAcento] || texto;
  }

  function normalizarNomeFaccaoGerenciada(valor) {
    return String(valor || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function chaveNormalizadaProcessosFaccoes(valor) {
    return normalizarComparacao(valor).replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function ordenarNomesProcessosFaccoes(lista) {
    const mapa = new Map();
    (lista || []).forEach(valor => {
      const nome = normalizarNomeProcessoGerenciado(valor);
      const chave = chaveNormalizadaProcessosFaccoes(nome);
      if (nome && chave && !mapa.has(chave)) mapa.set(chave, nome);
    });
    return [...mapa.values()].sort((a, b) => {
      const ia = PROCESSOS_FACCOES_ORDEM_PADRAO.indexOf(a);
      const ib = PROCESSOS_FACCOES_ORDEM_PADRAO.indexOf(b);
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }
      return a.localeCompare(b, "pt-BR", { numeric: true });
    });
  }

  function ordenarNomesFaccoesProcessos(lista) {
    const mapa = new Map();
    (lista || []).forEach(valor => {
      const nome = normalizarNomeFaccaoGerenciada(valor);
      const chave = chaveNormalizadaProcessosFaccoes(nome);
      if (nome && chave && !mapa.has(chave)) mapa.set(chave, nome);
    });
    return [...mapa.values()].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }

  function inferirSetorProcessoFaccao(nome) {
    const normalizado = normalizarComparacao(nome);
    if (normalizado.includes("CALCINHA")) return "calcinha";
    if (
      normalizado.includes("SUTIA") ||
      normalizado.includes("BOJO") ||
      normalizado.includes("ALCA")
    ) return "sutia";
    return "ambos";
  }

  function normalizarSetorProcessoFaccao(valor, nome = "") {
    const setor = String(valor || "").trim().toLowerCase();
    if (["sutia", "calcinha", "ambos"].includes(setor)) return setor;
    return inferirSetorProcessoFaccao(nome);
  }

  function normalizarRegistroProcessoFaccao(item) {
    const nome = normalizarNomeProcessoGerenciado(item?.nome || item?.processo || "");
    return {
      nome,
      setor: normalizarSetorProcessoFaccao(item?.setor, nome),
      faccoes: ordenarNomesFaccoesProcessos(item?.faccoes || item?.nomesFaccoes || []),
      ativo: item?.ativo !== false
    };
  }

  function processosPadraoComoConfiguracao() {
    return Object.entries(FACCOES_POR_PROCESSO).map(([nome, faccoes]) => ({
      nome: normalizarNomeProcessoGerenciado(nome),
      setor: inferirSetorProcessoFaccao(nome),
      faccoes: ordenarNomesFaccoesProcessos(faccoes),
      ativo: true
    }));
  }

  function mesclarProcessosFaccoes(base, adicionais) {
    const mapa = new Map();
    [...(base || []), ...(adicionais || [])].forEach(item => {
      const normalizado = normalizarRegistroProcessoFaccao(item);
      if (!normalizado.nome) return;
      const chave = chaveNormalizadaProcessosFaccoes(normalizado.nome);
      const atual = mapa.get(chave);
      if (!atual) {
        mapa.set(chave, normalizado);
        return;
      }
      mapa.set(chave, {
        ...atual,
        ...normalizado,
        setor: normalizado.setor || atual.setor,
        faccoes: ordenarNomesFaccoesProcessos([...(atual.faccoes || []), ...(normalizado.faccoes || [])]),
        ativo: atual.ativo !== false || normalizado.ativo !== false
      });
    });

    const nomesOrdenados = ordenarNomesProcessosFaccoes([...mapa.values()].map(item => item.nome));
    return nomesOrdenados.map(nome => mapa.get(chaveNormalizadaProcessosFaccoes(nome))).filter(Boolean);
  }

  function construirConfiguracaoInferidaProcessosFaccoes() {
    let processos = processosPadraoComoConfiguracao();
    const extras = [];

    faccoesCadastroProcessos.forEach(faccao => {
      if (!faccao?.nome || faccao?.ativo === false || faccao?.cadastroPendente) return;
      (Array.isArray(faccao.processosPermitidos) ? faccao.processosPermitidos : []).forEach(processo => {
        const nome = normalizarNomeProcessoGerenciado(processo);
        if (!nome) return;
        extras.push({
          nome,
          setor: inferirSetorProcessoFaccao(nome),
          faccoes: [faccao.nome],
          ativo: true
        });
      });
    });

    processos = mesclarProcessosFaccoes(processos, extras);
    return processos;
  }

  function getProcessosFaccoesAtivos() {
    const origem = configuracaoProcessosFaccoesExiste
      ? processosFaccoesConfigurados
      : construirConfiguracaoInferidaProcessosFaccoes();
    return origem.filter(item => item?.ativo !== false && item?.nome);
  }

  function getNomesProcessosFaccoesAtivos(setor = "") {
    const setorNormalizado = String(setor || "").toLowerCase();
    return ordenarNomesProcessosFaccoes(
      getProcessosFaccoesAtivos()
        .filter(item => !setorNormalizado || item.setor === "ambos" || item.setor === setorNormalizado)
        .map(item => item.nome)
    );
  }

  function getRegistroProcessoFaccao(nome) {
    const chave = chaveNormalizadaProcessosFaccoes(nome);
    return getProcessosFaccoesAtivos().find(item => chaveNormalizadaProcessosFaccoes(item.nome) === chave) || null;
  }

  function getFaccoesGerenciadasPorProcesso(nome) {
    const registro = getRegistroProcessoFaccao(nome);
    if (!registro) return [];
    return ordenarNomesFaccoesProcessos(registro.faccoes || []);
  }

  function faccaoAtivaPorNomeProcessos(nome) {
    const chave = chaveNormalizadaProcessosFaccoes(nome);
    return faccoesCadastroProcessos.find(item =>
      item?.ativo !== false &&
      !item?.cadastroPendente &&
      chaveNormalizadaProcessosFaccoes(item?.nome) === chave
    ) || null;
  }

  function injetarEstilosProcessosFaccoes() {
    if (document.getElementById("styleProcessosFaccoesGerenciados")) return;
    const style = document.createElement("style");
    style.id = "styleProcessosFaccoesGerenciados";
    style.textContent = `
      .processos-faccoes-painel {
        margin: 18px 0 22px;
        padding: 18px;
        border: 1px solid #dbe3ee;
        border-radius: 18px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        box-shadow: 0 10px 28px rgba(15, 23, 42, .06);
      }
      .processos-faccoes-cabecalho {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 14px;
      }
      .processos-faccoes-cabecalho h3 { margin: 0; color: #0f172a; }
      .processos-faccoes-cabecalho p { margin: 5px 0 0; color: #64748b; }
      .processos-faccoes-grade {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 10px;
      }
      .processo-faccao-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-height: 72px;
        padding: 13px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        background: #fff;
        color: #0f172a;
        text-align: left;
        cursor: pointer;
        transition: .18s ease;
      }
      .processo-faccao-card:hover { border-color: #7c3aed; transform: translateY(-1px); }
      .processo-faccao-card.ativo { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124, 58, 237, .12); }
      .processo-faccao-card strong { display: block; font-size: 14px; }
      .processo-faccao-card small { display: block; margin-top: 3px; color: #64748b; }
      .processo-faccao-card .contador {
        min-width: 34px;
        height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #ede9fe;
        color: #6d28d9;
        font-weight: 900;
      }
      .processos-faccoes-detalhe {
        margin-top: 14px;
        padding: 16px;
        border: 1px solid #dbe3ee;
        border-radius: 14px;
        background: #fff;
      }
      .processos-faccoes-detalhe.hidden { display: none !important; }
      .processos-faccoes-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
      .processos-faccoes-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        border-radius: 999px;
        background: #ecfdf5;
        border: 1px solid #bbf7d0;
        color: #166534;
        font-weight: 800;
        font-size: 12px;
      }
      .processos-faccoes-chip.pendente { background: #fff7ed; border-color: #fed7aa; color: #9a3412; }
      .processos-faccoes-admin {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e2e8f0;
      }
      .processos-faccoes-admin.hidden { display: none !important; }
      .processos-faccoes-admin-grid {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 170px auto;
        gap: 10px;
        align-items: end;
      }
      .processos-faccoes-admin label { display: grid; gap: 5px; color: #334155; font-size: 12px; font-weight: 800; }
      .processos-faccoes-admin input, .processos-faccoes-admin select {
        width: 100%;
        min-height: 42px;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 9px 11px;
        background: #fff;
      }
      .processos-faccoes-checks {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 8px;
        margin: 12px 0;
        max-height: 300px;
        overflow: auto;
        padding: 4px;
      }
      .processos-faccoes-check {
        display: flex !important;
        grid-template-columns: none !important;
        align-items: center;
        gap: 9px !important;
        min-height: 42px;
        padding: 9px 10px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #f8fafc;
        cursor: pointer;
      }
      .processos-faccoes-check input { width: 17px !important; min-height: 17px !important; margin: 0; }
      .processos-faccoes-novo {
        margin-bottom: 14px;
        padding: 14px;
        border: 1px dashed #a78bfa;
        border-radius: 13px;
        background: #faf5ff;
      }
      .processos-faccoes-admin-acoes { display: flex; flex-wrap: wrap; gap: 8px; }
      @media (max-width: 780px) {
        .processos-faccoes-cabecalho { flex-direction: column; }
        .processos-faccoes-admin-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function criarPainelProcessosFaccoes() {
    let painel = document.getElementById("painelProcessosFaccoes");
    if (painel) return painel;

    const cardsResumo = document.querySelector("#faccoes .faccoes-cards");
    if (!cardsResumo) return null;

    painel = document.createElement("section");
    painel.id = "painelProcessosFaccoes";
    painel.className = "processos-faccoes-painel";
    painel.innerHTML = `
      <div class="processos-faccoes-cabecalho">
        <div>
          <h3>Processos das facções</h3>
          <p>Clique em um processo para ver quais facções realizam esse serviço.</p>
        </div>
        <button id="btnGerenciarProcessosFaccoes" class="btn btn-primary hidden" type="button">Gerenciar processos</button>
      </div>
      <div id="gradeProcessosFaccoes" class="processos-faccoes-grade"></div>
      <div id="detalheProcessoFaccao" class="processos-faccoes-detalhe hidden"></div>
    `;
    cardsResumo.insertAdjacentElement("afterend", painel);
    return painel;
  }

  function criarHtmlNovoProcessoFaccao() {
    if (!usuarioEhAdminProcessosFaccoes) return "";
    return `
      <div id="boxNovoProcessoFaccao" class="processos-faccoes-novo hidden">
        <strong>Adicionar novo processo</strong>
        <div class="processos-faccoes-admin-grid" style="margin-top:10px;">
          <label>Nome do processo
            <input id="novoProcessoFaccaoNome" type="text" placeholder="Ex: REVISÃO FINAL" />
          </label>
          <label>Usado em
            <select id="novoProcessoFaccaoSetor">
              <option value="sutia">Sutiã</option>
              <option value="calcinha">Calcinha</option>
              <option value="ambos">Sutiã e Calcinha</option>
            </select>
          </label>
          <button id="btnAdicionarNovoProcessoFaccao" class="btn btn-success" type="button">Adicionar processo</button>
        </div>
      </div>
    `;
  }

  function renderGradeProcessosFaccoes() {
    const painel = criarPainelProcessosFaccoes();
    if (!painel) return;

    const botaoGerenciar = document.getElementById("btnGerenciarProcessosFaccoes");
    botaoGerenciar?.classList.toggle("hidden", !usuarioEhAdminProcessosFaccoes);

    const grade = document.getElementById("gradeProcessosFaccoes");
    if (!grade) return;
    const processos = getProcessosFaccoesAtivos();

    if (!processos.length) {
      grade.innerHTML = `<div class="empty">Nenhum processo cadastrado.</div>`;
      document.getElementById("detalheProcessoFaccao")?.classList.add("hidden");
      return;
    }

    if (!processoFaccaoSelecionado || !getRegistroProcessoFaccao(processoFaccaoSelecionado)) {
      processoFaccaoSelecionado = processos[0].nome;
    }

    grade.innerHTML = processos.map(item => {
      const selecionado = chaveNormalizadaProcessosFaccoes(item.nome) === chaveNormalizadaProcessosFaccoes(processoFaccaoSelecionado);
      const quantidade = (item.faccoes || []).length;
      const setorLabel = item.setor === "calcinha" ? "Calcinha" : item.setor === "ambos" ? "Sutiã e Calcinha" : "Sutiã";
      return `
        <button type="button" class="processo-faccao-card ${selecionado ? "ativo" : ""}" data-selecionar-processo-faccao="${escapeHtmlProcessosFaccoes(item.nome)}">
          <span>
            <strong>${escapeHtmlProcessosFaccoes(item.nome)}</strong>
            <small>${escapeHtmlProcessosFaccoes(setorLabel)}</small>
          </span>
          <span class="contador">${quantidade}</span>
        </button>
      `;
    }).join("");

    renderDetalheProcessoFaccao();
  }

  function renderDetalheProcessoFaccao() {
    const detalhe = document.getElementById("detalheProcessoFaccao");
    if (!detalhe) return;
    const registro = getRegistroProcessoFaccao(processoFaccaoSelecionado);
    if (!registro) {
      detalhe.classList.add("hidden");
      detalhe.innerHTML = "";
      return;
    }

    const faccoes = ordenarNomesFaccoesProcessos(registro.faccoes || []);
    const chips = faccoes.length
      ? faccoes.map(nome => {
          const cadastrada = faccaoAtivaPorNomeProcessos(nome);
          return `<span class="processos-faccoes-chip ${cadastrada ? "" : "pendente"}">${escapeHtmlProcessosFaccoes(nome)}${cadastrada ? "" : " • sem cadastro ativo"}</span>`;
        }).join("")
      : `<span class="muted">Nenhuma facção vinculada a este processo.</span>`;

    const faccoesAtivas = faccoesCadastroProcessos
      .filter(item => item?.nome && item?.ativo !== false && !item?.cadastroPendente && !item?.duplicadaDe)
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR", { numeric: true }));
    const selecionadas = new Set(faccoes.map(chaveNormalizadaProcessosFaccoes));

    detalhe.classList.remove("hidden");
    detalhe.innerHTML = `
      ${criarHtmlNovoProcessoFaccao()}
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div>
          <h4 style="margin:0;color:#0f172a;">${escapeHtmlProcessosFaccoes(registro.nome)}</h4>
          <p style="margin:5px 0 0;color:#64748b;">Quem realiza este processo</p>
        </div>
        <span class="badge info">${faccoes.length} facção(ões)</span>
      </div>
      <div class="processos-faccoes-chips">${chips}</div>
      ${usuarioEhAdminProcessosFaccoes ? `
        <div id="adminProcessoFaccaoSelecionado" class="processos-faccoes-admin hidden">
          <div class="processos-faccoes-admin-grid">
            <label>Nome do processo
              <input id="editarProcessoFaccaoNome" type="text" value="${escapeHtmlProcessosFaccoes(registro.nome)}" />
            </label>
            <label>Usado em
              <select id="editarProcessoFaccaoSetor">
                <option value="sutia" ${registro.setor === "sutia" ? "selected" : ""}>Sutiã</option>
                <option value="calcinha" ${registro.setor === "calcinha" ? "selected" : ""}>Calcinha</option>
                <option value="ambos" ${registro.setor === "ambos" ? "selected" : ""}>Sutiã e Calcinha</option>
              </select>
            </label>
            <button id="btnSalvarProcessoFaccao" class="btn btn-success" type="button">Salvar alterações</button>
          </div>
          <p style="margin:14px 0 6px;color:#475569;font-weight:800;">Marque quem realiza este processo:</p>
          <div class="processos-faccoes-checks">
            ${faccoesAtivas.length ? faccoesAtivas.map(faccao => {
              const nome = normalizarNomeFaccaoGerenciada(faccao.nome);
              const marcado = selecionadas.has(chaveNormalizadaProcessosFaccoes(nome));
              return `
                <label class="processos-faccoes-check">
                  <input type="checkbox" data-faccao-processo-check="${escapeHtmlProcessosFaccoes(nome)}" ${marcado ? "checked" : ""} />
                  <span>${escapeHtmlProcessosFaccoes(nome)}</span>
                </label>
              `;
            }).join("") : `<span class="muted">Cadastre uma facção ativa antes de criar vínculos.</span>`}
          </div>
          <div class="processos-faccoes-admin-acoes">
            <button id="btnSalvarVinculosProcessoFaccao" class="btn btn-primary" type="button">Salvar quem faz</button>
            <button id="btnExcluirProcessoFaccao" class="btn btn-danger" type="button">Excluir processo da lista</button>
          </div>
          <small style="display:block;margin-top:9px;color:#64748b;">Excluir ou renomear não altera movimentações e pagamentos antigos.</small>
        </div>
      ` : ""}
    `;

    const painelAtual = getPainelProcessosFaccoes();
    const gerenciando = painelAtual?.dataset?.gerenciandoProcessosFaccoes === "1";
    detalhe.querySelector("#adminProcessoFaccaoSelecionado")?.classList.toggle("hidden", !gerenciando);
    detalhe.querySelector("#boxNovoProcessoFaccao")?.classList.toggle("hidden", !gerenciando);
  }

  function getPainelProcessosFaccoes() {
    return document.getElementById("painelProcessosFaccoes");
  }

  async function salvarConfiguracaoProcessosFaccoes(processos, detalhesLog = "") {
    if (!usuarioEhAdminProcessosFaccoes || !contextoProcessosFaccoes?.user) {
      mostrarAvisoFormulario("Somente o administrador pode gerenciar processos das facções.");
      return false;
    }
    const { firestore, db, user } = contextoProcessosFaccoes;
    const normalizados = mesclarProcessosFaccoes([], processos).map(normalizarRegistroProcessoFaccao);
    await firestore.setDoc(
      firestore.doc(db, PROCESSOS_FACCOES_CONFIG_COLECAO, PROCESSOS_FACCOES_CONFIG_DOCUMENTO),
      {
        processos: normalizados,
        atualizadoEm: firestore.serverTimestamp(),
        atualizadoPor: user.uid,
        versaoGerenciamento: APP_VERSION
      },
      { merge: true }
    );
    try {
      await firestore.addDoc(firestore.collection(db, "logsAlteracoes"), {
        acao: "processos_faccoes_atualizados",
        entidade: "configuracoes",
        entidadeId: PROCESSOS_FACCOES_CONFIG_DOCUMENTO,
        detalhes: detalhesLog || `${normalizados.length} processo(s) configurado(s)`,
        usuarioUid: user.uid,
        usuarioEmail: user.email || "",
        criadoEm: firestore.serverTimestamp(),
        versao: APP_VERSION
      });
    } catch (error) {
      console.warn("Configuração salva, mas o log não foi registrado.", error);
    }
    return true;
  }

  async function sincronizarProcessoNosCadastrosFaccoes(nomeAntigo, nomeNovo, faccoesSelecionadas, excluir = false) {
    if (!contextoProcessosFaccoes?.user || !usuarioEhAdminProcessosFaccoes) return;
    const { firestore, db, user } = contextoProcessosFaccoes;
    const chaveAntiga = chaveNormalizadaProcessosFaccoes(nomeAntigo);
    const chaveNova = chaveNormalizadaProcessosFaccoes(nomeNovo);
    const selecionadas = new Set((faccoesSelecionadas || []).map(chaveNormalizadaProcessosFaccoes));
    const alteracoes = [];

    faccoesCadastroProcessos.forEach(faccao => {
      if (!faccao?.id || !faccao?.nome) return;
      const atuais = ordenarNomesProcessosFaccoes(faccao.processosPermitidos || []);
      const filtradas = atuais.filter(item => chaveNormalizadaProcessosFaccoes(item) !== chaveAntiga && chaveNormalizadaProcessosFaccoes(item) !== chaveNova);
      if (!excluir && selecionadas.has(chaveNormalizadaProcessosFaccoes(faccao.nome))) {
        filtradas.push(nomeNovo);
      }
      const finais = ordenarNomesProcessosFaccoes(filtradas);
      const antes = atuais.map(chaveNormalizadaProcessosFaccoes).join("|");
      const depois = finais.map(chaveNormalizadaProcessosFaccoes).join("|");
      if (antes === depois) return;
      alteracoes.push({ id: faccao.id, processosPermitidos: finais });
    });

    for (let inicio = 0; inicio < alteracoes.length; inicio += 400) {
      const lote = firestore.writeBatch(db);
      alteracoes.slice(inicio, inicio + 400).forEach(item => {
        lote.set(firestore.doc(db, "faccoes", item.id), {
          processosPermitidos: item.processosPermitidos,
          processosGerenciados: true,
          atualizadoPor: user.uid,
          atualizadoEm: firestore.serverTimestamp()
        }, { merge: true });
      });
      await lote.commit();
    }
  }

  async function adicionarNovoProcessoFaccao() {
    const nome = normalizarNomeProcessoGerenciado(document.getElementById("novoProcessoFaccaoNome")?.value || "");
    const setor = normalizarSetorProcessoFaccao(document.getElementById("novoProcessoFaccaoSetor")?.value, nome);
    if (!nome) {
      mostrarAvisoFormulario("Digite o nome do novo processo.");
      return;
    }
    if (getProcessosFaccoesAtivos().some(item => chaveNormalizadaProcessosFaccoes(item.nome) === chaveNormalizadaProcessosFaccoes(nome))) {
      mostrarAvisoFormulario("Este processo já está cadastrado.");
      return;
    }
    const novaLista = [...getProcessosFaccoesAtivos(), { nome, setor, faccoes: [], ativo: true }];
    try {
      await salvarConfiguracaoProcessosFaccoes(novaLista, `Processo criado: ${nome}`);
      processoFaccaoSelecionado = nome;
      showUpdateToast(`Processo "${nome}" adicionado.`);
    } catch (error) {
      console.error(error);
      mostrarAvisoFormulario("Não foi possível adicionar o processo.");
    }
  }

  function faccoesMarcadasNoGerenciamento() {
    return [...document.querySelectorAll("[data-faccao-processo-check]:checked")]
      .map(input => normalizarNomeFaccaoGerenciada(input.getAttribute("data-faccao-processo-check")))
      .filter(Boolean);
  }

  async function salvarProcessoFaccaoSelecionado({ somenteVinculos = false } = {}) {
    const atual = getRegistroProcessoFaccao(processoFaccaoSelecionado);
    if (!atual) return;
    const nomeNovo = somenteVinculos
      ? atual.nome
      : normalizarNomeProcessoGerenciado(document.getElementById("editarProcessoFaccaoNome")?.value || atual.nome);
    const setorNovo = somenteVinculos
      ? atual.setor
      : normalizarSetorProcessoFaccao(document.getElementById("editarProcessoFaccaoSetor")?.value, nomeNovo);
    const selecionadas = faccoesMarcadasNoGerenciamento();
    if (!nomeNovo) {
      mostrarAvisoFormulario("Informe o nome do processo.");
      return;
    }
    const conflito = getProcessosFaccoesAtivos().some(item =>
      chaveNormalizadaProcessosFaccoes(item.nome) === chaveNormalizadaProcessosFaccoes(nomeNovo) &&
      chaveNormalizadaProcessosFaccoes(item.nome) !== chaveNormalizadaProcessosFaccoes(atual.nome)
    );
    if (conflito) {
      mostrarAvisoFormulario("Já existe outro processo com esse nome.");
      return;
    }

    const novaLista = getProcessosFaccoesAtivos().map(item => {
      if (chaveNormalizadaProcessosFaccoes(item.nome) !== chaveNormalizadaProcessosFaccoes(atual.nome)) return item;
      return { ...item, nome: nomeNovo, setor: setorNovo, faccoes: selecionadas, ativo: true };
    });

    try {
      const botao = document.getElementById(somenteVinculos ? "btnSalvarVinculosProcessoFaccao" : "btnSalvarProcessoFaccao");
      if (botao) { botao.disabled = true; botao.textContent = "Salvando..."; }
      await salvarConfiguracaoProcessosFaccoes(novaLista, `${atual.nome} -> ${nomeNovo} | ${selecionadas.length} facção(ões)`);
      await sincronizarProcessoNosCadastrosFaccoes(atual.nome, nomeNovo, selecionadas, false);
      processoFaccaoSelecionado = nomeNovo;
      showUpdateToast("Processo e facções atualizados com sucesso.");
    } catch (error) {
      console.error(error);
      mostrarAvisoFormulario("Não foi possível salvar os vínculos do processo.");
      renderDetalheProcessoFaccao();
    }
  }

  async function excluirProcessoFaccaoSelecionado() {
    const atual = getRegistroProcessoFaccao(processoFaccaoSelecionado);
    if (!atual) return;
    const confirmar = window.confirm(
      `Excluir "${atual.nome}" da lista de processos?\n\nMovimentações e pagamentos antigos não serão alterados.`
    );
    if (!confirmar) return;

    const novaLista = getProcessosFaccoesAtivos().filter(item =>
      chaveNormalizadaProcessosFaccoes(item.nome) !== chaveNormalizadaProcessosFaccoes(atual.nome)
    );
    try {
      await salvarConfiguracaoProcessosFaccoes(novaLista, `Processo removido: ${atual.nome}`);
      await sincronizarProcessoNosCadastrosFaccoes(atual.nome, atual.nome, [], true);
      processoFaccaoSelecionado = novaLista[0]?.nome || "";
      showUpdateToast(`Processo "${atual.nome}" removido da lista.`);
    } catch (error) {
      console.error(error);
      mostrarAvisoFormulario("Não foi possível excluir o processo.");
    }
  }

  function atualizarSelectChegadaManualComProcessosGerenciados() {
    const select = document.getElementById("chegadaManualProcesso");
    if (!select || select.tagName !== "SELECT") return;
    const valorAtual = processoCanonico(select.value);
    const nomes = getNomesProcessosFaccoesAtivos();
    select.innerHTML = `<option value="">Selecione o processo realizado</option>` + nomes.map(nome =>
      `<option value="${escapeHtmlProcessosFaccoes(nome)}">${escapeHtmlProcessosFaccoes(nome)}</option>`
    ).join("");
    if (valorAtual && nomes.some(nome => chaveNormalizadaProcessosFaccoes(nome) === chaveNormalizadaProcessosFaccoes(valorAtual))) {
      select.value = valorAtual;
    }
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setorAtualMovimentacaoProcessosFaccoes() {
    try {
      if (typeof setorAtualFiltroExcelManejo === "function") {
        return setorAtualFiltroExcelManejo() === "calcinha" ? "calcinha" : "sutia";
      }
    } catch (_) {}
    return document.querySelector(".manejo-setor-btn.active")?.dataset?.setor === "calcinha" ? "calcinha" : "sutia";
  }

  function aplicarProcessosGerenciadosNoModalMovimentacao() {
    const modal = document.getElementById("modalMovimentacao");
    const tipo = document.getElementById("movimentacaoTipoDestino")?.value || "";
    const select = document.getElementById("movimentacaoProcessoSelect");
    if (!modal || modal.classList.contains("hidden") || tipo !== "faccao" || !select) return;

    const setor = setorAtualMovimentacaoProcessosFaccoes();
    const nomes = getNomesProcessosFaccoesAtivos(setor);
    const valorAtual = processoCanonico(select.value || document.getElementById("movimentacaoProcesso")?.value || "");
    select.innerHTML = `<option value="">Primeiro selecione o processo</option>` + nomes.map(nome =>
      `<option value="${escapeHtmlProcessosFaccoes(nome)}">${escapeHtmlProcessosFaccoes(nome)}</option>`
    ).join("");
    if (valorAtual && nomes.some(nome => chaveNormalizadaProcessosFaccoes(nome) === chaveNormalizadaProcessosFaccoes(valorAtual))) {
      select.value = valorAtual;
    }
    const input = document.getElementById("movimentacaoProcesso");
    if (input) input.value = select.value || "";
    aplicarFaccoesGerenciadasNoDestinoMovimentacao();
  }

  function aplicarFaccoesGerenciadasNoDestinoMovimentacao() {
    const tipo = document.getElementById("movimentacaoTipoDestino")?.value || "";
    const destino = document.getElementById("movimentacaoDestino");
    if (tipo !== "faccao" || !destino) return;
    const processo = processoCanonico(
      document.getElementById("movimentacaoProcessoSelect")?.value ||
      document.getElementById("movimentacaoProcesso")?.value || ""
    );
    const valorAtual = normalizarNomeFaccaoGerenciada(destino.value);
    if (!processo) {
      destino.disabled = true;
      destino.innerHTML = `<option value="">Escolha o processo primeiro</option>`;
      return;
    }
    const faccoes = getFaccoesGerenciadasPorProcesso(processo);
    destino.disabled = !faccoes.length;
    destino.innerHTML = faccoes.length
      ? `<option value="">Agora selecione a facção</option>` + faccoes.map(nome =>
          `<option value="${escapeHtmlProcessosFaccoes(nome)}">${escapeHtmlProcessosFaccoes(nome)}</option>`
        ).join("")
      : `<option value="">Nenhuma facção vinculada a este processo</option>`;
    const correspondente = faccoes.find(nome => chaveNormalizadaProcessosFaccoes(nome) === chaveNormalizadaProcessosFaccoes(valorAtual));
    if (correspondente) destino.value = correspondente;
  }

  function instalarEventosProcessosFaccoes() {
    if (eventosProcessosFaccoesInstalados) return;
    eventosProcessosFaccoesInstalados = true;

    document.addEventListener("click", event => {
      const selecionar = event.target?.closest?.("[data-selecionar-processo-faccao]");
      if (selecionar) {
        processoFaccaoSelecionado = selecionar.getAttribute("data-selecionar-processo-faccao") || "";
        renderGradeProcessosFaccoes();
        return;
      }

      if (event.target?.closest?.("#btnGerenciarProcessosFaccoes")) {
        const painel = getPainelProcessosFaccoes();
        if (!painel || !usuarioEhAdminProcessosFaccoes) return;
        const ativo = painel.dataset.gerenciandoProcessosFaccoes !== "1";
        painel.dataset.gerenciandoProcessosFaccoes = ativo ? "1" : "0";
        const botao = document.getElementById("btnGerenciarProcessosFaccoes");
        if (botao) botao.textContent = ativo ? "Fechar gerenciamento" : "Gerenciar processos";
        renderDetalheProcessoFaccao();
        return;
      }

      if (event.target?.closest?.("#btnAdicionarNovoProcessoFaccao")) {
        adicionarNovoProcessoFaccao();
        return;
      }
      if (event.target?.closest?.("#btnSalvarProcessoFaccao")) {
        salvarProcessoFaccaoSelecionado({ somenteVinculos: false });
        return;
      }
      if (event.target?.closest?.("#btnSalvarVinculosProcessoFaccao")) {
        salvarProcessoFaccaoSelecionado({ somenteVinculos: true });
        return;
      }
      if (event.target?.closest?.("#btnExcluirProcessoFaccao")) {
        excluirProcessoFaccaoSelecionado();
        return;
      }

      // Depois que o app.js abre o modal, substitui as listas pela configuração oficial.
      setTimeout(aplicarProcessosGerenciadosNoModalMovimentacao, 0);
      setTimeout(aplicarProcessosGerenciadosNoModalMovimentacao, 80);
    });

    document.getElementById("movimentacaoProcessoSelect")?.addEventListener("change", () => {
      setTimeout(aplicarFaccoesGerenciadasNoDestinoMovimentacao, 0);
    });
    document.getElementById("movimentacaoProcesso")?.addEventListener("input", () => {
      setTimeout(aplicarFaccoesGerenciadasNoDestinoMovimentacao, 0);
    });

    document.getElementById("formMovimentacaoProducao")?.addEventListener("submit", event => {
      const tipo = document.getElementById("movimentacaoTipoDestino")?.value || "";
      if (tipo !== "faccao") return;
      const processo = processoCanonico(document.getElementById("movimentacaoProcessoSelect")?.value || "");
      const faccao = normalizarNomeFaccaoGerenciada(document.getElementById("movimentacaoDestino")?.value || "");
      const permitidas = getFaccoesGerenciadasPorProcesso(processo);
      if (!processo || !faccao || !permitidas.some(nome => chaveNormalizadaProcessosFaccoes(nome) === chaveNormalizadaProcessosFaccoes(faccao))) {
        event.preventDefault();
        event.stopImmediatePropagation();
        mostrarAvisoFormulario("Selecione uma facção vinculada ao processo escolhido.");
      }
    }, true);
  }

  async function criarConfiguracaoInicialProcessosFaccoesSeNecessario() {
    if (
      inicializacaoProcessosFaccoesTentada ||
      configuracaoProcessosFaccoesExiste ||
      !usuarioEhAdminProcessosFaccoes ||
      !contextoProcessosFaccoes?.user ||
      !faccoesCadastroProcessos.length
    ) return;

    inicializacaoProcessosFaccoesTentada = true;
    try {
      const processos = construirConfiguracaoInferidaProcessosFaccoes();
      const { firestore, db, user } = contextoProcessosFaccoes;
      const referencia = firestore.doc(db, PROCESSOS_FACCOES_CONFIG_COLECAO, PROCESSOS_FACCOES_CONFIG_DOCUMENTO);
      await firestore.runTransaction(db, async transacao => {
        const snapshot = await transacao.get(referencia);
        if (snapshot.exists()) return;
        transacao.set(referencia, {
          processos,
          criadoEm: firestore.serverTimestamp(),
          criadoPor: user.uid,
          atualizadoEm: firestore.serverTimestamp(),
          atualizadoPor: user.uid,
          versaoGerenciamento: APP_VERSION
        });
      });
      showUpdateToast(`${processos.length} processo(s) e seus vínculos foram preparados para gerenciamento.`);
    } catch (error) {
      inicializacaoProcessosFaccoesTentada = false;
      console.error("Erro ao criar configuração inicial dos processos das facções.", error);
    }
  }

  function iniciarSnapshotsProcessosFaccoes() {
    if (!contextoProcessosFaccoes) return;
    const { firestore, db } = contextoProcessosFaccoes;

    if (unsubscribeConfigProcessosFaccoes) unsubscribeConfigProcessosFaccoes();
    unsubscribeConfigProcessosFaccoes = firestore.onSnapshot(
      firestore.doc(db, PROCESSOS_FACCOES_CONFIG_COLECAO, PROCESSOS_FACCOES_CONFIG_DOCUMENTO),
      snapshot => {
        configuracaoProcessosFaccoesExiste = snapshot.exists();
        processosFaccoesConfigurados = configuracaoProcessosFaccoesExiste
          ? mesclarProcessosFaccoes([], snapshot.data()?.processos || [])
          : [];
        renderGradeProcessosFaccoes();
        atualizarSelectChegadaManualComProcessosGerenciados();
        aplicarProcessosGerenciadosNoModalMovimentacao();
        criarConfiguracaoInicialProcessosFaccoesSeNecessario();
      },
      error => console.error("Erro ao carregar configuração dos processos das facções.", error)
    );

    if (unsubscribeListaFaccoesProcessos) unsubscribeListaFaccoesProcessos();
    unsubscribeListaFaccoesProcessos = firestore.onSnapshot(
      firestore.collection(db, "faccoes"),
      snapshot => {
        faccoesCadastroProcessos = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        renderGradeProcessosFaccoes();
        criarConfiguracaoInicialProcessosFaccoesSeNecessario();
      },
      error => console.error("Erro ao carregar facções para os processos.", error)
    );
  }

  async function configurarUsuarioProcessosFaccoes(user) {
    if (!user || !contextoProcessosFaccoes) {
      usuarioEhAdminProcessosFaccoes = false;
      document.getElementById("btnGerenciarProcessosFaccoes")?.classList.add("hidden");
      if (unsubscribeConfigProcessosFaccoes) unsubscribeConfigProcessosFaccoes();
      if (unsubscribeListaFaccoesProcessos) unsubscribeListaFaccoesProcessos();
      unsubscribeConfigProcessosFaccoes = null;
      unsubscribeListaFaccoesProcessos = null;
      return;
    }

    const { firestore, db } = contextoProcessosFaccoes;
    try {
      const perfilSnapshot = await firestore.getDoc(firestore.doc(db, "usuarios", user.uid));
      const perfil = perfilSnapshot.exists() ? perfilSnapshot.data() : {};
      usuarioEhAdminProcessosFaccoes = perfil?.tipo === "admin" && perfil?.ativo !== false;
      contextoProcessosFaccoes = { ...contextoProcessosFaccoes, user, perfil };
      criarPainelProcessosFaccoes();
      iniciarSnapshotsProcessosFaccoes();
      renderGradeProcessosFaccoes();
    } catch (error) {
      usuarioEhAdminProcessosFaccoes = false;
      console.error("Não foi possível validar o acesso aos processos das facções.", error);
    }
  }

  async function conectarFirebaseProcessosFaccoes(tentativa = 0) {
    if (contextoProcessosFaccoes?.auth) return;
    try {
      const [firebaseApp, firestore, firebaseAuth] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js")
      ]);
      if (!firebaseApp.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const appAtual = firebaseApp.getApp();
      const auth = firebaseAuth.getAuth(appAtual);
      const db = firestore.getFirestore(appAtual);
      contextoProcessosFaccoes = { firestore, firebaseAuth, auth, db, user: null, perfil: null };
      if (unsubscribeAuthProcessosFaccoes) unsubscribeAuthProcessosFaccoes();
      unsubscribeAuthProcessosFaccoes = firebaseAuth.onAuthStateChanged(auth, configurarUsuarioProcessosFaccoes);
    } catch (error) {
      if (tentativa < 20) {
        setTimeout(() => conectarFirebaseProcessosFaccoes(tentativa + 1), 300);
        return;
      }
      console.error("Não foi possível iniciar os processos das facções.", error);
    }
  }

  function iniciarProcessosFaccoesGerenciados() {
    if (painelProcessosFaccoesIniciado) {
      renderGradeProcessosFaccoes();
      return;
    }
    painelProcessosFaccoesIniciado = true;
    injetarEstilosProcessosFaccoes();
    criarPainelProcessosFaccoes();
    instalarEventosProcessosFaccoes();
    conectarFirebaseProcessosFaccoes();
    renderGradeProcessosFaccoes();
  }




  // =========================================================
  // CHEGADA MANUAL SIMPLIFICADA PELA OP
  // - O usuário informa somente a OP; REF, cor, quantidade e setor vêm do Firestore.
  // - O usuário escolhe processo, facção, falta e desconto em reais.
  // - Movimentação, pagamento e log são gravados no mesmo batch.
  // - Sem MutationObserver e sem alterar o app.js.
  // =========================================================
  let chegadaManualSimplificadaOPCarregada = null;
  let chegadaManualSimplificadaBuscando = false;
  let chegadaManualSimplificadaSalvando = false;
  let chegadaManualSimplificadaTimer = null;
  const cacheOPsChegadaManualSimplificada = new Map();

  function escapeHtmlChegadaManualSimplificada(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function textoOPChegadaManualSimplificada(valor) {
    return String(valor || "")
      .trim()
      .toUpperCase()
      .replace(/^OP\s*[-:]?\s*/i, "");
  }

  function numeroChegadaManualSimplificada(valor) {
    const convertido = Number(String(valor ?? "").replace(",", "."));
    return Number.isFinite(convertido) ? convertido : 0;
  }

  function quantidadeOPChegadaManualSimplificada(op) {
    const candidatos = [
      op?.quantidade,
      op?.quantidadeTotal,
      op?.quantidadePecas,
      op?.qtd,
      op?.total,
      op?.pecas,
      op?.quantidadeSutia,
      op?.quantidadeCalcinha
    ];
    for (const valor of candidatos) {
      const numero = numeroChegadaManualSimplificada(valor);
      if (numero > 0) return numero;
    }
    return 0;
  }

  function setorOPChegadaManualSimplificada(op) {
    const valor = normalizarComparacao(
      op?.tipoPeca || op?.tipo || op?.setor || op?.tipoPecaLabel || ""
    );
    return valor.includes("CALCINHA") ? "calcinha" : "sutia";
  }

  function labelSetorChegadaManualSimplificada(setor) {
    return setor === "calcinha" ? "Calcinha" : "Sutiã";
  }

  function hojeISOChegadaManualSimplificada() {
    const agora = new Date();
    const local = new Date(agora.getTime() - (agora.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 10);
  }

  function dataEnvioDaOPChegadaManualSimplificada(op, setor) {
    const manejo = op?.manejosSetores?.[setor] || op?.manejo || {};
    const candidatos = [
      manejo?.dataEnvio,
      manejo?.data,
      op?.dataEnvioFaccao,
      op?.dataEnvio,
      op?.dataOriginalLigia
    ];
    for (const valor of candidatos) {
      const texto = String(valor || "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
    }
    return "";
  }

  function idSeguroChegadaManualSimplificada(valor) {
    return String(valor || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 180);
  }

  function formatarMoedaChegadaManualSimplificada(valor) {
    return numeroChegadaManualSimplificada(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function elementosChegadaManualSimplificada() {
    return {
      form: document.getElementById("formChegadaManualFaccao"),
      op: document.getElementById("chegadaManualOP"),
      resumo: document.getElementById("chegadaManualResumoOPAutomatico"),
      status: document.getElementById("chegadaManualStatusOPAutomatico"),
      processo: document.getElementById("chegadaManualProcesso"),
      faccao: document.getElementById("chegadaManualFaccao"),
      falta: document.getElementById("chegadaManualFalta"),
      desconto: document.getElementById("chegadaManualDesconto"),
      recebido: document.getElementById("chegadaManualQuantidadeRecebidaCalculada"),
      submit: document.querySelector('#formChegadaManualFaccao button[type="submit"]')
    };
  }

  function definirStatusOPChegadaManualSimplificada(mensagem, tipo = "normal") {
    const status = document.getElementById("chegadaManualStatusOPAutomatico");
    if (!status) return;
    status.textContent = mensagem || "";
    status.dataset.tipo = tipo;
  }

  function limparOPChegadaManualSimplificada({ preservarNumero = false } = {}) {
    chegadaManualSimplificadaOPCarregada = null;
    const el = elementosChegadaManualSimplificada();
    if (!preservarNumero && el.op) el.op.value = "";
    if (el.resumo) {
      el.resumo.classList.add("hidden");
      el.resumo.innerHTML = "";
    }
    if (el.processo) {
      el.processo.innerHTML = '<option value="">Busque uma OP primeiro</option>';
      el.processo.disabled = true;
    }
    if (el.faccao) {
      el.faccao.innerHTML = '<option value="">Escolha o processo primeiro</option>';
      el.faccao.disabled = true;
    }
    if (el.falta) {
      el.falta.value = "0";
      el.falta.max = "";
      el.falta.disabled = true;
    }
    if (el.desconto) {
      el.desconto.value = "0";
      el.desconto.disabled = true;
    }
    if (el.recebido) el.recebido.textContent = "-";
    if (el.submit) el.submit.disabled = true;
    definirStatusOPChegadaManualSimplificada("Digite a OP para carregar os dados automaticamente.");
  }

  async function buscarOPServidorChegadaManualSimplificada(numeroOP) {
    const chave = textoOPChegadaManualSimplificada(numeroOP);
    if (!chave) return null;
    if (cacheOPsChegadaManualSimplificada.has(chave)) {
      return cacheOPsChegadaManualSimplificada.get(chave);
    }

    const { firestore, db } = await obterContextoTravasDuplicidade();
    const colecao = firestore.collection(db, "ordensProducao");
    const encontrados = new Map();

    try {
      const direto = await firestore.getDoc(firestore.doc(db, "ordensProducao", chave));
      if (direto.exists()) encontrados.set(direto.id, { id: direto.id, ...direto.data() });
    } catch (error) {
      console.warn("Não foi possível consultar a OP pelo ID.", error);
    }

    const valores = [chave];
    if (/^\d+(?:[.,]\d+)?$/.test(chave)) {
      const num = Number(chave.replace(",", "."));
      if (Number.isFinite(num)) valores.push(num);
    }

    const campos = ["numeroOP", "numeroOPExterno", "op"];
    for (const campo of campos) {
      for (const valor of [...new Set(valores)]) {
        try {
          const snap = await firestore.getDocs(
            firestore.query(colecao, firestore.where(campo, "==", valor))
          );
          snap.docs.forEach(item => encontrados.set(item.id, { id: item.id, ...item.data() }));
        } catch (error) {
          console.warn(`Consulta alternativa da OP falhou em ${campo}.`, error);
        }
      }
    }

    if (!encontrados.size) {
      // Fallback compatível com documentos antigos que não possuem os campos padronizados.
      const snap = await firestore.getDocs(colecao);
      snap.docs.forEach(item => {
        const dados = { id: item.id, ...item.data() };
        const numeros = [dados.id, dados.numeroOP, dados.numeroOPExterno, dados.op]
          .map(textoOPChegadaManualSimplificada);
        if (numeros.includes(chave)) encontrados.set(item.id, dados);
      });
    }

    const lista = [...encontrados.values()].filter(item => item?.excluida !== true && item?.excluido !== true);
    const ordem = lista[0] || null;
    cacheOPsChegadaManualSimplificada.set(chave, ordem);
    return ordem;
  }

  function processosDisponiveisChegadaManualSimplificada(op) {
    const setor = setorOPChegadaManualSimplificada(op);
    let processos = [];
    try {
      processos = getNomesProcessosFaccoesAtivos(setor) || [];
    } catch (error) {
      console.warn("Lista gerenciada de processos ainda não disponível.", error);
    }
    if (!processos.length) {
      processos = Object.keys(FACCOES_POR_PROCESSO).filter(nome => {
        const normalizado = normalizarComparacao(nome);
        return setor === "calcinha"
          ? normalizado.includes("CALCINHA")
          : !normalizado.includes("CALCINHA");
      });
    }
    return [...new Set(processos.map(normalizarNomeProcessoGerenciado).filter(Boolean))];
  }

  function faccoesDisponiveisChegadaManualSimplificada(processo) {
    let nomes = [];
    try {
      nomes = getRegistroProcessoFaccao(processo)?.faccoes || [];
    } catch (error) {
      console.warn("Vínculos gerenciados ainda não disponíveis.", error);
    }
    if (!nomes.length) nomes = FACCOES_POR_PROCESSO[processo] || [];
    if (!nomes.length && Array.isArray(faccoesCadastroProcessos)) {
      nomes = faccoesCadastroProcessos
        .filter(item => item?.ativo !== false && !item?.cadastroPendente)
        .filter(item => (item?.processosPermitidos || []).some(p =>
          normalizarComparacao(p) === normalizarComparacao(processo)
        ))
        .map(item => item.nome);
    }
    return ordenarNomesFaccoesProcessos(nomes);
  }

  function atualizarFaccoesChegadaManualSimplificada() {
    const el = elementosChegadaManualSimplificada();
    const processo = normalizarNomeProcessoGerenciado(el.processo?.value || "");
    const faccoes = processo ? faccoesDisponiveisChegadaManualSimplificada(processo) : [];
    if (!el.faccao) return;

    el.faccao.innerHTML = processo
      ? '<option value="">Selecione quem realizou o processo</option>'
      : '<option value="">Escolha o processo primeiro</option>';
    faccoes.forEach(nome => {
      const option = document.createElement("option");
      option.value = nome;
      option.textContent = nome;
      el.faccao.appendChild(option);
    });
    el.faccao.disabled = !processo || !faccoes.length;
    if (processo && !faccoes.length) {
      el.faccao.innerHTML = '<option value="">Nenhuma facção vinculada a este processo</option>';
      definirStatusOPChegadaManualSimplificada(
        "O processo não possui facção vinculada. Ajuste em Facções → Gerenciar processos.",
        "erro"
      );
    } else if (chegadaManualSimplificadaOPCarregada) {
      definirStatusOPChegadaManualSimplificada("Dados da OP carregados. Complete o lançamento abaixo.", "sucesso");
    }
  }

  function recalcularRecebidoChegadaManualSimplificada() {
    const el = elementosChegadaManualSimplificada();
    const total = quantidadeOPChegadaManualSimplificada(chegadaManualSimplificadaOPCarregada);
    const falta = Math.max(0, numeroChegadaManualSimplificada(el.falta?.value));
    const recebido = Math.max(total - falta, 0);
    if (el.recebido) el.recebido.textContent = recebido.toLocaleString("pt-BR");
    if (el.falta) el.falta.setCustomValidity(falta > total ? "A falta não pode ser maior que a quantidade da OP." : "");
    return recebido;
  }

  function preencherOPChegadaManualSimplificada(op) {
    chegadaManualSimplificadaOPCarregada = op;
    const el = elementosChegadaManualSimplificada();
    const setor = setorOPChegadaManualSimplificada(op);
    const quantidade = quantidadeOPChegadaManualSimplificada(op);
    const referencia = String(op?.referencia || op?.ref || "").trim();
    const cor = String(op?.cor || "").trim();
    const numeroOP = textoOPChegadaManualSimplificada(op?.numeroOP || op?.numeroOPExterno || op?.op || op?.id);

    document.getElementById("chegadaManualRef").value = referencia;
    document.getElementById("chegadaManualCor").value = cor;
    document.getElementById("chegadaManualQuantidade").value = quantidade;
    document.getElementById("chegadaManualDataEnvio").value = dataEnvioDaOPChegadaManualSimplificada(op, setor);
    document.getElementById("chegadaManualDataChegada").value = hojeISOChegadaManualSimplificada();

    if (el.op) el.op.value = numeroOP;
    if (el.resumo) {
      el.resumo.innerHTML = `
        <div><span>OP</span><strong>${escapeHtmlChegadaManualSimplificada(numeroOP || "-")}</strong></div>
        <div><span>Referência</span><strong>${escapeHtmlChegadaManualSimplificada(referencia || "-")}</strong></div>
        <div><span>Cor</span><strong>${escapeHtmlChegadaManualSimplificada(cor || "-")}</strong></div>
        <div><span>Quantidade da OP</span><strong>${quantidade.toLocaleString("pt-BR")}</strong></div>
        <div><span>Peça</span><strong>${escapeHtmlChegadaManualSimplificada(labelSetorChegadaManualSimplificada(setor))}</strong></div>
      `;
      el.resumo.classList.remove("hidden");
    }

    const processos = processosDisponiveisChegadaManualSimplificada(op);
    if (el.processo) {
      el.processo.innerHTML = '<option value="">Selecione o processo realizado</option>';
      processos.forEach(nome => {
        const option = document.createElement("option");
        option.value = nome;
        option.textContent = nome;
        el.processo.appendChild(option);
      });
      el.processo.disabled = !processos.length;
    }
    if (el.faccao) {
      el.faccao.innerHTML = '<option value="">Escolha o processo primeiro</option>';
      el.faccao.disabled = true;
    }
    if (el.falta) {
      el.falta.value = "0";
      el.falta.max = String(quantidade);
      el.falta.disabled = false;
    }
    if (el.desconto) {
      el.desconto.value = "0";
      el.desconto.disabled = false;
    }
    if (el.submit) el.submit.disabled = !referencia || !cor || quantidade <= 0 || !processos.length;
    recalcularRecebidoChegadaManualSimplificada();

    if (!referencia || !cor || quantidade <= 0) {
      definirStatusOPChegadaManualSimplificada(
        "A OP foi encontrada, mas está sem referência, cor ou quantidade válida. Corrija o cadastro da OP antes de continuar.",
        "erro"
      );
      if (el.submit) el.submit.disabled = true;
    } else if (!processos.length) {
      definirStatusOPChegadaManualSimplificada(
        "Nenhum processo foi configurado para este tipo de peça.",
        "erro"
      );
    } else {
      definirStatusOPChegadaManualSimplificada("Dados da OP carregados automaticamente.", "sucesso");
    }
  }

  async function carregarOPChegadaManualSimplificada() {
    if (chegadaManualSimplificadaBuscando) return;
    const el = elementosChegadaManualSimplificada();
    const numero = textoOPChegadaManualSimplificada(el.op?.value);
    if (!numero) {
      limparOPChegadaManualSimplificada({ preservarNumero: true });
      return;
    }

    chegadaManualSimplificadaBuscando = true;
    if (el.submit) el.submit.disabled = true;
    definirStatusOPChegadaManualSimplificada("Buscando a OP no sistema...");
    try {
      const op = await buscarOPServidorChegadaManualSimplificada(numero);
      if (!op) {
        limparOPChegadaManualSimplificada({ preservarNumero: true });
        definirStatusOPChegadaManualSimplificada("OP não encontrada. Confira o número digitado.", "erro");
        el.op?.focus();
        return;
      }
      preencherOPChegadaManualSimplificada(op);
    } catch (error) {
      console.error("Erro ao buscar OP para chegada manual.", error);
      limparOPChegadaManualSimplificada({ preservarNumero: true });
      definirStatusOPChegadaManualSimplificada("Não foi possível buscar a OP. Verifique a internet e tente novamente.", "erro");
    } finally {
      chegadaManualSimplificadaBuscando = false;
    }
  }

  async function consultarDuplicidadeChegadaManualSimplificada(dados) {
    const movimentos = await carregarMovimentacoesServidorDuplicidade({ numeroOP: dados.numeroOP });
    const mesmaEtapa = movimentos.find(mov =>
      movimentoValidoParaDuplicidade(mov) &&
      normalizarComparacao(mov.tipoDestino) === "FACCAO" &&
      normalizarComparacao(mov.numeroOP) === normalizarComparacao(dados.numeroOP) &&
      normalizarComparacao(mov.referencia) === normalizarComparacao(dados.referencia) &&
      normalizarComparacao(mov.destino) === normalizarComparacao(dados.faccao) &&
      normalizarComparacao(mov.processo) === normalizarComparacao(dados.processo)
    );

    if (!mesmaEtapa) return { duplicado: false };
    const status = normalizarComparacao(mesmaEtapa.status);
    if (mesmaEtapa.dataChegada || ["RETORNOU", "FINALIZADO", "ENCAMINHADO"].includes(status)) {
      return {
        duplicado: true,
        mensagem: "Já existe uma chegada para esta OP, processo e facção. Use Movimentações registradas para corrigir, sem gerar outro pagamento."
      };
    }
    return {
      duplicado: true,
      mensagem: "Esta OP já foi enviada para essa facção e processo. Registre a chegada pela movimentação existente, em vez de usar Chegada manual."
    };
  }

  async function buscarPrecoChegadaManualSimplificada(firestore, db, referencia, processo) {
    const snap = await firestore.getDocs(firestore.collection(db, "precosReferencia"));
    return snap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .find(item =>
        item?.ativo !== false &&
        normalizarComparacao(item.referencia) === normalizarComparacao(referencia) &&
        normalizarComparacao(item.processo || item.servicoNome) === normalizarComparacao(processo)
      ) || null;
  }

  async function salvarChegadaManualSimplificada(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (chegadaManualSimplificadaSalvando) return;

    const el = elementosChegadaManualSimplificada();
    const numeroDigitado = textoOPChegadaManualSimplificada(el.op?.value);
    if (!chegadaManualSimplificadaOPCarregada ||
        textoOPChegadaManualSimplificada(
          chegadaManualSimplificadaOPCarregada.numeroOP ||
          chegadaManualSimplificadaOPCarregada.numeroOPExterno ||
          chegadaManualSimplificadaOPCarregada.op ||
          chegadaManualSimplificadaOPCarregada.id
        ) !== numeroDigitado) {
      await carregarOPChegadaManualSimplificada();
    }

    const op = chegadaManualSimplificadaOPCarregada;
    if (!op) {
      mostrarAvisoFormulario("Informe uma OP válida antes de salvar.");
      return;
    }

    const numeroOP = textoOPChegadaManualSimplificada(op.numeroOP || op.numeroOPExterno || op.op || op.id);
    const referencia = String(op.referencia || op.ref || "").trim().toUpperCase();
    const cor = String(op.cor || "").trim().toUpperCase();
    const setor = setorOPChegadaManualSimplificada(op);
    const quantidadeEnviada = quantidadeOPChegadaManualSimplificada(op);
    const processo = normalizarNomeProcessoGerenciado(el.processo?.value || "");
    const faccao = normalizarNomeFaccaoGerenciada(el.faccao?.value || "");
    const falta = Math.max(0, numeroChegadaManualSimplificada(el.falta?.value));
    const descontoDefeito = Math.max(0, numeroChegadaManualSimplificada(el.desconto?.value));
    const quantidadeRecebida = Math.max(quantidadeEnviada - falta, 0);
    const dataChegada = hojeISOChegadaManualSimplificada();
    const dataEnvio = dataEnvioDaOPChegadaManualSimplificada(op, setor);

    if (!numeroOP || !referencia || !cor || quantidadeEnviada <= 0) {
      mostrarAvisoFormulario("A OP não possui referência, cor ou quantidade válida.");
      return;
    }
    if (!processo) {
      mostrarAvisoFormulario("Selecione o processo realizado.");
      el.processo?.focus();
      return;
    }
    const faccoesPermitidas = faccoesDisponiveisChegadaManualSimplificada(processo);
    if (!faccao || !faccoesPermitidas.some(nome => normalizarComparacao(nome) === normalizarComparacao(faccao))) {
      mostrarAvisoFormulario("Selecione uma facção vinculada ao processo escolhido.");
      el.faccao?.focus();
      return;
    }
    if (falta > quantidadeEnviada) {
      mostrarAvisoFormulario("A quantidade faltante não pode ser maior que a quantidade da OP.");
      el.falta?.focus();
      return;
    }
    if (quantidadeRecebida <= 0) {
      mostrarAvisoFormulario("Nenhuma peça foi recebida. Não registre chegada quando toda a quantidade estiver faltando.");
      el.falta?.focus();
      return;
    }

    const dadosChave = { numeroOP, referencia, faccao, processo };
    chegadaManualSimplificadaSalvando = true;
    if (el.submit) {
      el.submit.disabled = true;
      el.submit.dataset.textoOriginal = el.submit.textContent;
      el.submit.textContent = "Salvando...";
    }
    let trava = null;

    try {
      const duplicidade = await consultarDuplicidadeChegadaManualSimplificada(dadosChave);
      if (duplicidade.duplicado) {
        mostrarAvisoFormulario(duplicidade.mensagem);
        return;
      }

      trava = await adquirirTravaTemporariaDuplicidade(
        "chegada-manual-faccao",
        textoChaveTrava(numeroOP, referencia, faccao, processo),
        { numeroOP, referencia, faccao, processo, quantidadeEnviada, falta, descontoDefeito }
      );

      const reconferencia = await consultarDuplicidadeChegadaManualSimplificada(dadosChave);
      if (reconferencia.duplicado) {
        mostrarAvisoFormulario(reconferencia.mensagem);
        return;
      }

      const { firestore, db, auth } = await obterContextoTravasDuplicidade();
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado.");

      const preco = await buscarPrecoChegadaManualSimplificada(firestore, db, referencia, processo);
      const chaveMov = textoChaveTrava(numeroOP, referencia, faccao, processo, dataChegada);
      const movimentacaoId = idSeguroChegadaManualSimplificada(`manual-chegada-${hashTravaDuplicidade(chaveMov)}`);
      const movimentoRef = firestore.doc(db, "movimentacoesProducao", movimentacaoId);
      const movimentoExistente = await firestore.getDoc(movimentoRef);
      if (movimentoExistente.exists() && movimentoValidoParaDuplicidade(movimentoExistente.data())) {
        mostrarAvisoFormulario("Esta chegada manual já foi salva. Use Movimentações registradas para corrigir.");
        return;
      }

      const valorUnitario = numeroChegadaManualSimplificada(preco?.valor);
      const subtotal = quantidadeRecebida * valorUnitario;
      const total = Math.max(subtotal - descontoDefeito, 0);
      const pagamentoId = idSeguroChegadaManualSimplificada(
        preco ? `mov-${movimentacaoId}-${preco.id}` : `mov-${movimentacaoId}-sem-valor`
      );
      const pagamentoRef = firestore.doc(db, "entregasPagamento", pagamentoId);
      const pagamentoExistente = await firestore.getDoc(pagamentoRef);
      if (pagamentoExistente.exists() && pagamentoExistente.data()?.excluido !== true) {
        mostrarAvisoFormulario("O pagamento desta chegada já existe. A operação foi bloqueada para evitar duplicidade.");
        return;
      }

      const agoraServidor = firestore.serverTimestamp();
      const movimentacao = {
        id: movimentacaoId,
        origem: "chegada_manual_faccao",
        origemManual: true,
        tipoDestino: "faccao",
        tipoDestinoLabel: "Facção",
        opId: op.id || "",
        numeroOP,
        referencia,
        cor,
        produtoNome: op.produtoNome || op.nomeProduto || op.nome || "",
        setor,
        setorLabel: labelSetorChegadaManualSimplificada(setor),
        destino: faccao,
        processo,
        quantidadeEnviada,
        quantidadeRecebida,
        dataEnvio,
        dataEnvioNaoInformada: !dataEnvio,
        dataChegada,
        falta,
        descontoDefeito,
        defeito: descontoDefeito,
        status: "retornou",
        observacoes: `Chegada manual pela OP. Recebido: ${quantidadeRecebida}; falta: ${falta}; desconto: ${formatarMoedaChegadaManualSimplificada(descontoDefeito)}.`,
        criadoPor: user.uid,
        criadoEm: agoraServidor,
        atualizadoPor: user.uid,
        atualizadoEm: agoraServidor,
        versaoRegistro: APP_VERSION
      };

      const pagamento = {
        origem: "movimentacao",
        movimentacaoId,
        movimentacaoOrigemId: "",
        pagamentoReenvio: false,
        opId: op.id || "",
        numeroOP,
        referencia,
        cor,
        produtoNome: op.produtoNome || op.nomeProduto || op.nome || "",
        faccao,
        precoReferenciaId: preco?.id || "",
        processo: preco?.processo || processo,
        processoMovimentacao: processo,
        servicoId: preco?.id || "",
        servicoNome: preco?.processo || processo,
        setor: preco?.setor || setor,
        setorLabel: labelSetorChegadaManualSimplificada(preco?.setor || setor),
        dataEntrega: dataChegada,
        quantidade: quantidadeRecebida,
        falta,
        descontoDefeito,
        subtotal: preco ? subtotal : 0,
        valorUnitario: preco ? valorUnitario : 0,
        total: preco ? total : 0,
        statusPagamento: preco ? "pendente" : "sem_valor",
        valorPendente: !preco,
        avisoPagamento: preco ? "" : `Adicionar valor para Ref. ${referencia} + ${processo}.`,
        observacoes: preco
          ? "Gerado automaticamente pela chegada manual simplificada."
          : "Pagamento ficou em aberto porque não existe valor cadastrado para REF + PROCESSO.",
        atualizadoPor: user.uid,
        atualizadoEm: agoraServidor,
        criadoPor: user.uid,
        criadoEm: agoraServidor,
        versaoRegistro: APP_VERSION
      };

      const logRef = firestore.doc(firestore.collection(db, "logsAlteracoes"));
      const batch = firestore.writeBatch(db);
      batch.set(movimentoRef, movimentacao, { merge: false });
      batch.set(pagamentoRef, pagamento, { merge: false });
      batch.set(logRef, {
        acao: "chegada_manual_faccao_simplificada",
        entidade: "movimentacaoProducao",
        entidadeId: movimentacaoId,
        detalhes: `OP ${numeroOP} | ${faccao} | ${processo} | OP ${quantidadeEnviada} | falta ${falta} | recebido ${quantidadeRecebida} | desconto ${formatarMoedaChegadaManualSimplificada(descontoDefeito)}`,
        usuarioId: user.uid,
        usuarioEmail: user.email || "",
        versao: APP_VERSION,
        criadoEm: agoraServidor
      });
      await batch.commit();

      cachePagamentoFinal.expiraEm = 0;
      document.getElementById("modalChegadaManualFaccao")?.classList.add("hidden");
      el.form?.reset();
      limparOPChegadaManualSimplificada();
      mostrarAvisoFormulario(
        preco
          ? `Chegada salva. ${quantidadeRecebida.toLocaleString("pt-BR")} peças recebidas e pagamento de ${formatarMoedaChegadaManualSimplificada(total)} gerado.`
          : `Chegada salva. ${quantidadeRecebida.toLocaleString("pt-BR")} peças recebidas; o pagamento ficou pendente de valor.`
      );
    } catch (error) {
      console.error("Erro ao salvar chegada manual simplificada.", error);
      if (error?.codigoTravaDuplicidade === "EM_USO") {
        mostrarAvisoFormulario("Outra pessoa já está registrando esta mesma chegada. Aguarde alguns segundos.");
      } else if (String(error?.code || "").includes("permission-denied")) {
        mostrarAvisoFormulario("Sem permissão para salvar a chegada ou o pagamento. Confira as regras do Firebase.");
      } else {
        mostrarAvisoFormulario("Não foi possível salvar. Nenhuma parte da operação foi gravada; tente novamente.");
      }
    } finally {
      if (trava) await liberarTravaTemporariaDuplicidade(trava);
      chegadaManualSimplificadaSalvando = false;
      if (el.submit) {
        el.submit.disabled = !chegadaManualSimplificadaOPCarregada;
        el.submit.textContent = el.submit.dataset.textoOriginal || "Salvar chegada manual";
        delete el.submit.dataset.textoOriginal;
      }
    }
  }

  function construirFormularioChegadaManualSimplificada(form) {
    form.className = "form movimentacao-form chegada-manual-simplificada";
    form.innerHTML = `
      <div class="movimentacao-op-info">
        Informe somente a OP. Referência, cor, quantidade e tipo de peça serão carregados automaticamente.
      </div>

      <label>
        Nº OP
        <div class="chegada-manual-op-linha">
          <input id="chegadaManualOP" type="text" inputmode="numeric" placeholder="Ex: 58193" autocomplete="off" required />
          <button class="btn" id="btnBuscarOPChegadaManual" type="button">Buscar OP</button>
        </div>
        <small id="chegadaManualStatusOPAutomatico" class="chegada-manual-status-op"></small>
      </label>

      <div id="chegadaManualResumoOPAutomatico" class="chegada-manual-resumo-op hidden"></div>

      <input id="chegadaManualRef" type="hidden" />
      <input id="chegadaManualCor" type="hidden" />
      <input id="chegadaManualQuantidade" type="hidden" />
      <input id="chegadaManualDataEnvio" type="hidden" />
      <input id="chegadaManualDataChegada" type="hidden" />
      <input id="chegadaManualObs" type="hidden" />

      <label>
        O que foi feito / processo
        <select id="chegadaManualProcesso" required disabled>
          <option value="">Busque uma OP primeiro</option>
        </select>
      </label>

      <label>
        Quem fez / facção
        <select id="chegadaManualFaccao" required disabled>
          <option value="">Escolha o processo primeiro</option>
        </select>
      </label>

      <div class="form-grid two">
        <label>
          Quantidade faltando
          <input id="chegadaManualFalta" type="number" min="0" step="1" value="0" disabled required />
          <small>A quantidade recebida será calculada automaticamente.</small>
        </label>
        <label>
          Desconto por defeito (R$)
          <input id="chegadaManualDesconto" type="number" min="0" step="0.01" value="0" disabled required />
          <small>Informe 0 quando não houver desconto.</small>
        </label>
      </div>

      <div class="chegada-manual-calculo">
        <span>Quantidade que será considerada como recebida</span>
        <strong id="chegadaManualQuantidadeRecebidaCalculada">-</strong>
      </div>

      <div class="notice small">
        A chegada e o pagamento serão gravados juntos. Se já existir envio, chegada ou pagamento igual, o sistema bloqueará a duplicidade.
      </div>

      <div class="actions">
        <button class="btn btn-success" type="submit" disabled>Salvar chegada manual</button>
        <button class="btn" id="btnCancelarChegadaManualFaccao" type="button">Cancelar</button>
      </div>
    `;
  }

  function injetarEstilosChegadaManualSimplificada() {
    if (document.getElementById("styleChegadaManualSimplificada")) return;
    const style = document.createElement("style");
    style.id = "styleChegadaManualSimplificada";
    style.textContent = `
      .chegada-manual-op-linha {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
      }
      .chegada-manual-op-linha .btn { min-height: 44px; }
      .chegada-manual-status-op {
        display: block;
        min-height: 18px;
        margin-top: 6px;
        color: #64748b;
        line-height: 1.35;
      }
      .chegada-manual-status-op[data-tipo="erro"] { color: #b91c1c; font-weight: 700; }
      .chegada-manual-status-op[data-tipo="sucesso"] { color: #15803d; font-weight: 700; }
      .chegada-manual-resumo-op {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(125px, 1fr));
        gap: 10px;
        padding: 12px;
        border: 1px solid #bbf7d0;
        border-radius: 14px;
        background: #f0fdf4;
      }
      .chegada-manual-resumo-op.hidden { display: none !important; }
      .chegada-manual-resumo-op div {
        min-width: 0;
        padding: 9px 10px;
        border-radius: 10px;
        background: #fff;
      }
      .chegada-manual-resumo-op span {
        display: block;
        color: #64748b;
        font-size: 11px;
        font-weight: 700;
      }
      .chegada-manual-resumo-op strong {
        display: block;
        margin-top: 3px;
        color: #0f172a;
        font-size: 14px;
        overflow-wrap: anywhere;
      }
      .chegada-manual-calculo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 12px 14px;
        border: 1px solid #bfdbfe;
        border-radius: 12px;
        background: #eff6ff;
      }
      .chegada-manual-calculo span { color: #334155; font-size: 13px; font-weight: 700; }
      .chegada-manual-calculo strong { color: #1d4ed8; font-size: 20px; }
      @media (max-width: 640px) {
        .chegada-manual-op-linha { grid-template-columns: 1fr; }
        .chegada-manual-op-linha .btn { width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function iniciarChegadaManualSimplificadaPelaOP() {
    const formAntigo = document.getElementById("formChegadaManualFaccao");
    if (!formAntigo || formAntigo.dataset.chegadaManualSimplificada === APP_VERSION) return;

    injetarEstilosChegadaManualSimplificada();

    // Clona o formulário para remover apenas os listeners antigos de submit.
    // O modal, botões externos e demais telas permanecem intactos.
    const form = formAntigo.cloneNode(false);
    form.id = "formChegadaManualFaccao";
    form.dataset.chegadaManualSimplificada = APP_VERSION;
    construirFormularioChegadaManualSimplificada(form);
    formAntigo.replaceWith(form);

    const el = elementosChegadaManualSimplificada();
    el.form?.addEventListener("submit", salvarChegadaManualSimplificada, true);
    el.processo?.addEventListener("change", atualizarFaccoesChegadaManualSimplificada);
    el.falta?.addEventListener("input", recalcularRecebidoChegadaManualSimplificada);
    document.getElementById("btnBuscarOPChegadaManual")?.addEventListener("click", carregarOPChegadaManualSimplificada);
    el.op?.addEventListener("blur", carregarOPChegadaManualSimplificada);
    el.op?.addEventListener("change", carregarOPChegadaManualSimplificada);
    el.op?.addEventListener("input", () => {
      clearTimeout(chegadaManualSimplificadaTimer);
      const atual = textoOPChegadaManualSimplificada(el.op.value);
      const carregada = textoOPChegadaManualSimplificada(
        chegadaManualSimplificadaOPCarregada?.numeroOP ||
        chegadaManualSimplificadaOPCarregada?.numeroOPExterno ||
        chegadaManualSimplificadaOPCarregada?.op ||
        chegadaManualSimplificadaOPCarregada?.id
      );
      if (carregada && atual !== carregada) limparOPChegadaManualSimplificada({ preservarNumero: true });
      if (atual.length >= 4) {
        chegadaManualSimplificadaTimer = setTimeout(carregarOPChegadaManualSimplificada, 500);
      }
    });
    el.op?.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      carregarOPChegadaManualSimplificada();
    });

    document.getElementById("btnCancelarChegadaManualFaccao")?.addEventListener("click", () => {
      document.getElementById("modalChegadaManualFaccao")?.classList.add("hidden");
      form.reset();
      limparOPChegadaManualSimplificada();
    });

    document.getElementById("btnAbrirChegadaManualFaccao")?.addEventListener("click", () => {
      setTimeout(() => {
        form.reset();
        limparOPChegadaManualSimplificada();
        document.getElementById("chegadaManualDataChegada").value = hojeISOChegadaManualSimplificada();
        document.getElementById("chegadaManualOP")?.focus();
      }, 0);
    });

    limparOPChegadaManualSimplificada();
  }


  function iniciarRecursosDaVersao() {
    iniciarTelasExclusivasGerenciamento();
    iniciarProcessosFaccoesGerenciados();
    iniciarConcluirInteligenteManejo();
    iniciarGerenciarValoresOrganizadoSeguro();
    // Instalada primeiro para barrar a ação antes das rotinas antigas de salvamento.
    iniciarTravasDuplicidadeFaccaoPagamento();
    iniciarRevisaoFinalPagamentos();
    iniciarTelaPagamentosSegura();
    iniciarHotfixChegadaManual();
    iniciarHotfixNecessidade();
    iniciarGestaoSugestoesFases();
    iniciarGestaoSugestoesSeparadasSutiaCalcinha();
    iniciarRestauracaoFasesAntigas();
    iniciarSetasListasManejo();
    iniciarMovimentacoesRegistradasUsuario();
    iniciarEdicaoLocalUsuarios();
    iniciarExibicaoEditarLocalUsuarios();
    iniciarSistemaDuploSutiaCalcinha();
    iniciarAuditoriaCompletaOP();
    iniciarFiltrosExcelManejo();
    iniciarSemChegadaFaccaoRetornada();
    iniciarChegadaManualSimplificadaPelaOP();
  }

  window.addEventListener("load", () => {
    rememberVersion();
    registerServiceWorker();
    checkVersionFile();
    iniciarRecursosDaVersao();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarRecursosDaVersao, { once: true });
  } else {
    iniciarRecursosDaVersao();
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkVersionFile();
  });
})();
