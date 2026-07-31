(() => {
  "use strict";

  const VERSION = "2026-07-30-pagamentos-multiplos-processos-35";
  const FB = "10.12.5";
  const ID_CONTROLE = "pagamentoFiltroProcessosMultiplos";
  const ID_BOTAO = "btnPagamentoFiltroProcessosMultiplos";
  const ID_PAINEL = "painelPagamentoFiltroProcessosMultiplos";
  const ID_LISTA = "listaPagamentoFiltroProcessosMultiplos";

  if (window.__CORPONU_PAGAMENTOS_MULTIPLOS_PROCESSOS__ === VERSION) return;
  window.__CORPONU_PAGAMENTOS_MULTIPLOS_PROCESSOS__ = VERSION;

  let contextoPromise = null;
  let cache = { expiraEm: 0, pagamentos: [], faccoes: [], perfil: null, usuario: null, contexto: null };
  let selecionados = new Map();
  let renderTimer = 0;
  let renderizando = false;
  let salvandoLote = false;
  let sincronizandoSelect = false;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

  const dataBR = valor => {
    const texto = String(valor || "").trim();
    const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : (texto || "-");
  };

  function processoCanonico(valor) {
    const original = String(valor || "").trim();
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
    const processo = normalizar(processoPagamento(item));
    const manual = processo === "SUTIA MONTAGEM" || processo === "SUTIA COMPLETO";
    const salvo = String(item?.statusPagamento || "pendente").toLowerCase();
    if (manual && salvo !== "pago" && item?.valorTotalDefinidoManualmente !== true) return "sem_valor";
    if (item?.valorPendente === true || salvo === "sem_valor") return "sem_valor";
    return salvo;
  }

  function pagamentoAtivo(item) {
    const status = statusPagamento(item);
    return item?.excluido !== true && !["cancelado", "excluido"].includes(status);
  }

  async function contextoFirebase() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`)
    ]).then(async ([appMod, fs, authMod]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado");
      const app = appMod.getApp();
      const auth = authMod.getAuth(app);
      const db = fs.getFirestore(app);
      let usuario = auth.currentUser;
      if (!usuario) {
        usuario = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("Usuário ainda não autenticado")), 10000);
          const cancelar = authMod.onAuthStateChanged(auth, atual => {
            if (!atual) return;
            clearTimeout(timer);
            cancelar();
            resolve(atual);
          }, reject);
        });
      }
      return { app, auth, db, fs, usuario };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  async function carregarDados(forcar = false) {
    if (!forcar && cache.expiraEm > Date.now() && cache.pagamentos.length) return cache;
    const contexto = await contextoFirebase();
    const { fs, db, usuario } = contexto;
    const perfilSnap = await fs.getDoc(fs.doc(db, "usuarios", usuario.uid));
    const perfil = perfilSnap.exists() ? perfilSnap.data() : {};
    const admin = perfil?.tipo === "admin" && perfil?.ativo === true;
    const financeiro = Boolean(perfil?.ativo === true && (
      admin ||
      perfil?.permissoes?.recursos?.gerenciarValores === true ||
      perfil?.permissoes?.recursos?.marcarPagamentos === true
    ));
    const pagamentosRef = fs.collection(db, "entregasPagamento");
    const consulta = financeiro
      ? pagamentosRef
      : fs.query(pagamentosRef, fs.where("criadoPor", "==", usuario.uid));
    const [pagamentosSnap, faccoesSnap] = await Promise.all([
      fs.getDocs(consulta),
      fs.getDocs(fs.collection(db, "faccoes"))
    ]);
    cache = {
      expiraEm: Date.now() + 12000,
      pagamentos: pagamentosSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })),
      faccoes: faccoesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })),
      perfil,
      usuario,
      contexto,
      admin,
      financeiro
    };
    return cache;
  }

  function filtrosAtuais() {
    return {
      inicio: String(document.getElementById("pagamentoDataInicio")?.value || ""),
      fim: String(document.getElementById("pagamentoDataFim")?.value || ""),
      faccao: String(document.getElementById("pagamentoFiltroFaccao")?.value || ""),
      referencia: String(document.getElementById("pagamentoFiltroReferencia")?.value || ""),
      status: String(document.getElementById("pagamentoFiltroStatus")?.value || "pendente"),
      processos: new Set(selecionados.keys())
    };
  }

  function filtrarPagamentos(pagamentos, filtros = filtrosAtuais()) {
    return (pagamentos || []).filter(item => {
      if (!pagamentoAtivo(item)) return false;
      const data = String(item?.dataEntrega || "");
      if (filtros.inicio && data < filtros.inicio) return false;
      if (filtros.fim && data > filtros.fim) return false;
      if (filtros.faccao && String(item?.faccao || "") !== filtros.faccao) return false;
      if (filtros.referencia && normalizar(item?.referencia) !== normalizar(filtros.referencia)) return false;
      if (filtros.processos.size && !filtros.processos.has(normalizar(processoPagamento(item)))) return false;
      const status = statusPagamento(item);
      if (filtros.status === "sem_valor" && status !== "sem_valor") return false;
      if (filtros.status === "pendente" && status !== "pendente") return false;
      if (filtros.status === "pago" && status !== "pago") return false;
      return true;
    });
  }

  function processosDisponiveis(pagamentos) {
    const mapa = new Map();
    (pagamentos || []).forEach(item => {
      if (!pagamentoAtivo(item)) return;
      const processo = processoPagamento(item);
      const chave = normalizar(processo);
      if (chave && !mapa.has(chave)) mapa.set(chave, processo);
    });
    const prioridade = ["ENCAPAR BOJO", "ALÇA", "CALCINHA MONTAGEM", "CALCINHA COMPLETA", "SUTIÃ MONTAGEM", "SUTIÃ COMPLETO"];
    return [...mapa.entries()].sort((a, b) => {
      const ia = prioridade.findIndex(item => normalizar(item) === a[0]);
      const ib = prioridade.findIndex(item => normalizar(item) === b[0]);
      const pa = ia < 0 ? 999 : ia;
      const pb = ib < 0 ? 999 : ib;
      return pa - pb || a[1].localeCompare(b[1], "pt-BR", { sensitivity: "base" });
    });
  }

  function injetarEstilos() {
    if (document.getElementById("stylePagamentoMultiplosProcessos")) return;
    const style = document.createElement("style");
    style.id = "stylePagamentoMultiplosProcessos";
    style.textContent = `
      #pagamentos #pagamentoFiltroPreco.pag-multi-original{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}
      #${ID_CONTROLE}{position:relative;width:100%;margin-top:6px}
      #${ID_BOTAO}{width:100%;min-height:39px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;font:800 12px/1.2 inherit;cursor:pointer;text-align:left}
      #${ID_BOTAO}:focus,#${ID_BOTAO}.aberto{outline:3px solid rgba(124,58,237,.13);border-color:#8b5cf6}
      #${ID_BOTAO} .pag-multi-seta{color:#64748b;font-size:15px}
      #${ID_PAINEL}{position:absolute;z-index:10020;top:calc(100% + 7px);left:0;width:min(360px,calc(100vw - 36px));padding:10px;border:1px solid #cbd5e1;border-radius:13px;background:#fff;box-shadow:0 18px 45px rgba(15,23,42,.18)}
      #${ID_PAINEL}.hidden{display:none!important}
      .pag-multi-topo{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 2px 9px;border-bottom:1px solid #e2e8f0}
      .pag-multi-topo strong{font-size:12px;color:#0f172a}.pag-multi-topo button{border:0;background:transparent;color:#6d28d9;font-size:11px;font-weight:900;cursor:pointer}
      #${ID_LISTA}{display:grid;gap:4px;max-height:290px;overflow:auto;padding-top:8px}
      .pag-multi-opcao{display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:9px;cursor:pointer;color:#334155;font-size:12px;font-weight:750}
      .pag-multi-opcao:hover{background:#f5f3ff}.pag-multi-opcao input{width:17px;height:17px;accent-color:#7c3aed;flex:0 0 auto}
      .pag-multi-resumo{margin-top:6px;color:#64748b;font-size:10px;font-weight:800;line-height:1.35}
      .pag-multi-resumo strong{color:#5b21b6}
      @media(max-width:720px){#${ID_PAINEL}{position:fixed;left:12px;right:12px;top:auto;bottom:12px;width:auto;max-height:70vh}}
    `;
    document.head.appendChild(style);
  }

  function atualizarTextoControle() {
    const botao = document.getElementById(ID_BOTAO);
    const resumo = document.querySelector(`#${ID_CONTROLE} .pag-multi-resumo`);
    if (!botao) return;
    const nomes = [...selecionados.values()];
    const texto = !nomes.length ? "Todos" : nomes.length === 1 ? nomes[0] : `${nomes.length} processos selecionados`;
    botao.querySelector(".pag-multi-label").textContent = texto;
    if (resumo) resumo.innerHTML = !nomes.length
      ? "Todos os processos serão considerados."
      : `<strong>${nomes.length}</strong> selecionado(s): ${escapar(nomes.join(", "))}`;
  }

  function renderizarOpcoes(lista) {
    const container = document.getElementById(ID_LISTA);
    if (!container) return;
    const chavesValidas = new Set(lista.map(([chave]) => chave));
    [...selecionados.keys()].forEach(chave => {
      if (!chavesValidas.has(chave)) selecionados.delete(chave);
    });
    container.innerHTML = lista.length ? lista.map(([chave, nome]) => `
      <label class="pag-multi-opcao">
        <input type="checkbox" data-processo-multiplo="${escapar(chave)}" ${selecionados.has(chave) ? "checked" : ""}>
        <span>${escapar(nome)}</span>
      </label>`).join("") : '<div class="empty">Nenhum processo encontrado.</div>';
    atualizarTextoControle();
  }

  function abrirFecharPainel(forcar = null) {
    const painel = document.getElementById(ID_PAINEL);
    const botao = document.getElementById(ID_BOTAO);
    if (!painel || !botao) return;
    const abrir = forcar === null ? painel.classList.contains("hidden") : Boolean(forcar);
    painel.classList.toggle("hidden", !abrir);
    botao.classList.toggle("aberto", abrir);
    botao.setAttribute("aria-expanded", String(abrir));
  }

  function sincronizarSelectOriginal() {
    const select = document.getElementById("pagamentoFiltroPreco");
    if (!select || sincronizandoSelect) return;
    sincronizandoSelect = true;
    try {
      let valor = "";
      if (selecionados.size === 1) {
        const chave = [...selecionados.keys()][0];
        const option = [...select.options].find(item => normalizar(item.textContent) === chave);
        valor = option?.value || "";
      }
      select.value = valor;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    } finally {
      sincronizandoSelect = false;
    }
  }

  async function montarControle() {
    const pagina = document.getElementById("pagamentos");
    const select = document.getElementById("pagamentoFiltroPreco");
    if (!pagina || !select) return false;
    injetarEstilos();
    select.classList.add("pag-multi-original");
    let controle = document.getElementById(ID_CONTROLE);
    if (!controle) {
      controle = document.createElement("div");
      controle.id = ID_CONTROLE;
      controle.innerHTML = `
        <button id="${ID_BOTAO}" type="button" aria-haspopup="true" aria-expanded="false"><span class="pag-multi-label">Todos</span><span class="pag-multi-seta">⌄</span></button>
        <div id="${ID_PAINEL}" class="hidden">
          <div class="pag-multi-topo"><strong>Escolha um ou mais processos</strong><button type="button" data-limpar-processos-multiplos>Usar todos</button></div>
          <div id="${ID_LISTA}"></div>
        </div>
        <div class="pag-multi-resumo">Todos os processos serão considerados.</div>`;
      select.insertAdjacentElement("beforebegin", controle);
    }
    try {
      const dados = await carregarDados(false);
      renderizarOpcoes(processosDisponiveis(dados.pagamentos));
    } catch (error) {
      console.warn("Não foi possível carregar os processos do multifiltro.", error);
    }
    return true;
  }

  function localizarFaccao(nome, faccoes) {
    const chave = normalizar(nome);
    const candidatas = (faccoes || []).filter(item => {
      const atual = normalizar(item?.nome);
      return atual === chave || (atual && chave && (atual.includes(chave) || chave.includes(atual)));
    }).sort((a, b) => Number(b?.ativo !== false) - Number(a?.ativo !== false));
    const item = candidatas[0] || {};
    return {
      nome: String(item?.nome || nome || "SEM FACÇÃO").trim(),
      pix: String(item?.chavePix || item?.pix || item?.dadosPagamento?.pix || "").trim(),
      titular: String(item?.titularPix || item?.titular || item?.nomeTitularPix || item?.dadosPagamento?.titular || "").trim(),
      cidade: String(item?.cidade || "").trim(),
      celular: String(item?.celular || item?.telefone || item?.whatsapp || "").trim()
    };
  }

  function chaveDuplicidade(item) {
    if (item?.movimentacaoId) return ["MOV", item.movimentacaoId, item.precoReferenciaId || item.servicoId || "", normalizar(processoPagamento(item))].join("|");
    return ["MANUAL", normalizar(item?.numeroOP), normalizar(item?.referencia), normalizar(item?.faccao), normalizar(processoPagamento(item)), item?.dataEntrega || "", Number(item?.quantidade || 0)].join("|");
  }

  function duplicidades(pagamentos) {
    const mapa = new Map();
    pagamentos.forEach(item => {
      const chave = chaveDuplicidade(item);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(item);
    });
    return [...mapa.values()].filter(itens => itens.length > 1);
  }

  function setTexto(id, texto) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = texto;
  }

  function renderizarTela(pagamentos, faccoes) {
    if (selecionados.size < 2) return;
    const grupos = new Map();
    pagamentos.forEach(item => {
      const faccao = String(item?.faccao || "SEM FACÇÃO").trim() || "SEM FACÇÃO";
      const referencia = String(item?.referencia || "-").trim() || "-";
      const processo = processoPagamento(item) || "-";
      const unitario = Number(item?.valorUnitario || 0);
      const chave = [normalizar(faccao), normalizar(referencia), normalizar(processo), unitario.toFixed(6)].join("|");
      if (!grupos.has(chave)) grupos.set(chave, { faccao, referencia, processo, entregas: 0, quantidade: 0, unitario, total: 0 });
      const grupo = grupos.get(chave);
      grupo.entregas += 1;
      grupo.quantidade += Number(item?.quantidade || 0);
      grupo.total += statusPagamento(item) === "sem_valor" ? 0 : Number(item?.total || 0);
    });
    const listaGrupos = [...grupos.values()].sort((a, b) => a.faccao.localeCompare(b.faccao, "pt-BR", { sensitivity: "base" }) || a.referencia.localeCompare(b.referencia, "pt-BR", { numeric: true }) || a.processo.localeCompare(b.processo, "pt-BR"));
    const totalFaccoes = new Set(pagamentos.map(item => normalizar(item?.faccao))).size;
    const totalPecas = pagamentos.reduce((soma, item) => soma + Number(item?.quantidade || 0), 0);
    const total = pagamentos.reduce((soma, item) => soma + (statusPagamento(item) === "sem_valor" ? 0 : Number(item?.total || 0)), 0);
    setTexto("pagamentoTotalFaccoes", totalFaccoes.toLocaleString("pt-BR"));
    setTexto("pagamentoTotalEntregas", pagamentos.length.toLocaleString("pt-BR"));
    setTexto("pagamentoTotalRecebidas", totalPecas.toLocaleString("pt-BR"));
    setTexto("pagamentoTotalValor", moeda(total));

    const resumo = document.getElementById("listaPagamento");
    if (resumo) resumo.innerHTML = listaGrupos.length ? listaGrupos.map(grupo => `<tr><td><strong>${escapar(grupo.faccao)}</strong></td><td><strong>${escapar(grupo.referencia)}</strong></td><td><strong>${escapar(grupo.processo)}</strong></td><td>${grupo.entregas.toLocaleString("pt-BR")}</td><td><strong>${grupo.quantidade.toLocaleString("pt-BR")}</strong></td><td>${escapar(moeda(grupo.unitario))}</td><td><strong>${escapar(moeda(grupo.total))}</strong></td></tr>`).join("") : '<tr><td colspan="7" class="empty">Nenhum pagamento encontrado para os processos e filtros selecionados.</td></tr>';

    const entregas = document.getElementById("listaEntregasPagamento");
    if (entregas) entregas.innerHTML = pagamentos.length ? [...pagamentos].sort((a, b) => String(b?.dataEntrega || "").localeCompare(String(a?.dataEntrega || ""))).map(item => {
      const status = statusPagamento(item);
      const pago = status === "pago";
      const semValor = status === "sem_valor";
      return `<tr><td>${escapar(dataBR(item?.dataEntrega))}</td><td><strong>${escapar(item?.numeroOP || "-")}</strong></td><td><strong>${escapar(item?.referencia || "-")}</strong></td><td>${escapar(item?.faccao || "-")}</td><td>${escapar(processoPagamento(item) || "-")}</td><td><strong>${Number(item?.quantidade || 0).toLocaleString("pt-BR")}</strong></td><td><strong>${semValor ? "A definir" : escapar(moeda(item?.total))}</strong></td><td><span class="badge ${pago ? "ok" : "pending"}${semValor ? " badge-pagamento-sem-valor" : ""}">${pago ? "Pago" : semValor ? "Aguardando valor" : "Pendente"}</span></td><td><button class="btn btn-sm ${pago || semValor ? "btn-warning" : "btn-success"}" onclick="alternarStatusEntregaPagamento('${escapar(item.id)}')">${pago ? "Reabrir" : semValor ? "Informar valor" : "Pagar"}</button> <button class="btn btn-sm btn-danger" onclick="excluirEntregaPagamento('${escapar(item.id)}')">Excluir</button></td></tr>`;
    }).join("") : '<tr><td colspan="9" class="empty">Nenhuma entrega encontrada para os processos e filtros selecionados.</td></tr>';

    const semValor = pagamentos.filter(item => statusPagamento(item) === "sem_valor");
    const dups = duplicidades(pagamentos);
    const nomes = [...new Set(pagamentos.map(item => String(item?.faccao || "SEM FACÇÃO")))];
    const semPix = nomes.filter(nome => !localizarFaccao(nome, faccoes).pix);
    setTexto("confPagamentoItens", pagamentos.length.toLocaleString("pt-BR"));
    setTexto("confPagamentoTotal", moeda(total));
    setTexto("confPagamentoSemValor", semValor.length.toLocaleString("pt-BR"));
    setTexto("confPagamentoSemPix", semPix.length.toLocaleString("pt-BR"));
    setTexto("confPagamentoDuplicados", dups.length.toLocaleString("pt-BR"));
    const alertas = [];
    if (semValor.length) alertas.push(`${semValor.length} pagamento(s) aguardam definição de valor.`);
    if (semPix.length) alertas.push(`Sem PIX cadastrado: ${semPix.slice(0, 8).join(", ")}${semPix.length > 8 ? "..." : ""}.`);
    if (dups.length) alertas.push(`${dups.length} possível(is) duplicidade(s) foram identificadas.`);
    const caixa = document.getElementById("alertasConferenciaPagamentoFinal");
    if (caixa) caixa.innerHTML = alertas.length ? `<div class="pagamento-final-aviso"><strong>Atenção:</strong><br>${alertas.map(item => `• ${escapar(item)}`).join("<br>")}</div>` : '<div class="pagamento-final-ok"><strong>Conferência concluída:</strong> os processos selecionados estão prontos para relatório ou fechamento.</div>';
  }

  async function renderizarMultifiltro(forcar = false) {
    if (selecionados.size < 2 || renderizando) return;
    renderizando = true;
    try {
      const dados = await carregarDados(forcar);
      renderizarOpcoes(processosDisponiveis(dados.pagamentos));
      renderizarTela(filtrarPagamentos(dados.pagamentos), dados.faccoes);
    } catch (error) {
      console.error("Erro ao aplicar múltiplos processos em Pagamentos.", error);
    } finally {
      renderizando = false;
    }
  }

  function agendarRender(forcar = false, atraso = 180) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => renderizarMultifiltro(forcar), atraso);
  }

  function textoFiltros() {
    const filtros = filtrosAtuais();
    const periodo = filtros.inicio || filtros.fim ? `${dataBR(filtros.inicio) || "-"} até ${dataBR(filtros.fim) || "-"}` : "Todo o período";
    const textoSelect = (id, padrao) => {
      const select = document.getElementById(id);
      return String(select?.options?.[select.selectedIndex]?.textContent || padrao).trim();
    };
    return [`Período: ${periodo}`, `Facção: ${textoSelect("pagamentoFiltroFaccao", "Todas")}`, `Referência: ${textoSelect("pagamentoFiltroReferencia", "Todas")}`, `Processos: ${[...selecionados.values()].join(", ")}`, `Pagamento: ${textoSelect("pagamentoFiltroStatus", "Todos")}`].join(" | ");
  }

  function abrirRelatorio(html) {
    const janela = window.open("", "_blank");
    if (!janela) {
      alert("O navegador bloqueou a impressão. Permita pop-ups e tente novamente.");
      return;
    }
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
  }

  async function relatorioSimplificado() {
    const dados = await carregarDados(true);
    const pagamentos = filtrarPagamentos(dados.pagamentos);
    if (!pagamentos.length) return alert("Não há pagamentos para os filtros selecionados.");
    const mapa = new Map();
    pagamentos.forEach(item => {
      const nome = String(item?.faccao || "SEM FACÇÃO").trim() || "SEM FACÇÃO";
      const chave = normalizar(nome);
      if (!mapa.has(chave)) mapa.set(chave, { nome, valor: 0 });
      mapa.get(chave).valor += statusPagamento(item) === "sem_valor" ? 0 : Number(item?.total || 0);
    });
    const grupos = [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })).map(grupo => ({ ...localizarFaccao(grupo.nome, dados.faccoes), valor: grupo.valor }));
    const total = grupos.reduce((soma, grupo) => soma + grupo.valor, 0);
    const linhas = grupos.map(grupo => `<tr><td>${escapar(grupo.nome)}</td><td class="${grupo.pix ? "" : "sem"}">${escapar(grupo.pix || "NÃO CADASTRADO")}</td><td class="num">${escapar(moeda(grupo.valor))}</td></tr>`).join("");
    abrirRelatorio(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório simplificado de pagamentos</title><style>*{box-sizing:border-box}body{margin:22px;font-family:Arial;color:#0f172a}header{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #111827;padding-bottom:12px}h1{margin:0;font-size:23px}p{margin:5px 0;color:#475569;font-size:11px}.filtros{margin:13px 0;padding:9px 11px;border:1px solid #cbd5e1;background:#f8fafc;border-radius:8px;font-size:10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #94a3b8;padding:9px 10px}th{background:#e2e8f0;text-align:left}.num{text-align:right;font-weight:bold}.sem{color:#b91c1c;background:#fef2f2;font-weight:bold}tfoot td{background:#f8fafc;font-size:14px;font-weight:bold}@page{size:A4 portrait;margin:12mm}@media print{body{margin:0}}</style></head><body><header><div><h1>Relatório simplificado de pagamentos</h1><p>Nome, chave PIX e valor total por facção.</p></div><p><strong>Emitido em:</strong><br>${escapar(new Date().toLocaleString("pt-BR"))}</p></header><div class="filtros"><strong>Filtros:</strong> ${escapar(textoFiltros())}</div><table><thead><tr><th>Nome</th><th>PIX</th><th>Valor</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr><td colspan="2">TOTAL GERAL</td><td class="num">${escapar(moeda(total))}</td></tr></tfoot></table><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));<\/script></body></html>`);
  }

  async function relatorioCompleto() {
    const dados = await carregarDados(true);
    const pagamentos = filtrarPagamentos(dados.pagamentos);
    if (!pagamentos.length) return alert("Não há pagamentos para os filtros selecionados.");
    const mapa = new Map();
    pagamentos.forEach(item => {
      const nome = String(item?.faccao || "SEM FACÇÃO").trim() || "SEM FACÇÃO";
      const chave = normalizar(nome);
      if (!mapa.has(chave)) mapa.set(chave, { nome, itens: [] });
      mapa.get(chave).itens.push(item);
    });
    const secoes = [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })).map(grupo => {
      const cadastro = localizarFaccao(grupo.nome, dados.faccoes);
      const total = grupo.itens.reduce((soma, item) => soma + (statusPagamento(item) === "sem_valor" ? 0 : Number(item?.total || 0)), 0);
      const linhas = grupo.itens.map(item => `<tr><td>${escapar(dataBR(item?.dataEntrega))}</td><td>${escapar(item?.numeroOP || "-")}</td><td>${escapar(item?.referencia || "-")}</td><td>${escapar(processoPagamento(item) || "-")}</td><td class="num">${Number(item?.quantidade || 0).toLocaleString("pt-BR")}</td><td class="num">${statusPagamento(item) === "sem_valor" ? "A definir" : escapar(moeda(item?.valorUnitario))}</td><td class="num">${escapar(moeda(item?.descontoDefeito || 0))}</td><td class="num"><strong>${statusPagamento(item) === "sem_valor" ? "A definir" : escapar(moeda(item?.total))}</strong></td></tr>`).join("");
      return `<section><div class="head"><div><h2>${escapar(cadastro.nome)}</h2><p><strong>PIX:</strong> ${escapar(cadastro.pix || "NÃO CADASTRADO")}</p>${cadastro.titular ? `<p><strong>Titular:</strong> ${escapar(cadastro.titular)}</p>` : ""}</div><div class="right"><p><strong>Total:</strong> ${escapar(moeda(total))}</p></div></div><table><thead><tr><th>Data</th><th>OP</th><th>Ref.</th><th>Processo</th><th>Qtd.</th><th>Valor unit.</th><th>Desconto</th><th>Total</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr><td colspan="7">TOTAL DE ${escapar(cadastro.nome)}</td><td class="num">${escapar(moeda(total))}</td></tr></tfoot></table></section>`;
    }).join("");
    const totalGeral = pagamentos.reduce((soma, item) => soma + (statusPagamento(item) === "sem_valor" ? 0 : Number(item?.total || 0)), 0);
    abrirRelatorio(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório completo de pagamentos</title><style>*{box-sizing:border-box}body{margin:20px;font-family:Arial;color:#0f172a}header{display:flex;justify-content:space-between;border-bottom:3px solid #111827;padding-bottom:12px}h1{margin:0;font-size:23px}p{margin:3px 0;font-size:10px}.filtros{margin:12px 0 16px;padding:9px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px}.head{display:flex;justify-content:space-between;padding:10px 12px;border:1px solid #94a3b8;border-bottom:0;background:#eef2ff}.head h2{margin:0 0 5px;font-size:17px}.right{text-align:right}section{margin-bottom:22px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #94a3b8;padding:6px 7px;font-size:9px}th{background:#e2e8f0;text-align:left}.num{text-align:right;white-space:nowrap}tfoot td{font-weight:bold;background:#f8fafc}@page{size:A4 landscape;margin:9mm}@media print{body{margin:0}thead{display:table-header-group}tr{page-break-inside:avoid}}</style></head><body><header><div><h1>Relatório completo de pagamentos</h1><p>Processos selecionados: ${escapar([...selecionados.values()].join(", "))}</p></div><div class="right"><p><strong>Emitido em:</strong> ${escapar(new Date().toLocaleString("pt-BR"))}</p><p><strong>Total geral:</strong> ${escapar(moeda(totalGeral))}</p></div></header><div class="filtros"><strong>Filtros:</strong> ${escapar(textoFiltros())}</div>${secoes}<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));<\/script></body></html>`);
  }

  async function confirmarPagamentosMultiplos() {
    if (salvandoLote) return;
    salvandoLote = true;
    const botao = document.getElementById("btnMarcarPagamentosFiltrados");
    const texto = botao?.textContent || "Confirmar pagamentos filtrados";
    try {
      if (botao) { botao.disabled = true; botao.textContent = "Confirmando pagamentos..."; }
      const dados = await carregarDados(true);
      if (!dados.admin) return alert("Apenas administrador ativo pode fechar pagamentos.");
      const pagamentos = filtrarPagamentos(dados.pagamentos).filter(item => statusPagamento(item) !== "pago");
      if (!pagamentos.length) return alert("Nenhum pagamento pendente foi encontrado para os processos e filtros selecionados.");
      const semValor = pagamentos.filter(item => statusPagamento(item) === "sem_valor");
      if (semValor.length) return alert(`Fechamento bloqueado: ${semValor.length} pagamento(s) ainda aguardam definição de valor.`);
      const dups = duplicidades(pagamentos);
      if (dups.length) return alert(`Fechamento bloqueado: ${dups.length} possível(is) duplicidade(s) foram identificadas.`);
      if (pagamentos.length > 450) return alert("O filtro possui mais de 450 lançamentos. Reduza o período ou selecione uma facção.");
      const { fs, db, usuario } = dados.contexto;
      for (let inicio = 0; inicio < pagamentos.length; inicio += 400) {
        const batch = fs.writeBatch(db);
        pagamentos.slice(inicio, inicio + 400).forEach(item => batch.set(fs.doc(db, "entregasPagamento", item.id), { statusPagamento: "pago", pagoEm: fs.serverTimestamp(), pagoPor: usuario.uid, atualizadoPor: usuario.uid, atualizadoEm: fs.serverTimestamp() }, { merge: true }));
        await batch.commit();
      }
      const total = pagamentos.reduce((soma, item) => soma + Number(item?.total || 0), 0);
      try {
        await fs.addDoc(fs.collection(db, "logsAlteracoes"), { acao: "pagamentos_multiplos_processos_fechados", tipoAlvo: "entregaPagamento", alvoId: "lote", detalhes: `${pagamentos.length} pagamentos | ${moeda(total)} | ${textoFiltros()}`, usuarioUid: usuario.uid, usuarioNome: dados.perfil?.nome || "", usuarioEmail: dados.perfil?.email || usuario.email || "", usuarioTipo: dados.perfil?.tipo || "admin", criadoEm: fs.serverTimestamp(), versao: VERSION });
      } catch (error) { console.warn("Pagamentos confirmados, mas o log adicional não foi criado.", error); }
      cache.expiraEm = 0;
      alert(`${pagamentos.length} pagamento(s) dos processos selecionados foram marcados como pagos. Total: ${moeda(total)}.`);
      document.getElementById("btnAtualizarServidor")?.click();
      agendarRender(true, 1000);
    } catch (error) {
      console.error("Erro ao confirmar múltiplos processos.", error);
      alert("Não foi possível confirmar os pagamentos. Confira a conexão antes de tentar novamente.");
    } finally {
      salvandoLote = false;
      if (botao) { botao.disabled = false; botao.textContent = texto; }
    }
  }

  function atualizarModalConfirmacao() {
    if (selecionados.size < 2) return;
    setTimeout(() => {
      const filtros = document.getElementById("confirmacaoForteFiltros");
      if (filtros && !document.getElementById("modalConfirmacaoFortePagamentos")?.classList.contains("hidden")) filtros.innerHTML = `<strong>Filtros atuais:</strong><br>${escapar(textoFiltros())}`;
    }, 30);
  }

  function selecionarProcesso(chave, marcado, nome = "") {
    if (marcado) selecionados.set(chave, nome || chave);
    else selecionados.delete(chave);
    atualizarTextoControle();
    sincronizarSelectOriginal();
    if (selecionados.size > 1) agendarRender(false, 260);
  }

  function eventos() {
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.closest(`#${ID_BOTAO}`)) {
        event.preventDefault();
        abrirFecharPainel();
        return;
      }
      if (alvo.closest("[data-limpar-processos-multiplos]")) {
        selecionados.clear();
        document.querySelectorAll("[data-processo-multiplo]").forEach(input => { input.checked = false; });
        atualizarTextoControle();
        sincronizarSelectOriginal();
        abrirFecharPainel(false);
        return;
      }
      if (!alvo.closest(`#${ID_CONTROLE}`)) abrirFecharPainel(false);

      const paginaPagamentos = alvo.closest('.nav-btn[data-page="pagamentos"]');
      if (paginaPagamentos) [150, 500, 1000].forEach(ms => setTimeout(montarControle, ms));

      if (alvo.closest("#btnLimparFiltrosPagamento")) {
        selecionados.clear();
        setTimeout(() => {
          document.querySelectorAll("[data-processo-multiplo]").forEach(input => { input.checked = false; });
          atualizarTextoControle();
        }, 80);
      }

      if (selecionados.size > 1 && alvo.closest("#btnRelatorioPagamentoSimplificado")) {
        event.preventDefault(); event.stopImmediatePropagation(); relatorioSimplificado();
      }
      if (selecionados.size > 1 && alvo.closest("#btnImprimirPagamento")) {
        event.preventDefault(); event.stopImmediatePropagation(); relatorioCompleto();
      }
      if (selecionados.size > 1 && alvo.closest("#btnMarcarPagamentosFiltrados")) {
        if (event.isTrusted === false) {
          event.preventDefault();
          event.stopImmediatePropagation();
          confirmarPagamentosMultiplos();
        } else {
          atualizarModalConfirmacao();
        }
      }

      if (selecionados.size > 1 && (alvo.closest("#btnAtualizarServidor") || alvo.closest("#listaEntregasPagamento button"))) {
        cache.expiraEm = 0;
        agendarRender(false, 1000);
      }
    }, true);

    document.addEventListener("change", event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
      if (input.matches("[data-processo-multiplo]")) {
        const chave = input.dataset.processoMultiplo;
        const nome = input.closest("label")?.querySelector("span")?.textContent?.trim() || chave;
        selecionarProcesso(chave, input.checked, nome);
        return;
      }
      if (!input.closest("#pagamentos") || input.id === "pagamentoFiltroPreco") return;
      if (["pagamentoDataInicio", "pagamentoDataFim", "pagamentoFiltroFaccao", "pagamentoFiltroReferencia", "pagamentoFiltroStatus"].includes(input.id) && selecionados.size > 1) agendarRender(false, 260);
    }, true);

    document.addEventListener("pointerdown", event => {
      if (selecionados.size > 1 && event.target instanceof Element && event.target.closest("#btnMarcarPagamentosFiltrados")) atualizarModalConfirmacao();
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") abrirFecharPainel(false);
    });
  }

  function iniciar() {
    eventos();
    let tentativas = 0;
    const tentar = () => {
      tentativas += 1;
      montarControle().then(pronto => {
        if (!pronto && tentativas < 40) setTimeout(tentar, 300);
      });
    };
    tentar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();