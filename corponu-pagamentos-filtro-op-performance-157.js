(() => {
  "use strict";

  const VERSION = "2026-08-08-pagamentos-filtro-op-performance-157";
  const FB = "10.12.5";
  const INPUT_ID = "pagamentoFiltroOP";
  const TTL_MS = 30000;

  if (window.__CORPONU_PAGAMENTOS_FILTRO_OP_PERFORMANCE__ === VERSION) return;
  window.__CORPONU_PAGAMENTOS_FILTRO_OP_PERFORMANCE__ = VERSION;

  let contextoPromise = null;
  let timer = 0;
  let sequencia = 0;
  let renderizando = false;
  let cache = { chave: "", expiraEm: 0, pagamentos: [] };

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalizarOP = valor => texto(valor).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const numero = (valor, padrao = 0) => {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
    const bruto = texto(valor);
    if (!bruto) return padrao;
    const convertido = Number(bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto);
    return Number.isFinite(convertido) ? convertido : padrao;
  };
  const moeda = valor => numero(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function processoCanonico(valor) {
    const original = texto(valor);
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
    return aliases[chave] || original.toUpperCase();
  }

  function processoPagamento(item) {
    return processoCanonico(item?.processo || item?.servicoNome || item?.processoMovimentacao || "");
  }

  function statusPagamento(item) {
    const salvo = texto(item?.statusPagamento || item?.status || "pendente").toLowerCase();
    if (item?.valorPendente === true || salvo === "sem_valor") return "sem_valor";
    if (["pago", "paga", "quitado", "quitada"].includes(salvo)) return "pago";
    return "pendente";
  }

  function pagamentoAtivo(item) {
    if (!item || item.tipoDocumento === "controle_processo_v2") return false;
    const salvo = texto(item.statusPagamento || item.status).toLowerCase();
    return item.excluido !== true && item.cancelado !== true && ![
      "cancelado", "cancelada", "excluido", "excluida", "estornado", "estornada"
    ].includes(salvo);
  }

  function dataLegivel(item) {
    const valor = texto(item?.dataEntrega || item?.dataChegada);
    const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    const competencia = texto(item?.competencia);
    const mes = competencia.match(/^(\d{4})-(\d{2})$/);
    if (mes) return `${mes[2]}/${mes[1]}`;
    return valor || "-";
  }

  async function contextoFirebase() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      return { fs, db: fs.getFirestore(app) };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  function valoresConsultaOP(valor) {
    const bruto = texto(valor);
    const valores = [];
    if (bruto) valores.push(bruto);
    if (/^\d+$/.test(bruto)) {
      const n = Number(bruto);
      if (Number.isSafeInteger(n)) valores.push(n);
    }
    return valores.filter((item, indice, lista) =>
      lista.findIndex(outro => typeof outro === typeof item && String(outro) === String(item)) === indice
    );
  }

  async function consultarCampo(fs, db, campo, valores, mapa) {
    for (const valor of valores) {
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, "entregasPagamento"),
        fs.where(campo, "==", valor)
      ));
      snap.docs.forEach(doc => mapa.set(doc.id, { id: doc.id, ...doc.data() }));
    }
  }

  async function buscarPagamentosDaOP(op, { forcar = false } = {}) {
    const chave = normalizarOP(op);
    if (!chave) return [];
    if (!forcar && cache.chave === chave && cache.expiraEm > Date.now()) return [...cache.pagamentos];

    const { fs, db } = await contextoFirebase();
    const valores = valoresConsultaOP(op);
    const mapa = new Map();

    await consultarCampo(fs, db, "numeroOP", valores, mapa);
    if (!mapa.size) {
      for (const campo of ["numeroOPExterno", "op", "numeroOrdem"]) {
        await consultarCampo(fs, db, campo, valores, mapa);
        if (mapa.size) break;
      }
    }

    const pagamentos = [...mapa.values()].filter(pagamentoAtivo);
    cache = { chave, expiraEm: Date.now() + TTL_MS, pagamentos };
    return [...pagamentos];
  }

  function processosSelecionados() {
    return new Set([...document.querySelectorAll("[data-processo-multiplo]:checked")]
      .map(input => normalizar(input.dataset.processoMultiplo))
      .filter(Boolean));
  }

  function filtrosAtuais() {
    return {
      op: normalizarOP(document.getElementById(INPUT_ID)?.value),
      inicio: texto(document.getElementById("pagamentoDataInicio")?.value),
      fim: texto(document.getElementById("pagamentoDataFim")?.value),
      faccao: texto(document.getElementById("pagamentoFiltroFaccao")?.value),
      referencia: texto(document.getElementById("pagamentoFiltroReferencia")?.value),
      precoId: texto(document.getElementById("pagamentoFiltroPreco")?.value),
      status: texto(document.getElementById("pagamentoFiltroStatus")?.value || "pendente"),
      processos: processosSelecionados()
    };
  }

  function filtrarPagamentos(pagamentos) {
    const filtros = filtrosAtuais();
    return (pagamentos || []).filter(item => {
      if (!pagamentoAtivo(item)) return false;
      const opItem = normalizarOP(item.numeroOP || item.numeroOPExterno || item.op || item.numeroOrdem || "");
      if (filtros.op && opItem !== filtros.op) return false;
      const data = texto(item.dataEntrega || item.dataChegada);
      if (filtros.inicio && data && data < filtros.inicio) return false;
      if (filtros.fim && data && data > filtros.fim) return false;
      if (filtros.faccao && texto(item.faccao || item.destino) !== filtros.faccao) return false;
      if (filtros.referencia && normalizar(item.referencia) !== normalizar(filtros.referencia)) return false;
      if (filtros.processos.size) {
        if (!filtros.processos.has(normalizar(processoPagamento(item)))) return false;
      } else if (filtros.precoId) {
        const idItem = texto(item.precoReferenciaId || item.servicoId || item.precoId);
        if (idItem !== filtros.precoId) return false;
      }
      const status = statusPagamento(item);
      if (filtros.status === "sem_valor" && status !== "sem_valor") return false;
      if (filtros.status === "pendente" && status !== "pendente") return false;
      if (filtros.status === "pago" && status !== "pago") return false;
      return true;
    });
  }

  function definirTexto(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(valor);
  }

  function renderizar(pagamentos) {
    const grupos = new Map();
    for (const item of pagamentos) {
      const faccao = texto(item.faccao || item.responsavel || item.destino || "SEM FACÇÃO") || "SEM FACÇÃO";
      const referencia = texto(item.referencia || "-") || "-";
      const processo = processoPagamento(item) || "-";
      const unitario = numero(item.valorUnitario);
      const chave = [normalizar(faccao), normalizar(referencia), normalizar(processo), unitario.toFixed(6)].join("|");
      if (!grupos.has(chave)) grupos.set(chave, { faccao, referencia, processo, entregas: 0, quantidade: 0, unitario, total: 0 });
      const grupo = grupos.get(chave);
      grupo.entregas += 1;
      grupo.quantidade += numero(item.quantidade);
      grupo.total += statusPagamento(item) === "sem_valor" ? 0 : numero(item.total);
    }

    const lista = [...grupos.values()].sort((a, b) =>
      a.faccao.localeCompare(b.faccao, "pt-BR", { sensitivity: "base" }) ||
      a.referencia.localeCompare(b.referencia, "pt-BR", { numeric: true }) ||
      a.processo.localeCompare(b.processo, "pt-BR")
    );
    const totalFaccoes = new Set(pagamentos.map(item => normalizar(item.faccao || item.responsavel || item.destino))).size;
    const totalPecas = pagamentos.reduce((soma, item) => soma + numero(item.quantidade), 0);
    const total = pagamentos.reduce((soma, item) => soma + (statusPagamento(item) === "sem_valor" ? 0 : numero(item.total)), 0);

    definirTexto("pagamentoTotalFaccoes", totalFaccoes.toLocaleString("pt-BR"));
    definirTexto("pagamentoTotalEntregas", pagamentos.length.toLocaleString("pt-BR"));
    definirTexto("pagamentoTotalRecebidas", totalPecas.toLocaleString("pt-BR"));
    definirTexto("pagamentoTotalValor", moeda(total));

    const resumo = document.getElementById("listaPagamento");
    if (resumo) resumo.innerHTML = lista.length
      ? lista.map(grupo => `<tr><td><strong>${escapar(grupo.faccao)}</strong></td><td><strong>${escapar(grupo.referencia)}</strong></td><td><strong>${escapar(grupo.processo)}</strong></td><td>${grupo.entregas.toLocaleString("pt-BR")}</td><td><strong>${grupo.quantidade.toLocaleString("pt-BR")}</strong></td><td>${escapar(moeda(grupo.unitario))}</td><td><strong>${escapar(moeda(grupo.total))}</strong></td></tr>`).join("")
      : '<tr><td colspan="7" class="empty">Nenhum pagamento encontrado para esta OP e os filtros selecionados.</td></tr>';

    const entregas = document.getElementById("listaEntregasPagamento");
    if (entregas) entregas.innerHTML = pagamentos.length
      ? [...pagamentos].sort((a, b) => texto(b.dataEntrega || b.dataChegada || b.competencia).localeCompare(texto(a.dataEntrega || a.dataChegada || a.competencia))).map(item => {
          const status = statusPagamento(item);
          const pago = status === "pago";
          const semValor = status === "sem_valor";
          const v2 = item.tipoDocumento === "lancamento_financeiro_v2";
          const faccao = item.faccao || item.responsavel || item.destino || "-";
          const acoes = v2
            ? '<span class="badge pending">Fechamento V2</span>'
            : `<button class="btn btn-sm ${pago || semValor ? "btn-warning" : "btn-success"}" onclick="alternarStatusEntregaPagamento('${escapar(item.id)}')">${pago ? "Reabrir" : semValor ? "Informar valor" : "Pagar"}</button> <button class="btn btn-sm btn-danger" onclick="excluirEntregaPagamento('${escapar(item.id)}')">Excluir</button>`;
          return `<tr><td>${escapar(dataLegivel(item))}</td><td><strong>${escapar(item.numeroOP || item.op || "-")}</strong></td><td><strong>${escapar(item.referencia || "-")}</strong></td><td>${escapar(faccao)}</td><td>${escapar(processoPagamento(item) || "-")}</td><td><strong>${numero(item.quantidade).toLocaleString("pt-BR")}</strong></td><td><strong>${semValor ? "A definir" : escapar(moeda(item.total))}</strong></td><td><span class="badge ${pago ? "ok" : "pending"}${semValor ? " badge-pagamento-sem-valor" : ""}">${pago ? "Pago" : semValor ? "Aguardando valor" : "Pendente"}</span></td><td>${acoes}</td></tr>`;
        }).join("")
      : '<tr><td colspan="9" class="empty">Nenhuma entrega encontrada para esta OP e os filtros selecionados.</td></tr>';

    definirTexto("confPagamentoItens", pagamentos.length.toLocaleString("pt-BR"));
    definirTexto("confPagamentoTotal", moeda(total));
    definirTexto("confPagamentoSemValor", pagamentos.filter(item => statusPagamento(item) === "sem_valor").length.toLocaleString("pt-BR"));
    definirTexto("confPagamentoDuplicados", "0");
  }

  function mostrarCarregando() {
    const tbody = document.getElementById("listaEntregasPagamento");
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="empty">Buscando somente esta OP…</td></tr>';
  }

  async function aplicar({ forcar = false } = {}) {
    const input = document.getElementById(INPUT_ID);
    const op = texto(input?.value);
    if (!normalizarOP(op) || renderizando) return;
    const minhaSequencia = ++sequencia;
    renderizando = true;
    mostrarCarregando();
    try {
      const encontrados = await buscarPagamentosDaOP(op, { forcar });
      if (minhaSequencia !== sequencia || normalizarOP(input?.value) !== normalizarOP(op)) return;
      renderizar(filtrarPagamentos(encontrados));
    } catch (error) {
      console.error("[Corpo Nu 157] Falha no filtro leve por OP.", error);
      const tbody = document.getElementById("listaEntregasPagamento");
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="empty">Não foi possível buscar esta OP. Tente novamente.</td></tr>';
    } finally {
      renderizando = false;
    }
  }

  function agendar(forcar = false, atraso = 300) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => aplicar({ forcar }), atraso);
  }

  function restaurarTelaOriginal() {
    ++sequencia;
    cache = { chave: "", expiraEm: 0, pagamentos: [] };
    const status = document.getElementById("pagamentoFiltroStatus");
    window.setTimeout(() => status?.dispatchEvent(new Event("change", { bubbles: true })), 0);
  }

  document.addEventListener("input", event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== INPUT_ID) return;
    event.stopImmediatePropagation();
    if (normalizarOP(input.value)) agendar(false, 280);
    else restaurarTelaOriginal();
  }, true);

  document.addEventListener("change", event => {
    const alvo = event.target;
    const op = normalizarOP(document.getElementById(INPUT_ID)?.value);
    if (!op || !(alvo instanceof HTMLInputElement || alvo instanceof HTMLSelectElement)) return;
    if (alvo.matches("[data-processo-multiplo]") || [
      "pagamentoDataInicio",
      "pagamentoDataFim",
      "pagamentoFiltroFaccao",
      "pagamentoFiltroReferencia",
      "pagamentoFiltroPreco",
      "pagamentoFiltroStatus"
    ].includes(alvo.id)) {
      event.stopImmediatePropagation();
      agendar(false, 260);
    }
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;
    if (alvo.closest("#btnLimparFiltrosPagamento")) {
      const input = document.getElementById(INPUT_ID);
      if (input) input.value = "";
      restaurarTelaOriginal();
    }
  }, true);
})();