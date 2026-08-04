(() => {
  "use strict";

  const VERSION = "2026-08-04-alca-chegada-direta-123";
  const FIREBASE_VERSION = "10.12.5";
  const PRECO_ID = "valor-padrao-alca";
  const MULTIPLICADOR_PADRAO = 2;

  if (window.__CORPONU_ALCA_CHEGADA_DIRETA_123__ === VERSION) return;
  window.__CORPONU_ALCA_CHEGADA_DIRETA_123__ = VERSION;

  let contextoPromise = null;
  const formulariosEmProcessamento = new WeakSet();

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
    const bruto = texto(valor).replace(/R\$/gi, "").replace(/\s+/g, "");
    if (!bruto) return 0;
    const ajustado = bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto;
    const resultado = Number(ajustado.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(resultado) ? resultado : 0;
  }

  const arredondar2 = valor => Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;
  const arredondar4 = valor => Math.round((Number(valor || 0) + Number.EPSILON) * 10000) / 10000;

  function docIdSeguro(valor) {
    return texto(valor)
      .replaceAll("/", "-")
      .replaceAll("\\", "-")
      .replaceAll("#", "-")
      .replaceAll("?", "-");
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function ehAlca(valor) {
    const processo = normalizar(valor);
    return processo === "ALCA" || processo === "ALCAS";
  }

  function formularioAbertoEhAlca() {
    const informacao = normalizar(document.getElementById("chegadaMovimentacaoInfo")?.textContent || "");
    return /(^| )ALCA(S)?( |$)/.test(informacao);
  }

  function mostrarToast(mensagem, erro = false) {
    const elemento = document.getElementById("toast");
    if (!elemento) return;
    elemento.textContent = mensagem;
    elemento.classList.remove("hidden");
    elemento.style.background = erro ? "#991b1b" : "#166534";
    window.clearTimeout(window.__corponuAlca123Toast);
    window.__corponuAlca123Toast = window.setTimeout(() => {
      elemento.classList.add("hidden");
      elemento.style.removeProperty("background");
    }, erro ? 7500 : 5500);
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModulo, authModulo, firestore]) => {
      if (!appModulo.getApps().length) throw new Error("Firebase ainda não inicializado.");
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

  async function obterUsuario(auth) {
    for (let tentativa = 0; tentativa < 30 && !auth.currentUser; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    return auth.currentUser;
  }

  async function obterPrecoAlca(firestore, db) {
    const snapshot = await firestore.getDoc(
      firestore.doc(db, "precosReferencia", PRECO_ID)
    );
    if (!snapshot.exists()) throw new Error("O valor global da ALÇA ainda não está cadastrado.");

    const dados = snapshot.data() || {};
    const valorAlca = numero(dados.valor ?? dados.valorUnitario ?? dados.preco);
    const multiplicador = Math.max(1, numero(dados.multiplicadorQuantidade) || MULTIPLICADOR_PADRAO);

    if (!(valorAlca > 0)) throw new Error("O valor global da ALÇA precisa ser maior que zero.");

    return { id: snapshot.id, valorAlca, multiplicador };
  }

  function statusFinal(dados) {
    const status = normalizar(dados?.statusPagamento || dados?.status || "");
    return dados?.pago === true || dados?.quitado === true || [
      "PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA",
      "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
    ].includes(status);
  }

  async function escolherDocumentoPagamento(firestore, db, movimentacaoId, precoId) {
    const consulta = firestore.query(
      firestore.collection(db, "entregasPagamento"),
      firestore.where("movimentacaoId", "==", movimentacaoId)
    );
    const snapshot = await firestore.getDocs(consulta);
    const documentos = snapshot.docs.map(documento => ({
      id: documento.id,
      ref: documento.ref,
      dados: documento.data() || {}
    }));

    const pago = documentos.find(item => {
      const status = normalizar(item.dados.statusPagamento || "");
      return item.dados.pago === true || item.dados.quitado === true || ["PAGO", "PAGA", "QUITADO", "QUITADA"].includes(status);
    });
    if (pago) throw new Error("Esta movimentação já possui um pagamento pago. A chegada não foi repetida.");

    const ativos = documentos.filter(item => !statusFinal(item.dados));
    const idCorreto = docIdSeguro(`mov-${movimentacaoId}-${precoId}`);
    const idSemValor = docIdSeguro(`mov-${movimentacaoId}-sem-valor`);
    const existente = ativos.find(item => item.id === idCorreto)
      || ativos.find(item => item.id === idSemValor)
      || ativos[0];

    if (existente) return existente;

    return {
      id: idCorreto,
      ref: firestore.doc(db, "entregasPagamento", idCorreto),
      dados: {}
    };
  }

  async function registrarLogSeguro(firestore, db, usuario, movimentacao, quantidade, quantidadeAlcas, total) {
    try {
      await firestore.addDoc(firestore.collection(db, "logsAlteracoes"), {
        acao: "chegada_alca_pagamento_direto",
        tipoAlvo: "movimentacaoProducao",
        alvoId: movimentacao.id,
        detalhes: `OP ${movimentacao.numeroOP || "-"} | ALÇA | ${quantidade} sutiãs | ${quantidadeAlcas} alças | ${formatarMoeda(total)}`,
        usuarioUid: usuario.uid,
        usuarioNome: "",
        usuarioEmail: usuario.email || "",
        usuarioTipo: "",
        criadoEm: firestore.serverTimestamp()
      });
    } catch (error) {
      console.warn("Não foi possível registrar o log da chegada de ALÇA.", error);
    }
  }

  async function registrarChegadaAlcaDireta() {
    const movimentacaoId = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    const dataChegada = texto(document.getElementById("chegadaData")?.value);
    const falta = Math.max(0, numero(document.getElementById("chegadaFalta")?.value));
    const descontoDefeito = Math.max(0, numero(document.getElementById("chegadaDefeito")?.value));

    if (!movimentacaoId) throw new Error("Movimentação não encontrada.");
    if (!dataChegada) throw new Error("Informe a data de chegada/retorno.");

    const { firestore, db, auth } = await contexto();
    const usuario = await obterUsuario(auth);
    const movimentacaoRef = firestore.doc(db, "movimentacoesProducao", movimentacaoId);
    const movimentacaoSnapshot = await firestore.getDoc(movimentacaoRef);

    if (!movimentacaoSnapshot.exists()) throw new Error("Movimentação não encontrada no Firebase.");

    const movimentacao = { id: movimentacaoSnapshot.id, ...movimentacaoSnapshot.data() };
    if (!ehAlca(movimentacao.processo) || movimentacao.tipoDestino !== "faccao") {
      throw new Error("Esta rotina é exclusiva para a chegada de ALÇA em facção.");
    }

    const quantidadeEnviada = Math.max(0, numero(movimentacao.quantidadeEnviada));
    if (falta > quantidadeEnviada) throw new Error("A falta não pode ser maior que a quantidade enviada.");

    const quantidade = Math.max(quantidadeEnviada - falta, 0);
    const preco = await obterPrecoAlca(firestore, db);
    const pagamento = await escolherDocumentoPagamento(firestore, db, movimentacaoId, preco.id);
    const quantidadeAlcas = quantidade * preco.multiplicador;
    const valorUnitarioSutia = arredondar4(preco.valorAlca * preco.multiplicador);
    const subtotal = arredondar2(quantidade * valorUnitarioSutia);
    const total = arredondar2(Math.max(subtotal - descontoDefeito, 0));
    const pagamentoReenvio = Boolean(
      movimentacao.movimentacaoOrigemId || movimentacao.reenvio || movimentacao.origem === "movimentacao"
    );

    const lote = firestore.writeBatch(db);
    lote.set(movimentacaoRef, {
      dataChegada,
      falta,
      descontoDefeito,
      defeito: descontoDefeito,
      quantidadeRecebida: quantidade,
      status: "retornou",
      atualizadoPor: usuario.uid,
      atualizadoEm: firestore.serverTimestamp()
    }, { merge: true });

    lote.set(pagamento.ref, {
      origem: "movimentacao",
      movimentacaoId,
      movimentacaoOrigemId: movimentacao.movimentacaoOrigemId || "",
      pagamentoReenvio,
      opId: movimentacao.opId || "",
      numeroOP: movimentacao.numeroOP || "",
      referencia: movimentacao.referencia || "",
      cor: movimentacao.cor || "",
      produtoNome: movimentacao.produtoNome || "",
      faccao: movimentacao.destino || "",
      precoReferenciaId: preco.id,
      processo: "ALÇA",
      processoMovimentacao: movimentacao.processo || "ALÇA",
      servicoId: preco.id,
      servicoNome: "ALÇA",
      setor: "alca",
      setorLabel: "Alça",
      dataEntrega: dataChegada,
      quantidade,
      quantidadeAlcas,
      multiplicadorAlcas: preco.multiplicador,
      falta,
      descontoDefeito,
      subtotal,
      valorUnitarioAlca: arredondar4(preco.valorAlca),
      valorUnitario: valorUnitarioSutia,
      total,
      statusPagamento: "pendente",
      valorPendente: false,
      valorManualFinanceiroPendente: false,
      avisoPagamento: "",
      motivoValorPendente: "",
      formaValorPagamento: "valor_global_alca",
      calculoAlca: "quantidade_sutias_x_2_x_valor_alca",
      observacoes: pagamentoReenvio
        ? "Gerado por retorno de reenvio de ALÇA. Pagamento separado da etapa anterior."
        : "Gerado diretamente na chegada de ALÇA, com duas alças por sutiã.",
      atualizadoPor: usuario.uid,
      atualizadoEm: firestore.serverTimestamp(),
      criadoPor: pagamento.dados.criadoPor || usuario.uid,
      criadoEm: pagamento.dados.criadoEm || firestore.serverTimestamp(),
      versaoCalculoAlca: VERSION
    }, { merge: true });

    await lote.commit();
    await registrarLogSeguro(firestore, db, usuario, movimentacao, quantidade, quantidadeAlcas, total);

    document.getElementById("modalChegadaMovimentacao")?.classList.add("hidden");
    document.getElementById("formChegadaMovimentacao")?.reset();
    mostrarToast(`Chegada registrada e pagamento de ALÇA gerado: ${formatarMoeda(total)}.`);
  }

  function interceptarSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.id !== "formChegadaMovimentacao" || !formularioAbertoEhAlca()) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (formulariosEmProcessamento.has(form)) return;
    formulariosEmProcessamento.add(form);

    const botao = form.querySelector('button[type="submit"], input[type="submit"]');
    const textoOriginal = botao?.textContent || "";
    if (botao) {
      botao.disabled = true;
      if (botao.tagName === "BUTTON") botao.textContent = "Registrando ALÇA...";
    }

    registrarChegadaAlcaDireta()
      .catch(error => {
        console.error("Erro ao registrar a chegada direta de ALÇA.", error);
        mostrarToast(error?.message || "Não foi possível registrar a chegada de ALÇA.", true);
      })
      .finally(() => {
        formulariosEmProcessamento.delete(form);
        if (botao) {
          botao.disabled = false;
          if (botao.tagName === "BUTTON") botao.textContent = textoOriginal;
        }
      });
  }

  window.addEventListener("submit", interceptarSubmit, true);
})();
