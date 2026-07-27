(() => {
  const APP_VERSION = "2026-07-28-chegada-manual-condicional-1";
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

  function iniciarRecursosDaVersao() {
    iniciarHotfixChegadaManual();
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
