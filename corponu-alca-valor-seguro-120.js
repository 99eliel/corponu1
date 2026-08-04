(() => {
  "use strict";

  const VERSION = "2026-08-04-correcao-alca-valor-120";
  const FIREBASE_VERSION = "10.12.5";
  const FORM_ID = "formValorPadraoAlca";
  const INPUT_ID = "inputValorPadraoAlca";
  const BOTAO_ID = "btnSalvarValorPadraoAlca";
  const STATUS_ID = "statusValorPadraoAlca";
  const PRECO_ID = "valor-padrao-alca";
  const MULTIPLICADOR = 2;
  const ALIASES = ["ALÇA", "ALCA", "ALÇAS", "ALCAS"];

  if (window.__CORPONU_ALCA_VALOR_SEGURO_120__ === VERSION) return;
  window.__CORPONU_ALCA_VALOR_SEGURO_120__ = VERSION;

  let contextoPromise = null;
  let salvando = false;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function numeroMoeda(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    const bruto = texto(valor).replace(/R\$/gi, "").replace(/\s+/g, "");
    if (!bruto) return 0;
    const ajustado = bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto;
    const numero = Number(ajustado.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numero) ? numero : 0;
  }

  const arredondar2 = valor => Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;
  const arredondar4 = valor => Math.round((Number(valor || 0) + Number.EPSILON) * 10000) / 10000;

  function ehAlca(item) {
    const processo = normalizar(
      item?.processo || item?.servicoNome || item?.processoMovimentacao || item?.nomeProcesso || ""
    );
    return processo === "ALCA" || processo === "ALCAS";
  }

  function pagamentoPodeSerCorrigido(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    if (item?.pago === true || item?.cancelado === true || item?.excluido === true) return false;
    return ![
      "PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA",
      "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
    ].includes(status);
  }

  function pagamentoAlcaSemValor(item) {
    if (!ehAlca(item) || !pagamentoPodeSerCorrigido(item)) return false;
    const status = normalizar(item?.statusPagamento || item?.status || "");
    return item?.valorPendente === true ||
      item?.valorManualFinanceiroPendente === true ||
      ["SEM VALOR", "AGUARDANDO VALOR"].includes(status) ||
      !(numeroMoeda(item?.valorUnitarioAlca) > 0) ||
      !(numeroMoeda(item?.valorUnitario) > 0) ||
      !(numeroMoeda(item?.total ?? item?.valorTotal) > 0);
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModulo, authModulo, firestore]) => {
      if (!appModulo.getApps().length) throw new Error("Firebase ainda não foi inicializado.");
      const app = appModulo.getApp();
      return {
        firestore,
        db: firestore.getFirestore(app),
        auth: authModulo.getAuth(app)
      };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  async function aguardarUsuario(auth) {
    for (let tentativa = 0; tentativa < 30 && !auth.currentUser; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 150));
    }
    if (!auth.currentUser) throw new Error("Usuário ainda não autenticado.");
    return auth.currentUser;
  }

  async function consultarSomentePagamentosAlca(firestore, db) {
    const encontrados = new Map();
    const colecao = firestore.collection(db, "entregasPagamento");

    const consultas = [
      ...["processo", "servicoNome", "processoMovimentacao"].map(campo =>
        firestore.query(colecao, firestore.where(campo, "in", ALIASES))
      ),
      firestore.query(colecao, firestore.where("setor", "==", "alca"))
    ];

    for (const consulta of consultas) {
      try {
        const snapshot = await firestore.getDocs(consulta);
        snapshot.docs.forEach(documento => {
          const item = { id: documento.id, ...documento.data() };
          if (ehAlca(item)) encontrados.set(documento.id, item);
        });
      } catch (error) {
        console.warn("Uma consulta específica de ALÇA não pôde ser executada.", error);
      }
    }

    return [...encontrados.values()].filter(pagamentoAlcaSemValor);
  }

  function quantidadeRecebida(item) {
    return Math.max(0, Number(
      item?.quantidadeRecebida ?? item?.quantidade ?? item?.quantidadeEnviada ?? 0
    ) || 0);
  }

  function descontoDefeito(item) {
    return Math.max(0, numeroMoeda(
      item?.descontoDefeito ?? item?.descontoPorDefeito ?? item?.defeito ?? 0
    ));
  }

  function toast(mensagem, erro = false) {
    const existente = document.getElementById("toast");
    if (existente) {
      existente.textContent = mensagem;
      existente.classList.remove("hidden");
      existente.style.background = erro ? "#991b1b" : "#166534";
      window.clearTimeout(window.__corponuAlca120Toast);
      window.__corponuAlca120Toast = window.setTimeout(() => {
        existente.classList.add("hidden");
        existente.style.removeProperty("background");
      }, erro ? 8000 : 6000);
      return;
    }

    const elemento = document.createElement("div");
    elemento.textContent = mensagem;
    elemento.style.cssText = [
      "position:fixed", "right:18px", "bottom:18px", "z-index:1000003",
      "max-width:min(480px,calc(100vw - 32px))", "padding:14px 16px",
      "border-radius:13px", "box-shadow:0 18px 48px rgba(15,23,42,.28)",
      `background:${erro ? "#991b1b" : "#166534"}`, "color:#fff",
      "font:800 13px/1.45 Arial,sans-serif"
    ].join(";");
    document.body.appendChild(elemento);
    window.setTimeout(() => elemento.remove(), erro ? 8000 : 6000);
  }

  function definirEstadoBotao(botao, textoBotao, bloqueado) {
    if (!(botao instanceof HTMLButtonElement)) return;
    botao.disabled = bloqueado;
    botao.textContent = textoBotao;
  }

  async function registrarLog(firestore, db, usuario, valor, quantidade) {
    try {
      await firestore.addDoc(firestore.collection(db, "logsAlteracoes"), {
        acao: "valor_alca_aplicado_sem_varredura_geral",
        tipoAlvo: "entregasPagamento",
        alvoId: PRECO_ID,
        detalhes: `R$ ${valor.toFixed(4)} por alça | ${quantidade} pagamento(s) pendente(s) corrigido(s)`,
        usuarioUid: usuario.uid,
        usuarioEmail: usuario.email || "",
        criadoEm: firestore.serverTimestamp(),
        versao: VERSION
      });
    } catch (error) {
      console.warn("Valor da ALÇA salvo, mas o log complementar não foi criado.", error);
    }
  }

  async function salvarValorAlcaSeguro(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== FORM_ID) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (salvando) return;

    const input = document.getElementById(INPUT_ID);
    const botao = document.getElementById(BOTAO_ID) || form.querySelector('button[type="submit"]');
    const status = document.getElementById(STATUS_ID);
    const valorAlca = numeroMoeda(input?.value);

    if (!(valorAlca > 0)) {
      toast("Informe um valor maior que zero para cada alça.", true);
      input?.focus();
      return;
    }

    salvando = true;
    const textoOriginal = botao?.textContent || "Salvar valor padrão";
    definirEstadoBotao(botao, "Salvando apenas ALÇA...", true);

    try {
      const { firestore, db, auth } = await contexto();
      const usuario = await aguardarUsuario(auth);
      const pendentes = await consultarSomentePagamentosAlca(firestore, db);
      const agora = firestore.serverTimestamp();
      const valorPorSutia = arredondar4(valorAlca * MULTIPLICADOR);
      const batch = firestore.writeBatch(db);

      batch.set(firestore.doc(db, "precosReferencia", PRECO_ID), {
        referencia: "TODAS",
        processo: "ALÇA",
        setor: "alca",
        setorLabel: "Alça",
        valor: arredondar4(valorAlca),
        valorUnitario: arredondar4(valorAlca),
        preco: arredondar4(valorAlca),
        ativo: true,
        tipoValor: "padrao_global_alca",
        valorPadraoGlobalAlca: true,
        multiplicadorQuantidade: MULTIPLICADOR,
        atualizadoPor: usuario.uid,
        atualizadoEm: agora,
        versaoValorAlca: VERSION
      }, { merge: true });

      pendentes.forEach(item => {
        const quantidade = quantidadeRecebida(item);
        const quantidadeAlcas = quantidade * MULTIPLICADOR;
        const desconto = descontoDefeito(item);
        const subtotal = arredondar2(quantidade * valorPorSutia);
        const total = arredondar2(Math.max(subtotal - desconto, 0));

        batch.set(firestore.doc(db, "entregasPagamento", item.id), {
          precoReferenciaId: PRECO_ID,
          servicoId: PRECO_ID,
          processo: "ALÇA",
          processoMovimentacao: "ALÇA",
          servicoNome: "ALÇA",
          setor: "alca",
          setorLabel: "Alça",
          quantidadeAlcas,
          multiplicadorAlcas: MULTIPLICADOR,
          valorUnitarioAlca: arredondar4(valorAlca),
          valorUnitario: valorPorSutia,
          subtotal,
          total,
          statusPagamento: "pendente",
          valorPendente: false,
          valorManualFinanceiroPendente: false,
          formaValorPagamento: "valor_global_alca",
          motivoValorPendente: "",
          avisoPagamento: "",
          valorInformadoPor: usuario.uid,
          valorInformadoEm: agora,
          atualizadoPor: usuario.uid,
          atualizadoEm: agora,
          versaoValorAlca: VERSION
        }, { merge: true });
      });

      definirEstadoBotao(botao, "Aplicando nos pendentes...", true);
      await batch.commit();

      if (status) {
        status.textContent = `Valor atual: R$ ${valorAlca.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4
        })} por alça. Valor por sutiã: R$ ${valorPorSutia.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4
        })}.`;
      }

      definirEstadoBotao(botao, "Valor da ALÇA salvo", true);
      toast(
        pendentes.length
          ? `Valor da ALÇA aplicado com segurança em ${pendentes.length} pagamento(s) pendente(s), sem atualizar os outros processos.`
          : "Valor padrão da ALÇA salvo. Não havia pagamentos pendentes para corrigir."
      );
      registrarLog(firestore, db, usuario, valorAlca, pendentes.length);

      window.setTimeout(() => {
        if (document.contains(botao)) definirEstadoBotao(botao, textoOriginal, false);
      }, 1800);
    } catch (error) {
      console.error("Falha ao salvar o valor seguro da ALÇA.", error);
      toast(
        String(error?.code || "").includes("permission-denied")
          ? "Seu usuário não possui permissão para alterar o valor da ALÇA."
          : (error?.message || "Não foi possível salvar o valor da ALÇA."),
        true
      );
      definirEstadoBotao(botao, textoOriginal, false);
    } finally {
      salvando = false;
    }
  }

  // Captura antes do listener antigo do update.js. Somente este formulário é interceptado.
  window.addEventListener("submit", salvarValorAlcaSeguro, true);
})();
