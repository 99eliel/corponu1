(() => {
  "use strict";

  const VERSION = "2026-08-03-alerta-duplicidades-pagamentos-113";
  const FIREBASE_VERSION = "10.12.5";
  const ALERTA_ID = "alertaPagamentosDuplicadosFiltrado113";
  const STYLE_ID = "stylePagamentosDuplicadosFiltrado113";
  const DETALHES_ID = "detalhesPagamentosDuplicados113";
  const CACHE_MS = 20_000;

  if (window.__CORPONU_PAGAMENTOS_DUPLICIDADES_113__ === VERSION) return;
  window.__CORPONU_PAGAMENTOS_DUPLICIDADES_113__ = VERSION;

  let firebasePromise = null;
  let cache = { expiraEm: 0, itens: [] };
  let timer = 0;
  let atualizando = false;
  let observer = null;
  let ultimosGrupos = [];

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  const normalizarOP = valor => texto(valor)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const numero = (valor, padrao = 0) => {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
    const bruto = texto(valor);
    if (!bruto) return padrao;
    const convertido = Number(bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(convertido) ? convertido : padrao;
  };

  const arred2 = valor => Math.round((numero(valor) + Number.EPSILON) * 100) / 100;
  const arred4 = valor => Math.round((numero(valor) + Number.EPSILON) * 10_000) / 10_000;
  const moeda = valor => numero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
  const dataBR = valor => {
    const bruto = texto(valor).slice(0, 10);
    const partes = bruto.split("-");
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : (bruto || "-");
  };
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
    const salvo = normalizar(item?.statusPagamento || item?.status || "PENDENTE");
    if (
      item?.valorPendente === true ||
      item?.valorManualFinanceiroPendente === true ||
      ["SEM VALOR", "SEM_VALOR"].includes(salvo)
    ) return "sem_valor";
    if (["PAGO", "PAGA", "QUITADO", "QUITADA"].includes(salvo)) return "pago";
    return "pendente";
  }

  function pagamentoAtivo(item) {
    const salvo = normalizar(item?.statusPagamento || item?.status || "");
    return item?.excluido !== true &&
      item?.cancelado !== true &&
      ![
        "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA",
        "ESTORNADO", "ESTORNADA"
      ].includes(salvo);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      return { fs, db: fs.getFirestore(appMod.getApp()) };
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
      const chave = normalizar(processoCanonico(input.dataset.processoMultiplo || input.value));
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
      op: normalizarOP(document.getElementById("pagamentoFiltroOP")?.value),
      inicio: texto(document.getElementById("pagamentoDataInicio")?.value),
      fim: texto(document.getElementById("pagamentoDataFim")?.value),
      faccao: normalizar(document.getElementById("pagamentoFiltroFaccao")?.value),
      referencia: normalizar(document.getElementById("pagamentoFiltroReferencia")?.value),
      precoId: texto(document.getElementById("pagamentoFiltroPreco")?.value),
      processos: processosSelecionados()
    };
  }

  function filtroEspecificoAtivo(filtros = filtrosAtuais()) {
    return Boolean(
      filtros.op ||
      filtros.inicio ||
      filtros.fim ||
      filtros.faccao ||
      filtros.referencia ||
      filtros.precoId ||
      filtros.processos.size
    );
  }

  function filtrarSemConsiderarStatus(itens, filtros = filtrosAtuais()) {
    return (itens || []).filter(item => {
      if (!pagamentoAtivo(item)) return false;

      const opItem = normalizarOP(item?.numeroOP || item?.op || item?.numeroOrdem || "");
      if (filtros.op && !opItem.includes(filtros.op)) return false;

      const data = texto(item?.dataEntrega || item?.dataChegada);
      if (filtros.inicio && data < filtros.inicio) return false;
      if (filtros.fim && data > filtros.fim) return false;

      if (filtros.faccao && normalizar(item?.faccao || item?.destino) !== filtros.faccao) return false;
      if (filtros.referencia && normalizar(item?.referencia) !== filtros.referencia) return false;

      if (filtros.processos.size) {
        const processo = normalizar(processoPagamento(item));
        if (!filtros.processos.has(processo)) return false;
      } else if (filtros.precoId) {
        const idItem = texto(item?.precoReferenciaId || item?.servicoId || item?.precoId);
        if (idItem !== filtros.precoId) return false;
      }
      return true;
    });
  }

  function timestampItem(item) {
    const valor = item?.criadoEm || item?.calculadoEm || item?.atualizadoEm;
    if (typeof valor?.toMillis === "function") return valor.toMillis();
    if (Number.isFinite(valor?.seconds)) return valor.seconds * 1000;
    if (Number.isFinite(valor?._seconds)) return valor._seconds * 1000;
    const data = Date.parse(texto(item?.dataEntrega || item?.dataChegada));
    return Number.isFinite(data) ? data : 0;
  }

  function chaveHistoricaEstrita(item) {
    const origemReenvio = normalizar(
      item?.movimentacaoOrigemId ||
      item?.origemRestanteId ||
      item?.restanteOrigemId ||
      ""
    );
    const reenvio = item?.pagamentoReenvio === true || item?.reenvio === true ? "1" : "0";
    return [
      "HIST",
      normalizarOP(item?.numeroOP || item?.op || item?.numeroOrdem),
      normalizar(item?.referencia),
      normalizar(item?.faccao || item?.destino),
      normalizar(processoPagamento(item)),
      texto(item?.dataEntrega || item?.dataChegada).slice(0, 10),
      numero(item?.quantidade).toFixed(4),
      numero(item?.falta).toFixed(4),
      arred4(item?.valorUnitario).toFixed(4),
      arred2(item?.total ?? item?.valorTotal).toFixed(2),
      reenvio,
      origemReenvio
    ].join("|");
  }

  function criarGrupo(itens, tipo, chave) {
    const ordenados = [...itens].sort((a, b) =>
      timestampItem(a) - timestampItem(b) ||
      texto(a?.id).localeCompare(texto(b?.id))
    );
    const principal = ordenados[0] || {};
    const extras = ordenados.slice(1);
    return {
      chave,
      tipo,
      confianca: tipo === "mesma_movimentacao" ? "alta" : "revisar",
      itens: ordenados,
      principal,
      extras,
      quantidadeOrdens: ordenados.length,
      quantidadeExtras: Math.max(ordenados.length - 1, 0),
      valorPotencialRepetido: arred2(extras.reduce(
        (soma, item) => soma + Math.max(0, numero(item?.total ?? item?.valorTotal)),
        0
      )),
      numeroOP: texto(principal?.numeroOP || principal?.op || "-"),
      referencia: texto(principal?.referencia || "-"),
      faccao: texto(principal?.faccao || principal?.destino || "-"),
      processo: processoPagamento(principal) || "-",
      data: texto(principal?.dataEntrega || principal?.dataChegada),
      quantidade: numero(principal?.quantidade),
      movimentacaoId: texto(principal?.movimentacaoId)
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
      grupo.forEach(item => usados.add(texto(item?.id)));
      grupos.push(criarGrupo(grupo, "mesma_movimentacao", `MOV|${movimentacaoId}`));
    });

    const porHistorico = new Map();
    (itens || []).forEach(item => {
      if (usados.has(texto(item?.id))) return;
      const chave = chaveHistoricaEstrita(item);
      if (!porHistorico.has(chave)) porHistorico.set(chave, []);
      porHistorico.get(chave).push(item);
    });

    porHistorico.forEach((grupo, chave) => {
      if (grupo.length < 2) return;
      const movimentos = new Set(grupo.map(item => texto(item?.movimentacaoId)).filter(Boolean));
      if (movimentos.size === 1 && movimentos.values().next().value) return;
      grupos.push(criarGrupo(grupo, "dados_identicos", chave));
    });

    return grupos.sort((a, b) =>
      (a.tipo === "mesma_movimentacao" ? -1 : 1) -
      (b.tipo === "mesma_movimentacao" ? -1 : 1) ||
      b.valorPotencialRepetido - a.valorPotencialRepetido ||
      a.numeroOP.localeCompare(b.numeroOP, "pt-BR", { numeric: true })
    );
  }

  function injetarEstilos() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ALERTA_ID}{
        margin:0 22px 5px;
        padding:16px 18px;
        display:grid;
        grid-template-columns:auto minmax(0,1fr) auto;
        align-items:center;
        gap:15px;
        border:2px solid #dc2626;
        border-radius:15px;
        background:linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%);
        color:#7f1d1d;
        box-shadow:0 8px 22px rgba(185,28,28,.13);
      }
      #${ALERTA_ID}.hidden{display:none!important}
      #${ALERTA_ID}.pag113-ok{
        padding:10px 14px;
        grid-template-columns:auto minmax(0,1fr);
        border-width:1px;
        border-color:#86efac;
        background:#f0fdf4;
        color:#166534;
        box-shadow:none;
      }
      #${ALERTA_ID} .pag113-icone{
        width:48px;height:48px;display:grid;place-items:center;
        border-radius:50%;background:#b91c1c;color:#fff;
        font-size:24px;font-weight:1000;
        box-shadow:0 5px 14px rgba(153,27,27,.22)
      }
      #${ALERTA_ID}.pag113-ok .pag113-icone{
        width:34px;height:34px;background:#16a34a;font-size:18px;box-shadow:none
      }
      #${ALERTA_ID} .pag113-conteudo{min-width:0}
      #${ALERTA_ID} .pag113-titulo{
        display:block;margin:0;color:#991b1b;font-size:16px;
        font-weight:1000;line-height:1.3;text-transform:uppercase
      }
      #${ALERTA_ID}.pag113-ok .pag113-titulo{
        color:#166534;font-size:12px;text-transform:none
      }
      #${ALERTA_ID} .pag113-texto{
        margin:5px 0 0;color:#7f1d1d;font-size:12px;font-weight:800;line-height:1.45
      }
      #${ALERTA_ID}.pag113-ok .pag113-texto{display:none}
      #${ALERTA_ID} .pag113-resumo{
        margin-top:8px;color:#991b1b;font-size:11px;font-weight:900;line-height:1.5
      }
      #${ALERTA_ID}.pag113-ok .pag113-resumo{display:none}
      #${ALERTA_ID} .pag113-acao{
        min-height:42px;padding:9px 13px;border:1px solid #991b1b;
        border-radius:10px;background:#b91c1c;color:#fff;
        font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap
      }
      #${ALERTA_ID} .pag113-acao:hover{background:#991b1b}
      #${ALERTA_ID}.pag113-ok .pag113-acao{display:none}
      #${DETALHES_ID}{
        grid-column:1/-1;
        margin-top:3px;
        padding-top:14px;
        border-top:1px solid #fca5a5;
      }
      #${DETALHES_ID}.hidden{display:none!important}
      #${DETALHES_ID} .pag113-aviso{
        margin:0 0 10px;padding:9px 11px;border-radius:9px;
        background:#fff;color:#7f1d1d;font-size:11px;font-weight:800;line-height:1.45
      }
      #${DETALHES_ID} .pag113-lista{display:grid;gap:9px}
      #${DETALHES_ID} .pag113-grupo{
        padding:11px;border:1px solid #fecaca;border-radius:11px;background:#fff
      }
      #${DETALHES_ID} .pag113-grupo-topo{
        display:flex;align-items:flex-start;justify-content:space-between;gap:10px
      }
      #${DETALHES_ID} .pag113-grupo strong{color:#7f1d1d;font-size:12px}
      #${DETALHES_ID} .pag113-selo{
        padding:4px 7px;border-radius:999px;background:#fee2e2;color:#991b1b;
        font-size:9px;font-weight:1000;white-space:nowrap
      }
      #${DETALHES_ID} .pag113-selo.revisar{background:#ffedd5;color:#9a3412}
      #${DETALHES_ID} .pag113-meta{
        margin-top:6px;color:#475569;font-size:10px;font-weight:800;line-height:1.55
      }
      #${DETALHES_ID} .pag113-ids{
        margin-top:7px;padding:7px 8px;border-radius:7px;background:#f8fafc;
        color:#64748b;font:700 9px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;
        word-break:break-all
      }
      @media(max-width:760px){
        #${ALERTA_ID}{margin:0 14px 5px;grid-template-columns:auto 1fr;padding:14px;gap:11px}
        #${ALERTA_ID} .pag113-icone{width:42px;height:42px;font-size:21px}
        #${ALERTA_ID} .pag113-titulo{font-size:14px}
        #${ALERTA_ID} .pag113-acao{grid-column:1/-1;width:100%}
        #${ALERTA_ID}.pag113-ok{grid-template-columns:auto 1fr}
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
        <div class="pag113-icone" aria-hidden="true">!</div>
        <div class="pag113-conteudo">
          <strong class="pag113-titulo"></strong>
          <p class="pag113-texto"></p>
          <div class="pag113-resumo"></div>
        </div>
        <button class="pag113-acao" type="button" aria-expanded="false">Ver possíveis duplicidades</button>
        <div id="${DETALHES_ID}" class="hidden"></div>
      `;

      const alertaSemValor = document.getElementById("alertaPagamentosSemValorFiltrado108");
      (alertaSemValor || filtros).insertAdjacentElement("afterend", alerta);

      alerta.querySelector(".pag113-acao")?.addEventListener("click", event => {
        const detalhes = document.getElementById(DETALHES_ID);
        if (!detalhes) return;
        const abrir = detalhes.classList.contains("hidden");
        detalhes.classList.toggle("hidden", !abrir);
        event.currentTarget.setAttribute("aria-expanded", abrir ? "true" : "false");
        event.currentTarget.textContent = abrir ? "Ocultar possíveis duplicidades" : "Ver possíveis duplicidades";
      });
    }
    return alerta;
  }

  function renderizarDetalhes(grupos) {
    const detalhes = document.getElementById(DETALHES_ID);
    if (!detalhes) return;

    detalhes.innerHTML = `
      <p class="pag113-aviso">
        Esta verificação é preventiva e não exclui nada. “Mesma movimentação” é um indício forte.
        “Dados idênticos antigos” precisa de conferência, pois pode representar um lançamento legítimo muito parecido.
      </p>
      <div class="pag113-lista">
        ${grupos.map((grupo, indice) => {
          const ids = grupo.itens.map(item => texto(item?.id)).filter(Boolean);
          const movimentos = [...new Set(grupo.itens.map(item => texto(item?.movimentacaoId)).filter(Boolean))];
          const status = grupo.itens.map(item => statusPagamento(item));
          return `
            <article class="pag113-grupo">
              <div class="pag113-grupo-topo">
                <strong>${indice + 1}. OP ${escapar(grupo.numeroOP)} — ${escapar(grupo.processo)}</strong>
                <span class="pag113-selo ${grupo.confianca === "revisar" ? "revisar" : ""}">
                  ${grupo.confianca === "alta" ? "MESMA MOVIMENTAÇÃO" : "REVISAR DADOS IDÊNTICOS"}
                </span>
              </div>
              <div class="pag113-meta">
                Facção: ${escapar(grupo.faccao)} • Referência: ${escapar(grupo.referencia)} •
                Data: ${escapar(dataBR(grupo.data))} • Quantidade: ${grupo.quantidade.toLocaleString("pt-BR")} •
                ${grupo.quantidadeOrdens} ordens encontradas (${grupo.quantidadeExtras} possível(is) repetida(s)) •
                Valor potencialmente repetido: ${escapar(moeda(grupo.valorPotencialRepetido))} •
                Situações: ${escapar(status.join(", "))}
              </div>
              <div class="pag113-ids">
                Pagamentos: ${escapar(ids.join(" | ") || "-")}
                ${movimentos.length ? `<br>Movimentações: ${escapar(movimentos.join(" | "))}` : ""}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderizar(grupos, filtros) {
    const alerta = garantirAlerta();
    if (!alerta) return;

    ultimosGrupos = grupos;
    const temDuplicidades = grupos.length > 0;
    const mostrarOk = !temDuplicidades && filtroEspecificoAtivo(filtros);

    alerta.classList.toggle("hidden", !temDuplicidades && !mostrarOk);
    alerta.classList.toggle("pag113-ok", mostrarOk);
    const detalhes = document.getElementById(DETALHES_ID);
    const botao = alerta.querySelector(".pag113-acao");

    if (mostrarOk) {
      alerta.querySelector(".pag113-icone").textContent = "✓";
      alerta.querySelector(".pag113-titulo").textContent =
        "Verificação concluída: nenhuma ordem de pagamento duplicada foi identificada neste filtro.";
      detalhes?.classList.add("hidden");
      botao?.setAttribute("aria-expanded", "false");
      if (botao) botao.textContent = "Ver possíveis duplicidades";
      return;
    }

    if (!temDuplicidades) return;

    alerta.querySelector(".pag113-icone").textContent = "!";
    const extras = grupos.reduce((soma, grupo) => soma + grupo.quantidadeExtras, 0);
    const valor = arred2(grupos.reduce((soma, grupo) => soma + grupo.valorPotencialRepetido, 0));
    const ops = [...new Set(grupos.map(grupo => grupo.numeroOP).filter(op => op && op !== "-"))];
    const fortes = grupos.filter(grupo => grupo.confianca === "alta").length;
    const revisar = grupos.length - fortes;

    alerta.querySelector(".pag113-titulo").textContent = grupos.length === 1
      ? "Atenção: 1 grupo de possível pagamento duplicado neste filtro"
      : `Atenção: ${grupos.length.toLocaleString("pt-BR")} grupos de possíveis pagamentos duplicados neste filtro`;
    alerta.querySelector(".pag113-texto").textContent =
      "O total exibido pode conter valores repetidos. Confira estes lançamentos antes de confirmar ou imprimir o pagamento.";
    alerta.querySelector(".pag113-resumo").textContent =
      `${extras.toLocaleString("pt-BR")} ordem(ns) possivelmente repetida(s) • ` +
      `Valor potencialmente repetido: ${moeda(valor)} • ` +
      `${fortes} grupo(s) pela mesma movimentação • ${revisar} grupo(s) por dados históricos idênticos` +
      `${ops.length ? ` • OPs: ${ops.slice(0, 12).join(", ")}${ops.length > 12 ? "..." : ""}` : ""}.`;

    renderizarDetalhes(grupos);
    detalhes?.classList.add("hidden");
    botao?.setAttribute("aria-expanded", "false");
    if (botao) botao.textContent = "Ver possíveis duplicidades";
  }

  async function atualizar(forcarServidor = false) {
    if (atualizando || !document.getElementById("pagamentos")) return;
    atualizando = true;
    try {
      injetarEstilos();
      garantirAlerta();
      const filtros = filtrosAtuais();
      const pagamentos = await carregarPagamentos(forcarServidor);
      const filtrados = filtrarSemConsiderarStatus(pagamentos, filtros);
      renderizar(detectarDuplicidades(filtrados), filtros);
    } catch (error) {
      console.warn("Não foi possível verificar duplicidades nos pagamentos filtrados.", error);
    } finally {
      atualizando = false;
    }
  }

  function agendar(forcarServidor = false, atraso = 110) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => atualizar(forcarServidor), atraso);
  }

  function instalarEventos() {
    const filtros = new Set([
      "pagamentoDataInicio",
      "pagamentoDataFim",
      "pagamentoFiltroOP",
      "pagamentoFiltroFaccao",
      "pagamentoFiltroReferencia",
      "pagamentoFiltroPreco",
      "pagamentoFiltroStatus"
    ]);

    document.addEventListener("change", event => {
      const alvo = event.target;
      if (!(alvo instanceof HTMLInputElement || alvo instanceof HTMLSelectElement)) return;
      if (filtros.has(alvo.id) || alvo.matches("[data-processo-multiplo]")) agendar(false, 70);
    }, true);

    let timerOP = 0;
    document.addEventListener("input", event => {
      if (event.target?.id !== "pagamentoFiltroOP") return;
      window.clearTimeout(timerOP);
      timerOP = window.setTimeout(() => agendar(false, 0), 260);
    }, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      if (alvo.closest('.nav-btn[data-page="pagamentos"]')) agendar(false, 400);
      if (alvo.closest("#btnLimparFiltrosPagamento")) agendar(false, 150);
      if (alvo.closest("#btnAtualizarServidor")) {
        cache.expiraEm = 0;
        agendar(true, 500);
      }
      if (alvo.closest(
        "#modalPendenciasValoresFinanceiro button, " +
        "#modalPendenciasValoresFinanceiro [type='submit'], " +
        "#listaEntregasPagamento button"
      )) {
        cache.expiraEm = 0;
        agendar(false, 850);
      }
    }, true);

    document.addEventListener("submit", event => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (
        form.closest("#modalPendenciasValoresFinanceiro") ||
        form.id === "formPrecoReferencia" ||
        form.id === "formPagamentoManualFinanceiro"
      ) {
        cache.expiraEm = 0;
        agendar(false, 1000);
      }
    }, true);

    window.addEventListener("focus", () => agendar(false, 150));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) agendar(false, 150);
    });
  }

  function instalarObserver() {
    const pagina = document.getElementById("pagamentos");
    if (!pagina || observer) return;

    observer = new MutationObserver(mudancas => {
      const relevante = mudancas.some(mudanca => {
        const alvo = mudanca.target instanceof Element ? mudanca.target : mudanca.target?.parentElement;
        return alvo?.closest?.(
          "#listaEntregasPagamento, #pagamentoFiltroProcessosMultiplos, .pagamento-filtros-entregas"
        );
      });
      if (relevante) agendar(false, 130);
    });
    observer.observe(pagina, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["checked", "value"]
    });
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

  window.CorpoNuPagamentosDuplicidades = {
    versao: VERSION,
    atualizar: () => {
      cache.expiraEm = 0;
      return atualizar(true);
    },
    detectar: itens => detectarDuplicidades(Array.isArray(itens) ? itens : []),
    getUltimosGrupos: () => [...ultimosGrupos]
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
