(() => {
  "use strict";

  const VERSION = "2026-08-03-sutia-completo-reconciliacao-leve-94";
  const FIREBASE_VERSION = "10.12.5";
  const PROCESSO_COMPLETO = "SUTIÃ COMPLETO";
  const timers = new Map();
  let firebasePromise = null;

  if (window.__CORPONU_SUTIA_COMPLETO_RECONCILIACAO_MANUAL__ === VERSION) return;
  window.__CORPONU_SUTIA_COMPLETO_RECONCILIACAO_MANUAL__ = VERSION;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  const referencia = valor => texto(valor).replace(/\s+/g, "").toUpperCase();

  function processoCanonico(valor) {
    return normalizar(valor) === "SUTIA COMPLETO" ? PROCESSO_COMPLETO : texto(valor).toUpperCase();
  }

  function pagamentoPendente(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "PENDENTE");
    return item?.excluido !== true &&
      item?.cancelado !== true &&
      !["PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "EXCLUIDO"].includes(status) &&
      (status === "SEM VALOR" || status === "SEM_VALOR" || item?.valorPendente === true);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      return { fs, db: fs.getFirestore(appMod.getApp()) };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function pagamentosDaOP(numeroOP) {
    const opTexto = texto(numeroOP);
    if (!opTexto) return [];
    const { fs, db } = await firebase();
    const valores = [opTexto];
    const numerico = Number(opTexto);
    if (Number.isFinite(numerico)) valores.push(numerico);

    const mapa = new Map();
    for (const valor of [...new Set(valores)]) {
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, "entregasPagamento"),
        fs.where("numeroOP", "==", valor),
        fs.limit(40)
      ));
      snap.docs.forEach(item => mapa.set(item.id, { id: item.id, ...item.data() }));
    }
    return [...mapa.values()];
  }

  async function precisaFallback(numeroOP) {
    const pagamentos = await pagamentosDaOP(numeroOP);
    return pagamentos.some(item =>
      processoCanonico(item?.processo || item?.servicoNome || item?.processoMovimentacao) === PROCESSO_COMPLETO &&
      referencia(item?.referencia) !== "912" &&
      pagamentoPendente(item)
    );
  }

  async function aguardarCalculador() {
    for (let tentativa = 0; tentativa < 20; tentativa += 1) {
      const api = window.CorpoNuSutiaCompleto;
      if (api && typeof api.recalcularPendentes === "function") return api;
      await new Promise(resolve => window.setTimeout(resolve, 250));
    }
    return null;
  }

  async function executarFallback(numeroOP) {
    try {
      if (!(await precisaFallback(numeroOP))) return;
      const api = await aguardarCalculador();
      if (!api) return;
      await api.recalcularPendentes();
      window.setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 250);
    } catch (error) {
      console.warn("Fallback leve do Sutiã Completo não executado.", error);
    }
  }

  function agendar(numeroOP) {
    const op = texto(numeroOP);
    if (!op) return;
    window.clearTimeout(timers.get(op));
    timers.set(op, window.setTimeout(() => {
      timers.delete(op);
      executarFallback(op);
    }, 7000));
  }

  function instalar() {
    document.addEventListener("submit", event => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.id !== "formChegadaManualFaccao") return;

      const processo = processoCanonico(document.getElementById("chegadaManualProcesso")?.value);
      const ref = referencia(document.getElementById("chegadaManualRef")?.value);
      if (processo !== PROCESSO_COMPLETO || ref === "912") return;

      agendar(document.getElementById("chegadaManualOP")?.value);
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", instalar, { once: true });
  } else {
    instalar();
  }
})();