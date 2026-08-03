(() => {
  "use strict";

  const VERSION = "2026-08-03-alerta-pagamentos-sem-valor-108";
  const FIREBASE_VERSION = "10.12.5";
  const ALERTA_ID = "alertaPagamentosSemValorFiltrado108";
  const STYLE_ID = "stylePagamentosSemValorFiltrado108";
  const CACHE_MS = 20_000;

  if (window.__CORPONU_PAGAMENTOS_ALERTA_SEM_VALOR_108__ === VERSION) return;
  window.__CORPONU_PAGAMENTOS_ALERTA_SEM_VALOR_108__ = VERSION;

  let firebasePromise = null;
  let cache = { expiraEm: 0, itens: [] };
  let timer = 0;
  let atualizando = false;
  let observer = null;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const escapar = valor => String(valor ?? "")
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

  function processoPagamento(item) {
    return processoCanonico(
      item?.processo || item?.servicoNome || item?.processoMovimentacao || ""
    );
  }

  function statusPagamento(item) {
    const processo = normalizar(processoPagamento(item));
    const manual = processo === "SUTIA MONTAGEM" || processo === "SUTIA COMPLETO";
    const salvo = texto(item?.statusPagamento || "pendente").toLowerCase();

    if (manual && salvo !== "pago" && item?.valorTotalDefinidoManualmente !== true) {
      return "sem_valor";
    }
    if (
      item?.valorPendente === true ||
      item?.valorManualFinanceiroPendente === true ||
      salvo === "sem_valor"
    ) {
      return "sem_valor";
    }
    return salvo;
  }

  function pagamentoAtivo(item) {
    const status = statusPagamento(item);
    return item?.excluido !== true &&
      item?.cancelado !== true &&
      !["cancelado", "excluido", "estornado"].includes(status);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      return {
        fs,
        db: fs.getFirestore(appMod.getApp())
      };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function carregarPagamentos(forcarServidor = false) {
    if (!forcarServidor && cache.expiraEm > Date.now()) return cache.itens;

    const { fs, db } = await firebase();
    const referencia = fs.collection(db, "entregasPagamento");
    let snapshot = null;

    if (!forcarServidor && typeof fs.getDocsFromCache === "function") {
      try {
        snapshot = await fs.getDocsFromCache(referencia);
      } catch (_) {}
    }

    if (!snapshot || (snapshot.empty && !cache.itens.length)) {
      snapshot = await fs.getDocs(referencia);
    }

    cache = {
      expiraEm: Date.now() + CACHE_MS,
      itens: snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
    };
    return cache.itens;
  }

  function processosSelecionados() {
    const selecionados = new Set();

    document.querySelectorAll("[data-processo-multiplo]:checked").forEach(input => {
      const chave = normalizar(input.dataset.processoMultiplo || input.value);
      if (chave) selecionados.add(chave);
    });

    if (selecionados.size) return selecionados;

    const select = document.getElementById("pagamentoFiltroPreco");
    if (!(select instanceof HTMLSelectElement) || !select.value) return selecionados;

    const rotulo = texto(select.selectedOptions?.[0]?.textContent);
    const partes = rotulo.split(" - ").map(texto).filter(Boolean);
    if (partes.length >= 3) {
      const processo = partes.slice(1, -1).join(" - ");
      const chave = normalizar(processoCanonico(processo));
      if (chave) selecionados.add(chave);
    }
    return selecionados;
  }

  function filtrosAtuais() {
    return {
      inicio: texto(document.getElementById("pagamentoDataInicio")?.value),
      fim: texto(document.getElementById("pagamentoDataFim")?.value),
      faccao: normalizar(document.getElementById("pagamentoFiltroFaccao")?.value),
      referencia: normalizar(document.getElementById("pagamentoFiltroReferencia")?.value),
      processos: processosSelecionados()
    };
  }

  function filtrarSemConsiderarStatus(itens) {
    const filtros = filtrosAtuais();
    return (itens || []).filter(item => {
      if (!pagamentoAtivo(item)) return false;

      const data = texto(item?.dataEntrega || item?.dataChegada);
      if (filtros.inicio && data < filtros.inicio) return false;
      if (filtros.fim && data > filtros.fim) return false;
      if (filtros.faccao && normalizar(item?.faccao) !== filtros.faccao) return false;
      if (filtros.referencia && normalizar(item?.referencia) !== filtros.referencia) return false;
      if (filtros.processos.size) {
        const processo = normalizar(processoPagamento(item));
        if (!filtros.processos.has(processo)) return false;
      }
      return true;
    });
  }

  function deduplicarMovimentacoes(itens) {
    const mapa = new Map();
    (itens || []).forEach(item => {
      const chave = texto(item?.movimentacaoId) || `pagamento:${texto(item?.id)}`;
      if (!mapa.has(chave)) mapa.set(chave, item);
    });
    return [...mapa.values()];
  }

  function injetarEstilos() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ALERTA_ID}{
        margin:0 22px 4px;
        padding:17px 18px;
        display:grid;
        grid-template-columns:auto minmax(0,1fr) auto;
        align-items:center;
        gap:15px;
        border:2px solid #f97316;
        border-radius:15px;
        background:linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%);
        color:#7c2d12;
        box-shadow:0 8px 22px rgba(194,65,12,.12);
      }
      #${ALERTA_ID}.hidden{display:none!important}
      #${ALERTA_ID} .pag108-icone{
        width:48px;height:48px;display:grid;place-items:center;flex:0 0 auto;
        border-radius:50%;background:#ea580c;color:#fff;font-size:25px;font-weight:900;
        box-shadow:0 5px 14px rgba(194,65,12,.22)
      }
      #${ALERTA_ID} .pag108-conteudo{min-width:0}
      #${ALERTA_ID} .pag108-titulo{
        display:block;margin:0;color:#9a3412;font-size:16px;font-weight:1000;line-height:1.25;
        text-transform:uppercase;letter-spacing:.01em
      }
      #${ALERTA_ID} .pag108-texto{margin:5px 0 0;color:#7c2d12;font-size:12px;font-weight:800;line-height:1.45}
      #${ALERTA_ID} .pag108-detalhes{margin-top:8px;color:#9a3412;font-size:11px;font-weight:900;line-height:1.45;word-break:break-word}
      #${ALERTA_ID} .pag108-acao{
        min-height:42px;padding:9px 13px;border:1px solid #c2410c;border-radius:10px;
        background:#c2410c;color:#fff;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap
      }
      #${ALERTA_ID} .pag108-acao:hover{background:#9a3412;border-color:#9a3412}
      #pagamentos .pag108-total-incompleto{border-color:#fb923c!important;background:#fff7ed!important}
      #pagamentos .pag108-total-incompleto span{color:#c2410c!important}
      #pagamentos .pag108-total-incompleto strong{color:#9a3412!important}
      @media(max-width:760px){
        #${ALERTA_ID}{margin:0 14px 4px;grid-template-columns:auto 1fr;padding:14px;gap:11px}
        #${ALERTA_ID} .pag108-icone{width:42px;height:42px;font-size:21px}
        #${ALERTA_ID} .pag108-titulo{font-size:14px}
        #${ALERTA_ID} .pag108-acao{grid-column:1/-1;width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function garantirAlerta() {
    const pagina = document.getElementById("pagamentos");
    const filtros = pagina?.querySelector(".pagamento-filtros-entregas");
    if (!pagina || !filtros) return null;

    let alerta = document.getElementById(ALERTA_ID);
    if (!alerta) {
      alerta = document.createElement("section");
      alerta.id = ALERTA_ID;
      alerta.className = "hidden";
      alerta.setAttribute("role", "alert");
      alerta.setAttribute("aria-live", "polite");
      alerta.innerHTML = `
        <div class="pag108-icone" aria-hidden="true">!</div>
        <div class="pag108-conteudo">
          <strong class="pag108-titulo"></strong>
          <p class="pag108-texto"></p>
          <div class="pag108-detalhes"></div>
        </div>
        <button class="pag108-acao" type="button">Ver pendências de valor</button>
      `;
      filtros.insertAdjacentElement("afterend", alerta);

      alerta.querySelector(".pag108-acao")?.addEventListener("click", () => {
        const botao = document.getElementById("btnAtualizarConferenciaPagamentoFinal") ||
          document.getElementById("btnAbrirPendenciasValoresPagina");
        if (botao instanceof HTMLElement) {
          botao.click();
          return;
        }
        document.getElementById("btnToggleGerenciarValores")?.click();
      });
    }
    return alerta;
  }

  function ajustarCardTotal(temPendencias) {
    const card = document.getElementById("pagamentoTotalValor")?.closest(".pagamento-card");
    const rotulo = card?.querySelector("span");
    if (!(card instanceof HTMLElement) || !(rotulo instanceof HTMLElement)) return;

    if (!rotulo.dataset.pag108Original) rotulo.dataset.pag108Original = texto(rotulo.textContent) || "Total a pagar";
    card.classList.toggle("pag108-total-incompleto", temPendencias);
    rotulo.textContent = temPendencias ? "Total parcial — faltam valores" : rotulo.dataset.pag108Original;
  }

  function renderizar(pendencias) {
    const alerta = garantirAlerta();
    if (!alerta) return;

    const temPendencias = pendencias.length > 0;
    alerta.classList.toggle("hidden", !temPendencias);
    ajustarCardTotal(temPendencias);
    if (!temPendencias) return;

    const quantidade = pendencias.reduce((soma, item) => soma + Math.max(0, Number(item?.quantidade || 0)), 0);
    const ops = [...new Set(pendencias.map(item => texto(item?.numeroOP)).filter(Boolean))];
    const referencias = [...new Set(pendencias.map(item => texto(item?.referencia)).filter(Boolean))];
    const total = pendencias.length;
    const titulo = total === 1
      ? "Atenção: 1 movimentação deste filtro está sem valor definido"
      : `Atenção: ${total.toLocaleString("pt-BR")} movimentações deste filtro estão sem valor definido`;

    const detalhes = [];
    detalhes.push(`${quantidade.toLocaleString("pt-BR")} peça(s) ainda não entram no total exibido.`);
    if (ops.length) detalhes.push(`OPs: ${ops.slice(0, 10).join(", ")}${ops.length > 10 ? "..." : ""}.`);
    if (referencias.length) detalhes.push(`Referências: ${referencias.slice(0, 8).join(", ")}${referencias.length > 8 ? "..." : ""}.`);

    const tituloEl = alerta.querySelector(".pag108-titulo");
    const textoEl = alerta.querySelector(".pag108-texto");
    const detalhesEl = alerta.querySelector(".pag108-detalhes");
    if (tituloEl) tituloEl.textContent = titulo;
    if (textoEl) textoEl.textContent = "O total a pagar abaixo está incompleto e não inclui essas movimentações. Defina os valores antes de fechar ou imprimir o pagamento.";
    if (detalhesEl) detalhesEl.innerHTML = escapar(detalhes.join(" "));
  }

  async function atualizar(forcarServidor = false) {
    if (atualizando) return;
    const pagina = document.getElementById("pagamentos");
    if (!pagina) return;

    atualizando = true;
    try {
      injetarEstilos();
      garantirAlerta();
      const pagamentos = await carregarPagamentos(forcarServidor);
      const filtrados = filtrarSemConsiderarStatus(pagamentos);
      const pendencias = deduplicarMovimentacoes(
        filtrados.filter(item => statusPagamento(item) === "sem_valor")
      );
      renderizar(pendencias);
    } catch (error) {
      console.warn("Não foi possível atualizar o alerta de pagamentos sem valor.", error);
    } finally {
      atualizando = false;
    }
  }

  function agendar(forcarServidor = false, atraso = 120) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => atualizar(forcarServidor), atraso);
  }

  function instalarEventos() {
    const filtros = new Set([
      "pagamentoDataInicio",
      "pagamentoDataFim",
      "pagamentoFiltroFaccao",
      "pagamentoFiltroReferencia",
      "pagamentoFiltroPreco",
      "pagamentoFiltroStatus"
    ]);

    document.addEventListener("change", event => {
      const alvo = event.target;
      if (!(alvo instanceof HTMLInputElement || alvo instanceof HTMLSelectElement)) return;
      if (filtros.has(alvo.id) || alvo.matches("[data-processo-multiplo]")) agendar(false, 80);
    }, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      if (alvo.closest('.nav-btn[data-page="pagamentos"]')) {
        agendar(false, 450);
      }
      if (alvo.closest("#btnLimparFiltrosPagamento")) {
        agendar(false, 160);
      }
      if (alvo.closest("#btnAtualizarServidor")) {
        cache.expiraEm = 0;
        agendar(true, 500);
      }
      if (alvo.closest("#modalPendenciasValoresFinanceiro button, #modalPendenciasValoresFinanceiro [type='submit']")) {
        cache.expiraEm = 0;
        agendar(false, 900);
      }
    }, true);

    document.addEventListener("submit", event => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.closest("#modalPendenciasValoresFinanceiro") || form.id === "formPrecoReferencia") {
        cache.expiraEm = 0;
        agendar(false, 1000);
      }
    }, true);

    window.addEventListener("focus", () => agendar(false, 160));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) agendar(false, 160);
    });
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
    observer.observe(pagina, { childList: true, subtree: true, attributes: true, attributeFilter: ["checked", "value"] });
  }

  function iniciar() {
    injetarEstilos();
    instalarEventos();

    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      garantirAlerta();
      instalarObserver();
      if (document.getElementById("pagamentos") || tentativas >= 30) {
        window.clearInterval(intervalo);
        agendar(false, 300);
      }
    }, 250);
  }

  window.CorpoNuPagamentosAlertaSemValor = {
    versao: VERSION,
    atualizar: () => {
      cache.expiraEm = 0;
      return atualizar(false);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
