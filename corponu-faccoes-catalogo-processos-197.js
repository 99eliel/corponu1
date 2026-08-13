(() => {
  "use strict";

  const VERSION = "2026-08-13-faccoes-catalogo-processos-197";
  const FIREBASE_VERSION = "10.12.5";
  const CACHE_MS = 30000;
  const PROCESSOS_GLOBAIS = new Set(["SUTIA COMPLETO", "INTERLOCK"]);
  const PLACEHOLDERS = new Set([
    "",
    "SELECIONE",
    "SELECIONE O PROCESSO",
    "SELECIONE UM PROCESSO",
    "PROCESSO",
    "CARREGANDO PROCESSOS CADASTRADOS...",
    "BUSQUE A OP PARA CARREGAR",
    "NENHUM PROCESSO CADASTRADO",
    "ERRO AO CARREGAR PROCESSOS"
  ]);

  if (window.__CORPONU_FACCOES_CATALOGO_PROCESSOS_197__ === VERSION) return;
  window.__CORPONU_FACCOES_CATALOGO_PROCESSOS_197__ = VERSION;

  let contextoPromise = null;
  let catalogoCache = null;
  let catalogoEm = 0;
  let observerSelect = null;
  let selectObservado = null;
  let filtrando = false;
  let timer = 0;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModulo, firestore]) => {
      if (!appModulo.getApps().length) throw new Error("Firebase não inicializado");
      return { db: firestore.getFirestore(appModulo.getApp()), f: firestore };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  function abaAtual() {
    const titulo = normalizar(document.getElementById("s3titulo")?.textContent || "");
    if (titulo.includes("CALCINHA")) return "calcinha";
    if (titulo.includes("CORTE")) return "corte";
    return "sutia";
  }

  function adicionarProcesso(catalogo, nome, setor = "") {
    const processo = normalizar(nome);
    if (!processo || PLACEHOLDERS.has(processo)) return;

    const setorNorm = normalizar(setor);
    if (processo === "INTERLOCK") {
      catalogo.sutia.add(processo);
      catalogo.calcinha.add(processo);
      return;
    }

    if (setorNorm.includes("CALCINHA") || processo.includes("CALCINHA")) {
      catalogo.calcinha.add(processo);
      return;
    }

    if (
      setorNorm.includes("SUTIA") ||
      ["BOJO", "ALCA", "LATERAL"].some(chave => setorNorm.includes(chave)) ||
      /SUTIA|BOJO|ALCA|LATERAL/.test(processo)
    ) {
      catalogo.sutia.add(processo);
      return;
    }

    catalogo.sutia.add(processo);
    catalogo.calcinha.add(processo);
  }

  function catalogoDoSnapshot(snapshot) {
    const catalogo = {
      sutia: new Set(),
      calcinha: new Set(),
      corte: new Set()
    };

    PROCESSOS_GLOBAIS.forEach(nome => adicionarProcesso(catalogo, nome));

    snapshot.docs.forEach(documento => {
      const preco = documento.data() || {};
      if (preco.ativo === false) return;
      const nome = preco.processo || preco.servicoNome || preco.processoMovimentacao || "";
      if (!nome) return;
      adicionarProcesso(catalogo, nome, preco.setor || preco.area || preco.tipoPeca || "");
      catalogo.corte.add(normalizar(nome));
    });

    // Corte possui cadastro próprio e não deve perder seus processos por causa
    // do catálogo financeiro de Sutiã/Calcinha.
    return catalogo;
  }

  async function carregarCatalogo(forcar = false) {
    if (!forcar && catalogoCache && Date.now() - catalogoEm < CACHE_MS) return catalogoCache;

    const { db, f } = await contexto();
    const colecao = f.collection(db, "precosReferencia");
    let snapshot = null;

    try {
      const cache = await f.getDocsFromCache(colecao);
      if (!cache.empty) snapshot = cache;
    } catch (_) {}

    if (!snapshot) snapshot = await f.getDocs(colecao);

    catalogoCache = catalogoDoSnapshot(snapshot);
    catalogoEm = Date.now();
    return catalogoCache;
  }

  function manterPlaceholder(option) {
    const valor = normalizar(option.value || option.textContent || "");
    return PLACEHOLDERS.has(valor) || option.value === "";
  }

  async function filtrarSelect(forcarCatalogo = false) {
    if (filtrando) return;
    const select = document.getElementById("s3processo");
    if (!(select instanceof HTMLSelectElement)) return;

    const aba = abaAtual();
    if (aba === "corte") return;

    filtrando = true;
    try {
      const catalogo = await carregarCatalogo(forcarCatalogo);
      const permitidos = catalogo[aba] || new Set();
      const valorAtual = normalizar(select.value);

      [...select.options].forEach(option => {
        if (manterPlaceholder(option)) return;
        const nome = normalizar(option.value || option.textContent || "");
        if (!permitidos.has(nome)) option.remove();
      });

      if (valorAtual && !permitidos.has(valorAtual)) select.value = "";
    } catch (error) {
      console.warn("[Facções 197] Não foi possível sincronizar o catálogo de processos.", error);
    } finally {
      filtrando = false;
    }
  }

  function observarSelect() {
    const select = document.getElementById("s3processo");
    if (!(select instanceof HTMLSelectElement)) return;
    if (selectObservado === select) return;

    observerSelect?.disconnect();
    selectObservado = select;
    observerSelect = new MutationObserver(() => agendarFiltro(false, 0));
    observerSelect.observe(select, { childList: true });
  }

  function agendarFiltro(forcarCatalogo = false, atraso = 60) {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      observarSelect();
      filtrarSelect(forcarCatalogo);
    }, atraso);
  }

  function invalidarCatalogo() {
    catalogoCache = null;
    catalogoEm = 0;
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;

    if (alvo.closest("#btnSaidaAbas")) {
      invalidarCatalogo();
      [100, 300, 800].forEach(atraso => window.setTimeout(() => agendarFiltro(false, 0), atraso));
      return;
    }

    if (alvo.closest("#s3buscar")) {
      [220, 720].forEach(atraso => window.setTimeout(() => agendarFiltro(false, 0), atraso));
      return;
    }

    if (alvo.closest("#btnExcluirProcessoInteiro195")) {
      invalidarCatalogo();
    }
  }, true);

  window.addEventListener("focus", () => {
    if (!document.getElementById("modalSaida3")?.classList.contains("hidden")) agendarFiltro(true, 80);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      observarSelect();
      agendarFiltro(false, 200);
    }, { once: true });
  } else {
    observarSelect();
    agendarFiltro(false, 200);
  }
})();
