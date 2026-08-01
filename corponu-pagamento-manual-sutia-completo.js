(() => {
  "use strict";

  const VERSION = "2026-08-01-pagamento-manual-sutia-completo-64";
  const FB = "10.12.5";
  const MODAL_ID = "modalPagamentoManualFinanceiro";
  const FORM_ID = "formPagamentoManualFinanceiro";
  const PAINEL_COMPONENTES_ID = "pagManualComponentesOP";
  const BLOCO_ID = "pagManualSutiaCompleto64";
  const FECHO_ID = "pagManualFechoPronto64";
  const PONTO_ID = "pagManualPontoLuzPronto64";
  const RESUMO_ID = "pagManualCalculoSutia64";
  const CONFIG_ID = "sutia-completo-financeiro";

  if (window.__CORPONU_PAGAMENTO_MANUAL_SUTIA_COMPLETO__ === VERSION) return;
  window.__CORPONU_PAGAMENTO_MANUAL_SUTIA_COMPLETO__ = VERSION;

  let firebasePromise = null;
  let configCache = null;
  let configCacheEm = 0;
  const valoresCache = new Map();
  let observerPainel = null;
  let sequenciaCalculo = 0;
  let calculoAtual = null;
  let chaveCalculoAtual = "";
  let ultimoTokenPatch = "";

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
  const numero = valor => {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    const bruto = texto(valor);
    if (!bruto) return 0;
    const limpo = bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto.replace(/[^0-9.-]/g, "");
    const convertido = Number(limpo);
    return Number.isFinite(convertido) ? convertido : 0;
  };
  const arred4 = valor => Math.round((numero(valor) + Number.EPSILON) * 10000) / 10000;
  const arred2 = valor => Math.round((numero(valor) + Number.EPSILON) * 100) / 100;
  const moeda4 = valor => `R$ ${numero(valor).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
  const moeda2 = valor => numero(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const statusDefinido = valor => ["sim", "nao"].includes(texto(valor).toLowerCase());
  const processoCanonico = valor => {
    const chave = normalizar(valor);
    if (["SUTIA COMPLETO", "SUTIA COMPLETA", "SUTIÃ COMPLETO", "SUTIÃ COMPLETA"].includes(chave)) return "SUTIA COMPLETO";
    return chave;
  };

  function avisar(mensagem) {
    if (typeof window.mostrarAvisoFormulario === "function") window.mostrarAvisoFormulario(mensagem);
    else if (typeof window.toast === "function") window.toast(mensagem);
    else window.alert(mensagem);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`)
    ]).then(([appMod, fs, authMod]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      return { fs, db: fs.getFirestore(app), auth: authMod.getAuth(app) };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  function formulario() {
    return document.getElementById(FORM_ID);
  }

  function controlePorRotulo(termos, seletor = "input,select,textarea") {
    const form = formulario();
    if (!form) return null;
    const procurados = termos.map(normalizar);
    const labels = [...form.querySelectorAll("label")];
    for (const label of labels) {
      const conteudo = normalizar(label.childNodes?.[0]?.textContent || label.textContent);
      if (!procurados.some(termo => conteudo.includes(termo))) continue;
      const controle = label.querySelector(seletor);
      if (controle) return controle;
    }
    return null;
  }

  function campoProcesso() {
    return document.getElementById("pagManualProcesso") ||
      document.getElementById("pagManualServico") ||
      controlePorRotulo(["PROCESSO REALIZADO", "PROCESSO"], "select");
  }

  function campoValorManual() {
    return document.getElementById("pagManualValorTotal") ||
      document.getElementById("pagManualTotal") ||
      controlePorRotulo(["VALOR TOTAL FINAL DESTE SERVICO", "VALOR TOTAL FINAL"], "input");
  }

  function campoQuantidadeChegou() {
    return document.getElementById("pagManualQuantidadeChegou") ||
      document.getElementById("pagManualQuantidadeRecebida") ||
      document.getElementById("pagManualQuantidade") ||
      controlePorRotulo(["QUANTIDADE QUE CHEGOU", "QUANTIDADE RECEBIDA"], "input");
  }

  function campoReferencia() {
    return document.getElementById("pagManualReferencia") ||
      formulario()?.querySelector('[name="referencia"]');
  }

  function campoOpId() {
    return document.getElementById("pagManualOpId") ||
      document.getElementById("pagManualOPId") ||
      formulario()?.querySelector('input[type="hidden"][name="opId"]');
  }

  function campoNumeroOP() {
    return document.getElementById("pagManualNumeroOP");
  }

  function campoLateral() {
    return document.getElementById("pagManualLateral");
  }

  function campoBojo() {
    return document.getElementById("pagManualBojo");
  }

  function valorProcessoSelecionado() {
    const campo = campoProcesso();
    if (!campo) return "";
    if (campo instanceof HTMLSelectElement) {
      return texto(campo.selectedOptions?.[0]?.textContent || campo.value);
    }
    return texto(campo.value);
  }

  function ehSutiaCompleto() {
    return processoCanonico(valorProcessoSelecionado()) === "SUTIA COMPLETO";
  }

  function injetarEstilos() {
    if (document.getElementById("stylePagamentoManualSutia64")) return;
    const style = document.createElement("style");
    style.id = "stylePagamentoManualSutia64";
    style.textContent = `
      #${MODAL_ID} #componentesSutiaPagamentoManual{display:none!important}
      #${MODAL_ID} .pm64-valor-manual-oculto{display:none!important}
      #${BLOCO_ID}{grid-column:1/-1;padding:13px;border:1px solid #c4b5fd;border-radius:14px;background:linear-gradient(180deg,#faf5ff,#fff)}
      #${BLOCO_ID}.hidden{display:none!important}
      #${BLOCO_ID} .pm64-cabecalho strong{display:block;color:#4c1d95;font-size:14px}
      #${BLOCO_ID} .pm64-cabecalho span{display:block;margin-top:3px;color:#64748b;font-size:11px;line-height:1.4}
      #${BLOCO_ID} .pm64-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:11px}
      #${BLOCO_ID} label{margin:0;padding:11px;border:1px solid #e2e8f0;border-radius:11px;background:#fff;color:#334155;font-size:12px;font-weight:900}
      #${BLOCO_ID} select{width:100%;min-height:42px;margin-top:6px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;color:#0f172a;font-weight:800}
      #${RESUMO_ID}{margin-top:10px;padding:10px 11px;border-radius:10px;background:#f5f3ff;color:#5b21b6;font-size:11px;font-weight:800;line-height:1.5}
      #${RESUMO_ID}.erro{border:1px solid #fca5a5;background:#fef2f2;color:#991b1b}
      #${RESUMO_ID}.ok{border:1px solid #86efac;background:#f0fdf4;color:#166534}
      #${MODAL_ID} .pm64-nota-manual{display:block;margin-top:5px;color:#7c3aed;font-size:10px;font-weight:800;line-height:1.35}
      @media(max-width:620px){#${BLOCO_ID} .pm64-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function garantirBloco() {
    const painel = document.getElementById(PAINEL_COMPONENTES_ID);
    const form = formulario();
    if (!form) return null;
    let bloco = document.getElementById(BLOCO_ID);
    if (!bloco) {
      bloco = document.createElement("section");
      bloco.id = BLOCO_ID;
      bloco.className = "hidden";
      bloco.innerHTML = `
        <div class="pm64-cabecalho">
          <strong>Conferência do Sutiã Completo</strong>
          <span>Informe explicitamente se fecho e ponto de luz vieram prontos. Quando lateral e bojo estiverem definidos, o valor será calculado automaticamente.</span>
        </div>
        <div class="pm64-grid">
          <label>Fecho veio pronto?
            <select id="${FECHO_ID}">
              <option value="">Selecione</option>
              <option value="sim">Sim, veio pronto</option>
              <option value="nao">Não veio pronto</option>
            </select>
          </label>
          <label>Ponto de luz veio pronto?
            <select id="${PONTO_ID}">
              <option value="">Selecione</option>
              <option value="sim">Sim, veio pronto</option>
              <option value="nao">Não veio pronto</option>
            </select>
          </label>
        </div>
        <div id="${RESUMO_ID}">Selecione fecho e ponto de luz para conferir o cálculo.</div>`;
      if (painel) painel.insertAdjacentElement("afterend", bloco);
      else form.prepend(bloco);
    }
    return bloco;
  }

  function wrapperValorManual() {
    const input = campoValorManual();
    if (!input) return null;
    return input.closest("label") || input.parentElement;
  }

  function garantirNotaManual() {
    const input = campoValorManual();
    const wrapper = wrapperValorManual();
    if (!input || !wrapper) return;
    if (!wrapper.querySelector(".pm64-nota-manual")) {
      const nota = document.createElement("small");
      nota.className = "pm64-nota-manual";
      nota.textContent = "Este campo aparece somente quando a OP ainda está sem informação de lateral e/ou bojo.";
      wrapper.appendChild(nota);
    }
  }

  function mostrarValorManual(mostrar) {
    const input = campoValorManual();
    const wrapper = wrapperValorManual();
    if (!input || !wrapper) return;
    if (!input.dataset.pm64RequiredOriginal) input.dataset.pm64RequiredOriginal = input.required ? "1" : "0";
    wrapper.classList.toggle("pm64-valor-manual-oculto", !mostrar);
    input.required = mostrar && input.dataset.pm64RequiredOriginal === "1";
    if (!mostrar && calculoAtual) input.value = arred2(calculoAtual.total).toFixed(2);
  }

  async function carregarConfig() {
    if (configCache && Date.now() - configCacheEm < 30000) return configCache;
    const { fs, db } = await firebase();
    const snap = await fs.getDoc(fs.doc(db, "configuracoes", CONFIG_ID));
    const dados = snap.exists() ? snap.data() : {};
    configCache = {
      valorGeral: numero(dados.valorGeral ?? dados.valorBaseGeral ?? 5.5) || 5.5,
      referenciaEspecial: texto(dados.referenciaEspecial || "912") || "912",
      valorReferenciaEspecial: numero(dados.valorReferenciaEspecial ?? dados.valorEspecial ?? 6.5) || 6.5,
      descontoFechoNaoFeito: numero(dados.descontoFechoNaoFeito ?? 0.25),
      descontoPontoLuzNaoFeito: numero(dados.descontoPontoLuzNaoFeito ?? 0.15)
    };
    configCacheEm = Date.now();
    return configCache;
  }

  async function carregarValoresReferencia(referencia) {
    const ref = texto(referencia);
    if (!ref) return { lateral: null, bojo: null };
    const cache = valoresCache.get(ref);
    if (cache && Date.now() - cache.em < 30000) return cache.valor;

    const { fs, db } = await firebase();
    let documentos = [];
    const refNumerica = Number(ref);
    const valoresBusca = Number.isFinite(refNumerica) && String(refNumerica) !== ref ? [ref, refNumerica] : [ref];
    try {
      const consulta = valoresBusca.length > 1
        ? fs.query(fs.collection(db, "precosReferencia"), fs.where("referencia", "in", valoresBusca))
        : fs.query(fs.collection(db, "precosReferencia"), fs.where("referencia", "==", valoresBusca[0]));
      const snap = await fs.getDocs(consulta);
      documentos = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
      console.warn("Consulta direta dos valores não disponível; usando leitura compatível.", error);
      const snap = await fs.getDocs(fs.collection(db, "precosReferencia"));
      documentos = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .filter(item => texto(item.referencia) === ref || numero(item.referencia) === refNumerica);
    }

    const ativos = documentos.filter(item => item.ativo !== false);
    const encontrar = processo => {
      const item = ativos.find(preco => normalizar(preco.processo || preco.servicoNome) === normalizar(processo));
      return item ? numero(item.valor ?? item.valorUnitario ?? item.preco) : null;
    };
    const valor = { lateral: encontrar("LATERAL"), bojo: encontrar("ENCAPAR BOJO") };
    valoresCache.set(ref, { em: Date.now(), valor });
    return valor;
  }

  function chaveCalculo() {
    return [
      texto(campoReferencia()?.value),
      texto(campoQuantidadeChegou()?.value),
      texto(campoLateral()?.value),
      texto(campoBojo()?.value),
      texto(document.getElementById(FECHO_ID)?.value),
      texto(document.getElementById(PONTO_ID)?.value),
      processoCanonico(valorProcessoSelecionado())
    ].join("|");
  }

  function definirResumo(mensagem, classe = "") {
    const resumo = document.getElementById(RESUMO_ID);
    if (!resumo) return;
    resumo.className = classe;
    resumo.textContent = mensagem;
  }

  async function calcularAtual() {
    garantirBloco();
    garantirNotaManual();
    const minhaSequencia = ++sequenciaCalculo;
    calculoAtual = null;
    chaveCalculoAtual = "";

    const completo = ehSutiaCompleto();
    const bloco = document.getElementById(BLOCO_ID);
    const lateral = texto(campoLateral()?.value).toLowerCase();
    const bojo = texto(campoBojo()?.value).toLowerCase();
    const componentesDefinidos = statusDefinido(lateral) && statusDefinido(bojo);

    if (!completo) {
      bloco?.classList.add("hidden");
      mostrarValorManual(true);
      return;
    }

    bloco?.classList.remove("hidden");
    mostrarValorManual(!componentesDefinidos);

    if (!componentesDefinidos) {
      definirResumo("Lateral e/ou bojo ainda não foram informados. O valor total manual permanece disponível.");
      return;
    }

    const fecho = texto(document.getElementById(FECHO_ID)?.value).toLowerCase();
    const ponto = texto(document.getElementById(PONTO_ID)?.value).toLowerCase();
    if (!statusDefinido(fecho) || !statusDefinido(ponto)) {
      definirResumo("Selecione se o fecho e o ponto de luz vieram prontos para concluir o cálculo.");
      return;
    }

    const referencia = texto(campoReferencia()?.value);
    const quantidade = numero(campoQuantidadeChegou()?.value);
    if (!referencia || quantidade <= 0) {
      definirResumo("Aguarde a OP, a referência e a quantidade serem preenchidas.");
      return;
    }

    try {
      const [config, valores] = await Promise.all([carregarConfig(), carregarValoresReferencia(referencia)]);
      if (minhaSequencia !== sequenciaCalculo) return;

      const faltantes = [];
      if (lateral === "sim" && valores.lateral === null) faltantes.push(`LATERAL da referência ${referencia}`);
      if (bojo === "sim" && valores.bojo === null) faltantes.push(`ENCAPAR BOJO da referência ${referencia}`);
      if (faltantes.length) {
        definirResumo(`Não é possível calcular: falta cadastrar ${faltantes.join(" e ")} na aba Processos.`, "erro");
        return;
      }

      const referenciaEspecial = texto(config.referenciaEspecial);
      const valorBase = referencia === referenciaEspecial ? config.valorReferenciaEspecial : config.valorGeral;
      const descontoLateral = lateral === "sim" ? numero(valores.lateral) : 0;
      const descontoBojo = bojo === "sim" ? numero(valores.bojo) : 0;
      const descontoFecho = fecho === "nao" ? config.descontoFechoNaoFeito : 0;
      const descontoPonto = ponto === "nao" ? config.descontoPontoLuzNaoFeito : 0;
      const valorUnitario = arred4(Math.max(0, valorBase - descontoLateral - descontoBojo - descontoFecho - descontoPonto));
      const total = arred2(quantidade * valorUnitario);

      calculoAtual = {
        referencia,
        referenciaEspecialAplicada: referencia === referenciaEspecial,
        valorBaseUnitario: arred4(valorBase),
        lateralPronta: lateral === "sim",
        descontoLateralUnitario: arred4(descontoLateral),
        bojoPronto: bojo === "sim",
        descontoBojoUnitario: arred4(descontoBojo),
        fechoVeioPronto: fecho === "sim",
        descontoFechoUnitario: arred4(descontoFecho),
        pontoLuzVeioPronto: ponto === "sim",
        descontoPontoLuzUnitario: arred4(descontoPonto),
        quantidade,
        valorUnitarioFinal: valorUnitario,
        total
      };
      chaveCalculoAtual = chaveCalculo();
      const inputManual = campoValorManual();
      if (inputManual) inputManual.value = total.toFixed(2);
      mostrarValorManual(false);
      definirResumo(
        `Cálculo automático: ${moeda4(valorBase)} − lateral ${moeda4(descontoLateral)} − bojo ${moeda4(descontoBojo)} − fecho ${moeda4(descontoFecho)} − ponto de luz ${moeda4(descontoPonto)} = ${moeda4(valorUnitario)} por peça. Total: ${moeda2(total)}.`,
        "ok"
      );
    } catch (error) {
      console.error("Não foi possível calcular o pagamento manual do Sutiã Completo.", error);
      if (minhaSequencia === sequenciaCalculo) definirResumo("Não foi possível carregar os valores agora. Tente novamente antes de salvar.", "erro");
    }
  }

  function timestampMs(valor) {
    if (!valor) return 0;
    if (typeof valor.toMillis === "function") return valor.toMillis();
    if (typeof valor.toDate === "function") return valor.toDate().getTime();
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? 0 : data.getTime();
  }

  async function localizarPagamentoRecente(captura) {
    const { fs, db } = await firebase();
    let snap;
    if (captura.opId) {
      snap = await fs.getDocs(fs.query(fs.collection(db, "entregasPagamento"), fs.where("opId", "==", captura.opId)));
    } else {
      snap = await fs.getDocs(fs.query(fs.collection(db, "entregasPagamento"), fs.where("numeroOP", "==", captura.numeroOP)));
    }

    const candidatos = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .filter(item => {
        const processo = processoCanonico(item.processo || item.servicoNome || item.processoMovimentacao);
        const status = normalizar(item.statusPagamento || item.status || "PENDENTE");
        if (processo !== "SUTIA COMPLETO") return false;
        if (["PAGO", "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA"].includes(status) || item.excluido === true) return false;
        const criado = timestampMs(item.criadoEm || item.createdAt || item.atualizadoEm || item.updatedAt);
        return criado >= captura.inicio - 12000;
      })
      .sort((a, b) => timestampMs(b.criadoEm || b.createdAt || b.atualizadoEm || b.updatedAt) - timestampMs(a.criadoEm || a.createdAt || a.atualizadoEm || a.updatedAt));

    return candidatos[0] || null;
  }

  async function aplicarMetadadosPagamento(captura) {
    if (captura.token !== ultimoTokenPatch) return true;
    const pagamento = await localizarPagamentoRecente(captura);
    if (!pagamento) return false;
    const { fs, db, auth } = await firebase();
    const atualizacao = {
      sutiaCompletoFechoPronto: captura.fecho === "sim",
      sutiaCompletoPontoLuzPronto: captura.ponto === "sim",
      fechoVeioPronto: captura.fecho === "sim",
      pontoLuzVeioPronto: captura.ponto === "sim",
      lateralProntaInformada: captura.lateral === "sim",
      bojoProntoInformado: captura.bojo === "sim",
      componentesPagamentoManualVersao: VERSION,
      componentesPagamentoManualAtualizadosEm: fs.serverTimestamp(),
      componentesPagamentoManualAtualizadosPor: auth.currentUser?.uid || ""
    };
    if (captura.calculo) {
      atualizacao.calculoSutiaCompleto = { ...captura.calculo, origem: "pagamento_manual", versao: VERSION };
      atualizacao.valorUnitario = captura.calculo.valorUnitarioFinal;
      atualizacao.subtotal = captura.calculo.total;
      atualizacao.total = captura.calculo.total;
      atualizacao.valorTotal = captura.calculo.total;
      atualizacao.valorManualInformado = false;
      atualizacao.origemCalculo = "automatico_sutia_completo_pagamento_manual";
    } else {
      atualizacao.valorManualInformado = Boolean(captura.valorManual);
      atualizacao.origemCalculo = captura.valorManual ? "valor_manual_componentes_incompletos" : "aguardando_componentes_ou_valor";
    }
    await fs.updateDoc(fs.doc(db, "entregasPagamento", pagamento.id), atualizacao);
    return true;
  }

  function agendarPatch(captura) {
    ultimoTokenPatch = captura.token;
    [900, 1800, 3200, 5200].forEach(atraso => window.setTimeout(async () => {
      if (captura.token !== ultimoTokenPatch) return;
      try {
        const concluiu = await aplicarMetadadosPagamento(captura);
        if (concluiu) ultimoTokenPatch = "";
      } catch (error) {
        console.warn("Pagamento salvo, mas os metadados de fecho/ponto de luz ainda não foram associados.", error);
      }
    }, atraso));
  }

  function prepararSubmit() {
    const form = formulario();
    if (!form || form.dataset.pm64Submit) return;
    form.dataset.pm64Submit = "1";
    form.addEventListener("submit", event => {
      if (!ehSutiaCompleto()) return;

      const lateral = texto(campoLateral()?.value).toLowerCase();
      const bojo = texto(campoBojo()?.value).toLowerCase();
      const fecho = texto(document.getElementById(FECHO_ID)?.value).toLowerCase();
      const ponto = texto(document.getElementById(PONTO_ID)?.value).toLowerCase();
      const componentesDefinidos = statusDefinido(lateral) && statusDefinido(bojo);

      if (!statusDefinido(fecho) || !statusDefinido(ponto)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        avisar("Informe se o fecho e o ponto de luz vieram prontos antes de salvar.");
        document.getElementById(!statusDefinido(fecho) ? FECHO_ID : PONTO_ID)?.focus();
        return;
      }

      if (componentesDefinidos) {
        if (!calculoAtual || chaveCalculoAtual !== chaveCalculo()) {
          event.preventDefault();
          event.stopImmediatePropagation();
          calcularAtual();
          avisar("Aguarde o cálculo automático terminar e clique em salvar novamente.");
          return;
        }
        const inputManual = campoValorManual();
        if (inputManual) inputManual.value = arred2(calculoAtual.total).toFixed(2);
      }

      const captura = {
        token: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        inicio: Date.now(),
        opId: texto(campoOpId()?.value),
        numeroOP: texto(campoNumeroOP()?.value),
        referencia: texto(campoReferencia()?.value),
        lateral,
        bojo,
        fecho,
        ponto,
        valorManual: componentesDefinidos ? "" : texto(campoValorManual()?.value),
        calculo: componentesDefinidos ? { ...calculoAtual } : null
      };
      agendarPatch(captura);
    }, true);
  }

  function configurarEventos() {
    const form = formulario();
    if (!form || form.dataset.pm64Eventos) return;
    form.dataset.pm64Eventos = "1";
    form.addEventListener("change", event => {
      const alvo = event.target;
      if (!alvo) return;
      if ([campoProcesso(), campoLateral(), campoBojo(), document.getElementById(FECHO_ID), document.getElementById(PONTO_ID), campoQuantidadeChegou()].includes(alvo)) {
        calcularAtual();
      }
    });
    form.addEventListener("input", event => {
      if ([campoQuantidadeChegou(), campoReferencia()].includes(event.target)) window.setTimeout(calcularAtual, 0);
    });
  }

  function observarPainel() {
    const painel = document.getElementById(PAINEL_COMPONENTES_ID);
    if (!painel) return false;
    observerPainel?.disconnect();
    observerPainel = new MutationObserver(() => window.setTimeout(calcularAtual, 0));
    observerPainel.observe(painel, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    return true;
  }

  function preparar() {
    const modal = document.getElementById(MODAL_ID);
    const form = formulario();
    if (!modal || !form) return false;
    injetarEstilos();
    garantirBloco();
    garantirNotaManual();
    prepararSubmit();
    configurarEventos();
    observarPainel();
    calcularAtual();
    return true;
  }

  function limparNovaAbertura() {
    calculoAtual = null;
    chaveCalculoAtual = "";
    sequenciaCalculo += 1;
    const fecho = document.getElementById(FECHO_ID);
    const ponto = document.getElementById(PONTO_ID);
    if (fecho) fecho.value = "";
    if (ponto) ponto.value = "";
    window.setTimeout(calcularAtual, 0);
  }

  function iniciar() {
    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      if (preparar() || tentativas >= 40) window.clearInterval(intervalo);
    }, 250);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo?.closest("#btnPagamentoManualFinanceiro")) return;
      [0, 120, 350, 700].forEach(atraso => window.setTimeout(() => {
        preparar();
        if (atraso === 0) limparNovaAbertura();
      }, atraso));
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
