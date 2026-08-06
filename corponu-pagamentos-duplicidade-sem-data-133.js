(() => {
  "use strict";

  const VERSION = "2026-08-06-duplicidade-sem-data-133";
  const FIREBASE_VERSION = "10.12.5";
  const ALERTA_ID = "corponuDuplicidadeFiltro133";
  const DETALHES_ID = "corponuDuplicidadeFiltroDetalhes133";
  const STYLE_ID = "corponuDuplicidadeFiltroStyle133";

  if (window.__CORPONU_DUPLICIDADE_SEM_DATA_133__ === VERSION) return;
  window.__CORPONU_DUPLICIDADE_SEM_DATA_133__ = VERSION;

  let firebasePromise = null;
  let pagamentosCache = [];
  let cacheEm = 0;
  let timer = 0;
  let verificando = false;
  let ultimaAssinaturaAvisada = "";

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  const normalizarOP = valor => texto(valor).toUpperCase().replace(/[^A-Z0-9]/g, "");

  function numero(valor, padrao = 0) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
    const bruto = texto(valor).replace(/R\$/gi, "").replace(/\s+/g, "");
    if (!bruto) return padrao;
    const ajustado = bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto;
    const convertido = Number(ajustado.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(convertido) ? convertido : padrao;
  }

  const arred2 = valor => Math.round((numero(valor) + Number.EPSILON) * 100) / 100;
  const moeda = valor => numero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
  const escapar = valor => texto(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function processoCanonico(valor) {
    const original = texto(valor).toUpperCase();
    const chave = normalizar(original);
    const aliases = {
      BOJO: "ENCAPAR BOJO",
      ENCAPAR: "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      ALCA: "ALÇA",
      ALCAS: "ALÇA",
      "MONTAGEM CALCINHA": "CALCINHA MONTAGEM",
      "MONTAR CALCINHA": "CALCINHA MONTAGEM",
      CALCINHA: "CALCINHA COMPLETA",
      "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
      "SUTIA COMPLETO": "SUTIÃ COMPLETO"
    };
    return aliases[chave] || original;
  }

  function processoDoPagamento(item) {
    return processoCanonico(
      item?.processo || item?.servicoNome || item?.processoMovimentacao || item?.nomeProcesso || ""
    );
  }

  function pagamentoAtivo(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    return item?.excluido !== true && item?.cancelado !== true && ![
      "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
    ].includes(status);
  }

  function statusDoPagamento(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "PENDENTE");
    if (item?.valorPendente === true || item?.valorManualFinanceiroPendente === true || [
      "SEM VALOR", "SEM_VALOR", "AGUARDANDO VALOR"
    ].includes(status)) return "Aguardando valor";
    if (["PAGO", "PAGA", "QUITADO", "QUITADA"].includes(status)) return "Pago";
    return "Pendente";
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModulo, firestore]) => {
      if (!appModulo.getApps().length) throw new Error("Firebase ainda não inicializado.");
      return { firestore, db: firestore.getFirestore(appModulo.getApp()) };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function carregarPagamentos(forcarServidor = false) {
    if (!forcarServidor && pagamentosCache.length && Date.now() - cacheEm < 12000) {
      return pagamentosCache;
    }
    const { firestore, db } = await firebase();
    const snapshot = await firestore.getDocs(firestore.collection(db, "entregasPagamento"));
    pagamentosCache = snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }));
    cacheEm = Date.now();
    return pagamentosCache;
  }

  function processoSelecionado() {
    const multiplos = [...document.querySelectorAll("[data-processo-multiplo]:checked")]
      .map(input => processoCanonico(input.dataset.processoMultiplo || input.value))
      .map(normalizar)
      .filter(Boolean);
    if (multiplos.length) return new Set(multiplos);

    const select = document.getElementById("pagamentoFiltroPreco");
    if (!(select instanceof HTMLSelectElement) || !select.value) return new Set();
    const rotulo = texto(select.selectedOptions?.[0]?.textContent);
    const partes = rotulo.split(" - ").map(texto).filter(Boolean);
    if (partes.length >= 3) {
      return new Set([normalizar(processoCanonico(partes.slice(1, -1).join(" - ")))]);
    }
    const simples = normalizar(processoCanonico(rotulo));
    return simples && simples !== "TODOS" ? new Set([simples]) : new Set();
  }

  function filtrosAtuais() {
    return {
      inicio: texto(document.getElementById("pagamentoDataInicio")?.value),
      fim: texto(document.getElementById("pagamentoDataFim")?.value),
      faccao: normalizar(document.getElementById("pagamentoFiltroFaccao")?.value),
      faccaoLabel: texto(document.getElementById("pagamentoFiltroFaccao")?.value),
      referencia: normalizar(document.getElementById("pagamentoFiltroReferencia")?.value),
      referenciaLabel: texto(document.getElementById("pagamentoFiltroReferencia")?.value),
      op: normalizarOP(document.getElementById("pagamentoFiltroOP")?.value),
      processos: processoSelecionado()
    };
  }

  function filtrosAtivos(filtros) {
    return Boolean(
      filtros.inicio || filtros.fim || filtros.faccao || filtros.referencia ||
      filtros.op || filtros.processos.size
    );
  }

  function resumoFiltros(filtros) {
    const partes = [];
    if (filtros.processos.size) partes.push([...filtros.processos].join(" + "));
    if (filtros.faccaoLabel) partes.push(filtros.faccaoLabel.toUpperCase());
    if (filtros.referenciaLabel) partes.push(`REF. ${filtros.referenciaLabel}`);
    if (filtros.op) partes.push(`OP ${filtros.op}`);
    if (filtros.inicio || filtros.fim) partes.push(`${filtros.inicio || "início"} até ${filtros.fim || "hoje"}`);
    return partes.join(" • ") || "filtros atuais";
  }

  function filtrarPagamentos(itens, filtros) {
    return (itens || []).filter(item => {
      if (!pagamentoAtivo(item)) return false;
      const data = texto(item?.dataEntrega || item?.dataChegada).slice(0, 10);
      if (filtros.inicio && data < filtros.inicio) return false;
      if (filtros.fim && data > filtros.fim) return false;
      if (filtros.faccao && normalizar(item?.faccao || item?.destino) !== filtros.faccao) return false;
      if (filtros.referencia && normalizar(item?.referencia) !== filtros.referencia) return false;
      if (filtros.op) {
        const op = normalizarOP(item?.numeroOP || item?.op || item?.numeroOrdem || item?.opId);
        if (!op.includes(filtros.op)) return false;
      }
      if (filtros.processos.size && !filtros.processos.has(normalizar(processoDoPagamento(item)))) return false;
      return true;
    });
  }

  function identidadeReenvio(item) {
    const origem = texto(
      item?.movimentacaoOrigemId || item?.reenvioOrigemId || item?.movimentoOrigemId ||
      item?.origemRestanteId || item?.restanteOrigemId || ""
    );
    const reenvio = item?.pagamentoReenvio === true || item?.reenvio === true || Boolean(origem);
    return reenvio ? `REENVIO:${normalizar(origem || item?.movimentacaoId || item?.id)}` : "ORIGINAL";
  }

  function chaveSemData(item) {
    const op = normalizarOP(item?.opId || item?.numeroOP || item?.op || item?.numeroOrdem);
    const referencia = normalizar(item?.referencia);
    const cor = normalizar(item?.cor);
    const faccao = normalizar(item?.faccao || item?.destino);
    const processo = normalizar(processoDoPagamento(item));
    const quantidade = numero(item?.quantidade ?? item?.quantidadeRecebida);
    const falta = numero(item?.falta);
    if (!op || !processo || !faccao || !(quantidade > 0)) return "";
    return [
      "SEM_DATA", op, referencia, cor, faccao, processo,
      quantidade.toFixed(4), falta.toFixed(4), identidadeReenvio(item)
    ].join("|");
  }

  function timestamp(item) {
    const valor = item?.criadoEm || item?.calculadoEm || item?.atualizadoEm;
    if (typeof valor?.toMillis === "function") return valor.toMillis();
    if (Number.isFinite(valor?.seconds)) return valor.seconds * 1000;
    if (Number.isFinite(valor?._seconds)) return valor._seconds * 1000;
    return Date.parse(texto(item?.dataEntrega || item?.dataChegada)) || 0;
  }

  function criarGrupo(itens, tipo, chave) {
    const ordenados = [...itens].sort((a, b) => timestamp(a) - timestamp(b) || texto(a.id).localeCompare(texto(b.id)));
    const principal = ordenados[0] || {};
    const extras = ordenados.slice(1);
    const datas = [...new Set(ordenados.map(item => texto(item?.dataEntrega || item?.dataChegada).slice(0, 10)).filter(Boolean))];
    return {
      chave,
      tipo,
      confianca: tipo === "mesma_movimentacao" ? "alta" : "revisar",
      itens: ordenados,
      extras,
      numeroOP: texto(principal?.numeroOP || principal?.op || principal?.opId || "-"),
      referencia: texto(principal?.referencia || "-"),
      faccao: texto(principal?.faccao || principal?.destino || "-"),
      processo: processoDoPagamento(principal) || "-",
      quantidade: numero(principal?.quantidade ?? principal?.quantidadeRecebida),
      datas,
      valorExtra: arred2(extras.reduce((soma, item) => soma + Math.max(0, numero(item?.total ?? item?.valorTotal)), 0))
    };
  }

  function detectarDuplicidades(itens) {
    const grupos = [];
    const usados = new Set();
    const porMovimentacao = new Map();

    (itens || []).forEach(item => {
      const movimentacaoId = texto(item?.movimentacaoId);
      if (!movimentacaoId) return;
      if (!porMovimentacao.has(movimentacaoId)) porMovimentacao.set(movimentacaoId, []);
      porMovimentacao.get(movimentacaoId).push(item);
    });

    porMovimentacao.forEach((grupo, movimentacaoId) => {
      if (grupo.length < 2) return;
      grupo.forEach(item => usados.add(texto(item.id)));
      grupos.push(criarGrupo(grupo, "mesma_movimentacao", `MOV:${movimentacaoId}`));
    });

    const porDados = new Map();
    (itens || []).forEach(item => {
      if (usados.has(texto(item.id))) return;
      const chave = chaveSemData(item);
      if (!chave) return;
      if (!porDados.has(chave)) porDados.set(chave, []);
      porDados.get(chave).push(item);
    });

    porDados.forEach((grupo, chave) => {
      if (grupo.length < 2) return;
      grupos.push(criarGrupo(grupo, "dados_iguais_datas_diferentes", chave));
    });

    return grupos.sort((a, b) =>
      (a.confianca === "alta" ? -1 : 1) - (b.confianca === "alta" ? -1 : 1) ||
      b.valorExtra - a.valorExtra ||
      a.numeroOP.localeCompare(b.numeroOP, "pt-BR", { numeric: true })
    );
  }

  function injetarEstilos() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ALERTA_ID}{margin:12px 0 14px;padding:14px 16px;border:1px solid #93c5fd;border-radius:14px;background:#eff6ff;color:#1e3a8a;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center}
      #${ALERTA_ID}.hidden{display:none!important}#${ALERTA_ID}.ok{border-color:#86efac;background:#f0fdf4;color:#166534}#${ALERTA_ID}.erro{border:2px solid #dc2626;background:linear-gradient(135deg,#fef2f2,#fee2e2);color:#7f1d1d;box-shadow:0 8px 24px #b91c1c22}
      #${ALERTA_ID} .icone{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#2563eb;color:#fff;font-weight:1000;font-size:18px}#${ALERTA_ID}.ok .icone{background:#16a34a}#${ALERTA_ID}.erro .icone{background:#b91c1c}
      #${ALERTA_ID} strong{display:block;font-size:13px;font-weight:1000;line-height:1.35}#${ALERTA_ID} p{margin:4px 0 0;font-size:11px;font-weight:750;line-height:1.45;color:inherit}
      #${ALERTA_ID} button{min-height:40px;padding:8px 12px;border:1px solid currentColor;border-radius:10px;background:#fff;color:inherit;font-weight:950;cursor:pointer}#${ALERTA_ID}:not(.erro) button{display:none}
      #${DETALHES_ID}{grid-column:1/-1;border-top:1px solid #fca5a5;padding-top:12px;display:grid;gap:9px}#${DETALHES_ID}.hidden{display:none!important}
      #${DETALHES_ID} article{padding:11px;border:1px solid #fecaca;border-radius:11px;background:#fff}#${DETALHES_ID} .meta{margin-top:7px;color:#475569;font-size:10px;font-weight:800;line-height:1.55}#${DETALHES_ID} .ids{margin-top:7px;padding:7px 8px;border-radius:8px;background:#f8fafc;color:#64748b;font:700 9px/1.5 ui-monospace,Consolas,monospace;word-break:break-all}
      @media(max-width:760px){#${ALERTA_ID}{grid-template-columns:auto 1fr}#${ALERTA_ID} button{grid-column:1/-1;width:100%}}
    `;
    document.head.appendChild(style);
  }

  function garantirAlerta() {
    const filtros = document.querySelector("#pagamentos .pagamento-filtros-entregas");
    if (!filtros) return null;
    document.getElementById("corponuDuplicidadeFiltro127")?.remove();
    let alerta = document.getElementById(ALERTA_ID);
    if (alerta) return alerta;
    alerta = document.createElement("section");
    alerta.id = ALERTA_ID;
    alerta.className = "hidden";
    alerta.setAttribute("role", "status");
    alerta.setAttribute("aria-live", "polite");
    alerta.innerHTML = `
      <div class="icone">⌕</div>
      <div><strong data-titulo></strong><p data-texto></p></div>
      <button type="button" data-ver-detalhes>Ver lançamentos</button>
      <div id="${DETALHES_ID}" class="hidden"></div>
    `;
    filtros.insertAdjacentElement("afterend", alerta);
    alerta.querySelector("[data-ver-detalhes]")?.addEventListener("click", () => {
      alerta.querySelector(`#${DETALHES_ID}`)?.classList.toggle("hidden");
    });
    return alerta;
  }

  function esconderAlerta() {
    const alerta = document.getElementById(ALERTA_ID);
    if (alerta) alerta.className = "hidden";
  }

  function renderizar(filtros, grupos) {
    const alerta = garantirAlerta();
    if (!alerta) return;
    const titulo = alerta.querySelector("[data-titulo]");
    const textoAlerta = alerta.querySelector("[data-texto]");
    const detalhes = alerta.querySelector(`#${DETALHES_ID}`);
    const resumo = resumoFiltros(filtros);

    if (!grupos.length) {
      alerta.className = "ok";
      alerta.querySelector(".icone").textContent = "✓";
      titulo.textContent = `Nenhuma duplicidade encontrada em ${resumo}.`;
      textoAlerta.textContent = "A conferência ignora a diferença de data e preserva reenvios identificados separadamente.";
      detalhes.className = "hidden";
      detalhes.innerHTML = "";
      ultimaAssinaturaAvisada = "";
      return;
    }

    const extras = grupos.reduce((soma, grupo) => soma + grupo.extras.length, 0);
    const valorExtra = arred2(grupos.reduce((soma, grupo) => soma + grupo.valorExtra, 0));
    alerta.className = "erro";
    alerta.querySelector(".icone").textContent = "!";
    titulo.textContent = `${extras} possível(is) pagamento(s) duplicado(s) em ${resumo}.`;
    textoAlerta.textContent = `Possível valor repetido: ${moeda(valorExtra)}. A data diferente não impede mais o alerta.`;
    detalhes.className = "hidden";
    detalhes.innerHTML = grupos.map(grupo => `
      <article>
        <strong>OP ${escapar(grupo.numeroOP)} • Ref. ${escapar(grupo.referencia)} • ${escapar(grupo.processo)} • ${escapar(grupo.faccao)}</strong>
        <div class="meta">Quantidade: ${grupo.quantidade.toLocaleString("pt-BR")} • Datas encontradas: ${escapar(grupo.datas.map(data => data.split("-").reverse().join("/")).join(" e ") || "-")} • ${grupo.confianca === "alta" ? "Mesma movimentação vinculada" : "Mesmos dados com data diferente"}</div>
        <div class="ids">${grupo.itens.map(item => `Pagamento ${escapar(item.id)} | Movimentação ${escapar(item.movimentacaoId || "sem vínculo")} | ${escapar(statusDoPagamento(item))} | ${moeda(item.total ?? item.valorTotal)}`).join("<br>")}</div>
      </article>
    `).join("");

    const assinatura = grupos.map(grupo => grupo.chave).sort().join("||");
    if (assinatura && assinatura !== ultimaAssinaturaAvisada) {
      ultimaAssinaturaAvisada = assinatura;
      const toast = document.getElementById("toast");
      if (toast) {
        toast.textContent = `Atenção: ${extras} possível(is) pagamento(s) duplicado(s) encontrado(s).`;
        toast.classList.remove("hidden");
        clearTimeout(window.__duplicidadeSemDataToast133);
        window.__duplicidadeSemDataToast133 = setTimeout(() => toast.classList.add("hidden"), 6500);
      }
    }
  }

  async function verificar(forcarServidor = false) {
    if (verificando || !document.querySelector("#pagamentos.page.active")) return;
    const filtros = filtrosAtuais();
    if (!filtrosAtivos(filtros)) {
      esconderAlerta();
      return;
    }
    verificando = true;
    try {
      const pagamentos = await carregarPagamentos(forcarServidor);
      const filtrados = filtrarPagamentos(pagamentos, filtros);
      renderizar(filtros, detectarDuplicidades(filtrados));
    } catch (error) {
      console.error("[Duplicidade 133] Falha ao verificar pagamentos.", error);
    } finally {
      verificando = false;
    }
  }

  function agendar(forcarServidor = false) {
    clearTimeout(timer);
    timer = setTimeout(() => verificar(forcarServidor), 180);
  }

  function instalarEventos() {
    document.addEventListener("change", event => {
      const alvo = event.target;
      if (!(alvo instanceof Element)) return;
      if (alvo.matches("#pagamentoFiltroPreco, #pagamentoFiltroFaccao, #pagamentoFiltroReferencia, #pagamentoFiltroOP, #pagamentoDataInicio, #pagamentoDataFim, [data-processo-multiplo]")) {
        agendar(true);
      }
    });
    document.addEventListener("input", event => {
      const alvo = event.target;
      if (!(alvo instanceof Element)) return;
      if (alvo.matches("#pagamentoFiltroFaccao, #pagamentoFiltroReferencia, #pagamentoFiltroOP, #pagamentoDataInicio, #pagamentoDataFim")) agendar(false);
    });
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (alvo?.closest("#btnAtualizarPagamentos, [data-atualizar-pagamentos], #btnLimparFiltrosPagamento")) {
        pagamentosCache = [];
        cacheEm = 0;
        setTimeout(() => agendar(true), 250);
      }
    });
  }

  function iniciar() {
    document.getElementById("corponuDuplicidadeFiltro127")?.remove();
    document.getElementById("corponuDuplicidadeFiltroStyle127")?.remove();
    injetarEstilos();
    instalarEventos();
    const observer = new MutationObserver(() => {
      if (document.querySelector("#pagamentos.page.active")) {
        garantirAlerta();
        agendar(false);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    [300, 800, 1600].forEach(atraso => setTimeout(() => agendar(false), atraso));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();