(() => {
  "use strict";

  const VERSION = "2026-08-03-chegada-manual-sutia-pagamento-automatico-112";
  const FIREBASE_VERSION = "10.12.5";
  const FORM_ID = "formChegadaManualFaccao";
  const PAINEL_ID = "sutCompletoComponentesChegadaManual";
  const PROCESSO_COMPLETO = "SUTIÃ COMPLETO";
  const PROCESSO_LATERAL = "LATERAL";
  const PROCESSO_BOJO = "ENCAPAR BOJO";
  const CONFIG_DOC = "sutia-completo-pagamento";

  if (window.__CORPONU_CHEGADA_MANUAL_SUTIA_AUTO_112__ === VERSION) return;
  window.__CORPONU_CHEGADA_MANUAL_SUTIA_AUTO_112__ = VERSION;

  let firebasePromise = null;
  let configuracaoCache = null;
  let configuracaoCacheEm = 0;
  const precosCache = new Map();
  const processando = new Set();

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  const referenciaNormalizada = valor => texto(valor).replace(/\s+/g, "").toUpperCase();

  const numero = (valor, padrao = 0) => {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
    const bruto = texto(valor);
    if (!bruto) return padrao;
    const convertido = Number(bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(convertido) ? convertido : padrao;
  };
  const arred4 = valor => Math.round((numero(valor) + Number.EPSILON) * 10000) / 10000;
  const arred2 = valor => Math.round((numero(valor) + Number.EPSILON) * 100) / 100;
  const moeda = valor => numero(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const moeda4 = valor => `R$ ${numero(valor).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;

  function hojeISO() {
    const agora = new Date();
    return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function processoCanonico(valor) {
    return normalizar(valor) === "SUTIA COMPLETO" ? PROCESSO_COMPLETO : texto(valor).toUpperCase();
  }

  function idSeguro(valor) {
    return texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9_-]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 220) || `registro-${Date.now()}`;
  }

  function avisar(mensagem, tipo = "erro") {
    const toast = document.getElementById("toast");
    if (!toast) {
      window.alert(mensagem);
      return;
    }
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = tipo === "ok" ? "#166534" : tipo === "info" ? "#0f172a" : "#991b1b";
    window.clearTimeout(window.__corponuChegadaManualAuto112Toast);
    window.__corponuChegadaManualAuto112Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 7000);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("FIREBASE_NAO_INICIALIZADO");
      const app = appMod.getApp();
      return { fs, db: fs.getFirestore(app), auth: authMod.getAuth(app) };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  function bloquearFormulario(form, bloqueado, mensagem = "Calculando e salvando...") {
    if (!(form instanceof HTMLFormElement)) return;
    form.querySelectorAll('button[type="submit"],input[type="submit"]').forEach(botao => {
      if (bloqueado) {
        if (!botao.dataset.cn112Texto) botao.dataset.cn112Texto = botao.textContent || botao.value || "Salvar chegada manual";
        botao.disabled = true;
        if (botao.tagName === "INPUT") botao.value = mensagem;
        else botao.textContent = mensagem;
      } else {
        botao.disabled = false;
        if (botao.dataset.cn112Texto) {
          if (botao.tagName === "INPUT") botao.value = botao.dataset.cn112Texto;
          else botao.textContent = botao.dataset.cn112Texto;
          delete botao.dataset.cn112Texto;
        }
      }
    });
  }

  function estadoComponente(nome) {
    const titulo = nome === "lateral" ? "Lateral" : "Bojo";
    const select = document.getElementById(`sc51m${titulo}Situacao`);
    const responsavel = texto(document.getElementById(`sc51m${titulo}Responsavel`)?.value);
    if (select instanceof HTMLSelectElement) {
      const valor = texto(select.value).toLowerCase();
      if (valor === "sim" || valor === "nao") {
        return {
          conhecido: true,
          pronto: valor === "sim",
          origem: "Informado na chegada manual do Sutiã Completo",
          responsavel,
          informadoAgora: true
        };
      }
    }

    const card = document.querySelector(`#${PAINEL_ID} [data-componente="${nome}"]`);
    if (!(card instanceof HTMLElement)) return { conhecido: false, pronto: false, origem: "", responsavel: "", informadoAgora: false };
    const pill = card.querySelector(".sc51-pill");
    const pronto = pill?.classList.contains("sim") === true;
    const naoPronto = pill?.classList.contains("nao") === true;
    const detalhe = texto(card.querySelector("small")?.textContent);
    const partes = detalhe.split("•").map(item => item.trim()).filter(Boolean);
    return {
      conhecido: pronto || naoPronto,
      pronto,
      origem: partes[0] || "Informação registrada na OP",
      responsavel: partes.length > 1 ? partes[partes.length - 1] : "",
      informadoAgora: false
    };
  }

  function respostaBinaria(id) {
    const select = document.getElementById(id);
    if (!(select instanceof HTMLSelectElement)) return null;
    if (select.value === "sim") return true;
    if (select.value === "nao") return false;
    return null;
  }

  function lerConferencia() {
    const lateral = estadoComponente("lateral");
    const bojo = estadoComponente("bojo");
    const fechoPronto = respostaBinaria("sc51mFechoResposta107");
    const pontoLuzPronto = respostaBinaria("sc51mPontoLuzResposta107");

    if (!lateral.conhecido) throw new Error("LATERAL_NAO_INFORMADA");
    if (!bojo.conhecido) throw new Error("BOJO_NAO_INFORMADO");
    if (lateral.pronto && lateral.informadoAgora && !lateral.responsavel) throw new Error("LATERAL_SEM_RESPONSAVEL");
    if (bojo.pronto && bojo.informadoAgora && !bojo.responsavel) throw new Error("BOJO_SEM_RESPONSAVEL");
    if (fechoPronto === null) throw new Error("FECHO_NAO_INFORMADO");
    if (pontoLuzPronto === null) throw new Error("PONTO_NAO_INFORMADO");

    return { lateral, bojo, fechoPronto, pontoLuzPronto };
  }

  async function buscarOP(numeroOP) {
    const { fs, db } = await firebase();
    const opTexto = texto(numeroOP);
    if (!opTexto) return null;

    try {
      const direto = await fs.getDoc(fs.doc(db, "ordensProducao", opTexto));
      if (direto.exists()) return { id: direto.id, ...direto.data() };
    } catch (_) {}

    const valores = [opTexto];
    const numerico = Number(opTexto);
    if (Number.isFinite(numerico)) valores.push(numerico);
    for (const valor of valores) {
      for (const campo of ["numeroOP", "numeroOPExterno", "op"]) {
        try {
          const snap = await fs.getDocs(fs.query(
            fs.collection(db, "ordensProducao"),
            fs.where(campo, "==", valor),
            fs.limit(1)
          ));
          if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
        } catch (_) {}
      }
    }
    return null;
  }

  async function carregarConfiguracao() {
    if (configuracaoCache && Date.now() - configuracaoCacheEm < 120000) return configuracaoCache;
    const { fs, db } = await firebase();
    const snap = await fs.getDoc(fs.doc(db, "configuracoes", CONFIG_DOC));
    const dados = snap.exists() ? snap.data() : {};
    configuracaoCache = {
      valorBaseGeral: Math.max(0, numero(dados.valorBaseGeral, 5.5)),
      referenciaEspecial: referenciaNormalizada(dados.referenciaEspecial || "912"),
      valorBaseReferenciaEspecial: Math.max(0, numero(dados.valorBaseReferenciaEspecial, 6.5)),
      descontoFechoNaoFeito: Math.max(0, numero(dados.descontoFechoNaoFeito, 0.25)),
      descontoPontoLuzNaoFeito: Math.max(0, numero(dados.descontoPontoLuzNaoFeito, 0.15))
    };
    configuracaoCacheEm = Date.now();
    return configuracaoCache;
  }

  async function carregarPrecosReferencia(referencia) {
    const chave = referenciaNormalizada(referencia);
    const cache = precosCache.get(chave);
    if (cache && Date.now() - cache.em < 120000) return cache.itens;

    const { fs, db } = await firebase();
    const valores = [texto(referencia)];
    const numerico = Number(referencia);
    if (Number.isFinite(numerico)) valores.push(numerico);
    const mapa = new Map();

    for (const valor of [...new Set(valores.map(item => `${typeof item}:${item}`))]) {
      const separador = valor.indexOf(":");
      const tipo = valor.slice(0, separador);
      const bruto = valor.slice(separador + 1);
      const consultaValor = tipo === "number" ? Number(bruto) : bruto;
      try {
        const snap = await fs.getDocs(fs.query(
          fs.collection(db, "precosReferencia"),
          fs.where("referencia", "==", consultaValor)
        ));
        snap.docs.forEach(item => mapa.set(item.id, { id: item.id, ...item.data() }));
      } catch (_) {}
    }

    const itens = [...mapa.values()].filter(item => item.ativo !== false);
    precosCache.set(chave, { em: Date.now(), itens });
    return itens;
  }

  function precoDoProcesso(itens, processo) {
    const chave = normalizar(processo);
    const candidatos = itens.filter(item => normalizar(item.processo || item.servicoNome) === chave);
    const escolhido = candidatos.find(item => numero(item.valor) > 0) || candidatos[0];
    return escolhido ? { id: escolhido.id, valor: Math.max(0, numero(escolhido.valor)) } : null;
  }

  async function calcular(referencia, dados) {
    const config = await carregarConfiguracao();
    const especial = referenciaNormalizada(referencia) === config.referenciaEspecial;
    if (especial) {
      return {
        especial: true,
        base: arred4(config.valorBaseReferenciaEspecial),
        descontos: { lateral: 0, bojo: 0, fecho: 0, pontoLuz: 0 },
        valorUnitario: arred4(config.valorBaseReferenciaEspecial),
        faltantes: [],
        precoLateralId: "",
        precoBojoId: ""
      };
    }

    const precos = await carregarPrecosReferencia(referencia);
    const precoLateral = dados.lateral.pronto ? precoDoProcesso(precos, PROCESSO_LATERAL) : null;
    const precoBojo = dados.bojo.pronto ? precoDoProcesso(precos, PROCESSO_BOJO) : null;
    const faltantes = [];
    if (dados.lateral.pronto && !precoLateral) faltantes.push(`${PROCESSO_LATERAL} da referência ${referencia}`);
    if (dados.bojo.pronto && !precoBojo) faltantes.push(`${PROCESSO_BOJO} da referência ${referencia}`);

    const descontos = {
      lateral: dados.lateral.pronto && precoLateral ? arred4(precoLateral.valor) : 0,
      bojo: dados.bojo.pronto && precoBojo ? arred4(precoBojo.valor) : 0,
      fecho: dados.fechoPronto ? 0 : arred4(config.descontoFechoNaoFeito),
      pontoLuz: dados.pontoLuzPronto ? 0 : arred4(config.descontoPontoLuzNaoFeito)
    };

    return {
      especial: false,
      base: arred4(config.valorBaseGeral),
      descontos,
      valorUnitario: arred4(Math.max(config.valorBaseGeral - descontos.lateral - descontos.bojo - descontos.fecho - descontos.pontoLuz, 0)),
      faltantes,
      precoLateralId: precoLateral?.id || "",
      precoBojoId: precoBojo?.id || ""
    };
  }

  async function buscarMovimentacoes(numeroOP, opId) {
    const { fs, db } = await firebase();
    const mapa = new Map();
    const valores = [texto(numeroOP)];
    const numerico = Number(numeroOP);
    if (Number.isFinite(numerico)) valores.push(numerico);

    for (const valor of valores) {
      try {
        const snap = await fs.getDocs(fs.query(
          fs.collection(db, "movimentacoesProducao"),
          fs.where("numeroOP", "==", valor),
          fs.limit(50)
        ));
        snap.docs.forEach(item => mapa.set(item.id, { id: item.id, ...item.data() }));
      } catch (_) {}
    }
    if (opId) {
      try {
        const snap = await fs.getDocs(fs.query(
          fs.collection(db, "movimentacoesProducao"),
          fs.where("opId", "==", opId),
          fs.limit(50)
        ));
        snap.docs.forEach(item => mapa.set(item.id, { id: item.id, ...item.data() }));
      } catch (_) {}
    }
    return [...mapa.values()];
  }

  function movimentoAtivo(mov) {
    const status = normalizar(mov?.status || "");
    return mov?.excluido !== true && mov?.cancelado !== true && !["CANCELADO", "EXCLUIDO"].includes(status);
  }

  async function pagamentosDaMovimentacao(movimentacaoId) {
    const { fs, db } = await firebase();
    const snap = await fs.getDocs(fs.query(
      fs.collection(db, "entregasPagamento"),
      fs.where("movimentacaoId", "==", movimentacaoId),
      fs.limit(20)
    ));
    return snap.docs.map(item => ({ id: item.id, ...item.data() }))
      .filter(item => item.excluido !== true && item.cancelado !== true);
  }

  function pagamentoPago(pagamento) {
    return ["PAGO", "PAGA", "QUITADO", "QUITADA"].includes(normalizar(pagamento?.statusPagamento || pagamento?.status));
  }

  function pagamentoSemValor(pagamento) {
    const status = normalizar(pagamento?.statusPagamento || pagamento?.status);
    return pagamento?.valorPendente === true || pagamento?.valorManualFinanceiroPendente === true ||
      ["SEM VALOR", "SEM_VALOR"].includes(status) ||
      (!pagamentoPago(pagamento) && numero(pagamento?.total) <= 0 && numero(pagamento?.valorUnitario) <= 0);
  }

  function montarComponente(info, total, usuario, agora) {
    return {
      informado: true,
      pronto: info.pronto,
      status: info.pronto ? "completo" : "nao_pronto",
      quantidadePronta: info.pronto ? total : 0,
      quantidadeTotal: total,
      origem: "chegada_manual_sutia_completo",
      origemLabel: "Informado na chegada manual do Sutiã Completo",
      responsavel: info.responsavel || "",
      atualizadoPor: usuario?.uid || "",
      atualizadoEm: agora,
      versao: VERSION
    };
  }

  async function salvar(form) {
    const numeroOP = texto(document.getElementById("chegadaManualOP")?.value);
    const processo = processoCanonico(document.getElementById("chegadaManualProcesso")?.value);
    const faccao = texto(document.getElementById("chegadaManualFaccao")?.value).toUpperCase();
    const falta = Math.max(0, numero(document.getElementById("chegadaManualFalta")?.value));
    const descontoDefeito = Math.max(0, numero(document.getElementById("chegadaManualDesconto")?.value));
    const dataChegada = texto(document.getElementById("chegadaManualDataChegada")?.value) || hojeISO();
    const chave = `${numeroOP}|${faccao}|${dataChegada}`;

    if (processo !== PROCESSO_COMPLETO || !numeroOP || !faccao || processando.has(chave)) return;
    processando.add(chave);
    bloquearFormulario(form, true);

    try {
      const dados = lerConferencia();
      const op = await buscarOP(numeroOP);
      if (!op) throw new Error("OP_NAO_ENCONTRADA");

      const referencia = referenciaNormalizada(
        document.getElementById("chegadaManualRef")?.value || op.referencia || op.ref
      );
      const cor = texto(document.getElementById("chegadaManualCor")?.value || op.cor).toUpperCase();
      const quantidadeEnviada = Math.max(0, numero(
        document.getElementById("chegadaManualQuantidade")?.value || op.quantidade || op.quantidadeTotal
      ));
      if (!referencia || !cor || quantidadeEnviada <= 0) throw new Error("OP_INCOMPLETA");
      if (falta > quantidadeEnviada) throw new Error("FALTA_INVALIDA");
      const quantidade = Math.max(quantidadeEnviada - falta, 0);
      if (quantidade <= 0) throw new Error("QUANTIDADE_ZERADA");

      const memoria = await calcular(referencia, dados);
      const movimentos = await buscarMovimentacoes(numeroOP, op.id);
      const correspondentes = movimentos
        .filter(mov =>
          movimentoAtivo(mov) &&
          processoCanonico(mov.processo || mov.servicoNome) === PROCESSO_COMPLETO &&
          normalizar(mov.destino || mov.faccao) === normalizar(faccao) &&
          (mov.origemManual === true || normalizar(mov.origem).includes("CHEGADA MANUAL"))
        )
        .sort((a, b) => numero(b.criadoEm?.seconds || b.atualizadoEm?.seconds) - numero(a.criadoEm?.seconds || a.atualizadoEm?.seconds));

      let movimentoExistente = correspondentes[0] || null;
      let pagamentosExistentes = movimentoExistente ? await pagamentosDaMovimentacao(movimentoExistente.id) : [];
      if (pagamentosExistentes.some(pagamentoPago)) throw new Error("PAGAMENTO_JA_PAGO");

      const pagamentosCalculados = pagamentosExistentes.filter(item => !pagamentoSemValor(item));
      if (movimentoExistente && pagamentosCalculados.length) throw new Error("CHEGADA_JA_CALCULADA");
      if (pagamentosExistentes.length > 1) throw new Error("PAGAMENTOS_MULTIPLOS");

      const movimentoId = movimentoExistente?.id || idSeguro(`manual-chegada-sutia-${numeroOP}-${faccao}-${dataChegada}`);
      const pagamentoExistente = pagamentosExistentes[0] || null;
      const pagamentoId = pagamentoExistente?.id || idSeguro(`mov-${movimentoId}-sut-completo-auto-112`);
      const { fs, db, auth } = await firebase();
      const usuario = auth.currentUser;
      if (!usuario) throw new Error("USUARIO_NAO_AUTENTICADO");
      const agora = fs.serverTimestamp();
      const subtotal = arred2(quantidade * memoria.valorUnitario);
      const total = arred2(Math.max(subtotal - descontoDefeito, 0));
      const faltandoValores = memoria.faltantes.length > 0;

      const conferencia = {
        lateralPronta: dados.lateral.pronto,
        lateralOrigem: dados.lateral.origem || "",
        lateralResponsavel: dados.lateral.responsavel || "",
        bojoPronto: dados.bojo.pronto,
        bojoOrigem: dados.bojo.origem || "",
        bojoResponsavel: dados.bojo.responsavel || "",
        fechoPronto: dados.fechoPronto,
        pontoLuzPronto: dados.pontoLuzPronto,
        valorBase: arred4(memoria.base),
        descontoLateral: arred4(memoria.descontos.lateral),
        descontoBojo: arred4(memoria.descontos.bojo),
        descontoFecho: arred4(memoria.descontos.fecho),
        descontoPontoLuz: arred4(memoria.descontos.pontoLuz),
        valorUnitarioCalculado: arred4(memoria.valorUnitario),
        quantidade,
        faltantes: memoria.faltantes,
        regraReferenciaEspecialIntegral: memoria.especial,
        confirmadoPor: usuario.uid,
        confirmadoEm: agora,
        versao: VERSION
      };

      const movimentoPatch = {
        id: movimentoId,
        origem: movimentoExistente?.origem || "chegada_manual_faccao",
        origemManual: true,
        tipoDestino: "faccao",
        tipoDestinoLabel: "Facção",
        opId: op.id,
        numeroOP,
        referencia,
        cor,
        produtoNome: op.produtoNome || op.nomeProduto || op.nome || "",
        setor: op.tipo || op.setor || "sutia",
        destino: faccao,
        processo: PROCESSO_COMPLETO,
        quantidadeEnviada,
        quantidadeRecebida: quantidade,
        dataEnvio: movimentoExistente?.dataEnvio || op.dataEnvioAtualMigracao || op.dataOriginalLigia || "",
        dataEnvioNaoInformada: !(movimentoExistente?.dataEnvio || op.dataEnvioAtualMigracao || op.dataOriginalLigia),
        dataChegada,
        falta,
        descontoDefeito,
        defeito: descontoDefeito,
        status: "retornou",
        sutiaCompletoConferencia: conferencia,
        fechoVeioPronto: dados.fechoPronto,
        pontoLuzVeioPronto: dados.pontoLuzPronto,
        lateralProntaSutiaCompleto: dados.lateral.pronto,
        bojoProntoSutiaCompleto: dados.bojo.pronto,
        componentesSutiaInformadosNaChegada: true,
        chegadaSutiaCompletoFluxoManualAutomatico: true,
        chegadaSutiaCompletoVersao: VERSION,
        observacoes: `Chegada manual automática do Sutiã Completo. Recebido: ${quantidade}; falta: ${falta}; desconto por defeito: ${moeda(descontoDefeito)}.`,
        atualizadoPor: usuario.uid,
        atualizadoEm: agora,
        ...(movimentoExistente ? {} : { criadoPor: usuario.uid, criadoEm: agora })
      };

      const pagamentoPatch = {
        origem: "movimentacao",
        movimentacaoId: movimentoId,
        movimentacaoOrigemId: movimentoExistente?.movimentacaoOrigemId || "",
        pagamentoReenvio: false,
        opId: op.id,
        numeroOP,
        referencia,
        cor,
        produtoNome: op.produtoNome || op.nomeProduto || op.nome || "",
        faccao,
        precoReferenciaId: memoria.especial ? "" : `calculo-sutia-completo-${referencia}`,
        processo: PROCESSO_COMPLETO,
        processoMovimentacao: PROCESSO_COMPLETO,
        servicoId: "calculo-automatico-sutia-completo",
        servicoNome: PROCESSO_COMPLETO,
        setor: op.tipo || op.setor || "sutia",
        setorLabel: "Sutiã",
        dataEntrega: dataChegada,
        quantidade,
        falta,
        descontoDefeito: memoria.especial ? 0 : descontoDefeito,
        subtotal: faltandoValores ? 0 : subtotal,
        valorUnitario: faltandoValores ? 0 : arred4(memoria.valorUnitario),
        total: faltandoValores ? 0 : total,
        valorTotal: faltandoValores ? 0 : total,
        statusPagamento: faltandoValores ? "sem_valor" : "pendente",
        valorPendente: faltandoValores,
        valorManualFinanceiroPendente: false,
        motivoValorPendente: faltandoValores ? `Aguardando ${memoria.faltantes.join(" e ")}.` : "",
        avisoPagamento: faltandoValores ? `Aguardando ${memoria.faltantes.join(" e ")}.` : "",
        valorTotalDefinidoManualmente: !faltandoValores,
        valorManualFinanceiro: false,
        formaValorPagamento: memoria.especial ? "VALOR_INTEGRAL_REFERENCIA_ESPECIAL" : "CALCULO_AUTOMATICO_SUTIA_COMPLETO",
        valorBaseSutiaCompleto: arred4(memoria.base),
        descontoSutiaCompletoLateral: arred4(memoria.descontos.lateral),
        descontoSutiaCompletoBojo: arred4(memoria.descontos.bojo),
        descontoSutiaCompletoFecho: arred4(memoria.descontos.fecho),
        descontoSutiaCompletoPontoLuz: arred4(memoria.descontos.pontoLuz),
        precoLateralReferenciaId: memoria.precoLateralId,
        precoBojoReferenciaId: memoria.precoBojoId,
        lateralPronta: dados.lateral.pronto,
        lateralOrigem: dados.lateral.origem || "",
        lateralResponsavel: dados.lateral.responsavel || "",
        bojoPronto: dados.bojo.pronto,
        bojoOrigem: dados.bojo.origem || "",
        bojoResponsavel: dados.bojo.responsavel || "",
        fechoPronto: dados.fechoPronto,
        pontoLuzPronto: dados.pontoLuzPronto,
        valorUnitarioCalculadoSutiaCompleto: arred4(memoria.valorUnitario),
        subtotalCalculadoSutiaCompleto: subtotal,
        totalCalculadoSutiaCompleto: total,
        regraReferenciaEspecialIntegral: memoria.especial,
        memoriaCalculoSutiaCompleto: {
          referencia,
          valorBase: arred4(memoria.base),
          lateralPronta: dados.lateral.pronto,
          descontoLateral: arred4(memoria.descontos.lateral),
          bojoPronto: dados.bojo.pronto,
          descontoBojo: arred4(memoria.descontos.bojo),
          fechoPronto: dados.fechoPronto,
          descontoFecho: arred4(memoria.descontos.fecho),
          pontoLuzPronto: dados.pontoLuzPronto,
          descontoPontoLuz: arred4(memoria.descontos.pontoLuz),
          valorUnitarioFinal: arred4(memoria.valorUnitario),
          quantidade,
          descontoDefeito: memoria.especial ? 0 : descontoDefeito,
          totalFinal: total,
          faltantes: memoria.faltantes,
          regra: memoria.especial ? "REFERENCIA_ESPECIAL_VALOR_INTEGRAL" : "CHEGADA_MANUAL_AUTOMATICA",
          versao: VERSION
        },
        observacoes: faltandoValores
          ? `Cálculo automático aguardando valor: ${memoria.faltantes.join(" | ")}.`
          : `Cálculo automático do Sutiã Completo: base ${moeda4(memoria.base)}, valor final ${moeda4(memoria.valorUnitario)} por peça.`,
        calculoSutiaCompletoVersao: VERSION,
        calculoSutiaCompletoAtualizadoPor: usuario.uid,
        calculoSutiaCompletoAtualizadoEm: agora,
        atualizadoPor: usuario.uid,
        atualizadoEm: agora,
        ...(pagamentoExistente ? {} : { criadoPor: usuario.uid, criadoEm: agora })
      };

      const movRef = fs.doc(db, "movimentacoesProducao", movimentoId);
      const pagamentoRef = fs.doc(db, "entregasPagamento", pagamentoId);
      const opRef = fs.doc(db, "ordensProducao", op.id);
      const logRef = fs.doc(fs.collection(db, "logsAlteracoes"));

      await fs.runTransaction(db, async transacao => {
        const [movSnap, pagSnap] = await Promise.all([
          transacao.get(movRef),
          transacao.get(pagamentoRef)
        ]);
        const pagServidor = pagSnap.exists() ? pagSnap.data() : null;
        if (pagServidor && pagamentoPago(pagServidor)) throw new Error("PAGAMENTO_JA_PAGO");
        if (movSnap.exists() && !movimentoExistente && movimentoAtivo(movSnap.data())) throw new Error("CHEGADA_DUPLICADA");

        transacao.set(movRef, movimentoPatch, { merge: true });
        transacao.set(pagamentoRef, pagamentoPatch, { merge: true });
        transacao.update(opRef, {
          "componentesConsolidados.lateral": montarComponente(dados.lateral, Math.max(quantidadeEnviada, numero(op.quantidade || op.quantidadeTotal)), usuario, agora),
          "componentesConsolidados.bojo": montarComponente(dados.bojo, Math.max(quantidadeEnviada, numero(op.quantidade || op.quantidadeTotal)), usuario, agora),
          componentesConsolidadosAtualizadoPor: usuario.uid,
          componentesConsolidadosAtualizadoEm: agora,
          atualizadoPor: usuario.uid,
          atualizadoEm: agora
        });
        transacao.set(logRef, {
          acao: pagamentoExistente ? "pagamento_manual_sutia_completo_corrigido" : "chegada_manual_sutia_completo_automatica",
          entidade: "movimentacaoProducao",
          entidadeId: movimentoId,
          tipoAlvo: "movimentacaoProducao",
          alvoId: movimentoId,
          detalhes: `OP ${numeroOP} | ${faccao} | ${quantidade} peças | lateral ${dados.lateral.pronto ? "sim" : "não"} | bojo ${dados.bojo.pronto ? "sim" : "não"} | fecho ${dados.fechoPronto ? "sim" : "não"} | ponto de luz ${dados.pontoLuzPronto ? "sim" : "não"} | total ${moeda(total)}`,
          usuarioId: usuario.uid,
          usuarioUid: usuario.uid,
          usuarioEmail: usuario.email || "",
          criadoPor: usuario.uid,
          criadoEm: agora,
          versao: VERSION
        });
      });

      document.getElementById("modalChegadaManualFaccao")?.classList.add("hidden");
      form.reset();
      document.getElementById(PAINEL_ID)?.remove();
      window.setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 120);
      avisar(faltandoValores
        ? `Chegada salva, mas o pagamento aguarda ${memoria.faltantes.join(" e ")}.`
        : pagamentoExistente
          ? `Pagamento pendente corrigido automaticamente: ${moeda(total)}.`
          : `Chegada manual e pagamento gerados automaticamente: ${moeda(total)}.`, faltandoValores ? "info" : "ok");
    } catch (error) {
      console.error("Falha na chegada manual automática do Sutiã Completo.", error);
      const mensagens = {
        OP_NAO_ENCONTRADA: "A OP não foi encontrada. Confira o número e tente novamente.",
        OP_INCOMPLETA: "A OP não possui referência, cor ou quantidade válida.",
        LATERAL_NAO_INFORMADA: "A situação da lateral ainda não foi carregada. Feche e abra a chegada manual novamente.",
        BOJO_NAO_INFORMADO: "A situação do bojo ainda não foi carregada. Feche e abra a chegada manual novamente.",
        LATERAL_SEM_RESPONSAVEL: "Informe quem fez a lateral.",
        BOJO_SEM_RESPONSAVEL: "Informe quem fez o bojo.",
        FECHO_NAO_INFORMADO: "Informe se a peça veio com fecho.",
        PONTO_NAO_INFORMADO: "Informe se a peça veio com ponto de luz.",
        FALTA_INVALIDA: "A quantidade faltante não pode ser maior que a quantidade da OP.",
        QUANTIDADE_ZERADA: "Nenhuma peça foi recebida.",
        USUARIO_NAO_AUTENTICADO: "Sua sessão expirou. Entre novamente no sistema.",
        PAGAMENTO_JA_PAGO: "Este pagamento já foi confirmado como pago e não pode ser alterado.",
        CHEGADA_JA_CALCULADA: "Esta chegada manual já possui pagamento calculado. Use a aba Pagamentos para conferir.",
        PAGAMENTOS_MULTIPLOS: "Foram encontrados vários pagamentos para a mesma movimentação. Nenhuma alteração foi feita.",
        CHEGADA_DUPLICADA: "Esta chegada manual já existe. Nenhum registro duplicado foi criado."
      };
      avisar(mensagens[error?.message] || "Não foi possível concluir a chegada manual. Nenhuma gravação parcial foi feita.");
    } finally {
      bloquearFormulario(form, false);
      processando.delete(chave);
    }
  }

  function interceptar(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== FORM_ID) return;
    const processo = processoCanonico(document.getElementById("chegadaManualProcesso")?.value);
    const painel = document.getElementById(PAINEL_ID);
    if (processo !== PROCESSO_COMPLETO || !(painel instanceof HTMLElement)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void salvar(form);
  }

  document.addEventListener("submit", interceptar, true);

  window.CorpoNuChegadaManualSutiaAutomatico = {
    versao: VERSION,
    ativo: true,
    limparCaches() {
      configuracaoCache = null;
      configuracaoCacheEm = 0;
      precosCache.clear();
    }
  };
})();
