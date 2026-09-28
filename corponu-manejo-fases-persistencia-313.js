(() => {
  "use strict";

  const VERSION = "2026-09-28-manejo-fases-blindadas-314";
  const GUARD = "__CORPONU_MANEJO_FASES_PERSISTENCIA__";
  const COLECAO_CONFIG = "configuracoes";
  const MARCADOR_BASELINE = "baselineProtecao314Consolidado";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  // Snapshot salvo pelo administrador em 28/09/2026.
  // É usado uma única vez para reconstruir as três listas oficiais e,
  // depois disso, o backup persistente passa a ser a fonte de recuperação.
  const BASELINE_SALVO = Object.freeze({
    sutia: Object.freeze([
      "AGUARDANDO MOVIMENTAÇÃO",
      "ÁGUIA",
      "BOJOS ENCAPADOS",
      "CASA",
      "CORTE",
      "COTTON",
      "DANÚBIA",
      "DEP. CORTE",
      "DHEYSIVEL",
      "DISPONÍVEL P CASA",
      "ENTRAR NA PRODUÇÃO",
      "FÊNIX",
      "GISLAINE",
      "GOIANIRA",
      "ITAMAR",
      "KAKA",
      "LIDERANÇA",
      "LÚCIA",
      "NÃO USA BOJO",
      "PEGAR BOJO",
      "PREPARAR",
      "PRODUÇÃO",
      "SILKADO",
      "UNIÃO"
    ]),
    lateral: Object.freeze([
      "FRANCILDA",
      "JHENIFER",
      "LIVIA",
      "NAGILA",
      "PRODUÇÃO"
    ]),
    calcinha: Object.freeze([
      "AGUARDANDO MOVIMENTAÇÃO",
      "ANA FLAVIA",
      "ANDREZA",
      "ANGÉLICA",
      "AURELIO",
      "BEATRIZ",
      "BRUNA",
      "CAMILA FIRMINO",
      "CORTE",
      "COTTON",
      "DAIANA",
      "DARLLEN",
      "DEP. CORTE",
      "ELITE",
      "ESPERANÇA",
      "ÍRIS",
      "JEAN",
      "JESSICA CAROLINE",
      "JHAYNNIS ALVES",
      "JOÃO",
      "JULIANA MARTINS",
      "JUZENI",
      "KAMILA E KARLA",
      "KAUANE",
      "KEILA",
      "LEIDIANE",
      "LEONARDO",
      "LIANA BADIAS",
      "LORENA",
      "MARÍLIA",
      "MATHEUS",
      "NAYARA FERNANDES",
      "PEDRO - MARCILENE",
      "POWER",
      "RONEIDIA",
      "SCHENEIDER",
      "SILVANY",
      "SUPERAÇÃO",
      "TALYTA",
      "THELLOR"
    ])
  });

  const ESPECIFICACOES = Object.freeze({
    sutia: Object.freeze({
      documento: "fasesManejo",
      backup: "backupFasesManejoSutia",
      idsDatalist: ["manejoFasesList", "filtroManejoFaseList"],
      evento: "corponu:fases-manejo-atualizadas"
    }),
    calcinha: Object.freeze({
      documento: "fasesManejoCalcinha",
      backup: "backupFasesManejoCalcinha",
      idsDatalist: ["manejoFasesListCalcinha"],
      evento: "corponu:fases-manejo-atualizadas"
    }),
    lateral: Object.freeze({
      documento: "fasesManejoSutiaLateral",
      backup: "backupFasesManejoSutiaLateral",
      idsDatalist: ["manejoFasesLateraisList", "filtroManejoFaseLateralList"],
      evento: "corponu:fases-manejo-lateral-atualizadas"
    })
  });

  const estados = {
    sutia: { unsubscribe: null, resolvendoVazio: null, ultimoBackupHash: "" },
    calcinha: { unsubscribe: null, resolvendoVazio: null, ultimoBackupHash: "" },
    lateral: { unsubscribe: null, resolvendoVazio: null, ultimoBackupHash: "" }
  };

  let contexto = null;
  let perfilAtual = null;
  let unsubscribeAuth = null;

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

  function hashLista(lista) {
    return ordenar(lista).map(chave).join("|");
  }

  function escaparHtml(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function preencherDatalist(id, fases) {
    const datalist = document.getElementById(id);
    if (!datalist) return;
    datalist.innerHTML = ordenar(fases)
      .map(fase => `<option value="${escaparHtml(fase)}"></option>`)
      .join("");
  }

  function publicar(tipo, fases, origem = "firestore") {
    const spec = ESPECIFICACOES[tipo];
    const lista = ordenar(fases);

    (spec.idsDatalist || []).forEach(id => preencherDatalist(id, lista));

    if (tipo === "sutia" || tipo === "calcinha") {
      window.dispatchEvent(new CustomEvent("corponu:fases-manejo-atualizadas", {
        detail: { tipo, fases: lista, origem, versao: VERSION }
      }));
    }

    if (tipo === "lateral") {
      window.dispatchEvent(new CustomEvent(spec.evento, {
        detail: { tipo: "lateral", fases: lista, origem, versao: VERSION }
      }));
    }
  }

  function dadosBackupDoDocumento(dados = {}, lista = []) {
    return {
      sugestoes: ordenar(lista),
      sugestoesExcluidas: ordenar(dados?.sugestoesExcluidas || [])
    };
  }

  async function lerDocumentoServidor(referencia) {
    const { firestore } = contexto;
    if (typeof firestore.getDocFromServer === "function") {
      try {
        return await firestore.getDocFromServer(referencia);
      } catch (_) {}
    }
    return firestore.getDoc(referencia);
  }

  async function salvarBackup(tipo, dadosDocumento, lista) {
    if (perfilAtual?.tipo !== "admin" || !contexto?.user) return false;

    const spec = ESPECIFICACOES[tipo];
    const listaOrdenada = ordenar(lista);
    if (!listaOrdenada.length) return false;

    const estado = estados[tipo];
    const hash = hashLista(listaOrdenada) + "#" + hashLista(dadosDocumento?.sugestoesExcluidas || []);
    if (estado.ultimoBackupHash === hash) return false;

    const { firestore, db, user } = contexto;
    const referenciaBackup = firestore.doc(db, COLECAO_CONFIG, spec.backup);

    await firestore.setDoc(referenciaBackup, {
      ...dadosBackupDoDocumento(dadosDocumento, listaOrdenada),
      tipo,
      documentoOrigem: spec.documento,
      protegidoEm: firestore.serverTimestamp(),
      protegidoPor: user.uid,
      versaoProtecao: VERSION
    }, { merge: false });

    estado.ultimoBackupHash = hash;
    return true;
  }

  async function lerBackup(tipo) {
    const spec = ESPECIFICACOES[tipo];
    const { firestore, db } = contexto;
    const referencia = firestore.doc(db, COLECAO_CONFIG, spec.backup);

    try {
      const snapshot = await lerDocumentoServidor(referencia);
      if (!snapshot.exists()) return null;
      const dados = snapshot.data() || {};
      const lista = ordenar(dados.sugestoes || []);
      if (!lista.length) return null;
      return {
        lista,
        excluidas: ordenar(dados.sugestoesExcluidas || [])
      };
    } catch (error) {
      console.warn(`[Manejo] Backup de ${tipo} não pôde ser lido.`, error);
      return null;
    }
  }

  async function consolidarBaseline(tipo) {
    if (perfilAtual?.tipo !== "admin" || !contexto?.user) return false;

    const spec = ESPECIFICACOES[tipo];
    const baseline = ordenar(BASELINE_SALVO[tipo] || []);
    if (!baseline.length) return false;

    const { firestore, db, user } = contexto;
    const referencia = firestore.doc(db, COLECAO_CONFIG, spec.documento);

    const resultado = await firestore.runTransaction(db, async transacao => {
      const snapshot = await transacao.get(referencia);
      const dados = snapshot.exists() ? snapshot.data() : {};

      if (dados?.[MARCADOR_BASELINE] === true) {
        return { aplicado: false, lista: ordenar(dados.sugestoes || []), dados };
      }

      transacao.set(referencia, {
        sugestoes: baseline,
        sugestoesExcluidas: [],
        [MARCADOR_BASELINE]: true,
        baselineProtecaoVersao: VERSION,
        baselineProtecaoEm: firestore.serverTimestamp(),
        baselineProtecaoPor: user.uid,
        atualizadoEm: firestore.serverTimestamp(),
        atualizadoPor: user.uid
      }, { merge: true });

      return { aplicado: true, lista: baseline, dados: { ...dados, sugestoesExcluidas: [] } };
    });

    if (resultado.aplicado) {
      publicar(tipo, baseline, "snapshot-salvo-28-09-2026");
      await salvarBackup(tipo, resultado.dados || {}, baseline);
      console.info(`[Manejo] Baseline protegido de ${tipo} consolidado com ${baseline.length} opções.`);
    }

    return resultado.aplicado;
  }

  async function restaurarOficial(tipo, lista, excluidas = [], origem = "backup") {
    if (perfilAtual?.tipo !== "admin" || !contexto?.user) return false;

    const spec = ESPECIFICACOES[tipo];
    const restaurada = ordenar(lista);
    if (!restaurada.length) return false;

    const { firestore, db, user } = contexto;
    const referencia = firestore.doc(db, COLECAO_CONFIG, spec.documento);

    const resultado = await firestore.runTransaction(db, async transacao => {
      const snapshot = await transacao.get(referencia);
      const dados = snapshot.exists() ? snapshot.data() : {};
      const atual = ordenar(dados.sugestoes || []);

      // Nunca substitui uma lista válida por uma restauração antiga.
      if (atual.length) return { restaurou: false, lista: atual, dados };

      const payload = {
        sugestoes: restaurada,
        [MARCADOR_BASELINE]: true,
        restauradoAutomaticamente: true,
        restauradoDe: origem,
        restauradoEm: firestore.serverTimestamp(),
        restauradoPor: user.uid,
        versaoProtecao: VERSION,
        atualizadoEm: firestore.serverTimestamp(),
        atualizadoPor: user.uid
      };

      if (origem === "baseline-salvo") {
        payload.sugestoesExcluidas = [];
      } else {
        payload.sugestoesExcluidas = ordenar(excluidas || []);
      }

      transacao.set(referencia, payload, { merge: true });
      return { restaurou: true, lista: restaurada, dados: { ...dados, ...payload } };
    });

    publicar(tipo, resultado.lista, resultado.restaurou ? origem : "firestore");

    if (resultado.restaurou) {
      await salvarBackup(tipo, resultado.dados || {}, resultado.lista);
      console.warn(`[Manejo] Lista ${tipo} estava vazia e foi restaurada automaticamente de ${origem}.`);
    }

    return resultado.restaurou;
  }

  async function resolverListaVazia(tipo) {
    const estado = estados[tipo];
    if (estado.resolvendoVazio) return estado.resolvendoVazio;

    estado.resolvendoVazio = (async () => {
      const spec = ESPECIFICACOES[tipo];
      const { firestore, db } = contexto;
      const referencia = firestore.doc(db, COLECAO_CONFIG, spec.documento);

      // Confirma diretamente no servidor antes de considerar a lista realmente vazia.
      try {
        const servidor = await lerDocumentoServidor(referencia);
        const dadosServidor = servidor.exists() ? servidor.data() : {};
        const listaServidor = ordenar(dadosServidor?.sugestoes || []);
        if (listaServidor.length) {
          publicar(tipo, listaServidor, "firestore-servidor");
          salvarBackup(tipo, dadosServidor, listaServidor).catch(() => {});
          return false;
        }
      } catch (error) {
        console.warn(`[Manejo] Não foi possível confirmar ${tipo} diretamente no servidor.`, error);
      }

      const backup = await lerBackup(tipo);
      const fallback = backup?.lista?.length ? backup.lista : ordenar(BASELINE_SALVO[tipo] || []);
      const excluidas = backup?.excluidas || [];
      const origem = backup?.lista?.length ? "backup-firestore" : "baseline-salvo";

      if (!fallback.length) {
        console.error(`[Manejo] Nenhuma fonte de recuperação disponível para ${tipo}.`);
        return false;
      }

      // Usuários comuns também recebem a lista imediatamente na interface.
      publicar(tipo, fallback, origem);

      // Somente o admin persiste a restauração, conforme as regras do Firestore.
      if (perfilAtual?.tipo === "admin") {
        return restaurarOficial(tipo, fallback, excluidas, origem);
      }

      return false;
    })();

    try {
      return await estado.resolvendoVazio;
    } finally {
      estado.resolvendoVazio = null;
    }
  }

  function pararSnapshots() {
    Object.values(estados).forEach(estado => {
      try { estado.unsubscribe?.(); } catch (_) {}
      estado.unsubscribe = null;
      estado.resolvendoVazio = null;
      estado.ultimoBackupHash = "";
    });
  }

  function iniciarSnapshot(tipo) {
    const spec = ESPECIFICACOES[tipo];
    const estado = estados[tipo];
    const { firestore, db } = contexto;
    const referencia = firestore.doc(db, COLECAO_CONFIG, spec.documento);

    try { estado.unsubscribe?.(); } catch (_) {}

    estado.unsubscribe = firestore.onSnapshot(
      referencia,
      { includeMetadataChanges: true },
      snapshot => {
        const dados = snapshot.exists() ? snapshot.data() : {};
        const lista = ordenar(dados?.sugestoes || []);

        if (lista.length) {
          publicar(tipo, lista, snapshot.metadata?.fromCache ? "cache-firestore" : "firestore");
          if (!snapshot.metadata?.fromCache) {
            salvarBackup(tipo, dados, lista).catch(error => {
              console.warn(`[Manejo] Não foi possível atualizar o backup de ${tipo}.`, error);
            });
          }
          return;
        }

        resolverListaVazia(tipo).catch(error => {
          console.error(`[Manejo] Falha ao proteger a lista ${tipo}.`, error);
        });
      },
      error => {
        console.error(`[Manejo] Snapshot de ${tipo} falhou.`, error);
        resolverListaVazia(tipo).catch(() => {});
      }
    );
  }

  async function configurarUsuario(user) {
    pararSnapshots();
    perfilAtual = null;

    if (!user || !contexto) return;

    const { firestore, db } = contexto;
    try {
      const referenciaPerfil = firestore.doc(db, "usuarios", user.uid);
      const perfilSnap = await lerDocumentoServidor(referenciaPerfil);
      perfilAtual = perfilSnap.exists() ? perfilSnap.data() : {};
    } catch (error) {
      console.warn("[Manejo] Perfil não pôde ser confirmado para a proteção das fases.", error);
      perfilAtual = {};
    }

    // Primeira execução da versão 314: grava exatamente o snapshot salvo pelo
    // administrador. O marcador impede que isso se repita após futuras edições.
    if (perfilAtual?.tipo === "admin") {
      for (const tipo of ["sutia", "lateral", "calcinha"]) {
        try {
          await consolidarBaseline(tipo);
        } catch (error) {
          console.error(`[Manejo] Não foi possível consolidar o baseline de ${tipo}.`, error);
        }
      }
    }

    iniciarSnapshot("sutia");
    iniciarSnapshot("lateral");
    iniciarSnapshot("calcinha");
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

      try { unsubscribeAuth?.(); } catch (_) {}
      unsubscribeAuth = firebaseAuth.onAuthStateChanged(auth, user => {
        contexto = { ...contexto, user: user || null };
        configurarUsuario(user).catch(error => {
          console.error("[Manejo] Proteção das fases não pôde ser iniciada.", error);
        });
      });

      window.corponuRestaurarFasesSalvas = async () => {
        if (!auth.currentUser) throw new Error("Faça login antes de restaurar as fases.");
        await configurarUsuario(auth.currentUser);
        return true;
      };
    } catch (error) {
      if (tentativa >= 40) {
        console.error("[Manejo] Proteção das fases não conseguiu conectar ao Firebase.", error);
        return;
      }
      window.setTimeout(() => conectar(tentativa + 1), 250);
    }
  }

  conectar();
})();
