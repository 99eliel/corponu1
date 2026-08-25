(() => {
  "use strict";

  const VERSION = "2026-08-25-restantes-calculo-definitivo-237";
  const FB = "10.12.5";
  const PROCESSO_COMPLETO = "SUTIÃ COMPLETO";
  const FLAG = "__CORPONU_RESTANTES_CALCULO_DEFINITIVO_237__";
  const raiz = typeof window !== "undefined" ? window : globalThis;

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

  const inteiro = valor => Math.max(0, Math.floor(numero(valor, 0)));
  const arred2 = valor => Math.round((numero(valor, 0) + Number.EPSILON) * 100) / 100;

  function referenciaCanonica(valor) {
    const bruto = texto(valor).replace(/\s+/g, "").toUpperCase();
    if (!bruto) return "";
    if (/^\d+$/.test(bruto)) return String(Number(bruto));
    return bruto.replace(/[^A-Z0-9]/g, "");
  }

  function processoCanonico(valor) {
    const chave = normalizar(valor);
    const aliases = {
      "SUTIA COMPLETO": PROCESSO_COMPLETO,
      "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
      "ENCAPAR": "ENCAPAR BOJO",
      "ENCAPAR BOJO": "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      "BOJO": "ENCAPAR BOJO",
      "ALCA": "ALÇA",
      "ALCAS": "ALÇA",
      "LATERAL": "LATERAL",
      "CALCINHA": "CALCINHA COMPLETA",
      "CALCINHA COMPLETA": "CALCINHA COMPLETA",
      "CALCINHA MONTAGEM": "CALCINHA MONTAGEM",
      "INTERLOCK": "INTERLOCK"
    };
    return aliases[chave] || texto(valor).toUpperCase();
  }

  function processoDoItem(item) {
    return processoCanonico(item?.processo || item?.servicoNome || item?.processoMovimentacao || "");
  }

  function ehSutiaCompleto(item) {
    return processoDoItem(item) === PROCESSO_COMPLETO;
  }

  function statusImutavel(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    return item?.pago === true || item?.excluido === true || item?.cancelado === true ||
      ["PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"].includes(status);
  }

  function origemRestante(item) {
    return item?.pagamentoComplementarRestante === true ||
      item?.origemRestantePagamento === true ||
      normalizar(item?.origem) === "RESTANTE FACCAO";
  }

  function precisaReparo(item) {
    if (!item || statusImutavel(item) || !origemRestante(item)) return false;
    const status = normalizar(item.statusPagamento || "");
    return item.valorPendente === true ||
      item.valorManualFinanceiroPendente === true ||
      ["SEM VALOR", "AGUARDANDO VALOR"].includes(status) ||
      numero(item.valorUnitario, 0) <= 0 ||
      numero(item.total ?? item.valorTotal, 0) <= 0;
  }

  function encontrarPreco(item, precos) {
    const ref = referenciaCanonica(item?.referencia || "");
    const processo = processoDoItem(item);
    if (!ref || !processo || processo === PROCESSO_COMPLETO) return null;

    const candidatos = (precos || []).filter(preco =>
      preco && preco.ativo !== false && numero(preco.valor, 0) > 0 &&
      referenciaCanonica(preco.referencia || "") === ref &&
      processoCanonico(preco.processo || preco.servicoNome || "") === processo
    );

    if (!candidatos.length) return null;
    const setor = normalizar(item?.setor || "");
    return candidatos.find(preco => normalizar(preco.setor || "") === setor) || candidatos[0];
  }

  function primeiroBooleano(...valores) {
    return valores.find(valor => typeof valor === "boolean");
  }

  function conferenciaValida(conferencia) {
    return Boolean(conferencia) &&
      typeof conferencia.fechoPronto === "boolean" &&
      typeof conferencia.pontoLuzPronto === "boolean";
  }

  function conferenciaDaFonte(fonte) {
    if (!fonte) return null;
    if (conferenciaValida(fonte.sutiaCompletoConferencia)) return { ...fonte.sutiaCompletoConferencia };

    const memoria = fonte.memoriaCalculoSutiaCompleto || {};
    const fechoPronto = primeiroBooleano(fonte.fechoPronto, fonte.fechoVeioPronto, memoria.fechoPronto);
    const pontoLuzPronto = primeiroBooleano(fonte.pontoLuzPronto, fonte.pontoLuzVeioPronto, memoria.pontoLuzPronto);
    if (typeof fechoPronto !== "boolean" || typeof pontoLuzPronto !== "boolean") return null;

    const lateralPronta = primeiroBooleano(fonte.lateralPronta, fonte.lateralProntaSutiaCompleto, memoria.lateralPronta);
    const bojoPronto = primeiroBooleano(fonte.bojoPronto, fonte.bojoProntoSutiaCompleto, memoria.bojoPronto);
    let lateralDescontada = primeiroBooleano(fonte.lateralDescontada);
    let bojoDescontado = primeiroBooleano(fonte.bojoDescontado);
    if (typeof lateralDescontada !== "boolean" && Object.prototype.hasOwnProperty.call(memoria, "descontoLateral")) {
      lateralDescontada = numero(memoria.descontoLateral, 0) > 0;
    }
    if (typeof bojoDescontado !== "boolean" && Object.prototype.hasOwnProperty.call(memoria, "descontoBojo")) {
      bojoDescontado = numero(memoria.descontoBojo, 0) > 0;
    }

    return {
      lateralPronta: typeof lateralPronta === "boolean" ? lateralPronta : false,
      lateralDescontada: typeof lateralDescontada === "boolean" ? lateralDescontada : undefined,
      lateralFeitaPelaFaccao: primeiroBooleano(fonte.lateralFeitaPelaFaccao),
      lateralFeitaPelaConfeccao: primeiroBooleano(fonte.lateralFeitaPelaConfeccao),
      lateralOrigemExecucao: texto(fonte.lateralOrigemExecucao || ""),
      lateralOrigem: texto(fonte.lateralOrigem || ""),
      lateralResponsavel: texto(fonte.lateralResponsavel || ""),
      bojoPronto: typeof bojoPronto === "boolean" ? bojoPronto : false,
      bojoDescontado: typeof bojoDescontado === "boolean" ? bojoDescontado : undefined,
      bojoFeitaPelaFaccao: primeiroBooleano(fonte.bojoFeitaPelaFaccao),
      bojoFeitoPelaFaccao: primeiroBooleano(fonte.bojoFeitoPelaFaccao),
      bojoFeitoPelaConfeccao: primeiroBooleano(fonte.bojoFeitoPelaConfeccao),
      bojoOrigemExecucao: texto(fonte.bojoOrigemExecucao || ""),
      bojoOrigem: texto(fonte.bojoOrigem || ""),
      bojoResponsavel: texto(fonte.bojoResponsavel || ""),
      fechoPronto,
      pontoLuzPronto,
      origemRestauracao: "restante_calculo_237",
      versaoRestauracao: VERSION
    };
  }

  raiz.__CORPONU_RESTANTES_237_TEST_API__ = Object.freeze({
    normalizar,
    referenciaCanonica,
    processoCanonico,
    ehSutiaCompleto,
    precisaReparo,
    encontrarPreco,
    conferenciaValida,
    conferenciaDaFonte
  });

  if (typeof document === "undefined") return;
  if (raiz[FLAG] === VERSION) return;
  raiz[FLAG] = VERSION;

  let firebasePromise = null;
  let precosPromise = null;
  let restanteSelecionadoId = "";
  let reparandoExistentes = false;

  function esperar(ms) {
    return new Promise(resolve => raiz.setTimeout(resolve, ms));
  }

  function avisar(mensagem, tipo = "normal") {
    const toast = document.getElementById("toast");
    if (!toast) {
      console[tipo === "erro" ? "error" : "info"](`[CorpoNu 237] ${mensagem}`);
      return;
    }
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    const fundo = toast.style.background;
    if (tipo === "erro") toast.style.background = "#991b1b";
    clearTimeout(raiz.__corponu237Toast);
    raiz.__corponu237Toast = setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = fundo;
    }, 5500);
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
      return { fs, db: fs.getFirestore(app), auth: authMod.getAuth(app) };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function aguardarUsuario(auth) {
    for (let tentativa = 0; tentativa < 40 && !auth.currentUser; tentativa += 1) await esperar(150);
    return auth.currentUser || null;
  }

  async function carregarPrecos(forcar = false) {
    if (forcar) precosPromise = null;
    if (!precosPromise) {
      precosPromise = (async () => {
        const ctx = await firebase();
        const snap = await ctx.fs.getDocs(ctx.fs.collection(ctx.db, "precosReferencia"));
        return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })).filter(item => item.ativo !== false);
      })();
    }
    return precosPromise;
  }

  async function carregarDocumento(colecao, id) {
    if (!id) return null;
    const ctx = await firebase();
    const snap = await ctx.fs.getDoc(ctx.fs.doc(ctx.db, colecao, String(id)));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  async function buscarPagamentoAnterior(pagamento, movimento) {
    const ctx = await firebase();
    const encontrados = new Map();

    if (pagamento?.opId) {
      try {
        const snap = await ctx.fs.getDocs(ctx.fs.query(
          ctx.fs.collection(ctx.db, "entregasPagamento"),
          ctx.fs.where("opId", "==", pagamento.opId)
        ));
        snap.docs.forEach(item => encontrados.set(item.id, { id: item.id, ...item.data() }));
      } catch (_) {}
    }

    const numeroOP = texto(pagamento?.numeroOP || movimento?.numeroOP);
    if (numeroOP) {
      const valores = [numeroOP];
      const numerico = Number(numeroOP);
      if (Number.isFinite(numerico)) valores.push(numerico);
      for (const valor of valores) {
        try {
          const snap = await ctx.fs.getDocs(ctx.fs.query(
            ctx.fs.collection(ctx.db, "entregasPagamento"),
            ctx.fs.where("numeroOP", "==", valor)
          ));
          snap.docs.forEach(item => encontrados.set(item.id, { id: item.id, ...item.data() }));
        } catch (_) {}
      }
    }

    return [...encontrados.values()]
      .filter(item => item.id !== pagamento.id && ehSutiaCompleto(item))
      .filter(item => conferenciaValida(conferenciaDaFonte(item)))
      .sort((a, b) => {
        const aOficial = a.calculoSutiaCompletoVersao || a.memoriaCalculoSutiaCompleto ? 1 : 0;
        const bOficial = b.calculoSutiaCompletoVersao || b.memoriaCalculoSutiaCompleto ? 1 : 0;
        return bOficial - aOficial;
      })[0] || null;
  }

  async function garantirConferenciaRestante(pagamento) {
    const ctx = await firebase();
    const movimento = await carregarDocumento("movimentacoesProducao", pagamento.movimentacaoId);
    if (!movimento) return { ok: false, motivo: "movimentacao_nao_encontrada" };

    let conferencia = conferenciaDaFonte(movimento);
    let origem = "movimento_restante";
    let raizMov = null;

    const raizId = texto(movimento.movimentacaoRaizId || movimento.movimentacaoOrigemId);
    if (!conferenciaValida(conferencia) && raizId && raizId !== movimento.id) {
      raizMov = await carregarDocumento("movimentacoesProducao", raizId);
      conferencia = conferenciaDaFonte(raizMov);
      origem = "movimento_raiz";
    }

    if (!conferenciaValida(conferencia)) {
      const anterior = await buscarPagamentoAnterior(pagamento, movimento);
      conferencia = conferenciaDaFonte(anterior);
      origem = "pagamento_anterior";
    }

    if (!conferenciaValida(conferencia)) {
      return { ok: false, motivo: "sem_conferencia", movimento };
    }

    const opId = movimento.opId || raizMov?.opId || pagamento.opId || "";
    const patch = {
      sutiaCompletoConferencia: {
        ...conferencia,
        restauradaDe: origem,
        restauradaEm: ctx.fs.serverTimestamp(),
        versaoRestauracao: VERSION
      },
      fechoVeioPronto: conferencia.fechoPronto,
      pontoLuzVeioPronto: conferencia.pontoLuzPronto,
      atualizadoEm: ctx.fs.serverTimestamp(),
      versaoRestanteCalculo: VERSION
    };
    if (opId && !movimento.opId) patch.opId = opId;

    const batch = ctx.fs.writeBatch(ctx.db);
    batch.set(ctx.fs.doc(ctx.db, "movimentacoesProducao", movimento.id), patch, { merge: true });

    const proximoId = texto(movimento.proximoRestanteMovimentacaoId);
    if (proximoId) {
      batch.set(ctx.fs.doc(ctx.db, "movimentacoesProducao", proximoId), {
        ...patch,
        opId: opId || movimento.opId || ""
      }, { merge: true });
    }

    await batch.commit();
    return { ok: true, origem, movimento: { ...movimento, ...patch } };
  }

  async function aguardarCalculadorOficial() {
    for (let tentativa = 0; tentativa < 60; tentativa += 1) {
      const api = raiz.CorpoNuSutiaCompleto;
      if (typeof api?.recalcularPendentesDaReferencia === "function") return api;
      await esperar(200);
    }
    return null;
  }

  async function repararSutiaCompleto(pagamento) {
    const preparado = await garantirConferenciaRestante(pagamento);
    if (!preparado.ok) return { corrigido: false, motivo: preparado.motivo };

    const calculador = await aguardarCalculadorOficial();
    if (!calculador) return { corrigido: false, motivo: "calculador_indisponivel" };

    await calculador.recalcularPendentesDaReferencia(pagamento.referencia || preparado.movimento?.referencia || "");
    const atualizado = await carregarDocumento("entregasPagamento", pagamento.id);
    const corrigido = Boolean(atualizado && atualizado.valorPendente !== true && numero(atualizado.total ?? atualizado.valorTotal, 0) > 0);
    return { corrigido, motivo: corrigido ? "ok" : "ainda_pendente" };
  }

  async function repararGenerico(pagamento, precos) {
    const preco = encontrarPreco(pagamento, precos);
    if (!preco) return { corrigido: false, motivo: "preco_nao_encontrado" };

    const ctx = await firebase();
    const quantidade = inteiro(pagamento.quantidade || pagamento.quantidadeRecebida || 0);
    const valorUnitario = numero(preco.valor, 0);
    const subtotal = arred2(quantidade * valorUnitario);
    const descontoDefeito = Math.max(0, numero(pagamento.descontoDefeito ?? pagamento.defeito, 0));
    const total = arred2(Math.max(subtotal - descontoDefeito, 0));
    if (!quantidade || !valorUnitario || total < 0) return { corrigido: false, motivo: "dados_invalidos" };

    await ctx.fs.setDoc(ctx.fs.doc(ctx.db, "entregasPagamento", pagamento.id), {
      origem: "movimentacao",
      origemRestantePagamento: true,
      origemManualPagamentos: false,
      pagamentoManualFinanceiro: false,
      pagamentoComplementarRestante: true,
      precoReferenciaId: preco.id,
      servicoId: preco.id,
      processo: preco.processo || pagamento.processo || pagamento.processoMovimentacao || "",
      servicoNome: preco.processo || preco.servicoNome || pagamento.servicoNome || pagamento.processo || "",
      setor: preco.setor || pagamento.setor || "",
      valorUnitario,
      subtotal,
      total,
      statusPagamento: "pendente",
      valorPendente: false,
      valorManualFinanceiroPendente: false,
      valorManualFinanceiro: false,
      valorTotalDefinidoManualmente: false,
      valorTotalManual: 0,
      formaValorPagamento: "preco_referencia_processo",
      motivoValorPendente: "",
      avisoPagamento: "",
      observacoes: "Pagamento complementar de restante recalculado automaticamente pela REF + PROCESSO cadastrados.",
      corrigidoRestante237: true,
      corrigidoEm: ctx.fs.serverTimestamp(),
      atualizadoEm: ctx.fs.serverTimestamp(),
      versaoGeracao: VERSION,
      versaoRegistro: VERSION
    }, { merge: true });

    return { corrigido: true, motivo: "ok", total };
  }

  async function repararPagamento(pagamento, precos = null) {
    if (!precisaReparo(pagamento)) return { corrigido: false, motivo: "nao_alvo" };
    if (ehSutiaCompleto(pagamento)) return repararSutiaCompleto(pagamento);
    return repararGenerico(pagamento, precos || await carregarPrecos());
  }

  async function acompanharPagamento(restanteId) {
    if (!restanteId) return;
    const pagamentoId = `${restanteId}-pagamento`.slice(0, 190);

    for (let tentativa = 0; tentativa < 40; tentativa += 1) {
      if (tentativa > 0) await esperar(250);
      const pagamento = await carregarDocumento("entregasPagamento", pagamentoId).catch(() => null);
      if (!pagamento) continue;
      if (!precisaReparo(pagamento)) return;

      const resultado = await repararPagamento(pagamento).catch(error => {
        console.warn("[CorpoNu 237] Pagamento recém-criado não foi recalculado.", error);
        return { corrigido: false, motivo: "erro" };
      });

      if (resultado.corrigido) {
        avisar(ehSutiaCompleto(pagamento)
          ? "Restante de Sutiã Completo calculado automaticamente pela regra oficial."
          : "Restante recalculado automaticamente pela REF + PROCESSO.");
      }
      return;
    }
  }

  async function repararPendentesExistentes() {
    if (reparandoExistentes) return;
    reparandoExistentes = true;
    try {
      const chaveSessao = `corponu_restantes_237_reparo_${VERSION}`;
      try {
        if (sessionStorage.getItem(chaveSessao) === "1") return;
        sessionStorage.setItem(chaveSessao, "1");
      } catch (_) {}

      const ctx = await firebase();
      const usuario = await aguardarUsuario(ctx.auth);
      if (!usuario) return;

      const snap = await ctx.fs.getDocs(ctx.fs.query(
        ctx.fs.collection(ctx.db, "entregasPagamento"),
        ctx.fs.where("pagamentoComplementarRestante", "==", true),
        ctx.fs.limit(180)
      ));

      const alvos = snap.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .filter(precisaReparo);
      if (!alvos.length) return;

      const precos = await carregarPrecos(true);
      let corrigidos = 0;
      let aguardando = 0;

      for (const pagamento of alvos) {
        try {
          const resultado = await repararPagamento(pagamento, precos);
          if (resultado.corrigido) corrigidos += 1;
          else aguardando += 1;
        } catch (error) {
          aguardando += 1;
          console.warn("[CorpoNu 237] Restante pendente não recalculado.", pagamento.id, error);
        }
      }

      if (corrigidos) {
        console.info(`[CorpoNu 237] ${corrigidos} pagamento(s) de Restantes corrigido(s); ${aguardando} ainda aguardando informação/preço.`);
        setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 250);
      }
    } catch (error) {
      console.warn("[CorpoNu 237] Reparo seguro dos Restantes não pôde rodar agora.", error);
    } finally {
      reparandoExistentes = false;
    }
  }

  function instalarEventos() {
    window.addEventListener("click", event => {
      const abrir = event.target?.closest?.("[data-receber-restante-pagamento]");
      if (abrir) restanteSelecionadoId = texto(abrir.dataset.receberRestantePagamento || "");
    }, true);

    window.addEventListener("submit", event => {
      if (event.target?.id !== "formReceberRestantePagamento") return;
      const id = restanteSelecionadoId;
      if (id) setTimeout(() => acompanharPagamento(id), 120);
    }, true);
  }

  function iniciar() {
    instalarEventos();
    setTimeout(repararPendentesExistentes, 2600);
    console.info(`[CorpoNu] Cálculo definitivo dos Restantes ativo: ${VERSION}`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
