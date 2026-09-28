(() => {
  "use strict";

  const VERSION = "2026-09-28-manejo-fases-persistentes-313";
  const GUARD = "__CORPONU_MANEJO_FASES_PERSISTENCIA__";
  const COLECAO_CONFIG = "configuracoes";
  const COLECAO_ORDENS = "ordensProducao";
  const COLECAO_LOGS = "logsAlteracoes";
  const RELOAD_REPARO_KEY = `corponu_fases_reparo_reload_${VERSION}`;

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  const ESPECIFICACOES = Object.freeze({
    sutia: Object.freeze({
      documento: "fasesManejo",
      campoExcluidas: "sugestoesExcluidas",
      tipoLog: "Sugestão de fase",
      evento: "corponu:fases-manejo-atualizadas"
    }),
    calcinha: Object.freeze({
      documento: "fasesManejoCalcinha",
      campoExcluidas: "sugestoesExcluidas",
      tipoLog: "Sugestão de fase da Calcinha",
      evento: "corponu:fases-manejo-atualizadas"
    }),
    lateral: Object.freeze({
      documento: "fasesManejoSutiaLateral",
      campoExcluidas: "sugestoesExcluidas",
      tipoLog: "Sugestão de Fase Lateral do Sutiã",
      evento: "corponu:fases-manejo-lateral-atualizadas"
    })
  });

  const estados = {
    sutia: { unsubscribe: null, reparando: null },
    calcinha: { unsubscribe: null, reparando: null },
    lateral: { unsubscribe: null, reparando: null }
  };

  let contexto = null;
  let unsubscribeAuth = null;
  let ordensHistoricasPromessa = null;
  let perfilAtual = null;
  let reloadReparoAgendado = false;

  const texto = valor => String(valor ?? "").replace(/\s+/g, " ").trim();

  function chave(valor) {
    return texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }

  function normalizarFase(valor) {
    const fase = texto(valor).toUpperCase();
    const k = chave(fase);
    if (!fase || !k) return "";
    if ([
      "CARREGANDO FASES...",
      "CARREGANDO FASES",
      "SELECIONE A FASE",
      "TODAS",
      "TODOS",
      "NENHUMA FASE CADASTRADA PELO ADMINISTRADOR",
      "NAO FOI POSSIVEL CARREGAR AS FASES"
    ].includes(k)) return "";
    return fase;
  }

  function ordenar(valores) {
    const mapa = new Map();
    (Array.isArray(valores) ? valores : []).forEach(valor => {
      const fase = normalizarFase(valor);
      const k = chave(fase);
      if (fase && k && !mapa.has(k)) mapa.set(k, fase);
    });
    return [...mapa.values()].sort((a, b) =>
      a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" })
    );
  }

  function tipoPecaDaOrdem(dados) {
    const setores = dados?.manejosSetores || {};
    if (setores?.calcinha || dados?.manejoCalcinha || dados?.calcinha) return "calcinha";
    const identidade = chave([
      dados?.tipoPeca,
      dados?.tipoPecaPadrao,
      dados?.tipoPecaLabel,
      dados?.setor,
      dados?.setorLabel,
      dados?.produtoNome,
      dados?.processo,
      dados?.processoPlanejado,
      dados?.observacoes
    ].join(" "));
    return identidade.includes("CALCINHA") ? "calcinha" : "sutia";
  }

  function adicionar(mapa, valor) {
    const fase = normalizarFase(valor);
    const k = chave(fase);
    if (!fase || !k || mapa.has(k)) return;
    mapa.set(k, fase);
  }

  function extrairFasesDasOrdens(snapshot) {
    const sutia = new Map();
    const calcinha = new Map();
    const lateral = new Map();

    snapshot.forEach(item => {
      const dados = item.data?.() || {};
      const setores = dados?.manejosSetores || {};
      const tipo = tipoPecaDaOrdem(dados);

      [
        setores?.sutia?.fase,
        setores?.bojo?.fase,
        dados?.manejoSutia?.fase,
        dados?.sutia?.fase,
        dados?.faseSutia,
        dados?.faseBojo
      ].forEach(valor => adicionar(sutia, valor));

      [
        setores?.calcinha?.fase,
        dados?.manejoCalcinha?.fase,
        dados?.calcinha?.fase,
        dados?.faseCalcinha
      ].forEach(valor => adicionar(calcinha, valor));

      if (dados?.fase) {
        adicionar(tipo === "calcinha" ? calcinha : sutia, dados.fase);
      }

      if (dados?.manejo?.fase) {
        adicionar(tipo === "calcinha" ? calcinha : sutia, dados.manejo.fase);
      }

      [
        setores?.sutia?.faseLateral,
        setores?.bojo?.faseLateral,
        dados?.manejoSutia?.faseLateral,
        dados?.sutia?.faseLateral,
        dados?.faseLateral,
        dados?.manejo?.faseLateral
      ].forEach(valor => adicionar(lateral, valor));
    });

    return {
      sutia: [...sutia.values()],
      calcinha: [...calcinha.values()],
      lateral: [...lateral.values()]
    };
  }

  async function obterFasesHistoricasOrdens() {
    if (ordensHistoricasPromessa) return ordensHistoricasPromessa;
    const { firestore, db } = contexto;
    ordensHistoricasPromessa = firestore
      .getDocs(firestore.collection(db, COLECAO_ORDENS))
      .then(extrairFasesDasOrdens)
      .catch(error => {
        console.warn("[Manejo] Não foi possível recuperar fases pelo histórico das OPs.", error);
        return { sutia: [], calcinha: [], lateral: [] };
      });
    return ordensHistoricasPromessa;
  }

  function instanteLog(dados, id = "") {
    const ts = dados?.criadoEm;
    const millis = typeof ts?.toMillis === "function" ? ts.toMillis() : 0;
    return `${String(millis).padStart(16, "0")}|${id}`;
  }

  async function obterEstadoPelosLogs(tipo) {
    if (perfilAtual?.tipo !== "admin") return new Map();

    const { firestore, db } = contexto;
    const spec = ESPECIFICACOES[tipo];

    try {
      const consulta = firestore.query(
        firestore.collection(db, COLECAO_LOGS),
        firestore.where("tipoAlvo", "==", spec.tipoLog)
      );
      const snapshot = await firestore.getDocs(consulta);
      const eventos = new Map();

      snapshot.forEach(item => {
        const dados = item.data?.() || {};
        const fase = normalizarFase(dados.alvoId);
        const k = chave(fase);
        if (!fase || !k) return;

        const acao = chave(dados.acao);
        const adicionada = acao.includes("ADICION") || acao.includes("CADASTR");
        const removida = acao.includes("REMOVID") || acao.includes("EXCLUID");
        if (!adicionada && !removida) return;

        const ordem = instanteLog(dados, item.id);
        const anterior = eventos.get(k);
        if (!anterior || ordem > anterior.ordem) {
          eventos.set(k, { fase, removida, ordem });
        }
      });

      return eventos;
    } catch (error) {
      console.warn(`[Manejo] Logs de ${tipo} não puderam ser usados na recuperação.`, error);
      return new Map();
    }
  }

  function obterFasesLocaisParaMigracao(tipo) {
    // Compatibilidade de migração apenas: estes valores são copiados uma vez
    // para o Firestore quando a lista oficial está vazia. Depois disso, o
    // navegador deixa de ser a fonte de verdade.
    const valores = [];
    const idsPorTipo = {
      sutia: ["manejoFasesList", "filtroManejoFaseList"],
      calcinha: ["manejoFasesListCalcinha"],
      lateral: ["manejoFasesLateraisList", "filtroManejoFaseLateralList"]
    };

    (idsPorTipo[tipo] || []).forEach(id => {
      document.querySelectorAll(`#${id} option`).forEach(option => {
        valores.push(option.value || option.textContent || "");
      });
    });

    const chavesStorage = tipo === "lateral"
      ? ["fasesLateraisManejoExtras"]
      : ["fasesManejoExtras"];

    chavesStorage.forEach(storageKey => {
      try {
        const lista = JSON.parse(localStorage.getItem(storageKey) || "[]");
        if (Array.isArray(lista)) valores.push(...lista);
      } catch (_) {}
    });

    return ordenar(valores);
  }

  async function recuperarLista(tipo, dadosDocumento = {}) {
    const spec = ESPECIFICACOES[tipo];
    const historico = await obterFasesHistoricasOrdens();
    const mapa = new Map();

    (historico[tipo] || []).forEach(valor => adicionar(mapa, valor));
    obterFasesLocaisParaMigracao(tipo).forEach(valor => adicionar(mapa, valor));

    const excluidasPersistidas = new Set(
      ordenar(dadosDocumento?.[spec.campoExcluidas] || []).map(chave)
    );

    const eventos = await obterEstadoPelosLogs(tipo);
    eventos.forEach((evento, k) => {
      if (evento.removida) {
        mapa.delete(k);
        excluidasPersistidas.add(k);
      } else {
        mapa.set(k, evento.fase);
        excluidasPersistidas.delete(k);
      }
    });

    excluidasPersistidas.forEach(k => mapa.delete(k));

    return {
      lista: ordenar([...mapa.values()]),
      excluidas: [...excluidasPersistidas]
    };
  }

  function preencherDatalist(id, fases) {
    const datalist = document.getElementById(id);
    if (!datalist) return;
    datalist.innerHTML = ordenar(fases)
      .map(fase => `<option value="${fase.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"></option>`)
      .join("");
  }

  function publicar(tipo, fases) {
    const lista = ordenar(fases);

    if (tipo === "sutia" || tipo === "calcinha") {
      window.dispatchEvent(new CustomEvent("corponu:fases-manejo-atualizadas", {
        detail: { tipo, fases: lista, origem: "firestore", versao: VERSION }
      }));
    }

    if (tipo === "lateral") {
      preencherDatalist("manejoFasesLateraisList", lista);
      preencherDatalist("filtroManejoFaseLateralList", lista);
      window.dispatchEvent(new CustomEvent(ESPECIFICACOES.lateral.evento, {
        detail: { tipo: "lateral", fases: lista, origem: "firestore", versao: VERSION }
      }));
    }
  }

  function agendarReloadAposReparo() {
    if (reloadReparoAgendado) return;
    try {
      if (sessionStorage.getItem(RELOAD_REPARO_KEY) === "1") return;
      sessionStorage.setItem(RELOAD_REPARO_KEY, "1");
    } catch (_) {}

    reloadReparoAgendado = true;
    window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("fases", VERSION);
      url.searchParams.set("t", String(Date.now()));
      window.location.replace(url.toString());
    }, 350);
  }

  async function persistirRecuperacao(tipo, recuperada) {
    if (perfilAtual?.tipo !== "admin" || !recuperada.lista.length) return false;

    const { firestore, db, user } = contexto;
    const spec = ESPECIFICACOES[tipo];
    const referencia = firestore.doc(db, COLECAO_CONFIG, spec.documento);

    return firestore.runTransaction(db, async transacao => {
      const snapshot = await transacao.get(referencia);
      const dados = snapshot.exists() ? snapshot.data() : {};
      const atuais = ordenar(dados?.sugestoes || []);
      if (atuais.length) return false;

      const excluidasAtuais = ordenar(dados?.[spec.campoExcluidas] || []);
      const mapaExcluidas = new Map();
      [...excluidasAtuais, ...recuperada.excluidas].forEach(valor => {
        const fase = normalizarFase(valor);
        const k = chave(fase || valor);
        if (k && !mapaExcluidas.has(k)) mapaExcluidas.set(k, fase || texto(valor));
      });

      transacao.set(referencia, {
        sugestoes: recuperada.lista,
        [spec.campoExcluidas]: [...mapaExcluidas.values()].filter(Boolean),
        recuperadoAutomaticamente: true,
        recuperadoEm: firestore.serverTimestamp(),
        recuperadoPor: user.uid,
        versaoPersistencia: VERSION,
        atualizadoEm: firestore.serverTimestamp(),
        atualizadoPor: user.uid
      }, { merge: true });

      return true;
    });
  }

  async function repararSeNecessario(tipo, dadosDocumento = {}) {
    const estado = estados[tipo];
    if (estado.reparando) return estado.reparando;

    estado.reparando = (async () => {
      const recuperada = await recuperarLista(tipo, dadosDocumento);
      if (!recuperada.lista.length) {
        publicar(tipo, []);
        return false;
      }

      publicar(tipo, recuperada.lista);
      const persistiu = await persistirRecuperacao(tipo, recuperada);
      if (persistiu) agendarReloadAposReparo();
      return persistiu;
    })();

    try {
      return await estado.reparando;
    } finally {
      estado.reparando = null;
    }
  }

  function pararSnapshots() {
    Object.values(estados).forEach(estado => {
      try {
        estado.unsubscribe?.();
      } catch (_) {}
      estado.unsubscribe = null;
      estado.reparando = null;
    });
    ordensHistoricasPromessa = null;
  }

  function iniciarSnapshot(tipo) {
    const { firestore, db } = contexto;
    const spec = ESPECIFICACOES[tipo];
    const referencia = firestore.doc(db, COLECAO_CONFIG, spec.documento);
    const estado = estados[tipo];

    try {
      estado.unsubscribe?.();
    } catch (_) {}

    estado.unsubscribe = firestore.onSnapshot(
      referencia,
      { includeMetadataChanges: true },
      snapshot => {
        const dados = snapshot.exists() ? snapshot.data() : {};
        const lista = ordenar(dados?.sugestoes || []);

        if (lista.length) {
          publicar(tipo, lista);
          return;
        }

        // Não depende do cache local: se a configuração oficial estiver vazia,
        // reconstrói a visualização pelo histórico persistido. Admin também
        // regrava a lista no Firestore para que a correção seja definitiva.
        repararSeNecessario(tipo, dados).catch(error => {
          console.error(`[Manejo] Falha ao reconstruir as fases de ${tipo}.`, error);
        });
      },
      error => {
        console.error(`[Manejo] Falha no snapshot persistente de ${tipo}.`, error);
        repararSeNecessario(tipo, {}).catch(() => {});
      }
    );
  }

  async function configurarUsuario(user) {
    pararSnapshots();
    perfilAtual = null;

    if (!user || !contexto) return;

    const { firestore, db } = contexto;
    try {
      const perfilSnap = await firestore.getDocFromServer(
        firestore.doc(db, "usuarios", user.uid)
      ).catch(() => firestore.getDoc(firestore.doc(db, "usuarios", user.uid)));

      perfilAtual = perfilSnap.exists() ? perfilSnap.data() : {};
    } catch (error) {
      console.warn("[Manejo] Não foi possível conferir o perfil para persistência das fases.", error);
      perfilAtual = {};
    }

    iniciarSnapshot("sutia");
    iniciarSnapshot("calcinha");
    iniciarSnapshot("lateral");
  }

  async function conectar(tentativa = 0) {
    if (contexto?.auth) return;

    try {
      const [firebaseApp, firestore, firebaseAuth] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js")
      ]);

      const apps = firebaseApp.getApps();
      if (!apps.length) throw new Error("Firebase principal ainda não foi inicializado.");

      const app = firebaseApp.getApp();
      const auth = firebaseAuth.getAuth(app);
      const db = firestore.getFirestore(app);
      contexto = { firebaseApp, firestore, firebaseAuth, app, auth, db, user: null };

      unsubscribeAuth?.();
      unsubscribeAuth = firebaseAuth.onAuthStateChanged(auth, user => {
        contexto = { ...contexto, user: user || null };
        configurarUsuario(user).catch(error => {
          console.error("[Manejo] Não foi possível iniciar a persistência das fases.", error);
        });
      });
    } catch (error) {
      if (tentativa >= 40) {
        console.error("[Manejo] Persistência das fases não conseguiu conectar ao Firebase.", error);
        return;
      }
      window.setTimeout(() => conectar(tentativa + 1), 250);
    }
  }

  conectar();
})();
