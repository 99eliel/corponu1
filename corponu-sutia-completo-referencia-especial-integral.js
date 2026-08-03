(() => {
  "use strict";

  const VERSION = "2026-08-03-sutia-especial-integral-92";
  const FIREBASE_VERSION = "10.12.5";
  const CONFIG_PRINCIPAL = "sutia-completo-pagamento";
  const CONFIG_COMPATIVEL = "sutia-completo-financeiro";
  const PROCESSO_COMPLETO = "SUTIÃ COMPLETO";
  const SESSION_KEY = `corponu_ref_especial_integral_${VERSION}`;

  if (window.__CORPONU_SUTIA_ESPECIAL_INTEGRAL__ === VERSION) return;
  window.__CORPONU_SUTIA_ESPECIAL_INTEGRAL__ = VERSION;

  let firebasePromise = null;
  let configCache = null;
  let configCacheEm = 0;
  let aplicandoPagamentos = false;
  let timerAplicacao = 0;

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
  const moeda4 = valor => `R$ ${numero(valor).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;

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
    if (!forcar && configCache && Date.now() - configCacheEm < 30000) return configCache;

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

  function ehReferenciaEspecial(referencia, config) {
    return Boolean(config?.referencia) &&
      referenciaNormalizada(referencia) === referenciaNormalizada(config.referencia);
  }

  function garantirEstilo() {
    if (document.getElementById("styleSutiaEspecialIntegral92")) return;
    const style = document.createElement("style");
    style.id = "styleSutiaEspecialIntegral92";
    style.textContent = `
      .sc92-referencia-integral .sc51-componentes,
      .sc92-referencia-integral .sc51-opcoes-fixas{display:none!important}
      .sc92-aviso{margin:0;padding:12px 13px;border:1px solid #86efac;border-radius:11px;background:#f0fdf4;color:#166534;font-size:12px;font-weight:900;line-height:1.45}
      .sc92-aviso strong{display:block;margin-bottom:3px;color:#14532d;font-size:13px}
      #configSutiaCompleto51 .sc92-config-aviso{display:block;margin-top:8px;color:#166534}
    `;
    document.head.appendChild(style);
  }

  function dispararMudanca(elemento) {
    if (!elemento) return;
    elemento.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function prepararPainel(prefixo, painel, config) {
    if (!(painel instanceof HTMLElement) || painel.dataset.sc92 === config.referencia) return;

    const lateral = document.getElementById(`${prefixo}LateralSituacao`);
    const bojo = document.getElementById(`${prefixo}BojoSituacao`);
    const lateralResponsavel = document.getElementById(`${prefixo}LateralResponsavel`);
    const bojoResponsavel = document.getElementById(`${prefixo}BojoResponsavel`);
    const fecho = document.getElementById(`${prefixo}FechoPronto`);
    const ponto = document.getElementById(`${prefixo}PontoLuzPronto`);

    if (lateral instanceof HTMLSelectElement) lateral.value = "nao";
    if (bojo instanceof HTMLSelectElement) bojo.value = "nao";
    if (lateralResponsavel instanceof HTMLInputElement) {
      lateralResponsavel.value = "";
      lateralResponsavel.disabled = true;
      lateralResponsavel.required = false;
    }
    if (bojoResponsavel instanceof HTMLInputElement) {
      bojoResponsavel.value = "";
      bojoResponsavel.disabled = true;
      bojoResponsavel.required = false;
    }
    if (fecho instanceof HTMLInputElement) fecho.checked = true;
    if (ponto instanceof HTMLInputElement) ponto.checked = true;

    painel.classList.add("sc92-referencia-integral");
    painel.dataset.sc92 = config.referencia;

    let aviso = painel.querySelector(".sc92-aviso");
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.className = "sc92-aviso";
      painel.querySelector("h4")?.parentElement?.insertAdjacentElement("afterend", aviso);
      if (!aviso.isConnected) painel.prepend(aviso);
    }
    aviso.innerHTML = `<strong>Referência ${config.referencia}: valor integral</strong>Esta referência não utiliza lateral, bojo, fecho nem ponto de luz. O valor será sempre ${moeda4(config.valor)} por peça, sem descontos desses componentes.`;

    dispararMudanca(lateral);
    dispararMudanca(bojo);
    dispararMudanca(fecho);
    dispararMudanca(ponto);
  }

  async function prepararChegadaManual() {
    const form = document.getElementById("formChegadaManualFaccao");
    const painel = document.getElementById("sutCompletoComponentesChegadaManual");
    if (!form || !painel || form.closest(".modal-backdrop")?.classList.contains("hidden")) return;

    const processo = processoCanonico(document.getElementById("chegadaManualProcesso")?.value);
    if (processo !== PROCESSO_COMPLETO) return;

    const config = await carregarConfig();
    const referencia = document.getElementById("chegadaManualRef")?.value;
    if (ehReferenciaEspecial(referencia, config)) prepararPainel("sc51m", painel, config);
    else {
      painel.classList.remove("sc92-referencia-integral");
      painel.querySelector(".sc92-aviso")?.remove();
      delete painel.dataset.sc92;
    }
  }

  async function prepararChegadaPadrao() {
    const form = document.getElementById("formChegadaMovimentacao");
    const painel = document.getElementById("sutCompletoComponentesChegada");
    const movimentacaoId = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    if (!form || !painel || !movimentacaoId || form.closest(".modal-backdrop")?.classList.contains("hidden")) return;

    try {
      const config = await carregarConfig();
      const { fs, db } = await firebase();
      const snap = await fs.getDoc(fs.doc(db, "movimentacoesProducao", movimentacaoId));
      if (!snap.exists()) return;
      const mov = snap.data();
      if (processoCanonico(mov.processo) === PROCESSO_COMPLETO && ehReferenciaEspecial(mov.referencia, config)) {
        prepararPainel("sc51", painel, config);
      }
    } catch (error) {
      console.warn("Não foi possível preparar a referência especial na chegada normal.", error);
    }
  }

  function atualizarAjudaConfiguracao(config) {
    const ajuda = document.querySelector("#configSutiaCompleto51 .sc51-ajuda");
    if (!(ajuda instanceof HTMLElement)) return;
    let aviso = ajuda.querySelector(".sc92-config-aviso");
    if (!aviso) {
      aviso = document.createElement("span");
      aviso.className = "sc92-config-aviso";
      ajuda.appendChild(aviso);
    }
    aviso.textContent = `A referência especial ${config.referencia} sempre recebe o valor integral de ${moeda4(config.valor)}, sem descontos de lateral, bojo, fecho ou ponto de luz.`;
  }

  async function consultarPagamentosSutiaCompleto() {
    const { fs, db } = await firebase();
    const mapa = new Map();
    const campos = ["processo", "servicoNome", "processoMovimentacao"];
    const valores = ["SUTIÃ COMPLETO", "SUTIA COMPLETO"];

    for (const campo of campos) {
      for (const valor of valores) {
        try {
          const snap = await fs.getDocs(fs.query(
            fs.collection(db, "entregasPagamento"),
            fs.where(campo, "==", valor),
            fs.limit(500)
          ));
          snap.docs.forEach(item => mapa.set(item.id, { id: item.id, ...item.data() }));
        } catch (error) {
          console.warn(`Consulta da referência especial por ${campo} indisponível.`, error);
        }
      }
    }
    return [...mapa.values()];
  }

  function precisaCorrigir(item, config) {
    if (statusImutavel(item)) return false;
    if (processoCanonico(item?.processo || item?.servicoNome || item?.processoMovimentacao) !== PROCESSO_COMPLETO) return false;
    if (!ehReferenciaEspecial(item?.referencia, config)) return false;

    const quantidade = Math.max(0, numero(item?.quantidade));
    if (!quantidade) return false;
    const totalIntegral = arred2(quantidade * config.valor);
    const status = normalizar(item?.statusPagamento || item?.status || "PENDENTE");
    return item?.regraReferenciaEspecialIntegral !== true ||
      item?.valorPendente === true ||
      ["SEM VALOR", "SEM_VALOR"].includes(status) ||
      Math.abs(numero(item?.valorUnitario) - config.valor) > 0.0001 ||
      Math.abs(numero(item?.total ?? item?.valorTotal) - totalIntegral) > 0.009;
  }

  async function aplicarRegraPagamentos({ origem = "automatico" } = {}) {
    if (aplicandoPagamentos) return { atualizados: 0 };
    aplicandoPagamentos = true;

    try {
      const config = await carregarConfig(true);
      if (!(config.valor > 0)) return { atualizados: 0 };

      atualizarAjudaConfiguracao(config);
      const pagamentos = (await consultarPagamentosSutiaCompleto())
        .filter(item => precisaCorrigir(item, config));
      if (!pagamentos.length) return { atualizados: 0 };

      const { fs, db, auth } = await firebase();
      const usuario = auth.currentUser;
      let atualizados = 0;

      for (let inicio = 0; inicio < pagamentos.length; inicio += 350) {
        const batch = fs.writeBatch(db);
        pagamentos.slice(inicio, inicio + 350).forEach(item => {
          const quantidade = Math.max(0, numero(item.quantidade));
          const totalIntegral = arred2(quantidade * config.valor);
          const descontoAnterior = Math.max(0, numero(item.descontoDefeito));
          const memoriaAnterior = item.memoriaCalculoSutiaCompleto || {};

          const patch = {
            valorUnitario: arred4(config.valor),
            subtotal: totalIntegral,
            total: totalIntegral,
            valorTotal: totalIntegral,
            valorUnitarioCalculadoSutiaCompleto: arred4(config.valor),
            subtotalCalculadoSutiaCompleto: totalIntegral,
            totalCalculadoSutiaCompleto: totalIntegral,
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
              totalFinal: totalIntegral,
              faltantes: [],
              regra: "REFERENCIA_ESPECIAL_VALOR_INTEGRAL",
              versao: VERSION
            },
            observacoes: `Referência especial ${config.referencia}: valor integral de ${moeda4(config.valor)} por peça, sem descontos.`,
            atualizadoEm: fs.serverTimestamp(),
            atualizadoPor: usuario?.uid || "",
            regraReferenciaEspecialAtualizadaEm: fs.serverTimestamp(),
            regraReferenciaEspecialAtualizadaPor: usuario?.uid || ""
          };

          if (descontoAnterior > 0) patch.descontoDefeitoOriginalAntesRegraIntegral = descontoAnterior;
          batch.set(fs.doc(db, "entregasPagamento", item.id), patch, { merge: true });
          atualizados += 1;
        });
        await batch.commit();
      }

      try {
        await fs.addDoc(fs.collection(db, "logsAlteracoes"), {
          acao: "referencia_especial_sutia_valor_integral",
          tipoAlvo: "entregaPagamento",
          alvoId: "lote",
          detalhes: `${atualizados} pagamento(s) da referência ${config.referencia} ajustado(s) para ${moeda4(config.valor)} por peça. Origem: ${origem}.`,
          usuarioUid: usuario?.uid || "",
          criadoEm: fs.serverTimestamp(),
          versao: VERSION
        });
      } catch (error) {
        console.warn("Regra integral aplicada, mas o log adicional não foi criado.", error);
      }

      window.setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 300);
      return { atualizados };
    } catch (error) {
      console.warn("Não foi possível aplicar agora a regra integral da referência especial.", error);
      return { atualizados: 0, erro: error };
    } finally {
      aplicandoPagamentos = false;
    }
  }

  function agendarAplicacao(atraso = 4500, origem = "automatico") {
    window.clearTimeout(timerAplicacao);
    timerAplicacao = window.setTimeout(() => aplicarRegraPagamentos({ origem }), atraso);
  }

  function instalarEventos() {
    const prepararInterface = () => {
      prepararChegadaManual();
      prepararChegadaPadrao();
      carregarConfig().then(atualizarAjudaConfiguracao).catch(() => {});
    };

    document.addEventListener("input", event => {
      const alvo = event.target;
      if (!(alvo instanceof HTMLInputElement || alvo instanceof HTMLSelectElement)) return;
      if (["chegadaManualRef", "chegadaManualProcesso", "chegadaManualOP"].includes(alvo.id)) {
        [80, 250, 650].forEach(ms => window.setTimeout(prepararInterface, ms));
      }
    }, true);

    document.addEventListener("change", event => {
      const alvo = event.target;
      if (!(alvo instanceof HTMLInputElement || alvo instanceof HTMLSelectElement)) return;
      if (["chegadaManualRef", "chegadaManualProcesso", "chegadaManualOP"].includes(alvo.id)) {
        [50, 220, 600].forEach(ms => window.setTimeout(prepararInterface, ms));
      }
    }, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.closest("#btnAbrirChegadaManualFaccao, [data-registrar-chegada], #listaMovimentacoesFaccoes button")) {
        [120, 400, 900, 1500].forEach(ms => window.setTimeout(prepararInterface, ms));
      }
    }, true);

    document.addEventListener("submit", event => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      if (["formChegadaManualFaccao", "formChegadaMovimentacao"].includes(form.id)) {
        [5500, 11000, 18000].forEach(ms => window.setTimeout(() => aplicarRegraPagamentos({ origem: form.id }), ms));
      }

      if (form.id === "configSutiaCompleto51") {
        configCache = null;
        configCacheEm = 0;
        [2500, 6500].forEach(ms => window.setTimeout(() => aplicarRegraPagamentos({ origem: "configuracao" }), ms));
      }
    }, true);

    window.addEventListener("focus", () => {
      prepararInterface();
      agendarAplicacao(1800, "foco");
    });
  }

  function iniciar() {
    garantirEstilo();
    instalarEventos();

    [400, 1000, 2200].forEach(ms => window.setTimeout(() => {
      prepararChegadaManual();
      prepararChegadaPadrao();
      carregarConfig().then(atualizarAjudaConfiguracao).catch(() => {});
    }, ms));

    try {
      if (sessionStorage.getItem(SESSION_KEY) !== "1") {
        sessionStorage.setItem(SESSION_KEY, "1");
        agendarAplicacao(5200, "atualizacao_versao");
      }
    } catch (error) {
      agendarAplicacao(5200, "atualizacao_versao");
    }
  }

  window.CorpoNuReferenciaEspecialIntegral = {
    versao: VERSION,
    aplicarAgora: () => aplicarRegraPagamentos({ origem: "manual_api" })
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
