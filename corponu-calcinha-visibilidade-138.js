(() => {
  "use strict";

  const VERSION = "2026-08-06-calcinha-visibilidade-138";
  const FIREBASE_VERSION = "10.12.5";
  const OP_ALVO = "57864";

  if (window.__CORPONU_CALCINHA_VISIBILIDADE_138__ === VERSION) return;
  window.__CORPONU_CALCINHA_VISIBILIDADE_138__ = VERSION;

  let firebasePromise = null;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function ehCalcinha(dados) {
    const tipo = normalizar([
      dados?.tipoPeca,
      dados?.tipoPecaPadrao,
      dados?.tipoPecaLabel,
      dados?.setor,
      dados?.setorLabel
    ].join(" "));
    return tipo.includes("CALCINHA") || normalizar(dados?.processoPlanejado || dados?.processo).startsWith("CALCINHA");
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModule, authModule, firestoreModule]) => {
      const apps = appModule.getApps();
      const app = apps.find(item => item.name === "[DEFAULT]") || apps[0] || appModule.getApp();
      return {
        ...firestoreModule,
        auth: authModule.getAuth(app),
        onAuthStateChanged: authModule.onAuthStateChanged,
        db: firestoreModule.getFirestore(app)
      };
    });
    return firebasePromise;
  }

  async function buscarOrdens(numeroOP) {
    const fb = await firebase();
    const encontrados = new Map();
    const valores = [String(numeroOP)];
    const numero = Number(numeroOP);
    if (Number.isFinite(numero)) valores.push(numero);

    for (const campo of ["numeroOP", "numeroOPExterno"]) {
      for (const valor of valores) {
        try {
          const consulta = fb.query(fb.collection(fb.db, "ordensProducao"), fb.where(campo, "==", valor));
          const snapshot = await fb.getDocs(consulta);
          snapshot.forEach(item => encontrados.set(item.id, { id: item.id, ...item.data() }));
        } catch (erro) {
          console.warn(`[Calcinha 138] Falha ao buscar ${campo}=${valor}.`, erro);
        }
      }
    }

    return [...encontrados.values()].filter(item => normalizar(item.numeroOP || item.numeroOPExterno) === normalizar(numeroOP));
  }

  async function garantirCriadoEm(ordem) {
    if (!ordem?.id || !ehCalcinha(ordem) || ordem.criadoEm) return false;
    const fb = await firebase();
    const usuario = fb.auth.currentUser;

    await fb.setDoc(fb.doc(fb.db, "ordensProducao", ordem.id), {
      criadoEm: fb.serverTimestamp(),
      criadoPor: ordem.criadoPor || ordem.atualizadoPor || usuario?.uid || "",
      atualizadoEm: fb.serverTimestamp(),
      visibilidadeOrdensCorrigida: true,
      visibilidadeOrdensVersao: VERSION
    }, { merge: true });

    console.info(`[Calcinha 138] OP ${ordem.numeroOP || ordem.numeroOPExterno || ordem.id} recebeu criadoEm e voltou à consulta ordenada.`);
    return true;
  }

  async function repararNumero(numeroOP, atualizarTela = true) {
    const ordens = await buscarOrdens(numeroOP);
    let corrigidas = 0;
    for (const ordem of ordens) {
      if (await garantirCriadoEm(ordem)) corrigidas += 1;
    }

    if (corrigidas && atualizarTela) {
      setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 250);
      setTimeout(() => document.querySelector('.corponu-dual-tabs[data-page="ordens"] [data-type="calcinha"]')?.click(), 700);
    }
    return corrigidas;
  }

  async function iniciar() {
    try {
      const fb = await firebase();
      fb.onAuthStateChanged(fb.auth, usuario => {
        if (!usuario) return;
        repararNumero(OP_ALVO, true).catch(erro => console.error("[Calcinha 138] Falha ao reparar a OP 57864.", erro));
      });
    } catch (erro) {
      console.error("[Calcinha 138] Não foi possível iniciar o reparo de visibilidade.", erro);
    }
  }

  // Proteção para futuras correções da 137: após salvar uma OP pela aba Calcinha,
  // garante que o documento corrigido possua criadoEm e portanto participe do orderBy da lista principal.
  window.addEventListener("submit", event => {
    if (event.target?.id !== "formOrdem") return;
    const tipo = document.body.dataset.corponuFormType;
    const aba = document.querySelector('.corponu-dual-tabs[data-page="ordens"] .corponu-dual-tab.active')?.dataset?.type;
    if (tipo !== "calcinha" && aba !== "calcinha") return;
    const numero = document.getElementById("ordemNumero")?.value || "";
    if (!numero) return;
    setTimeout(() => repararNumero(numero, true).catch(() => {}), 1800);
  }, true);

  iniciar();
})();
