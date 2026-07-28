(() => {
  const APP_VERSION = "2026-07-28-botao-editar-local-usuarios-2";
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
    return Boolean(user && perfil?.ativo === true && perfil?.tipo === "usuario");
  }

  async function salvarAjusteLocalComoUsuario(event) {
    const form = event.currentTarget;
    const perfil = contextoMovUsuario?.perfil;
    const user = contextoMovUsuario?.user;

    // Administrador continua usando a função original do app.js.
    if (perfil?.tipo === "admin") return;

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
    const perfil = contextoMovUsuario?.perfil;
    const user = contextoMovUsuario?.user;
    return Boolean(user && perfil?.ativo === true && perfil?.tipo === "usuario");
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

  function iniciarExibicaoEditarLocalUsuarios() {
    injetarEstiloBotaoEditarLocalUsuario();

    const atualizar = () => {
      garantirBotaoEditarLocalNasLinhas();
      garantirOpcaoEditarLocalNoMenu();
    };

    if (!document.documentElement.dataset.hotfixExibirEditarLocalUsuario) {
      document.documentElement.dataset.hotfixExibirEditarLocalUsuario = "1";

      document.addEventListener("click", event => {
        if (event.target.closest("#listaManejoInline .btn-kebab")) {
          setTimeout(garantirOpcaoEditarLocalNoMenu, 0);
          setTimeout(garantirOpcaoEditarLocalNoMenu, 40);
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

  function iniciarRecursosDaVersao() {
    iniciarHotfixChegadaManual();
    iniciarHotfixNecessidade();
    iniciarGestaoSugestoesFases();
    iniciarSetasListasManejo();
    iniciarImportacaoValoresPlanilha();
    iniciarMovimentacoesRegistradasUsuario();
    iniciarEdicaoLocalUsuarios();
    iniciarExibicaoEditarLocalUsuarios();
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
