(() => {
  "use strict";

  const VERSION = "2026-08-04-alca-pagamento-automatico-121";
  const FIREBASE_VERSION = "10.12.5";
  const VALOR_UNITARIO_ALCA = 0.05;
  const ALCAS_POR_SUTIA = 2;
  const VALOR_POR_SUTIA = VALOR_UNITARIO_ALCA * ALCAS_POR_SUTIA;
  const PRECO_ID = "valor-padrao-alca";

  if (window.__CORPONU_ALCA_PAGAMENTO_AUTOMATICO__ === VERSION) return;
  window.__CORPONU_ALCA_PAGAMENTO_AUTOMATICO__ = VERSION;

  let unsubscribe = null;
  let processando = Promise.resolve();
  let firebasePromise = null;

  const texto = valor => String(valor ?? "").trim();

  function normalizar(valor) {
    return texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function numero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    const bruto = texto(valor);
    if (!bruto) return 0;
    const convertido = Number(
      bruto.includes(",")
        ? bruto.replace(/\./g, "").replace(",", ".")
        : bruto
    );
    return Number.isFinite(convertido) ? convertido : 0;
  }

  function arredondar(valor, casas = 4) {
    const fator = 10 ** casas;
    return Math.round((Number(valor) + Number.EPSILON) * fator) / fator;
  }

  function statusBloqueado(item) {
    const status = normalizar(
      item?.statusPagamento || item?.statusFinanceiro || item?.status || ""
    );
    return item?.pago === true || item?.quitado === true || [
      "PAGO",
      "PAGA",
      "QUITADO",
      "QUITADA",
      "CANCELADO",
      "CANCELADA",
      "EXCLUIDO",
      "EXCLUIDA",
      "ESTORNADO",
      "ESTORNADA"
    ].includes(status);
  }

  function pagamentoAlcaSemValor(item) {
    if (!item || statusBloqueado(item) || item.excluido === true || item.cancelado === true) {
      return false;
    }

    const processo = normalizar(
      item.processo || item.servicoNome || item.processoMovimentacao || ""
    );
    if (processo !== "ALCA" && processo !== "ALCAS") return false;

    const quantidade = numero(item.quantidade ?? item.quantidadeRecebida);
    if (!(quantidade > 0)) return false;

    const status = normalizar(item.statusPagamento || "");
    const valorUnitario = numero(item.valorUnitario);

    return item.valorPendente === true ||
      item.valorManualFinanceiroPendente === true ||
      status === "SEM VALOR" ||
      status === "AGUARDANDO VALOR" ||
      !(valorUnitario > 0);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;

    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      return {
        authMod,
        fs,
        auth: authMod.getAuth(app),
        db: fs.getFirestore(app)
      };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });

    return firebasePromise;
  }

  function mostrarAviso(quantidade) {
    if (!(quantidade > 0)) return;

    let aviso = document.getElementById("toastAlcaAutomatica121");
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.id = "toastAlcaAutomatica121";
      aviso.style.cssText = [
        "position:fixed",
        "right:18px",
        "bottom:18px",
        "z-index:1000000",
        "max-width:390px",
        "padding:13px 15px",
        "border-radius:13px",
        "background:#111827",
        "color:#fff",
        "font:800 13px/1.4 Arial,sans-serif",
        "box-shadow:0 16px 38px rgba(15,23,42,.3)"
      ].join(";");
      document.body.appendChild(aviso);
    }

    aviso.textContent = quantidade === 1
      ? "Pagamento da ALÇA calculado automaticamente: 2 alças por sutiã."
      : `${quantidade} pagamentos de ALÇA foram calculados automaticamente.`;

    clearTimeout(aviso.__timer);
    aviso.__timer = setTimeout(() => aviso.remove(), 5500);
  }

  async function corrigirDocumentos(documentos) {
    const candidatos = documentos.filter(item => pagamentoAlcaSemValor(item.dados));
    if (!candidatos.length) return;

    const { fs, db } = await firebase();
    let atualizados = 0;

    for (let inicio = 0; inicio < candidatos.length; inicio += 400) {
      const grupo = candidatos.slice(inicio, inicio + 400);
      const lote = fs.writeBatch(db);

      grupo.forEach(({ id, dados }) => {
        const quantidade = Math.max(
          0,
          numero(dados.quantidade ?? dados.quantidadeRecebida)
        );
        const quantidadeAlcas = quantidade * ALCAS_POR_SUTIA;
        const descontoDefeito = Math.max(0, numero(dados.descontoDefeito));
        const subtotal = arredondar(quantidade * VALOR_POR_SUTIA, 4);
        const total = arredondar(Math.max(subtotal - descontoDefeito, 0), 2);

        lote.set(
          fs.doc(db, "entregasPagamento", id),
          {
            precoReferenciaId: PRECO_ID,
            servicoId: PRECO_ID,
            processo: "ALÇA",
            processoMovimentacao: "ALÇA",
            servicoNome: "ALÇA",
            setor: "alca",
            setorLabel: "Alça",
            quantidade,
            quantidadeAlcas,
            multiplicadorAlcas: ALCAS_POR_SUTIA,
            valorUnitarioAlca: VALOR_UNITARIO_ALCA,
            valorUnitario: VALOR_POR_SUTIA,
            subtotal,
            descontoDefeito,
            total,
            statusPagamento: "pendente",
            statusFinanceiro: "pendente",
            valorPendente: false,
            valorManualFinanceiroPendente: false,
            avisoPagamento: "",
            calculoAlcaAutomatico: true,
            regraCalculoAlca: "quantidade_sutias_x_2_x_0_05",
            versaoCalculoAlca: VERSION,
            atualizadoEm: fs.serverTimestamp()
          },
          { merge: true }
        );
        atualizados += 1;
      });

      await lote.commit();
    }

    mostrarAviso(atualizados);
  }

  function enfileirar(documentos) {
    processando = processando
      .then(() => corrigirDocumentos(documentos))
      .catch(error => {
        console.error("Não foi possível calcular automaticamente a ALÇA.", error);
      });
  }

  async function iniciarListener() {
    const { authMod, auth, fs, db } = await firebase();

    authMod.onAuthStateChanged(auth, usuario => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (!usuario) return;

      const consulta = fs.query(
        fs.collection(db, "entregasPagamento"),
        fs.where("processo", "in", ["ALÇA", "ALCA", "ALÇAS", "ALCAS"])
      );

      unsubscribe = fs.onSnapshot(
        consulta,
        snapshot => {
          const documentos = snapshot.docChanges().map(alteracao => ({
            id: alteracao.doc.id,
            dados: alteracao.doc.data()
          }));
          enfileirar(documentos);
        },
        error => {
          console.error("Não foi possível acompanhar pagamentos de ALÇA.", error);
        }
      );
    });
  }

  function iniciar() {
    iniciarListener().catch(error => {
      console.error("Falha ao iniciar o pagamento automático da ALÇA.", error);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
