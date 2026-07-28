(() => {
  const APP_VERSION = "2026-07-28-necessidade-original-restauracao-1";
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
  // HOTFIX: NECESSIDADE ORIGINAL DA PLANILHA
  // - Exibe imediatamente o valor original quando a tela mostra vazio.
  // - Não substitui nenhum valor atual que já esteja preenchido.
  // - Oferece restauração definitiva e segura no Firestore.
  // - Evita que o botão verde salve vazio quando existe necessidade original.
  // =========================================================

  const LIGIA_ORIGINAL_URL = "dados-ligia-migracao.json";
  const necessidadesOriginaisPorOP = new Map();
  let carregandoNecessidadesOriginais = null;
  let observerNecessidades = null;
  let aplicandoFallbackNecessidades = false;
  let restauracaoNecessidadesEmAndamento = false;

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
    for (const valor of valores) {
      const texto = limparNecessidade(valor);
      if (texto) return texto;
    }
    return "";
  }

  function necessidadesDosManejos(dados) {
    const candidatos = [];
    const setores = dados?.manejosSetores;
    if (setores && typeof setores === "object") {
      Object.values(setores).forEach(manejo => {
        if (!manejo || typeof manejo !== "object") return;
        candidatos.push(manejo.necessidade, manejo.necessidadeTexto);
      });
    }

    const manejoAntigo = dados?.manejo;
    if (manejoAntigo && typeof manejoAntigo === "object") {
      candidatos.push(manejoAntigo.necessidade, manejoAntigo.necessidadeTexto);
    }

    return candidatos;
  }

  function extrairNecessidadeOriginal(dados) {
    if (!dados || typeof dados !== "object") return "";
    return primeiroTextoNecessidade(
      dados.necessidadeOriginalLigia,
      ...necessidadesDosManejos(dados),
      dados.necessidade,
      dados.necessidadeTexto,
      dados.previsaoEntrega,
      dados.dataNecessidade,
      dados.dataEntrega
    );
  }

  function registrarNecessidadeOriginal(op, necessidade) {
    const texto = limparNecessidade(necessidade);
    if (!texto) return;

    [op?.id, op?.numeroOP, op?.numeroOPExterno].forEach(numero => {
      const chave = normalizarNumeroOPNecessidade(numero);
      if (chave && !necessidadesOriginaisPorOP.has(chave)) {
        necessidadesOriginaisPorOP.set(chave, texto);
      }
    });
  }

  async function carregarNecessidadesOriginais() {
    if (necessidadesOriginaisPorOP.size) return necessidadesOriginaisPorOP;
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

        ordens.forEach(op => registrarNecessidadeOriginal(op, extrairNecessidadeOriginal(op)));
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
    return normalizarNumeroOPNecessidade(primeiroInput?.value || linha?.querySelector("td:first-child")?.textContent || "");
  }

  function marcarCampoNecessidadeRecuperado(input, valor) {
    if (!input || !valor) return;
    input.value = valor;
    input.dataset.necessidadeOriginalRecuperada = "1";
    input.title = "Necessidade recuperada dos dados originais. Clique no botão verde da linha para salvar esta OP ou use a restauração definitiva.";
    input.style.background = "#fff8dc";
    input.style.borderColor = "#d6a800";
  }

  function aplicarFallbackNaTabelaManejo() {
    const tbody = document.getElementById("listaManejoInline");
    if (!tbody) return 0;

    let preenchidas = 0;
    tbody.querySelectorAll('tr[data-manejo-row="1"]').forEach(linha => {
      const input = linha.querySelector('input[id$="-necessidade"]');
      if (!input || limparNecessidade(input.value)) return;

      const numeroOP = obterNumeroOPDaLinhaManejo(linha);
      const original = necessidadeOriginalDaOP(numeroOP);
      if (!original) return;

      marcarCampoNecessidadeRecuperado(input, original);
      preenchidas += 1;
    });

    return preenchidas;
  }

  function aplicarFallbackNaTabelaOrdens() {
    const tbody = document.getElementById("listaOrdens");
    if (!tbody) return 0;

    let preenchidas = 0;
    tbody.querySelectorAll("tr").forEach(linha => {
      const celulas = linha.querySelectorAll("td");
      if (celulas.length < 2) return;

      const numeroOP = normalizarNumeroOPNecessidade(celulas[0].textContent || "");
      const atual = limparNecessidade(celulas[1].textContent || "").replace(/^-$/, "");
      if (atual) return;

      const original = necessidadeOriginalDaOP(numeroOP);
      if (!original) return;

      const alvo = celulas[1].querySelector("strong") || celulas[1];
      alvo.textContent = original;
      celulas[1].title = "Necessidade recuperada visualmente dos dados originais.";
      celulas[1].style.background = "#fff8dc";
      preenchidas += 1;
    });

    return preenchidas;
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

  function aplicarFallbackVisualNecessidades() {
    if (aplicandoFallbackNecessidades || !necessidadesOriginaisPorOP.size) return;
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
    window.__timerFallbackNecessidades = setTimeout(aplicarFallbackVisualNecessidades, 40);
  }

  function iniciarObservadorNecessidades() {
    if (observerNecessidades) return;
    const alvos = [
      document.getElementById("listaManejoInline"),
      document.getElementById("listaOrdens")
    ].filter(Boolean);
    if (!alvos.length) return;

    observerNecessidades = new MutationObserver(agendarFallbackVisualNecessidades);
    alvos.forEach(alvo => observerNecessidades.observe(alvo, { childList: true, subtree: true }));
  }

  function contarNecessidadesRecuperadasNaTela() {
    return document.querySelectorAll('[data-necessidade-original-recuperada="1"]').length;
  }

  function atualizarStatusCorrecaoNecessidade(mensagem = "") {
    const status = document.getElementById("statusCorrecaoNecessidade");
    if (!status) return;

    if (mensagem) {
      status.textContent = mensagem;
      return;
    }

    const recuperadasTela = contarNecessidadesRecuperadasNaTela();
    if (recuperadasTela > 0) {
      status.textContent = `${recuperadasTela} necessidade(s) original(is) recuperada(s) nesta tela.`;
    } else if (necessidadesOriginaisPorOP.size > 0) {
      status.textContent = `${necessidadesOriginaisPorOP.size} OP(s) com necessidade original disponíveis para conferência.`;
    } else {
      status.textContent = "Aguardando leitura dos dados originais.";
    }
  }

  function adicionarPainelCorrecaoNecessidade() {
    if (document.getElementById("painelCorrecaoNecessidade")) return;

    const referencia = document.querySelector("#manejo .manejo-soma-compacta") || document.querySelector("#manejo .notice.small");
    if (!referencia) return;

    const painel = document.createElement("div");
    painel.id = "painelCorrecaoNecessidade";
    painel.style.display = "flex";
    painel.style.flexWrap = "wrap";
    painel.style.alignItems = "center";
    painel.style.gap = "10px";
    painel.style.margin = "10px 0";
    painel.style.padding = "10px 12px";
    painel.style.border = "1px solid #e5c04b";
    painel.style.borderRadius = "12px";
    painel.style.background = "#fffdf2";
    painel.innerHTML = `
      <div style="flex:1; min-width:240px;">
        <strong>Correção da Necessidade</strong>
        <div id="statusCorrecaoNecessidade" style="font-size:12px; margin-top:3px; color:#5f4b00;">
          Aguardando leitura dos dados originais.
        </div>
      </div>
      <button id="btnRestaurarNecessidadesOriginais" class="btn btn-primary" type="button">
        Restaurar necessidades vazias
      </button>
    `;

    referencia.insertAdjacentElement("afterend", painel);
    document.getElementById("btnRestaurarNecessidadesOriginais")?.addEventListener("click", restaurarNecessidadesOriginaisNoFirebase);
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

  function necessidadeAtualPreenchida(dados) {
    return primeiroTextoNecessidade(dados?.necessidade, dados?.necessidadeTexto);
  }

  function candidatoRestauracaoDocumento(documento) {
    const dados = documento?.data?.() || {};
    const atual = necessidadeAtualPreenchida(dados);
    if (atual) return { atual, candidato: "", dados };

    const numeroOP = normalizarNumeroOPNecessidade(
      dados.numeroOP || dados.numeroOPExterno || documento.id
    );
    const candidato = primeiroTextoNecessidade(
      dados.necessidadeOriginalLigia,
      ...necessidadesDosManejos(dados),
      necessidadeOriginalDaOP(numeroOP),
      dados.previsaoEntrega,
      dados.dataNecessidade,
      dados.dataEntrega
    );

    return { atual: "", candidato, dados, numeroOP };
  }

  async function restaurarNecessidadesOriginaisNoFirebase() {
    if (restauracaoNecessidadesEmAndamento) return;
    restauracaoNecessidadesEmAndamento = true;

    const botao = document.getElementById("btnRestaurarNecessidadesOriginais");
    const textoOriginalBotao = botao?.textContent || "Restaurar necessidades vazias";
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Conferindo OPs...";
    }

    try {
      await carregarNecessidadesOriginais();
      const { firestore, db } = await obterFirebaseParaCorrecao();
      const snapshot = await firestore.getDocs(firestore.collection(db, "ordensProducao"));

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

      if (!restauraveis.length) {
        atualizarStatusCorrecaoNecessidade("Nenhuma necessidade vazia com valor original foi encontrada.");
        showUpdateToast("Nenhuma necessidade precisava ser restaurada.");
        return;
      }

      const confirmar = window.confirm(
        `Foram encontradas ${restauraveis.length} OP(s) com necessidade vazia e valor original disponível.\n\n` +
        `A correção NÃO altera as ${preservadas} OP(s) que já possuem necessidade preenchida.\n\n` +
        "Deseja gravar a restauração definitiva no Firebase?"
      );
      if (!confirmar) {
        atualizarStatusCorrecaoNecessidade("Restauração cancelada. A visualização temporária continua ativa.");
        return;
      }

      let lote = firestore.writeBatch(db);
      let itensNoLote = 0;
      let totalSalvo = 0;

      for (const item of restauraveis) {
        lote.set(item.documento.ref, {
          necessidade: item.candidato,
          necessidadeTexto: item.candidato,
          necessidadeManual: false,
          necessidadeRestauradaOriginal: true,
          necessidadeRestauradaVersao: APP_VERSION,
          necessidadeRestauradaEm: firestore.serverTimestamp(),
          atualizadoEm: firestore.serverTimestamp()
        }, { merge: true });

        itensNoLote += 1;
        totalSalvo += 1;

        if (itensNoLote >= 400) {
          if (botao) botao.textContent = `Salvando ${totalSalvo}/${restauraveis.length}...`;
          await lote.commit();
          lote = firestore.writeBatch(db);
          itensNoLote = 0;
        }
      }

      if (itensNoLote > 0) await lote.commit();

      atualizarStatusCorrecaoNecessidade(
        `${totalSalvo} necessidade(s) restaurada(s). ${preservadas} valor(es) preenchido(s) foram preservados.`
      );
      showUpdateToast(`${totalSalvo} necessidade(s) original(is) restaurada(s) com segurança.`);

      document.querySelectorAll('[data-necessidade-original-recuperada="1"]').forEach(input => {
        input.dataset.necessidadeOriginalRecuperada = "";
        input.style.background = "";
        input.style.borderColor = "";
      });

      if (typeof window.atualizarDadosServidorAgora === "function") {
        setTimeout(() => window.atualizarDadosServidorAgora(), 600);
      } else {
        setTimeout(() => window.location.reload(), 900);
      }

      console.info("Restauração de necessidades concluída.", {
        totalSalvo,
        preservadas,
        semOrigem
      });
    } catch (error) {
      console.error("Erro ao restaurar necessidades originais.", error);
      atualizarStatusCorrecaoNecessidade("Erro na restauração. Nenhum valor preenchido foi sobrescrito.");
      showUpdateToast("Não foi possível restaurar as necessidades. Confira a internet e as permissões do usuário.");
    } finally {
      restauracaoNecessidadesEmAndamento = false;
      if (botao) {
        botao.disabled = false;
        botao.textContent = textoOriginalBotao;
      }
    }
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
    adicionarPainelCorrecaoNecessidade();
    iniciarObservadorNecessidades();
    document.addEventListener("click", protegerNecessidadeAntesDoSalvar, true);
    await carregarNecessidadesOriginais();
    aplicarFallbackVisualNecessidades();
  }

  window.restaurarNecessidadesOriginaisNoFirebase = restaurarNecessidadesOriginaisNoFirebase;

  function iniciarRecursosDaVersao() {
    iniciarHotfixChegadaManual();
    iniciarHotfixNecessidade();
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
