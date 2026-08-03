(() => {
  "use strict";

  const VERSION = "2026-08-03-sutia-912-direcionado-94";
  const FIREBASE_VERSION = "10.12.5";
  const CONFIG_PRINCIPAL = "sutia-completo-pagamento";
  const CONFIG_COMPATIVEL = "sutia-completo-financeiro";
  const PROCESSO_COMPLETO = "SUTIÃ COMPLETO";

  if (window.__CORPONU_SUTIA_ESPECIAL_INTEGRAL__ === VERSION) return;
  window.__CORPONU_SUTIA_ESPECIAL_INTEGRAL__ = VERSION;

  let firebasePromise = null;
  let configCache = null;
  let configCacheEm = 0;
  const tentativas = new Map();

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
      : bruto);
    return Number.isFinite(convertido) ? convertido : padrao;
  };
  const arred4 = valor => Math.round((numero(valor) + Number.EPSILON) * 10000) / 10000;
  const arred2 = valor => Math.round((numero(valor) + Number.EPSILON) * 100) / 100;
  const moeda4 = valor => `R$ ${numero(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  })}`;

  function processoCanonico(valor) {
    return normalizar(valor) === "SUTIA COMPLETO" ? PROCESSO_COMPLETO : texto(valor).toUpperCase();
  }

  function statusImutavel(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    return item?.excluido === true || item?.cancelado === true || [
      "PAGO", "PAGA", "QUITADO", "QUITADA",
      "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA",
      "ESTORNADO", "ESTORNADA"
    ].includes(status);
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

  async function carregarConfig(forcar = false) {
    if (!forcar && configCache && Date.now() - configCacheEm < 60000) return configCache;

    const { fs, db } = await firebase();
    const [principal, compativel] = await Promise.all([
      fs.getDoc(fs.doc(db, "configuracoes", CONFIG_PRINCIPAL)).catch(() => null),
      fs.getDoc(fs.doc(db, "configuracoes", CONFIG_COMPATIVEL)).catch(() => null)
    ]);
    const a = principal?.exists?.() ? principal.data() : {};
    const b = compativel?.exists?.() ? compativel.data() : {};

    configCache = {
      referencia: referenciaNormalizada(
        a.referenciaEspecial || b.referenciaEspecial || "912"
      ) || "912",
      valor: Math.max(0, numero(
        a.valorBaseReferenciaEspecial ??
        a.valorReferenciaEspecial ??
        b.valorReferenciaEspecial ??
        b.valorEspecial ??
        6.5,
        6.5
      ))
    };
    configCacheEm = Date.now();
    return configCache;
  }

  function ehEspecial(ref, config) {
    return referenciaNormalizada(ref) === referenciaNormalizada(config?.referencia);
  }

  function pagamentoEhEspecial(item, config) {
    return processoCanonico(
      item?.processo || item?.servicoNome || item?.processoMovimentacao
    ) === PROCESSO_COMPLETO && ehEspecial(item?.referencia, config);
  }

  function precisaCorrigir(item, config) {
    if (statusImutavel(item) || !pagamentoEhEspecial(item, config)) return false;
    const quantidade = Math.max(0, numero(item?.quantidade));
    if (!quantidade) return false;
    const total = arred2(quantidade * config.valor);
    const status = normalizar(item?.statusPagamento || item?.status || "PENDENTE");
    return item?.regraReferenciaEspecialIntegral !== true ||
      item?.valorPendente === true ||
      ["SEM VALOR", "SEM_VALOR"].includes(status) ||
      Math.abs(numero(item?.valorUnitario) - config.valor) > 0.0001 ||
      Math.abs(numero(item?.total ?? item?.valorTotal) - total) > 0.009 ||
      numero(item?.descontoDefeito) !== 0;
  }

  async function aplicarItens(itens, config, origem) {
    const corrigir = itens.filter(item => precisaCorrigir(item, config));
    if (!corrigir.length) {
      return {
        encontrados: itens.filter(item => pagamentoEhEspecial(item, config) && !statusImutavel(item)).length,
        atualizados: 0
      };
    }

    const { fs, db, auth } = await firebase();
    const usuario = auth.currentUser;
    let atualizados = 0;

    for (let inicio = 0; inicio < corrigir.length; inicio += 350) {
      const batch = fs.writeBatch(db);
      corrigir.slice(inicio, inicio + 350).forEach(item => {
        const quantidade = Math.max(0, numero(item.quantidade));
        const total = arred2(quantidade * config.valor);
        const descontoAnterior = Math.max(0, numero(item.descontoDefeito));
        const memoriaAnterior = item.memoriaCalculoSutiaCompleto || {};
        const agora = fs.serverTimestamp();

        const patch = {
          valorUnitario: arred4(config.valor),
          subtotal: total,
          total,
          valorTotal: total,
          valorUnitarioCalculadoSutiaCompleto: arred4(config.valor),
          subtotalCalculadoSutiaCompleto: total,
          totalCalculadoSutiaCompleto: total,
          valorTotalDefinidoManualmente: true,
          valorManualFinanceiro: false,
          formaValorPagamento: "VALOR_INTEGRAL_REFERENCIA_ESPECIAL",
          statusPagamento: "pendente",
          valorPendente: false,
          avisoPagamento: "",
          descontoDefeito: 0,
          regraReferenciaEspecialIntegral: true,
          referenciaEspecialIntegral: config.referencia,
          valorReferenciaEspecialIntegral: arred4(config.valor),
          memoriaCalculoSutiaCompleto: {
            ...memoriaAnterior,
            referencia: config.referencia,
            valorBase: arred4(config.valor),
            lateralPronta: false,
            bojoPronto: false,
            fechoPronto: true,
            pontoLuzPronto: true,
            descontoLateral: 0,
            descontoBojo: 0,
            descontoFecho: 0,
            descontoPontoLuz: 0,
            descontoDefeitoIgnorado: descontoAnterior,
            valorUnitarioFinal: arred4(config.valor),
            quantidade,
            totalFinal: total,
            faltantes: [],
            regra: "REFERENCIA_ESPECIAL_VALOR_INTEGRAL",
            versao: VERSION
          },
          observacoes: `Referência especial ${config.referencia}: valor integral de ${moeda4(config.valor)} por peça, sem descontos.`,
          regraReferenciaEspecialOrigem: origem,
          atualizadoEm: agora,
          atualizadoPor: usuario?.uid || "",
          regraReferenciaEspecialAtualizadaEm: agora,
          regraReferenciaEspecialAtualizadaPor: usuario?.uid || ""
        };
        if (descontoAnterior > 0) {
          patch.descontoDefeitoOriginalAntesRegraIntegral = descontoAnterior;
        }

        batch.set(fs.doc(db, "entregasPagamento", item.id), patch, { merge: true });
        atualizados += 1;
      });
      await batch.commit();
    }

    if (atualizados > 0) {
      window.setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 120);
    }
    return { encontrados: corrigir.length, atualizados };
  }

  async function buscarPorMovimentacao(movimentacaoId) {
    const { fs, db } = await firebase();
    const snap = await fs.getDocs(fs.query(
      fs.collection(db, "entregasPagamento"),
      fs.where("movimentacaoId", "==", movimentacaoId),
      fs.limit(20)
    ));
    return snap.docs.map(item => ({ id: item.id, ...item.data() }));
  }

  async function buscarPorOP(numeroOP) {
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

  function filtrarAssinatura(itens, assinatura, config) {
    return itens.filter(item => {
      if (!pagamentoEhEspecial(item, config)) return false;
      if (assinatura.faccao && normalizar(item.faccao) !== normalizar(assinatura.faccao)) return false;
      if (assinatura.data && texto(item.dataEntrega || item.dataChegada) !== assinatura.data) return false;
      return true;
    });
  }

  async function aplicarAssinatura(assinatura) {
    const config = await carregarConfig();
    let itens = assinatura.movimentacaoId
      ? await buscarPorMovimentacao(assinatura.movimentacaoId)
      : await buscarPorOP(assinatura.numeroOP);
    itens = filtrarAssinatura(itens, assinatura, config);
    return aplicarItens(itens, config, assinatura.origem);
  }

  function cancelarTentativas(chave) {
    const lista = tentativas.get(chave) || [];
    lista.forEach(timer => window.clearTimeout(timer));
    tentativas.delete(chave);
  }

  function agendarAssinatura(assinatura) {
    const chave = assinatura.movimentacaoId
      ? `mov:${assinatura.movimentacaoId}`
      : `op:${assinatura.numeroOP}|${normalizar(assinatura.faccao)}|${assinatura.data}`;
    cancelarTentativas(chave);

    const timers = [250, 750, 1600, 3200].map(atraso => window.setTimeout(async () => {
      try {
        const resultado = await aplicarAssinatura(assinatura);
        if (resultado.encontrados > 0 || resultado.atualizados > 0) cancelarTentativas(chave);
      } catch (error) {
        console.warn("Pagamento da referência especial ainda não disponível.", error);
      }
    }, atraso));
    tentativas.set(chave, timers);
  }

  function prepararPainel(prefixo, painel, config) {
    if (!(painel instanceof HTMLElement)) return;
    const lateral = document.getElementById(`${prefixo}LateralSituacao`);
    const bojo = document.getElementById(`${prefixo}BojoSituacao`);
    const fecho = document.getElementById(`${prefixo}FechoPronto`);
    const ponto = document.getElementById(`${prefixo}PontoLuzPronto`);

    if (lateral instanceof HTMLSelectElement) {
      lateral.value = "nao";
      lateral.required = false;
    }
    if (bojo instanceof HTMLSelectElement) {
      bojo.value = "nao";
      bojo.required = false;
    }
    [`${prefixo}LateralResponsavel`, `${prefixo}BojoResponsavel`].forEach(id => {
      const input = document.getElementById(id);
      if (input instanceof HTMLInputElement) {
        input.value = "";
        input.required = false;
        input.disabled = true;
      }
    });
    if (fecho instanceof HTMLInputElement) fecho.checked = true;
    if (ponto instanceof HTMLInputElement) ponto.checked = true;

    painel.style.display = "none";
    painel.dataset.sutia912Integral = config.referencia;
  }

  async function prepararManual() {
    const form = document.getElementById("formChegadaManualFaccao");
    if (!(form instanceof HTMLFormElement)) return;
    const processo = processoCanonico(document.getElementById("chegadaManualProcesso")?.value);
    const ref = document.getElementById("chegadaManualRef")?.value;
    const config = await carregarConfig();

    if (processo === PROCESSO_COMPLETO && ehEspecial(ref, config)) {
      form.dataset.sutia912Rapido = "1";
      prepararPainel("sc51m", document.getElementById("sutCompletoComponentesChegadaManual"), config);
    } else {
      delete form.dataset.sutia912Rapido;
    }
  }

  async function prepararNormal() {
    const form = document.getElementById("formChegadaMovimentacao");
    const id = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    if (!(form instanceof HTMLFormElement) || !id) return;

    try {
      const config = await carregarConfig();
      const { fs, db } = await firebase();
      const snap = await fs.getDoc(fs.doc(db, "movimentacoesProducao", id));
      if (!snap.exists()) return;
      const mov = snap.data();
      if (processoCanonico(mov.processo) === PROCESSO_COMPLETO && ehEspecial(mov.referencia, config)) {
        form.dataset.sutia912Rapido = "1";
        prepararPainel("sc51", document.getElementById("sutCompletoComponentesChegada"), config);
      } else {
        delete form.dataset.sutia912Rapido;
      }
    } catch (error) {
      console.warn("Não foi possível preparar a chegada rápida da referência especial.", error);
    }
  }

  function atualizarAjudaConfiguracao(config) {
    const ajuda = document.querySelector("#configSutiaCompleto51 .sc51-ajuda");
    if (!(ajuda instanceof HTMLElement)) return;
    let aviso = ajuda.querySelector(".sc94-config-aviso");
    if (!aviso) {
      aviso = document.createElement("span");
      aviso.className = "sc94-config-aviso";
      aviso.style.cssText = "display:block;margin-top:8px;color:#166534";
      ajuda.appendChild(aviso);
    }
    aviso.textContent = `A referência especial ${config.referencia} recebe sempre ${moeda4(config.valor)} por peça, sem descontos.`;
  }

  async function reconciliarReferencia() {
    const config = await carregarConfig(true);
    const { fs, db } = await firebase();
    const valores = [config.referencia];
    const numerico = Number(config.referencia);
    if (Number.isFinite(numerico)) valores.push(numerico);

    const mapa = new Map();
    for (const valor of [...new Set(valores)]) {
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, "entregasPagamento"),
        fs.where("referencia", "==", valor),
        fs.limit(500)
      ));
      snap.docs.forEach(item => mapa.set(item.id, { id: item.id, ...item.data() }));
    }
    return aplicarItens([...mapa.values()], config, "reconciliacao_solicitada");
  }

  function instalarEventos() {
    document.addEventListener("submit", event => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      if (form.id === "formChegadaManualFaccao") {
        const processo = processoCanonico(document.getElementById("chegadaManualProcesso")?.value);
        const ref = referenciaNormalizada(document.getElementById("chegadaManualRef")?.value);
        if (processo === PROCESSO_COMPLETO && ref === "912") {
          agendarAssinatura({
            numeroOP: texto(document.getElementById("chegadaManualOP")?.value),
            faccao: texto(document.getElementById("chegadaManualFaccao")?.value),
            data: texto(document.getElementById("chegadaManualDataChegada")?.value),
            origem: "chegada_manual_912"
          });
        }
      }

      if (form.id === "formChegadaMovimentacao" && form.dataset.sutia912Rapido === "1") {
        agendarAssinatura({
          movimentacaoId: texto(document.getElementById("chegadaMovimentacaoId")?.value),
          origem: "chegada_normal_912"
        });
      }

      if (form.id === "configSutiaCompleto51") {
        configCache = null;
        configCacheEm = 0;
        window.setTimeout(() => reconciliarReferencia().catch(error => {
          console.warn("Referência especial não reconciliada após configuração.", error);
        }), 1800);
      }
    }, true);

    ["input", "change"].forEach(tipo => {
      document.addEventListener(tipo, event => {
        const alvo = event.target;
        if (!(alvo instanceof HTMLInputElement || alvo instanceof HTMLSelectElement)) return;
        if (["chegadaManualOP", "chegadaManualRef", "chegadaManualProcesso"].includes(alvo.id)) {
          [40, 180, 450].forEach(ms => window.setTimeout(() => prepararManual(), ms));
        }
      }, true);
    });

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      if (alvo.closest("#btnAbrirChegadaManualFaccao, #btnBuscarOPChegadaManualFaccao")) {
        [80, 220, 500].forEach(ms => window.setTimeout(() => prepararManual(), ms));
      }

      if (alvo.closest("[data-registrar-chegada], #listaMovimentacoesFaccoes button")) {
        const form = document.getElementById("formChegadaMovimentacao");
        if (form instanceof HTMLFormElement) delete form.dataset.sutia912Rapido;
        [100, 300, 700].forEach(ms => window.setTimeout(() => prepararNormal(), ms));
      }
    }, true);
  }

  function iniciar() {
    instalarEventos();
    [300, 800, 1500].forEach(ms => window.setTimeout(() => {
      prepararManual();
      prepararNormal();
      carregarConfig().then(atualizarAjudaConfiguracao).catch(() => {});
    }, ms));
  }

  window.CorpoNuReferenciaEspecialIntegral = {
    versao: VERSION,
    aplicarAgora: reconciliarReferencia
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();