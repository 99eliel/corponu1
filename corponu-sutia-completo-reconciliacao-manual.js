(() => {
  "use strict";

  const VERSION = "2026-08-03-sutia-completo-reconciliacao-manual-91";
  const FIREBASE_VERSION = "10.12.5";
  const PROCESSO_COMPLETO = "SUTIÃ COMPLETO";
  const SESSION_KEY = `corponu_reconciliacao_sutia_manual_${VERSION}`;

  if (window.__CORPONU_SUTIA_COMPLETO_RECONCILIACAO_MANUAL__ === VERSION) return;
  window.__CORPONU_SUTIA_COMPLETO_RECONCILIACAO_MANUAL__ = VERSION;

  let firebasePromise = null;
  let execucaoAtual = null;
  const timersPorOP = new Map();

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const numero = valor => {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    const bruto = texto(valor);
    if (!bruto) return 0;
    const convertido = Number(bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto);
    return Number.isFinite(convertido) ? convertido : 0;
  };

  function processoCanonico(valor) {
    return normalizar(valor) === "SUTIA COMPLETO" ? PROCESSO_COMPLETO : texto(valor).toUpperCase();
  }

  function processoPagamento(item) {
    return processoCanonico(item?.processo || item?.servicoNome || item?.processoMovimentacao || "");
  }

  function pagamentoAtivo(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "PENDENTE");
    return item?.excluido !== true && item?.cancelado !== true && ![
      "PAGO", "PAGA", "QUITADO", "QUITADA",
      "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA",
      "ESTORNADO", "ESTORNADA"
    ].includes(status);
  }

  function pagamentoAindaSemValor(item) {
    if (!pagamentoAtivo(item) || processoPagamento(item) !== PROCESSO_COMPLETO) return false;
    const status = normalizar(item?.statusPagamento || item?.status || "PENDENTE");
    return status === "SEM VALOR" ||
      status === "SEM_VALOR" ||
      item?.valorPendente === true ||
      item?.valorTotalDefinidoManualmente !== true ||
      numero(item?.total ?? item?.valorTotal) <= 0;
  }

  function avisar(mensagem) {
    const toast = document.getElementById("toast");
    if (!(toast instanceof HTMLElement)) return;
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = "#166534";
    window.clearTimeout(window.__corponuSutiaManual91Toast);
    window.__corponuSutiaManual91Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 5500);
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

  async function documentosDaOP(numeroOP) {
    const opTexto = texto(numeroOP);
    if (!opTexto) return [];

    const { fs, db } = await firebase();
    const valores = [opTexto];
    const opNumerica = Number(opTexto);
    if (Number.isFinite(opNumerica) && String(opNumerica) !== opTexto) valores.push(opNumerica);

    const mapa = new Map();
    for (const valor of valores) {
      try {
        const snap = await fs.getDocs(fs.query(
          fs.collection(db, "entregasPagamento"),
          fs.where("numeroOP", "==", valor),
          fs.limit(80)
        ));
        snap.docs.forEach(item => mapa.set(item.id, { id: item.id, ...item.data() }));
      } catch (error) {
        console.warn("Consulta da OP para reconciliação não disponível.", error);
      }
    }
    return [...mapa.values()];
  }

  async function existePendenciaDaOP(numeroOP) {
    const pagamentos = await documentosDaOP(numeroOP);
    return pagamentos.some(pagamentoAindaSemValor);
  }

  async function existeAlgumaPendencia() {
    const { fs, db } = await firebase();
    const mapa = new Map();
    const consultas = [
      fs.query(
        fs.collection(db, "entregasPagamento"),
        fs.where("statusPagamento", "==", "sem_valor"),
        fs.limit(80)
      ),
      fs.query(
        fs.collection(db, "entregasPagamento"),
        fs.where("valorPendente", "==", true),
        fs.limit(80)
      )
    ];

    for (const consulta of consultas) {
      try {
        const snap = await fs.getDocs(consulta);
        snap.docs.forEach(item => mapa.set(item.id, { id: item.id, ...item.data() }));
      } catch (error) {
        console.warn("Consulta de pendências do Sutiã Completo não disponível.", error);
      }
    }
    return [...mapa.values()].some(pagamentoAindaSemValor);
  }

  async function aguardarCalculador() {
    for (let tentativa = 0; tentativa < 30; tentativa += 1) {
      const api = window.CorpoNuSutiaCompleto;
      if (api && typeof api.recalcularPendentes === "function") return api;
      await new Promise(resolve => window.setTimeout(resolve, 300));
    }
    return null;
  }

  async function reconciliar({ numeroOP = "", origem = "manual" } = {}) {
    if (execucaoAtual) return execucaoAtual;

    execucaoAtual = (async () => {
      try {
        const precisaReconciliar = numeroOP
          ? await existePendenciaDaOP(numeroOP)
          : await existeAlgumaPendencia();
        if (!precisaReconciliar) return { executado: false, atualizados: 0 };

        const api = await aguardarCalculador();
        if (!api) {
          console.warn("Calculador do Sutiã Completo ainda não está disponível para reconciliação.");
          return { executado: false, atualizados: 0 };
        }

        const resultado = await api.recalcularPendentes();
        const atualizados = Number(resultado?.atualizados || 0);
        if (atualizados > 0) {
          window.setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 350);
          if (origem === "manual") {
            avisar(`Pagamento do Sutiã Completo recalculado automaticamente${numeroOP ? ` para a OP ${numeroOP}` : ""}.`);
          }
        }
        return { executado: true, atualizados, resultado };
      } catch (error) {
        console.warn("Não foi possível reconciliar agora o pagamento da chegada manual de Sutiã Completo.", error);
        return { executado: false, atualizados: 0, erro: error };
      } finally {
        execucaoAtual = null;
      }
    })();

    return execucaoAtual;
  }

  function agendarParaOP(numeroOP) {
    const op = texto(numeroOP);
    if (!op) return;

    const anteriores = timersPorOP.get(op) || [];
    anteriores.forEach(timer => window.clearTimeout(timer));

    const timers = [7000, 14500].map(atraso => window.setTimeout(async () => {
      await reconciliar({ numeroOP: op, origem: "manual" });
      if (!(await existePendenciaDaOP(op).catch(() => false))) {
        (timersPorOP.get(op) || []).forEach(timer => window.clearTimeout(timer));
        timersPorOP.delete(op);
      }
    }, atraso));
    timersPorOP.set(op, timers);
  }

  function instalarEventoChegadaManual() {
    document.addEventListener("submit", event => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.id !== "formChegadaManualFaccao") return;

      const processo = processoCanonico(document.getElementById("chegadaManualProcesso")?.value);
      if (processo !== PROCESSO_COMPLETO) return;

      const numeroOP = texto(document.getElementById("chegadaManualOP")?.value);
      if (numeroOP) agendarParaOP(numeroOP);
    }, true);
  }

  function repararPendenciasDaVersao() {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (error) {}

    window.setTimeout(() => reconciliar({ origem: "atualizacao" }), 5500);
  }

  function iniciar() {
    instalarEventoChegadaManual();
    repararPendenciasDaVersao();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
