(() => {
  "use strict";

  const VERSION = "2026-08-03-correcao-definitiva-chegada-sutia-110";
  const FIREBASE_VERSION = "10.12.5";
  const FORM_ID = "formChegadaMovimentacao";
  const MODAL_ID = "modalChegadaMovimentacao";
  const PAINEL_ID = "sutCompletoComponentesChegada";
  const PROCESSO_COMPLETO = "SUTIÃ COMPLETO";
  const PROCESSO_LATERAL = "LATERAL";
  const PROCESSO_BOJO = "ENCAPAR BOJO";
  const CONFIG_DOC = "sutia-completo-pagamento";
  const CACHE_MS = 120_000;

  if (window.__CORPONU_CHEGADA_SUTIA_DEFINITIVA_110__ === VERSION) return;
  window.__CORPONU_CHEGADA_SUTIA_DEFINITIVA_110__ = VERSION;

  let firebasePromise = null;
  let configCache = { expiraEm: 0, valor: null };
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
  const normalizarReferencia = valor => texto(valor).replace(/\s+/g, "").toUpperCase();

  const numero = (valor, padrao = 0) => {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
    const bruto = texto(valor);
    if (!bruto) return padrao;
    const convertido = Number(bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(convertido) ? convertido : padrao;
  };

  const arred4 = valor => Math.round((numero(valor) + Number.EPSILON) * 10_000) / 10_000;
  const arred2 = valor => Math.round((numero(valor) + Number.EPSILON) * 100) / 100;
  const moeda2 = valor => numero(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const moeda4 = valor => `R$ ${numero(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  })}`;

  function processoCanonico(valor) {
    const chave = normalizar(valor);
    if (chave === "SUTIA COMPLETO") return PROCESSO_COMPLETO;
    if (chave === "LATERAL" || chave === "CORTE") return PROCESSO_LATERAL;
    if (["ENCAPAR BOJO", "ENCAPAR BOJOS", "BOJO"].includes(chave)) return PROCESSO_BOJO;
    return texto(valor).toUpperCase();
  }

  function docIdSeguro(valor) {
    return texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
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
    window.clearTimeout(window.__corponuChegadaSutia110Toast);
    window.__corponuChegadaSutia110Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 6500);
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

  function respostaBinaria(id) {
    const select = document.getElementById(id);
    if (!(select instanceof HTMLSelectElement)) return null;
    const valor = texto(select.value).toLowerCase();
    if (valor === "sim") return true;
    if (valor === "nao") return false;
    return null;
  }

  function lerComponente(nome) {
    const titulo = nome === "lateral" ? "Lateral" : "Bojo";
    const select = document.getElementById(`sc51${titulo}Situacao`);
    const responsavelInput = document.getElementById(`sc51${titulo}Responsavel`);

    if (select instanceof HTMLSelectElement) {
      const valor = texto(select.value).toLowerCase();
      if (!["sim", "nao"].includes(valor)) return null;
      return {
        conhecido: true,
        pronto: valor === "sim",
        responsavel: texto(responsavelInput?.value),
        origem: "Informado na chegada do Sutiã Completo",
        informadoAgora: true
      };
    }

    const painel = document.getElementById(PAINEL_ID);
    const card = painel?.querySelector(`[data-componente="${nome}"]`);
    if (!(card instanceof HTMLElement)) return null;

    const pillSim = card.querySelector(".sc51-pill.sim");
    const pillNao = card.querySelector(".sc51-pill.nao");
    if (!pillSim && !pillNao) return null;

    const detalhe = texto(card.querySelector("small")?.textContent);
    const partes = detalhe.split("•").map(item => item.trim()).filter(Boolean);
    return {
      conhecido: true,
      pronto: Boolean(pillSim),
      origem: partes[0] || "Informação registrada na OP",
      responsavel: partes.length > 1 ? partes[partes.length - 1] : "",
      informadoAgora: false
    };
  }

  function bloquearForm(form, bloqueado) {
    if (!(form instanceof HTMLFormElement)) return;
    form.querySelectorAll('button[type="submit"],input[type="submit"]').forEach(botao => {
      if (bloqueado) {
        if (!botao.dataset.cn110Texto) botao.dataset.cn110Texto = botao.textContent || botao.value || "Confirmar chegada";
        botao.disabled = true;
        if (botao.tagName === "INPUT") botao.value = "Salvando...";
        else botao.textContent = "Salvando...";
      } else {
        const original = botao.dataset.cn110Texto;
        botao.disabled = false;
        if (original) {
          if (botao.tagName === "INPUT") botao.value = original;
          else botao.textContent = original;
          delete botao.dataset.cn110Texto;
        }
      }
    });
  }

  async function carregarConfig() {
    if (configCache.valor && configCache.expiraEm > Date.now()) return configCache.valor;
    const { fs, db } = await firebase();
    const snap = await fs.getDoc(fs.doc(db, "configuracoes", CONFIG_DOC));
    const dados = snap.exists() ? snap.data() : {};
    const valor = {
      valorBaseGeral: Math.max(0, numero(dados.valorBaseGeral, 5.5)),
      referenciaEspecial: normalizarReferencia(dados.referenciaEspecial || "912"),
      valorBaseReferenciaEspecial: Math.max(0, numero(dados.valorBaseReferenciaEspecial, 6.5)),
      descontoFechoNaoFeito: Math.max(0, numero(dados.descontoFechoNaoFeito, 0.25)),
      descontoPontoLuzNaoFeito: Math.max(0, numero(dados.descontoPontoLuzNaoFeito, 0.15))
    };
    configCache = { expiraEm: Date.now() + CACHE_MS, valor };
    return valor;
  }

  async function carregarPrecosReferencia(referencia) {
    const chave = normalizarReferencia(referencia);
    const cache = precosCache.get(chave);
    if (cache && cache.expiraEm > Date.now()) return cache.itens;

    const { fs, db } = await firebase();
    const variantes = [texto(referencia)];
    const numerica = Number(texto(referencia));
    if (Number.isFinite(numerica)) variantes.push(numerica);

    const mapa = new Map();
    for (const variante of variantes.filter((item, indice, lista) =>
      item !== "" && lista.findIndex(outro => `${typeof outro}:${outro}` === `${typeof item}:${item}`) === indice
    )) {
      try {
        const snap = await fs.getDocs(fs.query(
          fs.collection(db, "precosReferencia"),
          fs.where("referencia", "==", variante)
        ));
        snap.docs.forEach(docSnap => mapa.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
      } catch (error) {
        console.warn("Consulta de valor por referência indisponível.", error);
      }
    }

    if (!mapa.size) {
      const snap = await fs.getDocs(fs.collection(db, "precosReferencia"));
      snap.docs.forEach(docSnap => {
        const item = { id: docSnap.id, ...docSnap.data() };
        if (normalizarReferencia(item.referencia) === chave) mapa.set(item.id, item);
      });
    }

    const itens = [...mapa.values()].filter(item => item.ativo !== false);
    precosCache.set(chave, { expiraEm: Date.now() + CACHE_MS, itens });
    return itens;
  }

  function buscarPreco(itens, processo) {
    const chave = normalizar(processo);
    const candidatos = (itens || []).filter(item =>
      normalizar(item.processo || item.servicoNome) === chave
    );
    const escolhido = candidatos.find(item => numero(item.valor ?? item.valorUnitario ?? item.preco) > 0) || candidatos[0];
    if (!escolhido) return null;
    return {
      id: escolhido.id,
      valor: Math.max(0, numero(escolhido.valor ?? escolhido.valorUnitario ?? escolhido.preco))
    };
  }

  async function buscarOP(mov) {
    const { fs, db } = await firebase();
    if (mov.opId) {
      const snap = await fs.getDoc(fs.doc(db, "ordensProducao", texto(mov.opId)));
      if (snap.exists()) return { id: snap.id, ...snap.data() };
    }

    const numeroOP = texto(mov.numeroOP);
    if (!numeroOP) return null;
    const variantes = [numeroOP];
    const numerica = Number(numeroOP);
    if (Number.isFinite(numerica)) variantes.push(numerica);

    for (const campo of ["numeroOP", "numeroOPExterno"]) {
      for (const valor of variantes) {
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

  async function localizarPagamento(movimentacaoId) {
    const { fs, db } = await firebase();
    const snap = await fs.getDocs(fs.query(
      fs.collection(db, "entregasPagamento"),
      fs.where("movimentacaoId", "==", movimentacaoId),
      fs.limit(20)
    ));
    const itens = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    const ativos = itens.filter(item => {
      const status = normalizar(item.statusPagamento || item.status || "PENDENTE");
      return item.excluido !== true && item.cancelado !== true && ![
        "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
      ].includes(status);
    });
    const pago = ativos.find(item => ["PAGO", "PAGA", "QUITADO", "QUITADA"].includes(
      normalizar(item.statusPagamento || item.status)
    ));
    if (pago) throw new Error("PAGAMENTO_JA_PAGO");

    const deterministico = docIdSeguro(`mov-${movimentacaoId}-sut-completo-107`);
    return ativos.find(item => item.id === deterministico) || ativos[0] || { id: deterministico, novo: true };
  }

  function montarConferencia({ lateral, bojo, fechoPronto, pontoLuzPronto, memoria, usuario, quantidade, agora }) {
    return {
      lateralPronta: lateral.pronto,
      lateralOrigem: lateral.origem || "",
      lateralResponsavel: lateral.responsavel || "",
      bojoPronto: bojo.pronto,
      bojoOrigem: bojo.origem || "",
      bojoResponsavel: bojo.responsavel || "",
      fechoPronto,
      pontoLuzPronto,
      valorBase: arred4(memoria.base),
      descontoLateral: arred4(memoria.descontos.lateral),
      descontoBojo: arred4(memoria.descontos.bojo),
      descontoFecho: arred4(memoria.descontos.fecho),
      descontoPontoLuz: arred4(memoria.descontos.pontoLuz),
      valorUnitarioCalculado: arred4(memoria.valorUnitario),
      quantidade,
      faltantes: memoria.faltantes,
      regraReferenciaEspecialIntegral: memoria.especial,
      confirmadoPor: usuario?.uid || "",
      confirmadoEm: agora,
      versao: VERSION
    };
  }

  function montarPagamento({ mov, faccao, quantidade, falta, descontoDefeito, memoria, lateral, bojo, fechoPronto, pontoLuzPronto, usuario, agora, existente }) {
    const faltando = memoria.faltantes.length > 0;
    const subtotalCalculado = arred2(quantidade * memoria.valorUnitario);
    const totalCalculado = arred2(Math.max(subtotalCalculado - descontoDefeito, 0));
    const pagamento = {
      origem: "movimentacao",
      movimentacaoId: mov.id,
      movimentacaoOrigemId: mov.movimentacaoOrigemId || "",
      pagamentoReenvio: Boolean(mov.movimentacaoOrigemId || mov.reenvio || mov.origem === "movimentacao"),
      opId: mov.opId || "",
      numeroOP: mov.numeroOP || "",
      referencia: mov.referencia || "",
      cor: mov.cor || "",
      produtoNome: mov.produtoNome || "",
      faccao,
      precoReferenciaId: memoria.especial ? "" : `calculo-sutia-completo-${normalizarReferencia(mov.referencia)}`,
      processo: PROCESSO_COMPLETO,
      processoMovimentacao: PROCESSO_COMPLETO,
      servicoId: "calculo-automatico-sutia-completo",
      servicoNome: PROCESSO_COMPLETO,
      setor: mov.setor || "sutia",
      setorLabel: "Sutiã",
      dataEntrega: mov.dataChegada || "",
      quantidade,
      falta,
      descontoDefeito,
      subtotal: faltando ? 0 : subtotalCalculado,
      valorUnitario: faltando ? 0 : arred4(memoria.valorUnitario),
      total: faltando ? 0 : totalCalculado,
      valorTotal: faltando ? 0 : totalCalculado,
      statusPagamento: faltando ? "sem_valor" : "pendente",
      valorPendente: faltando,
      avisoPagamento: faltando ? `Aguardando ${memoria.faltantes.join(" e ")}.` : "",
      valorBaseSutiaCompleto: arred4(memoria.base),
      descontoSutiaCompletoLateral: arred4(memoria.descontos.lateral),
      descontoSutiaCompletoBojo: arred4(memoria.descontos.bojo),
      descontoSutiaCompletoFecho: arred4(memoria.descontos.fecho),
      descontoSutiaCompletoPontoLuz: arred4(memoria.descontos.pontoLuz),
      precoLateralReferenciaId: memoria.precoLateralId || "",
      precoBojoReferenciaId: memoria.precoBojoId || "",
      lateralPronta: lateral.pronto,
      lateralOrigem: lateral.origem || "",
      lateralResponsavel: lateral.responsavel || "",
      bojoPronto: bojo.pronto,
      bojoOrigem: bojo.origem || "",
      bojoResponsavel: bojo.responsavel || "",
      fechoPronto,
      pontoLuzPronto,
      valorUnitarioCalculadoSutiaCompleto: arred4(memoria.valorUnitario),
      subtotalCalculadoSutiaCompleto: subtotalCalculado,
      totalCalculadoSutiaCompleto: totalCalculado,
      valorTotalDefinidoManualmente: !faltando,
      valorManualFinanceiro: false,
      formaValorPagamento: memoria.especial
        ? "VALOR_INTEGRAL_REFERENCIA_ESPECIAL"
        : "CALCULO_AUTOMATICO_SUTIA_COMPLETO",
      regraReferenciaEspecialIntegral: memoria.especial,
      referenciaEspecialIntegral: memoria.especial ? normalizarReferencia(mov.referencia) : "",
      valorReferenciaEspecialIntegral: memoria.especial ? arred4(memoria.valorUnitario) : 0,
      memoriaCalculoSutiaCompleto: {
        referencia: mov.referencia || "",
        valorBase: arred4(memoria.base),
        lateralPronta: lateral.pronto,
        descontoLateral: arred4(memoria.descontos.lateral),
        bojoPronto: bojo.pronto,
        descontoBojo: arred4(memoria.descontos.bojo),
        fechoPronto,
        descontoFecho: arred4(memoria.descontos.fecho),
        pontoLuzPronto,
        descontoPontoLuz: arred4(memoria.descontos.pontoLuz),
        valorUnitarioFinal: arred4(memoria.valorUnitario),
        quantidade,
        descontoDefeito,
        totalFinal: totalCalculado,
        faltantes: memoria.faltantes,
        regra: memoria.especial ? "REFERENCIA_ESPECIAL_VALOR_INTEGRAL" : "CHEGADA_BINARIA_DEFINITIVA",
        origemMemoria: "fluxo_definitivo_110",
        versao: VERSION
      },
      observacoes: faltando
        ? `Cálculo automático aguardando valor: ${memoria.faltantes.join(" | ")}.`
        : memoria.especial
          ? `Referência especial: valor integral de ${moeda4(memoria.valorUnitario)} por peça, sem descontos.`
          : `Cálculo automático do Sutiã Completo: base ${moeda4(memoria.base)}, valor final ${moeda4(memoria.valorUnitario)} por peça.`,
      calculoSutiaCompletoVersao: VERSION,
      calculoSutiaCompletoAtualizadoPor: usuario?.uid || "",
      calculoSutiaCompletoAtualizadoEm: agora,
      atualizadoPor: usuario?.uid || "",
      atualizadoEm: agora
    };

    if (existente?.novo) {
      pagamento.criadoPor = usuario?.uid || "";
      pagamento.criadoEm = agora;
    }
    return pagamento;
  }

  function componenteConsolidado(info, total, usuario, agora) {
    return {
      informado: true,
      pronto: info.pronto,
      status: info.pronto ? "completo" : "nao_pronto",
      quantidadePronta: info.pronto ? total : 0,
      quantidadeTotal: total,
      origem: info.informadoAgora ? "chegada_sutia_completo" : (info.origem || "registro_confirmado_na_chegada"),
      origemLabel: info.origem || "Confirmado na chegada do Sutiã Completo",
      responsavel: info.responsavel || "",
      atualizadoPor: usuario?.uid || "",
      atualizadoEm: agora,
      versao: VERSION
    };
  }

  async function calcularMemoria(referencia, lateral, bojo, fechoPronto, pontoLuzPronto) {
    const [config, precos] = await Promise.all([
      carregarConfig(),
      carregarPrecosReferencia(referencia)
    ]);
    const especial = normalizarReferencia(referencia) === config.referenciaEspecial;

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

    const precoLateral = lateral.pronto ? buscarPreco(precos, PROCESSO_LATERAL) : null;
    const precoBojo = bojo.pronto ? buscarPreco(precos, PROCESSO_BOJO) : null;
    const faltantes = [];
    if (lateral.pronto && !precoLateral) faltantes.push(`${PROCESSO_LATERAL} da referência ${referencia}`);
    if (bojo.pronto && !precoBojo) faltantes.push(`${PROCESSO_BOJO} da referência ${referencia}`);

    const descontos = {
      lateral: lateral.pronto && precoLateral ? arred4(precoLateral.valor) : 0,
      bojo: bojo.pronto && precoBojo ? arred4(precoBojo.valor) : 0,
      fecho: fechoPronto ? 0 : arred4(config.descontoFechoNaoFeito),
      pontoLuz: pontoLuzPronto ? 0 : arred4(config.descontoPontoLuzNaoFeito)
    };
    return {
      especial: false,
      base: arred4(config.valorBaseGeral),
      descontos,
      valorUnitario: arred4(Math.max(
        config.valorBaseGeral - descontos.lateral - descontos.bojo - descontos.fecho - descontos.pontoLuz,
        0
      )),
      faltantes,
      precoLateralId: precoLateral?.id || "",
      precoBojoId: precoBojo?.id || ""
    };
  }

  async function salvar(form) {
    const id = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    if (!id || processando.has(id)) return;
    processando.add(id);
    bloquearForm(form, true);

    try {
      const processoSelecionado = processoCanonico(document.getElementById("chegadaConfirmarProcesso")?.value);
      const faccaoSelecionada = texto(document.getElementById("chegadaConfirmarFaccao")?.value).toUpperCase();
      const dataChegada = texto(document.getElementById("chegadaData")?.value);
      const falta = Math.max(0, numero(document.getElementById("chegadaFalta")?.value));
      const descontoInformado = Math.max(0, numero(document.getElementById("chegadaDefeito")?.value));
      const lateral = lerComponente("lateral");
      const bojo = lerComponente("bojo");
      const fechoPronto = respostaBinaria("sc51FechoResposta107");
      const pontoLuzPronto = respostaBinaria("sc51PontoLuzResposta107");

      if (processoSelecionado !== PROCESSO_COMPLETO) throw new Error("PROCESSO_NAO_CONFIRMADO");
      if (!faccaoSelecionada) throw new Error("FACCAO_NAO_CONFIRMADA");
      if (!dataChegada) throw new Error("DATA_NAO_INFORMADA");
      if (!lateral) throw new Error("LATERAL_NAO_INFORMADA");
      if (!bojo) throw new Error("BOJO_NAO_INFORMADO");
      if (fechoPronto === null) throw new Error("FECHO_NAO_INFORMADO");
      if (pontoLuzPronto === null) throw new Error("PONTO_NAO_INFORMADO");
      if (lateral.pronto && lateral.informadoAgora && !lateral.responsavel) throw new Error("LATERAL_SEM_RESPONSAVEL");
      if (bojo.pronto && bojo.informadoAgora && !bojo.responsavel) throw new Error("BOJO_SEM_RESPONSAVEL");

      const { fs, db, auth } = await firebase();
      const movSnap = await fs.getDoc(fs.doc(db, "movimentacoesProducao", id));
      if (!movSnap.exists()) throw new Error("MOVIMENTACAO_NAO_ENCONTRADA");
      const movOriginal = { id: movSnap.id, ...movSnap.data() };
      if (processoCanonico(movOriginal.processo) !== PROCESSO_COMPLETO && processoSelecionado !== PROCESSO_COMPLETO) {
        throw new Error("PROCESSO_NAO_E_SUTIA_COMPLETO");
      }

      const quantidadeEnviada = Math.max(0, numero(movOriginal.quantidadeEnviada));
      if (falta > quantidadeEnviada) throw new Error("FALTA_MAIOR_QUE_ENVIO");
      const quantidade = Math.max(quantidadeEnviada - falta, 0);
      const [memoria, op, pagamentoExistente] = await Promise.all([
        calcularMemoria(movOriginal.referencia, lateral, bojo, fechoPronto, pontoLuzPronto),
        buscarOP(movOriginal),
        localizarPagamento(id)
      ]);
      const descontoDefeito = memoria.especial ? 0 : descontoInformado;

      const resumoConfirmacao = [
        `Confirmar a chegada da OP ${movOriginal.numeroOP || "-"}?`,
        `Facção: ${faccaoSelecionada}`,
        `Lateral: ${lateral.pronto ? "Sim" : "Não"}`,
        `Bojo: ${bojo.pronto ? "Sim" : "Não"}`,
        `Fecho: ${fechoPronto ? "Sim" : "Não"}`,
        `Ponto de luz: ${pontoLuzPronto ? "Sim" : "Não"}`,
        memoria.faltantes.length
          ? `Pagamento ficará sem valor até cadastrar: ${memoria.faltantes.join(" e ")}.`
          : `Valor final por peça: ${moeda4(memoria.valorUnitario)}.`
      ].join("\n");
      if (!window.confirm(resumoConfirmacao)) return;

      const usuario = auth.currentUser;
      const agora = fs.serverTimestamp();
      const conferencia = montarConferencia({
        lateral, bojo, fechoPronto, pontoLuzPronto, memoria, usuario, quantidade, agora
      });
      const mov = {
        ...movOriginal,
        processo: PROCESSO_COMPLETO,
        destino: faccaoSelecionada,
        dataChegada,
        falta,
        descontoDefeito,
        defeito: descontoDefeito,
        quantidadeRecebida: quantidade,
        status: "retornou"
      };
      const pagamento = montarPagamento({
        mov,
        faccao: faccaoSelecionada,
        quantidade,
        falta,
        descontoDefeito,
        memoria,
        lateral,
        bojo,
        fechoPronto,
        pontoLuzPronto,
        usuario,
        agora,
        existente: pagamentoExistente
      });

      const batch = fs.writeBatch(db);
      batch.set(fs.doc(db, "movimentacoesProducao", id), {
        processo: PROCESSO_COMPLETO,
        destino: faccaoSelecionada,
        processoConfirmadoChegada: PROCESSO_COMPLETO,
        faccaoConfirmadaChegada: faccaoSelecionada,
        processoEnvioAntesConfirmacao: movOriginal.processo || "",
        faccaoEnvioAntesConfirmacao: movOriginal.destino || "",
        dataChegada,
        falta,
        descontoDefeito,
        defeito: descontoDefeito,
        quantidadeRecebida: quantidade,
        status: "retornou",
        sutiaCompletoConferencia: conferencia,
        fechoVeioPronto: fechoPronto,
        pontoLuzVeioPronto: pontoLuzPronto,
        lateralProntaSutiaCompleto: lateral.pronto,
        bojoProntoSutiaCompleto: bojo.pronto,
        chegadaSutiaCompletoFluxoRapido: true,
        chegadaSutiaCompletoVersao: VERSION,
        confirmacaoChegadaRevalidada: true,
        confirmacaoChegadaRevalidadaPor: usuario?.uid || "",
        confirmacaoChegadaRevalidadaEm: agora,
        atualizadoPor: usuario?.uid || "",
        atualizadoEm: agora
      }, { merge: true });

      batch.set(fs.doc(db, "entregasPagamento", pagamentoExistente.id), pagamento, { merge: true });

      if (op?.id) {
        const totalOP = Math.max(0, numero(op.quantidade || op.quantidadeTotal || quantidadeEnviada));
        batch.update(fs.doc(db, "ordensProducao", op.id), {
          "componentesConsolidados.lateral": componenteConsolidado(lateral, totalOP, usuario, agora),
          "componentesConsolidados.bojo": componenteConsolidado(bojo, totalOP, usuario, agora),
          componentesConsolidadosAtualizadoPor: usuario?.uid || "",
          componentesConsolidadosAtualizadoEm: agora,
          atualizadoPor: usuario?.uid || "",
          atualizadoEm: agora
        });
      }

      batch.set(fs.doc(fs.collection(db, "logsAlteracoes")), {
        acao: "movimentacao_retorno_sutia_completo_definitiva",
        entidade: "movimentacaoProducao",
        entidadeId: id,
        tipoAlvo: "movimentacaoProducao",
        alvoId: id,
        detalhes: `OP ${movOriginal.numeroOP || "-"} | ${faccaoSelecionada} | voltou ${quantidade} peças | falta ${falta} | lateral ${lateral.pronto ? "sim" : "não"} | bojo ${bojo.pronto ? "sim" : "não"} | fecho ${fechoPronto ? "sim" : "não"} | ponto de luz ${pontoLuzPronto ? "sim" : "não"} | valor ${moeda4(memoria.valorUnitario)}`,
        usuarioId: usuario?.uid || "",
        usuarioUid: usuario?.uid || "",
        usuarioEmail: usuario?.email || "",
        criadoPor: usuario?.uid || "",
        criadoEm: agora,
        versao: VERSION
      });

      await batch.commit();

      document.getElementById(MODAL_ID)?.classList.add("hidden");
      form.reset();
      document.getElementById(PAINEL_ID)?.remove();
      avisar(memoria.faltantes.length
        ? `Chegada salva. O pagamento ficou aguardando ${memoria.faltantes.join(" e ")}.`
        : `Chegada e pagamento salvos juntos: ${moeda2(pagamento.total)}.`, "ok");
      window.setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 120);
    } catch (error) {
      console.error("Falha na chegada definitiva do Sutiã Completo.", error);
      const mensagens = {
        PROCESSO_NAO_CONFIRMADO: "Confirme novamente o processo SUTIÃ COMPLETO.",
        FACCAO_NAO_CONFIRMADA: "Confirme novamente quem fez o processo.",
        DATA_NAO_INFORMADA: "Informe a data de chegada.",
        LATERAL_NAO_INFORMADA: "A situação da lateral ainda não foi carregada. Feche e abra a chegada novamente.",
        BOJO_NAO_INFORMADO: "A situação do bojo ainda não foi carregada. Feche e abra a chegada novamente.",
        FECHO_NAO_INFORMADO: "Informe se a peça veio com fecho.",
        PONTO_NAO_INFORMADO: "Informe se a peça veio com ponto de luz.",
        LATERAL_SEM_RESPONSAVEL: "Informe quem fez a lateral.",
        BOJO_SEM_RESPONSAVEL: "Informe quem fez o bojo.",
        MOVIMENTACAO_NAO_ENCONTRADA: "A movimentação não foi encontrada. Atualize a tela e tente novamente.",
        FALTA_MAIOR_QUE_ENVIO: "A falta não pode ser maior que a quantidade enviada.",
        PAGAMENTO_JA_PAGO: "Esta movimentação já possui pagamento confirmado como pago e não pode ser alterada pela chegada."
      };
      avisar(mensagens[error?.message] || "Não foi possível concluir a chegada. Nenhuma gravação parcial foi feita.");
    } finally {
      bloquearForm(form, false);
      processando.delete(id);
    }
  }

  function interceptarSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== FORM_ID) return;

    const painel = document.getElementById(PAINEL_ID);
    if (!(painel instanceof HTMLElement)) return;

    const processoSelecionado = processoCanonico(document.getElementById("chegadaConfirmarProcesso")?.value);
    if (processoSelecionado && processoSelecionado !== PROCESSO_COMPLETO) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void salvar(form);
  }

  document.addEventListener("submit", interceptarSubmit, true);

  window.CorpoNuChegadaSutiaDefinitiva = {
    versao: VERSION,
    ativa: true,
    limparCaches() {
      configCache = { expiraEm: 0, valor: null };
      precosCache.clear();
    }
  };
})();
