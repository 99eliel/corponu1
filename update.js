(() => {
  const APP_VERSION = "2026-07-28-fase-sem-piscar-1";
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
    return Object.keys(FACCOES_POR_PROCESSO).find(
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
      ${Object.keys(FACCOES_POR_PROCESSO)
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
    const faccoes = FACCOES_POR_PROCESSO[processo] || [];

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
      const permitidas = FACCOES_POR_PROCESSO[processo] || [];
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

    if (contador) contador.textContent = `${fasesGerenciadas.length} sugestão(ões)`;

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
          <h3>Gerenciar sugestões de fases</h3>
          <p>Somente administradores adicionam ou removem as opções mostradas no campo Fase do Manejo.</p>
        </div>
        <span id="contadorSugestoesFasesAdmin" class="badge ok">0 sugestão(ões)</span>
      </div>
      <div class="notice small" style="margin-bottom:12px;">
        Os usuários continuam podendo digitar uma fase livremente. Ela só aparecerá como sugestão para os demais quando o administrador cadastrá-la aqui.
      </div>
      <form id="formSugestaoFaseAdmin" style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-bottom:12px;">
        <label style="flex:1; min-width:240px;">
          Nova sugestão
          <input id="novaSugestaoFaseAdmin" type="text" placeholder="Ex: ACABAMENTO, REVISÃO, COSTURA" autocomplete="off" maxlength="80" />
        </label>
        <button class="btn btn-primary" type="submit">Adicionar sugestão</button>
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

  function iniciarRecursosDaVersao() {
    iniciarHotfixChegadaManual();
    iniciarHotfixNecessidade();
    iniciarGestaoSugestoesFases();
    iniciarSetasListasManejo();
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
