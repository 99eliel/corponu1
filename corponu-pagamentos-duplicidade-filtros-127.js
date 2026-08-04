(() => {
  "use strict";

  const VERSION = "2026-08-04-duplicidade-filtros-127";
  const FIREBASE_VERSION = "10.12.5";
  const ALERTA_ID = "corponuDuplicidadeFiltro127";
  const DETALHES_ID = "corponuDuplicidadeFiltroDetalhes127";
  const STYLE_ID = "corponuDuplicidadeFiltroStyle127";

  if (window.__CORPONU_DUPLICIDADE_FILTROS_127__ === VERSION) return;
  window.__CORPONU_DUPLICIDADE_FILTROS_127__ = VERSION;

  let firebasePromise = null;
  let timer = 0;
  let verificando = false;
  let observer = null;
  let ultimaAssinaturaAvisada = "";
  let ultimosGrupos = [];

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

  function statusDoPagamento(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "PENDENTE");
    if (item?.valorPendente === true || item?.valorManualFinanceiroPendente === true || ["SEM VALOR", "SEM_VALOR", "AGUARDANDO VALOR"].includes(status)) {
      return "Aguardando valor";
    }
    if (["PAGO", "PAGA", "QUITADO", "QUITADA"].includes(status)) return "Pago";
    return "Pendente";
  }

  function pagamentoAtivo(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    return item?.excluido !== true && item?.cancelado !== true && ![
      "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
    ].includes(status);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModulo, firestore]) => {
      if (!appModulo.getApps().length) throw new Error("Firebase ainda não inicializado.");
      return {
        firestore,
        db: firestore.getFirestore(appModulo.getApp())
      };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function carregarPagamentos(forcarServidor = false) {
    const { firestore, db } = await firebase();
    const colecao = firestore.collection(db, "entregasPagamento");

    if (!forcarServidor && typeof firestore.getDocsFromCache === "function") {
      try {
        const cache = await firestore.getDocsFromCache(colecao);
        if (!cache.empty) {
          return cache.docs.map(documento => ({ id: documento.id, ...documento.data() }));
        }
      } catch (_) {}
    }

    const snapshot = await firestore.getDocs(colecao);
    return snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }));
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

  function timestamp(item) {
    const valor = item?.criadoEm || item?.calculadoEm || item?.atualizadoEm;
    if (typeof valor?.toMillis === "function") return valor.toMillis();
    if (Number.isFinite(valor?.seconds)) return valor.seconds * 1000;
    if (Number.isFinite(valor?._seconds)) return valor._seconds * 1000;
    return Date.parse(texto(item?.dataEntrega || item?.dataChegada)) || 0;
  }

  function chaveLancamento(item) {
    const op = normalizarOP(item?.opId || item?.numeroOP || item?.op || item?.numeroOrdem);
    const processo = normalizar(processoDoPagamento(item));
    const faccao = normalizar(item?.faccao || item?.destino);
    const quantidade = numero(item?.quantidade ?? item?.quantidadeRecebida);

    if (!op || !processo || !faccao || !(quantidade > 0)) return "";

    const origemReenvio = normalizar(
      item?.movimentacaoOrigemId || item?.origemRestanteId || item?.restanteOrigemId || ""
    );
    const reenvio = item?.pagamentoReenvio === true || item?.reenvio === true ? "SIM" : "NAO";

    return [
      "LANCAMENTO",
      op,
      normalizar(item?.referencia),
      normalizar(item?.cor),
      faccao,
      processo,
      texto(item?.dataEntrega || item?.dataChegada).slice(0, 10),
      quantidade.toFixed(4),
      numero(item?.falta).toFixed(4),
      reenvio,
      origemReenvio
    ].join("|");
  }

  function criarGrupo(itens, tipo, chave) {
    const ordenados = [...itens].sort((a, b) => timestamp(a) - timestamp(b) || texto(a.id).localeCompare(texto(b.id)));
    const principal = ordenados[0] || {};
    const extras = ordenados.slice(1);
    return {
      chave,
      tipo,
      confianca: tipo === "mesma_movimentacao" ? "alta" : "conferir",
      itens: ordenados,
      principal,
      extras,
      numeroOP: texto(principal?.numeroOP || principal?.op || principal?.opId || "-"),
      referencia: texto(principal?.referencia || "-"),
      faccao: texto(principal?.faccao || principal?.destino || "-"),
      processo: processoDoPagamento(principal) || "-",
      data: texto(principal?.dataEntrega || principal?.dataChegada).slice(0, 10),
      quantidade: numero(principal?.quantidade ?? principal?.quantidadeRecebida),
      valorExtra: arred2(extras.reduce((soma, item) => soma + Math.max(0, numero(item?.total ?? item?.valorTotal)), 0))
    };
  }

  function detectarDuplicidades(itens) {
    const grupos = [];
    const usados = new Set();
    const porMovimentacao = new Map();

    (itens || []).forEach(item => {
      const id = texto(item?.movimentacaoId);
      if (!id) return;
      if (!porMovimentacao.has(id)) porMovimentacao.set(id, []);
      porMovimentacao.get(id).push(item);
    });

    porMovimentacao.forEach((grupo, movimentacaoId) => {
      if (grupo.length < 2) return;
      grupo.forEach(item => usados.add(texto(item.id)));
      grupos.push(criarGrupo(grupo, "mesma_movimentacao", `MOV|${movimentacaoId}`));
    });

    const porLancamento = new Map();
    (itens || []).forEach(item => {
      if (usados.has(texto(item.id))) return;
      const chave = chaveLancamento(item);
      if (!chave) return;
      if (!porLancamento.has(chave)) porLancamento.set(chave, []);
      porLancamento.get(chave).push(item);
    });

    porLancamento.forEach((grupo, chave) => {
      if (grupo.length < 2) return;
      grupos.push(criarGrupo(grupo, "lancamento_identico", chave));
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
      #${DETALHES_ID} article{padding:11px;border:1px solid #fecaca;border-radius:11px;background:#fff}#${DETALHES_ID} .topo{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}#${DETALHES_ID} .selo{padding:4px 7px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:9px;font-weight:1000;white-space:nowrap}#${DETALHES_ID} .selo.revisar{background:#ffedd5;color:#9a3412}
      #${DETALHES_ID} .meta{margin-top:7px;color:#475569;font-size:10px;font-weight:800;line-height:1.55}#${DETALHES_ID} .ids{margin-top:7px;padding:7px 8px;border-radius:8px;background:#f8fafc;color:#64748b;font:700 9px/1.5 ui-monospace,Consolas,monospace;word-break:break-all}
      #listaEntregasPagamento tr.cn-duplicado-127 td{background:#fff1f2!important;border-top-color:#fca5a5!important;border-bottom-color:#fca5a5!important}
      @media(max-width:760px){#${ALERTA_ID}{grid-template-columns:auto 1fr}#${ALERTA_ID} button{grid-column:1/-1;width:100%}}
    `;
    document.head.appendChild(style);
  }

  function garantirAlerta() {
    const filtros = document.querySelector("#pagamentos .pagamento-filtros-entregas");
    if (!filtros) return null;
    let alerta = document.getElementById(ALERTA_ID);
    if (alerta) return alerta;

    alerta = document.createElement("section");
    alerta.id = ALERTA_ID;
    alerta.className = "hidden";
    alerta.setAttribute("role", "status");
    alerta.setAttribute("aria-live", "polite");
    alerta.innerHTML = `
      <div class="icone">⌕</div>
      <div><strong></strong><p></p></div>
      <button type="button" aria-expanded="false">Ver lançamentos</button>
      <div id="${DETALHES_ID}" class="hidden"></div>
    `;
    filtros.insertAdjacentElement("afterend", alerta);
    alerta.querySelector("button")?.addEventListener("click", event => {
      const detalhes = document.getElementById(DETALHES_ID);
      if (!detalhes) return;
      const abrir = detalhes.classList.contains("hidden");
      detalhes.classList.toggle("hidden", !abrir);
      event.currentTarget.textContent = abrir ? "Ocultar lançamentos" : "Ver lançamentos";
      event.currentTarget.setAttribute("aria-expanded", abrir ? "true" : "false");
    });
    return alerta;
  }

  function marcarLinhas(grupos) {
    const ids = new Set(grupos.flatMap(grupo => grupo.itens.map(item => texto(item.id))).filter(Boolean));
    document.querySelectorAll("#listaEntregasPagamento tr").forEach(linha => {
      const html = linha.innerHTML;
      linha.classList.toggle("cn-duplicado-127", [...ids].some(id => html.includes(id)));
    });
  }

  function renderizarDetalhes(grupos) {
    const detalhes = document.getElementById(DETALHES_ID);
    if (!detalhes) return;
    detalhes.innerHTML = grupos.map((grupo, indice) => {
      const ids = grupo.itens.map(item => texto(item.id)).filter(Boolean);
      const movimentos = [...new Set(grupo.itens.map(item => texto(item.movimentacaoId)).filter(Boolean))];
      const situacoes = grupo.itens.map(statusDoPagamento);
      return `
        <article>
          <div class="topo">
            <strong>${indice + 1}. OP ${escapar(grupo.numeroOP)} — ${escapar(grupo.processo)}</strong>
            <span class="selo ${grupo.confianca === "alta" ? "" : "revisar"}">${grupo.confianca === "alta" ? "MESMA MOVIMENTAÇÃO" : "LANÇAMENTOS IGUAIS"}</span>
          </div>
          <div class="meta">
            Facção: ${escapar(grupo.faccao)} • Referência: ${escapar(grupo.referencia)} • Data: ${escapar(grupo.data || "-")} • Quantidade: ${grupo.quantidade.toLocaleString("pt-BR")} • Registros: ${grupo.itens.length} • Possível valor repetido: ${escapar(moeda(grupo.valorExtra))} • Situações: ${escapar(situacoes.join(", "))}
          </div>
          <div class="ids">Pagamentos: ${escapar(ids.join(" | ") || "-")}${movimentos.length ? `<br>Movimentações: ${escapar(movimentos.join(" | "))}` : ""}</div>
        </article>
      `;
    }).join("");
  }

  function toastDuplicidade(mensagem, assinatura) {
    if (!assinatura || assinatura === ultimaAssinaturaAvisada) return;
    ultimaAssinaturaAvisada = assinatura;
    let toast = document.getElementById("corponuDuplicidadeToast127");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "corponuDuplicidadeToast127";
      toast.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:1000010;max-width:min(460px,calc(100vw - 32px));padding:14px 16px;border-radius:13px;background:#991b1b;color:#fff;box-shadow:0 18px 48px #7f1d1d55;font:900 13px/1.45 Arial,sans-serif";
      document.body.appendChild(toast);
    }
    toast.textContent = mensagem;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.remove(), 7000);
  }

  function renderizar(grupos, filtros) {
    const alerta = garantirAlerta();
    if (!alerta) return;
    ultimosGrupos = grupos;
    marcarLinhas(grupos);

    const titulo = alerta.querySelector("strong");
    const descricao = alerta.querySelector("p");
    const detalhes = document.getElementById(DETALHES_ID);
    const botao = alerta.querySelector("button");

    alerta.classList.remove("hidden", "ok", "erro");
    detalhes?.classList.add("hidden");
    botao?.setAttribute("aria-expanded", "false");
    if (botao) botao.textContent = "Ver lançamentos";

    if (!filtrosAtivos(filtros)) {
      alerta.classList.add("hidden");
      ultimaAssinaturaAvisada = "";
      return;
    }

    if (!grupos.length) {
      alerta.classList.add("ok");
      alerta.querySelector(".icone").textContent = "✓";
      titulo.textContent = `Nenhuma duplicidade encontrada em ${resumoFiltros(filtros)}.`;
      descricao.textContent = "A conferência considera pagamentos pendentes, pagos e aguardando valor dentro dos filtros selecionados.";
      ultimaAssinaturaAvisada = "";
      return;
    }

    alerta.classList.add("erro");
    alerta.querySelector(".icone").textContent = "!";
    const extras = grupos.reduce((soma, grupo) => soma + Math.max(grupo.itens.length - 1, 0), 0);
    const valor = arred2(grupos.reduce((soma, grupo) => soma + grupo.valorExtra, 0));
    titulo.textContent = `${extras} possível(is) pagamento(s) duplicado(s) em ${resumoFiltros(filtros)}.`;
    descricao.textContent = `${grupos.length} grupo(s) com lançamentos iguais. Possível valor repetido: ${moeda(valor)}. Confira antes de marcar como pago.`;
    renderizarDetalhes(grupos);

    const assinatura = grupos.map(grupo => grupo.chave).sort().join("||");
    toastDuplicidade(`Atenção: ${extras} possível(is) pagamento(s) duplicado(s) no filtro selecionado.`, assinatura);
  }

  async function verificar(forcarServidor = false) {
    if (verificando || !document.getElementById("pagamentos")) return;
    verificando = true;
    try {
      injetarEstilos();
      const alerta = garantirAlerta();
      const filtros = filtrosAtuais();
      if (!filtrosAtivos(filtros)) {
        renderizar([], filtros);
        return;
      }

      alerta?.classList.remove("hidden", "ok", "erro");
      if (alerta) {
        alerta.querySelector(".icone").textContent = "…";
        alerta.querySelector("strong").textContent = `Verificando duplicidades em ${resumoFiltros(filtros)}...`;
        alerta.querySelector("p").textContent = "Comparando OP, referência, facção, processo, data, quantidade e origem do lançamento.";
      }

      const pagamentos = await carregarPagamentos(forcarServidor);
      const filtrados = filtrarPagamentos(pagamentos, filtros);
      renderizar(detectarDuplicidades(filtrados), filtros);
    } catch (error) {
      console.warn("Não foi possível verificar duplicidades nos filtros de pagamento.", error);
      const alerta = garantirAlerta();
      if (alerta) {
        alerta.classList.remove("hidden", "ok");
        alerta.classList.add("erro");
        alerta.querySelector(".icone").textContent = "!";
        alerta.querySelector("strong").textContent = "Não foi possível concluir a verificação de duplicidade.";
        alerta.querySelector("p").textContent = "Use o botão Atualizar e tente novamente. Nenhum pagamento foi alterado.";
      }
    } finally {
      verificando = false;
    }
  }

  function agendar(forcarServidor = false, atraso = 120) {
    clearTimeout(timer);
    timer = setTimeout(() => verificar(forcarServidor), atraso);
  }

  function instalarEventos() {
    const ids = new Set([
      "pagamentoDataInicio", "pagamentoDataFim", "pagamentoFiltroOP",
      "pagamentoFiltroFaccao", "pagamentoFiltroReferencia", "pagamentoFiltroPreco",
      "pagamentoFiltroStatus"
    ]);

    document.addEventListener("change", event => {
      const alvo = event.target;
      if (!(alvo instanceof HTMLInputElement || alvo instanceof HTMLSelectElement)) return;
      if (ids.has(alvo.id) || alvo.matches("[data-processo-multiplo]")) agendar(false, 60);
    }, true);

    let timerInput = 0;
    document.addEventListener("input", event => {
      if (event.target?.id !== "pagamentoFiltroOP") return;
      clearTimeout(timerInput);
      timerInput = setTimeout(() => agendar(false, 0), 250);
    }, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.closest('.nav-btn[data-page="pagamentos"]')) agendar(false, 450);
      if (alvo.closest("#btnLimparFiltrosPagamento")) agendar(false, 150);
      if (alvo.closest("#btnAtualizarServidor")) agendar(true, 550);
      if (alvo.closest("#listaEntregasPagamento button, #modalPendenciasValoresFinanceiro button")) agendar(true, 900);
    }, true);

    document.addEventListener("submit", event => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.closest("#modalPendenciasValoresFinanceiro") || form.id === "formPrecoReferencia" || form.id === "formPagamentoManualFinanceiro") {
        agendar(true, 1000);
      }
    }, true);
  }

  function instalarObserver() {
    const pagina = document.getElementById("pagamentos");
    if (!pagina || observer) return;
    observer = new MutationObserver(mudancas => {
      const relevante = mudancas.some(mudanca => {
        const alvo = mudanca.target instanceof Element ? mudanca.target : mudanca.target?.parentElement;
        return alvo?.closest?.("#listaEntregasPagamento, #pagamentoFiltroProcessosMultiplos, .pagamento-filtros-entregas");
      });
      if (relevante) agendar(false, 140);
    });
    observer.observe(pagina, { childList: true, subtree: true });
  }

  function iniciar() {
    injetarEstilos();
    instalarEventos();
    let tentativas = 0;
    const intervalo = setInterval(() => {
      tentativas += 1;
      garantirAlerta();
      instalarObserver();
      if (document.getElementById("pagamentos") || tentativas >= 30) {
        clearInterval(intervalo);
        agendar(false, 350);
      }
    }, 250);
  }

  window.CorpoNuPagamentosDuplicidades = {
    versao: VERSION,
    atualizar: () => verificar(true),
    detectar: itens => detectarDuplicidades(Array.isArray(itens) ? itens : []),
    getUltimosGrupos: () => [...ultimosGrupos]
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
