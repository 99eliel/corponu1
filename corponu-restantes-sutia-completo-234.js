(() => {
  "use strict";

  const VERSION = "2026-08-25-restantes-sutia-completo-234";
  const FB = "10.12.5";
  const PROCESSO_COMPLETO = "SUTIÃ COMPLETO";
  const FLAG = "__CORPONU_RESTANTES_SUTIA_COMPLETO_234__";

  const raizGlobal = typeof window !== "undefined" ? window : globalThis;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const numero = (valor, padrao = 0) => {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
    const bruto = texto(valor);
    if (!bruto) return padrao;
    const convertido = Number(bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto);
    return Number.isFinite(convertido) ? convertido : padrao;
  };

  function processoCanonico(valor) {
    const chave = normalizar(valor);
    const aliases = {
      "SUTIA COMPLETO": PROCESSO_COMPLETO,
      "SUTIÃ COMPLETO": PROCESSO_COMPLETO
    };
    return aliases[chave] || texto(valor).toUpperCase();
  }

  function processoDoPagamento(item) {
    return processoCanonico(
      item?.processo || item?.servicoNome || item?.processoMovimentacao || ""
    );
  }

  function ehSutiaCompleto(item) {
    return processoDoPagamento(item) === PROCESSO_COMPLETO;
  }

  function statusImutavel(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    return item?.pago === true ||
      item?.excluido === true ||
      item?.cancelado === true ||
      [
        "PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA",
        "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
      ].includes(status);
  }

  function origemRestante(pagamento, movimento) {
    return pagamento?.pagamentoComplementarRestante === true ||
      pagamento?.origemRestantePagamento === true ||
      normalizar(pagamento?.origem) === "RESTANTE FACCAO" ||
      movimento?.origemRestanteFaccao === true ||
      normalizar(movimento?.origem) === "RESTANTE FACCAO" ||
      movimento?.chegadaComplementar === true;
  }

  function pagamentoJaResolvidoManualmente(item) {
    return item?.pagamentoManualFinanceiro === true &&
      item?.valorTotalDefinidoManualmente === true &&
      numero(item?.total ?? item?.valorTotal, 0) > 0 &&
      item?.valorPendente !== true &&
      item?.valorManualFinanceiroPendente !== true;
  }

  function pagamentoPrecisaReparo(pagamento, movimento = null) {
    if (!pagamento || statusImutavel(pagamento) || !ehSutiaCompleto(pagamento)) return false;
    if (!origemRestante(pagamento, movimento)) return false;
    if (pagamentoJaResolvidoManualmente(pagamento)) return false;

    const status = normalizar(pagamento.statusPagamento || "");
    return pagamento?.valorPendente === true ||
      pagamento?.valorManualFinanceiroPendente === true ||
      pagamento?.pagamentoManualFinanceiro === true ||
      pagamento?.valorTotalDefinidoManualmente !== true ||
      ["SEM VALOR", "AGUARDANDO VALOR"].includes(status) ||
      !(numero(pagamento?.valorUnitario, 0) > 0) ||
      !(numero(pagamento?.total ?? pagamento?.valorTotal, 0) > 0);
  }

  function booleano(...valores) {
    return valores.find(valor => typeof valor === "boolean");
  }

  function conferenciaValida(conferencia) {
    return Boolean(conferencia) &&
      typeof conferencia.fechoPronto === "boolean" &&
      typeof conferencia.pontoLuzPronto === "boolean";
  }

  function conferenciaDaFonte(fonte) {
    if (!fonte) return null;

    if (conferenciaValida(fonte.sutiaCompletoConferencia)) {
      return { ...fonte.sutiaCompletoConferencia };
    }

    const memoria = fonte.memoriaCalculoSutiaCompleto || {};
    const fechoPronto = booleano(
      fonte.fechoPronto,
      fonte.fechoVeioPronto,
      memoria.fechoPronto
    );
    const pontoLuzPronto = booleano(
      fonte.pontoLuzPronto,
      fonte.pontoLuzVeioPronto,
      memoria.pontoLuzPronto
    );

    if (typeof fechoPronto !== "boolean" || typeof pontoLuzPronto !== "boolean") {
      return null;
    }

    const lateralPronta = booleano(
      fonte.lateralPronta,
      fonte.lateralProntaSutiaCompleto,
      memoria.lateralPronta
    );
    const bojoPronto = booleano(
      fonte.bojoPronto,
      fonte.bojoProntoSutiaCompleto,
      memoria.bojoPronto
    );

    let lateralDescontada = booleano(fonte.lateralDescontada);
    let bojoDescontado = booleano(fonte.bojoDescontado);

    if (typeof lateralDescontada !== "boolean" && Object.prototype.hasOwnProperty.call(memoria, "descontoLateral")) {
      lateralDescontada = numero(memoria.descontoLateral, 0) > 0;
    }
    if (typeof bojoDescontado !== "boolean" && Object.prototype.hasOwnProperty.call(memoria, "descontoBojo")) {
      bojoDescontado = numero(memoria.descontoBojo, 0) > 0;
    }

    return {
      lateralPronta: typeof lateralPronta === "boolean" ? lateralPronta : false,
      lateralDescontada: typeof lateralDescontada === "boolean" ? lateralDescontada : undefined,
      lateralFeitaPelaFaccao: booleano(fonte.lateralFeitaPelaFaccao),
      lateralFeitaPelaConfeccao: booleano(fonte.lateralFeitaPelaConfeccao),
      lateralOrigemExecucao: texto(fonte.lateralOrigemExecucao || ""),
      lateralOrigem: texto(fonte.lateralOrigem || ""),
      lateralResponsavel: texto(fonte.lateralResponsavel || ""),
      bojoPronto: typeof bojoPronto === "boolean" ? bojoPronto : false,
      bojoDescontado: typeof bojoDescontado === "boolean" ? bojoDescontado : undefined,
      bojoFeitoPelaFaccao: booleano(fonte.bojoFeitoPelaFaccao),
      bojoFeitoPelaConfeccao: booleano(fonte.bojoFeitoPelaConfeccao),
      bojoOrigemExecucao: texto(fonte.bojoOrigemExecucao || ""),
      bojoOrigem: texto(fonte.bojoOrigem || ""),
      bojoResponsavel: texto(fonte.bojoResponsavel || ""),
      fechoPronto,
      pontoLuzPronto,
      origemRestauracao: "restante_sutia_completo_234",
      versaoRestauracao: VERSION
    };
  }

  function planoReparo({ pagamento, movimento, raiz, pagamentoAnterior }) {
    if (!pagamentoPrecisaReparo(pagamento, movimento)) {
      return { alvo: false, conferencia: null, origem: "" };
    }

    const fontes = [
      [movimento, "movimento_restante"],
      [raiz, "movimento_raiz"],
      [pagamentoAnterior, "pagamento_anterior"]
    ];

    for (const [fonte, origem] of fontes) {
      const conferencia = conferenciaDaFonte(fonte);
      if (conferenciaValida(conferencia)) {
        return { alvo: true, conferencia, origem };
      }
    }

    return { alvo: true, conferencia: null, origem: "sem_conferencia" };
  }

  raizGlobal.__CORPONU_RESTANTES_SUTIA_COMPLETO_234_TEST_API__ = Object.freeze({
    normalizar,
    processoCanonico,
    ehSutiaCompleto,
    statusImutavel,
    origemRestante,
    pagamentoPrecisaReparo,
    conferenciaValida,
    conferenciaDaFonte,
    planoReparo
  });

  if (typeof document === "undefined") return;
  if (raizGlobal[FLAG] === VERSION) return;
  raizGlobal[FLAG] = VERSION;

  let firebasePromise = null;
  let reparando = false;
  let reparoAgendado = 0;
  let ultimoReparo = 0;

  function esperar(ms) {
    return new Promise(resolve => raizGlobal.setTimeout(resolve, ms));
  }

  function avisarConsole(mensagem, erro = null) {
    if (erro) console.warn(`[CorpoNu 234] ${mensagem}`, erro);
    else console.info(`[CorpoNu 234] ${mensagem}`);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      return {
        fs,
        db: fs.getFirestore(app),
        auth: authMod.getAuth(app)
      };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function aguardarUsuario(auth) {
    for (let tentativa = 0; tentativa < 40 && !auth.currentUser; tentativa += 1) {
      await esperar(150);
    }
    return auth.currentUser || null;
  }

  async function aguardarCalculadorOficial() {
    for (let tentativa = 0; tentativa < 50; tentativa += 1) {
      const api = raizGlobal.CorpoNuSutiaCompleto;
      if (typeof api?.recalcularPendentesDaReferencia === "function") return api;
      await esperar(200);
    }
    return null;
  }

  async function consultarPagamentosRestantes(fs, db) {
    const mapa = new Map();
    const consultas = [
      fs.query(fs.collection(db, "entregasPagamento"), fs.where("pagamentoComplementarRestante", "==", true)),
      fs.query(fs.collection(db, "entregasPagamento"), fs.where("origemRestantePagamento", "==", true)),
      fs.query(fs.collection(db, "entregasPagamento"), fs.where("origem", "==", "restante_faccao"))
    ];

    const resultados = await Promise.allSettled(consultas.map(consulta => fs.getDocs(consulta)));
    resultados.forEach(resultado => {
      if (resultado.status !== "fulfilled") return;
      resultado.value.docs.forEach(item => mapa.set(item.id, { id: item.id, ...item.data() }));
    });
    return [...mapa.values()];
  }

  async function carregarMovimento(fs, db, id) {
    if (!id) return null;
    const snap = await fs.getDoc(fs.doc(db, "movimentacoesProducao", id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  async function buscarPagamentoAnteriorComConferencia(fs, db, pagamento, movimento) {
    const numeroOP = texto(pagamento?.numeroOP || movimento?.numeroOP);
    if (!numeroOP) return null;

    const valores = [numeroOP];
    const numerico = Number(numeroOP);
    if (Number.isFinite(numerico)) valores.push(numerico);

    const mapa = new Map();
    for (const valor of valores) {
      try {
        const snap = await fs.getDocs(fs.query(
          fs.collection(db, "entregasPagamento"),
          fs.where("numeroOP", "==", valor)
        ));
        snap.docs.forEach(item => mapa.set(item.id, { id: item.id, ...item.data() }));
      } catch (_) {}
    }

    const candidatos = [...mapa.values()]
      .filter(item => item.id !== pagamento.id && ehSutiaCompleto(item))
      .filter(item => conferenciaValida(conferenciaDaFonte(item)))
      .sort((a, b) => {
        const aOficial = a.calculoSutiaCompletoVersao || a.memoriaCalculoSutiaCompleto ? 1 : 0;
        const bOficial = b.calculoSutiaCompletoVersao || b.memoriaCalculoSutiaCompleto ? 1 : 0;
        return bOficial - aOficial;
      });

    return candidatos[0] || null;
  }

  async function garantirConferenciaNoRestante(fs, db, pagamento) {
    const movimento = await carregarMovimento(fs, db, pagamento.movimentacaoId);
    if (!movimento || !origemRestante(pagamento, movimento)) {
      return { preparado: false, motivo: "movimento_nao_restante", movimento: null };
    }

    if (conferenciaValida(movimento.sutiaCompletoConferencia)) {
      return { preparado: true, motivo: "ja_possui", movimento };
    }

    const raizId = texto(movimento.movimentacaoRaizId || movimento.movimentacaoOrigemId);
    const raiz = raizId && raizId !== movimento.id
      ? await carregarMovimento(fs, db, raizId)
      : null;
    const pagamentoAnterior = conferenciaValida(conferenciaDaFonte(raiz))
      ? null
      : await buscarPagamentoAnteriorComConferencia(fs, db, pagamento, movimento);

    const plano = planoReparo({ pagamento, movimento, raiz, pagamentoAnterior });
    if (!plano.alvo || !conferenciaValida(plano.conferencia)) {
      return { preparado: false, motivo: plano.origem || "sem_conferencia", movimento, raiz };
    }

    const patch = {
      sutiaCompletoConferencia: {
        ...plano.conferencia,
        restauradaDe: plano.origem,
        restauradaEm: fs.serverTimestamp(),
        versaoRestauracao: VERSION
      },
      fechoVeioPronto: plano.conferencia.fechoPronto,
      pontoLuzVeioPronto: plano.conferencia.pontoLuzPronto,
      conferenciaSutiaCompletoRestaurada234: true,
      conferenciaSutiaCompletoRestauradaOrigem234: plano.origem,
      conferenciaSutiaCompletoRestauradaEm234: fs.serverTimestamp(),
      atualizadoEm: fs.serverTimestamp()
    };

    if (!movimento.opId && raiz?.opId) patch.opId = raiz.opId;
    if (typeof plano.conferencia.lateralPronta === "boolean") {
      patch.lateralProntaSutiaCompleto = plano.conferencia.lateralPronta;
    }
    if (typeof plano.conferencia.bojoPronto === "boolean") {
      patch.bojoProntoSutiaCompleto = plano.conferencia.bojoPronto;
    }

    await fs.setDoc(fs.doc(db, "movimentacoesProducao", movimento.id), patch, { merge: true });
    return {
      preparado: true,
      motivo: plano.origem,
      movimento: { ...movimento, ...patch }
    };
  }

  function pagamentoResolvido(item) {
    if (!item || statusImutavel(item)) return false;
    return normalizar(item.statusPagamento) === "PENDENTE" &&
      item.valorPendente !== true &&
      item.valorManualFinanceiroPendente !== true &&
      item.valorTotalDefinidoManualmente === true &&
      numero(item.valorUnitario, 0) > 0 &&
      numero(item.total ?? item.valorTotal, 0) > 0;
  }

  async function marcarPendenciaLegitimaSemConferencia(fs, db, usuario, pagamento, motivo) {
    if (!pagamento?.id || statusImutavel(pagamento)) return;
    await fs.setDoc(fs.doc(db, "entregasPagamento", pagamento.id), {
      origemRestantePagamento: true,
      origemManualPagamentos: false,
      pagamentoManualFinanceiro: false,
      valorManualFinanceiro: false,
      valorManualFinanceiroPendente: false,
      valorTotalDefinidoManualmente: false,
      statusPagamento: "sem_valor",
      valorPendente: true,
      formaValorPagamento: "CALCULO_AUTOMATICO_SUTIA_COMPLETO_AGUARDANDO_CONFERENCIA",
      motivoValorPendente: "restante_sutia_completo_sem_conferencia_origem",
      avisoPagamento: "Aguardando recuperar a conferência de Fecho e Ponto de luz da movimentação original do Sutiã Completo.",
      correcaoRestanteSutiaCompleto234: true,
      correcaoRestanteSutiaCompletoMotivo234: motivo || "sem_conferencia",
      atualizadoPor: usuario?.uid || "",
      atualizadoEm: fs.serverTimestamp(),
      versaoRegistro: VERSION
    }, { merge: true });
  }

  async function registrarLog(fs, db, usuario, resumo) {
    try {
      await fs.addDoc(fs.collection(db, "logsAlteracoes"), {
        acao: "reconciliacao_restantes_sutia_completo_234",
        entidade: "entregasPagamento",
        entidadeId: "restantes-sutia-completo-234",
        detalhes: `${resumo.alvos} alvo(s) | ${resumo.preparados} conferência(s) preparada(s) | ${resumo.resolvidos} resolvido(s) | ${resumo.aguardando} aguardando dado original | ${resumo.preservados} preservado(s)`,
        usuarioId: usuario?.uid || "",
        usuarioEmail: usuario?.email || "",
        criadoEm: fs.serverTimestamp(),
        versao: VERSION
      });
    } catch (error) {
      console.warn("[CorpoNu 234] Reparo concluído, mas o log não foi criado.", error);
    }
  }

  function atualizarTelaDepoisDoReparo() {
    try {
      raizGlobal.dispatchEvent(new CustomEvent("corponu:pendencias-recalculadas", {
        detail: { origem: VERSION }
      }));
    } catch (_) {}

    raizGlobal.setTimeout(() => {
      document.getElementById("btnAtualizarServidor")?.click();
      const central = document.getElementById("modalPendenciasValoresFinanceiro");
      if (central && !central.classList.contains("hidden")) {
        document.getElementById("btnAtualizarConferenciaPagamentoFinal")?.click();
      }
    }, 250);
  }

  async function repararRestantesSutiaCompleto({ forcar = false } = {}) {
    if (reparando) return null;
    if (!forcar && Date.now() - ultimoReparo < 5000) return null;

    reparando = true;
    ultimoReparo = Date.now();
    const resumo = { alvos: 0, preparados: 0, resolvidos: 0, aguardando: 0, preservados: 0 };

    try {
      const { fs, db, auth } = await firebase();
      const usuario = await aguardarUsuario(auth);
      if (!usuario) throw new Error("Usuário ainda não autenticado.");

      const calculador = await aguardarCalculadorOficial();
      if (!calculador) throw new Error("Calculador oficial do Sutiã Completo ainda não carregou.");

      const pagamentos = await consultarPagamentosRestantes(fs, db);
      const preparados = [];

      for (const pagamento of pagamentos) {
        if (statusImutavel(pagamento) || !ehSutiaCompleto(pagamento)) {
          resumo.preservados += 1;
          continue;
        }

        let movimento = null;
        if (pagamento.movimentacaoId) {
          movimento = await carregarMovimento(fs, db, pagamento.movimentacaoId).catch(() => null);
        }
        if (!pagamentoPrecisaReparo(pagamento, movimento)) {
          resumo.preservados += 1;
          continue;
        }

        resumo.alvos += 1;
        const preparacao = await garantirConferenciaNoRestante(fs, db, pagamento);
        if (!preparacao.preparado) {
          resumo.aguardando += 1;
          await marcarPendenciaLegitimaSemConferencia(fs, db, usuario, pagamento, preparacao.motivo);
          continue;
        }

        resumo.preparados += 1;
        preparados.push({ pagamento, referencia: texto(pagamento.referencia || preparacao.movimento?.referencia) });
      }

      const referencias = [...new Set(preparados.map(item => item.referencia).filter(Boolean))];
      for (const referencia of referencias) {
        await calculador.recalcularPendentesDaReferencia(referencia);
      }

      for (const item of preparados) {
        const snap = await fs.getDoc(fs.doc(db, "entregasPagamento", item.pagamento.id));
        const atual = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        if (pagamentoResolvido(atual)) resumo.resolvidos += 1;
        else resumo.aguardando += 1;
      }

      if (resumo.alvos > 0) {
        await registrarLog(fs, db, usuario, resumo);
        atualizarTelaDepoisDoReparo();
      }

      avisarConsole(`Revisão concluída: ${resumo.resolvidos} restante(s) de Sutiã Completo resolvido(s), ${resumo.aguardando} aguardando informação real.`);
      return resumo;
    } catch (error) {
      avisarConsole("Não foi possível concluir a reconciliação agora; será tentado novamente sem alterar pagamentos pagos.", error);
      return null;
    } finally {
      reparando = false;
    }
  }

  function agendarReparo(ms = 900) {
    raizGlobal.clearTimeout(reparoAgendado);
    reparoAgendado = raizGlobal.setTimeout(() => {
      repararRestantesSutiaCompleto({ forcar: true }).catch(() => {});
    }, ms);
  }

  function instalarEventos() {
    document.addEventListener("submit", event => {
      if (event.target?.id !== "formReceberRestantePagamento") return;
      agendarReparo(900);
      raizGlobal.setTimeout(() => repararRestantesSutiaCompleto({ forcar: true }).catch(() => {}), 2400);
    }, false);

    raizGlobal.addEventListener("pageshow", () => agendarReparo(1200));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) agendarReparo(900);
    });
  }

  function iniciar() {
    instalarEventos();
    agendarReparo(1500);
    avisarConsole(`Reconciliação de Restantes do Sutiã Completo ativa: ${VERSION}`);
  }

  raizGlobal.CorpoNuRestantesSutiaCompleto234 = Object.freeze({
    versao: VERSION,
    reparar: () => repararRestantesSutiaCompleto({ forcar: true })
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
