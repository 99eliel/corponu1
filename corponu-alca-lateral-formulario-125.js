(() => {
  "use strict";

  const VERSION = "2026-08-04-alca-lateral-formulario-125";
  const FIREBASE_VERSION = "10.12.5";
  const FORM_ID = "formChegadaCorte";
  const PRECO_ID = "valor-padrao-alca";
  const VALOR_ALCA = 0.05;
  const ALCAS_POR_SUTIA = 2;
  const VALOR_POR_SUTIA = VALOR_ALCA * ALCAS_POR_SUTIA;

  if (window.__CORPONU_ALCA_LATERAL_FORMULARIO_125__ === VERSION) return;
  window.__CORPONU_ALCA_LATERAL_FORMULARIO_125__ = VERSION;

  let contextoPromise = null;
  let processando = false;

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

  function ehAlca(valor) {
    const processo = normalizar(valor);
    return processo === "ALCA" || processo === "ALCAS";
  }

  function slug(valor) {
    return normalizar(valor)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";
  }

  function statusFinal(dados) {
    const status = normalizar(dados?.statusPagamento || dados?.statusFinanceiro || dados?.status || "");
    return dados?.pago === true || dados?.quitado === true || dados?.cancelado === true ||
      dados?.excluido === true || [
        "PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA",
        "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
      ].includes(status);
  }

  function pagamentoConfirmado(dados) {
    const status = normalizar(dados?.statusPagamento || "");
    return dados?.pago === true || dados?.quitado === true || [
      "PAGO", "PAGA", "QUITADO", "QUITADA"
    ].includes(status);
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

  async function aguardarUsuario(auth) {
    for (let tentativa = 0; tentativa < 30 && !auth.currentUser; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    return auth.currentUser;
  }

  function toast(mensagem, erro = false) {
    const principal = document.getElementById("toast");
    if (principal) {
      principal.textContent = mensagem;
      principal.classList.remove("hidden");
      principal.style.background = erro ? "#991b1b" : "#166534";
      window.clearTimeout(window.__corponuAlcaLateral125Toast);
      window.__corponuAlcaLateral125Toast = window.setTimeout(() => {
        principal.classList.add("hidden");
        principal.style.removeProperty("background");
      }, erro ? 8500 : 6500);
      return;
    }

    const aviso = document.createElement("div");
    aviso.textContent = mensagem;
    aviso.style.cssText = [
      "position:fixed", "right:18px", "bottom:18px", "z-index:1000020",
      "max-width:min(520px,calc(100vw - 32px))", "padding:14px 16px",
      "border-radius:13px", "box-shadow:0 18px 48px rgba(15,23,42,.28)",
      `background:${erro ? "#991b1b" : "#166534"}`, "color:#fff",
      "font:800 13px/1.45 Arial,sans-serif"
    ].join(";");
    document.body.appendChild(aviso);
    window.setTimeout(() => aviso.remove(), erro ? 8500 : 6500);
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function formularioVisualmenteAlca() {
    const preview = normalizar(document.getElementById("chegadaCortePreview")?.textContent || "");
    return /(^| )ALCA(S)?( |$)/.test(preview);
  }

  async function escolherPagamento(firestore, db, movimentacaoId) {
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

    const pago = documentos.find(item => pagamentoConfirmado(item.dados));
    if (pago) {
      throw new Error("Esta chegada já possui um pagamento confirmado e não pode ser alterada.");
    }

    const idPadrao = `corte-${slug(movimentacaoId)}`;
    const existentePadrao = documentos.find(item => item.id === idPadrao && !statusFinal(item.dados));
    if (existentePadrao) return existentePadrao;

    const existenteAberto = documentos.find(item => !statusFinal(item.dados));
    if (existenteAberto) return existenteAberto;

    return {
      id: idPadrao,
      ref: firestore.doc(db, "entregasPagamento", idPadrao),
      dados: {}
    };
  }

  async function registrarLog(firestore, db, usuario, movimento, quantidade, total) {
    try {
      await firestore.addDoc(firestore.collection(db, "logsAlteracoes"), {
        acao: "alca_lateral_chegada_pagamento_direto",
        entidade: "movimentacaoProducao",
        entidadeId: movimento.id,
        tipoAlvo: "movimentacaoProducao",
        alvoId: movimento.id,
        detalhes: `OP ${movimento.numeroOP || "-"} | ALÇA | ${quantidade} sutiãs | ${quantidade * ALCAS_POR_SUTIA} alças | ${formatarMoeda(total)}`,
        usuarioId: usuario.uid,
        usuarioUid: usuario.uid,
        usuarioEmail: usuario.email || "",
        criadoPor: usuario.uid,
        criadoEm: firestore.serverTimestamp(),
        versao: VERSION
      });
    } catch (error) {
      console.warn("O pagamento foi salvo, mas o log complementar não foi criado.", error);
    }
  }

  async function salvarChegadaAlcaLateral(event, form) {
    const movimentacaoId = texto(document.getElementById("chegadaCorteMovId")?.value);
    const dataChegada = texto(document.getElementById("chegadaCorteData")?.value);
    const quantidadeRecebida = Math.max(0, numero(document.getElementById("chegadaCorteRecebida")?.value));
    const falta = Math.max(0, numero(document.getElementById("chegadaCorteFalta")?.value));
    const descontoDefeito = Math.max(0, numero(document.getElementById("chegadaCorteDefeito")?.value));
    const observacao = texto(document.getElementById("chegadaCorteObs")?.value) || "Sem observações";

    if (!movimentacaoId) throw new Error("Movimentação não encontrada.");
    if (!dataChegada) throw new Error("Informe a data da chegada.");

    const { firestore, db, auth } = await contexto();
    const usuario = await aguardarUsuario(auth);
    const movimentacaoRef = firestore.doc(db, "movimentacoesProducao", movimentacaoId);
    const movimentacaoSnapshot = await firestore.getDoc(movimentacaoRef);

    if (!movimentacaoSnapshot.exists()) throw new Error("A movimentação não existe mais no Firebase.");

    const movimento = { id: movimentacaoSnapshot.id, ...movimentacaoSnapshot.data() };
    if (!ehAlca(movimento.processo)) {
      throw new Error("Esta correção é exclusiva para o processo ALÇA.");
    }

    const quantidadeEnviada = Math.max(0, numero(movimento.quantidadeEnviada));
    if (quantidadeRecebida > quantidadeEnviada) {
      throw new Error("A quantidade recebida não pode ser maior que a enviada.");
    }
    if (quantidadeRecebida + falta !== quantidadeEnviada) {
      throw new Error("Quantidade recebida + falta precisa ser igual à quantidade enviada.");
    }

    const pagamento = await escolherPagamento(firestore, db, movimentacaoId);
    const quantidadeAlcas = quantidadeRecebida * ALCAS_POR_SUTIA;
    const subtotal = arredondar2(quantidadeRecebida * VALOR_POR_SUTIA);
    const total = arredondar2(Math.max(subtotal - descontoDefeito, 0));

    const confirmar = window.confirm(
      `Confirmar chegada da ALÇA?\n` +
      `OP ${movimento.numeroOP || "-"}\n` +
      `Recebido: ${quantidadeRecebida}\n` +
      `Cálculo: ${quantidadeRecebida} × 2 × R$ 0,05\n` +
      `Total: ${formatarMoeda(total)}`
    );
    if (!confirmar) return { cancelado: true };

    const agora = firestore.serverTimestamp();
    const lote = firestore.writeBatch(db);

    lote.set(movimentacaoRef, {
      dataChegada,
      quantidadeRecebida,
      falta,
      descontoDefeito,
      defeito: descontoDefeito,
      observacoesChegada: observacao,
      status: "retornou",
      atualizadoPor: usuario.uid,
      atualizadoEm: agora,
      versaoAlcaLateral: VERSION
    }, { merge: true });

    lote.set(firestore.doc(db, "precosReferencia", PRECO_ID), {
      referencia: "TODAS",
      processo: "ALÇA",
      setor: "alca",
      setorLabel: "Alça",
      valor: arredondar4(VALOR_ALCA),
      valorUnitario: arredondar4(VALOR_ALCA),
      preco: arredondar4(VALOR_ALCA),
      ativo: true,
      tipoValor: "padrao_global_alca",
      valorPadraoGlobalAlca: true,
      multiplicadorQuantidade: ALCAS_POR_SUTIA,
      atualizadoPor: usuario.uid,
      atualizadoEm: agora,
      versaoValorAlca: VERSION
    }, { merge: true });

    lote.set(pagamento.ref, {
      origem: "movimentacao_corte",
      area: movimento.area || "corte",
      areaLabel: "Lateral e Alça",
      movimentacaoId,
      opId: movimento.opId || "",
      numeroOP: movimento.numeroOP || "",
      referencia: movimento.referencia || "",
      cor: movimento.cor || "",
      produtoNome: movimento.produtoNome || "",
      faccao: movimento.destino || "",
      processo: "ALÇA",
      processoMovimentacao: movimento.processo || "ALÇA",
      processoCorteId: movimento.processoCorteId || "",
      servicoNome: "ALÇA",
      precoReferenciaId: PRECO_ID,
      servicoId: PRECO_ID,
      setor: "alca",
      setorLabel: "Alça",
      dataEntrega: dataChegada,
      quantidade: quantidadeRecebida,
      quantidadeAlcas,
      multiplicadorAlcas: ALCAS_POR_SUTIA,
      falta,
      descontoDefeito,
      subtotal,
      valorUnitarioAlca: arredondar4(VALOR_ALCA),
      valorUnitario: arredondar4(VALOR_POR_SUTIA),
      total,
      statusPagamento: "pendente",
      valorPendente: false,
      valorManualFinanceiroPendente: false,
      formaValorPagamento: "valor_global_alca",
      avisoPagamento: "",
      motivoValorPendente: "",
      observacoes: "Gerado diretamente pela chegada da área Lateral e Alça: duas alças por sutiã.",
      calculoAlca: "quantidade_recebida_x_2_x_0_05",
      criadoPor: pagamento.dados.criadoPor || usuario.uid,
      criadoEm: pagamento.dados.criadoEm || agora,
      atualizadoPor: usuario.uid,
      atualizadoEm: agora,
      versaoAlcaLateral: VERSION
    }, { merge: true });

    await lote.commit();
    await registrarLog(firestore, db, usuario, movimento, quantidadeRecebida, total);

    document.getElementById("modalChegadaCorte")?.classList.add("hidden");
    form.reset();
    toast(`Chegada registrada e pagamento de ALÇA gerado: ${formatarMoeda(total)}.`);

    window.setTimeout(() => {
      const atualizar = document.getElementById("btnCorteAtualizar");
      if (atualizar instanceof HTMLButtonElement && !atualizar.disabled) atualizar.click();
    }, 120);

    return { cancelado: false, total };
  }

  function interceptarSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== FORM_ID) return;
    if (!formularioVisualmenteAlca()) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (processando) return;
    processando = true;

    const botao = event.submitter instanceof HTMLButtonElement
      ? event.submitter
      : form.querySelector('button[type="submit"]');
    const textoOriginal = botao?.textContent || "Salvar chegada";

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Salvando ALÇA...";
    }

    salvarChegadaAlcaLateral(event, form)
      .catch(error => {
        console.error("Erro ao salvar a chegada de ALÇA na área Lateral e Alça.", error);
        toast(error?.message || "Não foi possível salvar a chegada de ALÇA.", true);
      })
      .finally(() => {
        processando = false;
        if (botao && document.contains(botao)) {
          botao.disabled = false;
          botao.textContent = textoOriginal;
        }
      });
  }

  window.addEventListener("submit", interceptarSubmit, true);
})();
