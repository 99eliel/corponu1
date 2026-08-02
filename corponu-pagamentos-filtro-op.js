(() => {
  "use strict";

  const VERSION = "2026-08-02-filtro-op-pagamentos-90";
  const FB = "10.12.5";
  const INPUT_ID = "pagamentoFiltroOP";
  const LABEL_ID = "pagamentoFiltroOPLabel";

  if (window.__CORPONU_PAGAMENTOS_FILTRO_OP__ === VERSION) return;
  window.__CORPONU_PAGAMENTOS_FILTRO_OP__ = VERSION;

  let contextoPromise = null;
  let cache = { expiraEm: 0, pagamentos: [], faccoes: [], perfil: null, contexto: null, admin: false };
  let renderTimer = 0;
  let renderizando = false;
  let confirmandoLote = false;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const normalizarOP = valor => texto(valor)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

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
    const convertido = Number(bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto);
    return Number.isFinite(convertido) ? convertido : padrao;
  };

  const moeda = valor => numero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

  const dataBR = valor => {
    const bruto = texto(valor).slice(0, 10);
    const partes = bruto.split("-");
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : (bruto || "-");
  };

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
    const salvo = texto(item?.statusPagamento || item?.status).toLowerCase();
    return item?.excluido !== true && item?.cancelado !== true && ![
      "cancelado", "cancelada", "excluido", "excluida", "estornado", "estornada"
    ].includes(salvo);
  }

  function opAtiva() {
    return Boolean(normalizarOP(document.getElementById(INPUT_ID)?.value));
  }

  function avisar(mensagem, erro = false) {
    const toast = document.getElementById("toast");
    if (!toast) {
      window.alert(mensagem);
      return;
    }
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = erro ? "#991b1b" : "#166534";
    window.clearTimeout(window.__corponuFiltroOP90Toast);
    window.__corponuFiltroOP90Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 5500);
  }

  async function contextoFirebase() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`)
    ]).then(async ([appMod, fs, authMod]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      const auth = authMod.getAuth(app);
      const db = fs.getFirestore(app);
      let usuario = auth.currentUser;
      if (!usuario) {
        usuario = await new Promise((resolve, reject) => {
          const timer = window.setTimeout(() => reject(new Error("Usuário ainda não autenticado.")), 10000);
          const cancelar = authMod.onAuthStateChanged(auth, atual => {
            if (!atual) return;
            window.clearTimeout(timer);
            cancelar();
            resolve(atual);
          }, reject);
        });
      }
      return { fs, auth, db, usuario };
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
    const admin = perfil?.tipo === "admin" && perfil?.ativo !== false;
    const financeiro = Boolean(perfil?.ativo !== false && (
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
      pagamentos: pagamentosSnap.docs.map(item => ({ id: item.id, ...item.data() })),
      faccoes: faccoesSnap.docs.map(item => ({ id: item.id, ...item.data() })),
      perfil,
      contexto,
      admin
    };
    return cache;
  }

  function processosSelecionados() {
    const marcados = [...document.querySelectorAll("[data-processo-multiplo]:checked")]
      .map(input => normalizar(input.dataset.processoMultiplo))
      .filter(Boolean);
    return new Set(marcados);
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

  function filtrarPagamentos(pagamentos, filtros = filtrosAtuais()) {
    return (pagamentos || []).filter(item => {
      if (!pagamentoAtivo(item)) return false;
      const opItem = normalizarOP(item?.numeroOP || item?.op || item?.numeroOrdem || "");
      if (filtros.op && !opItem.includes(filtros.op)) return false;
      const data = texto(item?.dataEntrega || item?.dataChegada);
      if (filtros.inicio && data < filtros.inicio) return false;
      if (filtros.fim && data > filtros.fim) return false;
      if (filtros.faccao && texto(item?.faccao || item?.destino) !== filtros.faccao) return false;
      if (filtros.referencia && normalizar(item?.referencia) !== normalizar(filtros.referencia)) return false;
      if (filtros.processos.size) {
        if (!filtros.processos.has(normalizar(processoPagamento(item)))) return false;
      } else if (filtros.precoId) {
        const idItem = texto(item?.precoReferenciaId || item?.servicoId || item?.precoId);
        if (idItem !== filtros.precoId) return false;
      }
      const status = statusPagamento(item);
      if (filtros.status === "sem_valor" && status !== "sem_valor") return false;
      if (filtros.status === "pendente" && status !== "pendente") return false;
      if (filtros.status === "pago" && status !== "pago") return false;
      return true;
    });
  }

  function localizarFaccao(nome, faccoes) {
    const chave = normalizar(nome);
    const candidatas = (faccoes || []).filter(item => {
      const atual = normalizar(item?.nome || item?.nomeFaccao || item?.razaoSocial);
      return atual === chave || (atual && chave && (atual.includes(chave) || chave.includes(atual)));
    }).sort((a, b) => Number(b?.ativo !== false) - Number(a?.ativo !== false));
    const item = candidatas[0] || {};
    return {
      nome: texto(item?.nome || item?.nomeFaccao || nome || "SEM FACÇÃO"),
      pix: texto(item?.chavePix || item?.pix || item?.dadosPagamento?.pix),
      titular: texto(item?.titularPix || item?.titular || item?.nomeTitularPix || item?.dadosPagamento?.titular)
    };
  }

  function chaveDuplicidade(item) {
    if (item?.movimentacaoId) {
      return ["MOV", item.movimentacaoId, item.precoReferenciaId || item.servicoId || "", normalizar(processoPagamento(item))].join("|");
    }
    return [
      "MANUAL",
      normalizarOP(item?.numeroOP),
      normalizar(item?.referencia),
      normalizar(item?.faccao),
      normalizar(processoPagamento(item)),
      item?.dataEntrega || "",
      numero(item?.quantidade)
    ].join("|");
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

  function definirTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = String(valor);
  }

  function renderizarTela(pagamentos, faccoes) {
    const grupos = new Map();
    pagamentos.forEach(item => {
      const faccao = texto(item?.faccao || item?.destino || "SEM FACÇÃO") || "SEM FACÇÃO";
      const referencia = texto(item?.referencia || "-") || "-";
      const processo = processoPagamento(item) || "-";
      const unitario = numero(item?.valorUnitario);
      const chave = [normalizar(faccao), normalizar(referencia), normalizar(processo), unitario.toFixed(6)].join("|");
      if (!grupos.has(chave)) grupos.set(chave, {
        faccao, referencia, processo, entregas: 0, quantidade: 0, unitario, total: 0
      });
      const grupo = grupos.get(chave);
      grupo.entregas += 1;
      grupo.quantidade += numero(item?.quantidade);
      grupo.total += statusPagamento(item) === "sem_valor" ? 0 : numero(item?.total);
    });

    const listaGrupos = [...grupos.values()].sort((a, b) =>
      a.faccao.localeCompare(b.faccao, "pt-BR", { sensitivity: "base" }) ||
      a.referencia.localeCompare(b.referencia, "pt-BR", { numeric: true }) ||
      a.processo.localeCompare(b.processo, "pt-BR")
    );
    const totalFaccoes = new Set(pagamentos.map(item => normalizar(item?.faccao || item?.destino))).size;
    const totalPecas = pagamentos.reduce((soma, item) => soma + numero(item?.quantidade), 0);
    const total = pagamentos.reduce((soma, item) => soma + (statusPagamento(item) === "sem_valor" ? 0 : numero(item?.total)), 0);

    definirTexto("pagamentoTotalFaccoes", totalFaccoes.toLocaleString("pt-BR"));
    definirTexto("pagamentoTotalEntregas", pagamentos.length.toLocaleString("pt-BR"));
    definirTexto("pagamentoTotalRecebidas", totalPecas.toLocaleString("pt-BR"));
    definirTexto("pagamentoTotalValor", moeda(total));

    const resumo = document.getElementById("listaPagamento");
    if (resumo) resumo.innerHTML = listaGrupos.length
      ? listaGrupos.map(grupo => `<tr><td><strong>${escapar(grupo.faccao)}</strong></td><td><strong>${escapar(grupo.referencia)}</strong></td><td><strong>${escapar(grupo.processo)}</strong></td><td>${grupo.entregas.toLocaleString("pt-BR")}</td><td><strong>${grupo.quantidade.toLocaleString("pt-BR")}</strong></td><td>${escapar(moeda(grupo.unitario))}</td><td><strong>${escapar(moeda(grupo.total))}</strong></td></tr>`).join("")
      : '<tr><td colspan="7" class="empty">Nenhum pagamento encontrado para a OP e os filtros selecionados.</td></tr>';

    const entregas = document.getElementById("listaEntregasPagamento");
    if (entregas) entregas.innerHTML = pagamentos.length
      ? [...pagamentos].sort((a, b) => texto(b?.dataEntrega || b?.dataChegada).localeCompare(texto(a?.dataEntrega || a?.dataChegada))).map(item => {
          const status = statusPagamento(item);
          const pago = status === "pago";
          const semValor = status === "sem_valor";
          const data = item?.dataEntrega || item?.dataChegada;
          return `<tr><td>${escapar(dataBR(data))}</td><td><strong>${escapar(item?.numeroOP || item?.op || "-")}</strong></td><td><strong>${escapar(item?.referencia || "-")}</strong></td><td>${escapar(item?.faccao || item?.destino || "-")}</td><td>${escapar(processoPagamento(item) || "-")}</td><td><strong>${numero(item?.quantidade).toLocaleString("pt-BR")}</strong></td><td><strong>${semValor ? "A definir" : escapar(moeda(item?.total))}</strong></td><td><span class="badge ${pago ? "ok" : "pending"}${semValor ? " badge-pagamento-sem-valor" : ""}">${pago ? "Pago" : semValor ? "Aguardando valor" : "Pendente"}</span></td><td><button class="btn btn-sm ${pago || semValor ? "btn-warning" : "btn-success"}" onclick="alternarStatusEntregaPagamento('${escapar(item.id)}')">${pago ? "Reabrir" : semValor ? "Informar valor" : "Pagar"}</button> <button class="btn btn-sm btn-danger" onclick="excluirEntregaPagamento('${escapar(item.id)}')">Excluir</button></td></tr>`;
        }).join("")
      : '<tr><td colspan="9" class="empty">Nenhuma entrega encontrada para a OP e os filtros selecionados.</td></tr>';

    const semValor = pagamentos.filter(item => statusPagamento(item) === "sem_valor");
    const dups = duplicidades(pagamentos);
    const nomes = [...new Set(pagamentos.map(item => texto(item?.faccao || item?.destino || "SEM FACÇÃO")))];
    const semPix = nomes.filter(nome => !localizarFaccao(nome, faccoes).pix);
    definirTexto("confPagamentoItens", pagamentos.length.toLocaleString("pt-BR"));
    definirTexto("confPagamentoTotal", moeda(total));
    definirTexto("confPagamentoSemValor", semValor.length.toLocaleString("pt-BR"));
    definirTexto("confPagamentoSemPix", semPix.length.toLocaleString("pt-BR"));
    definirTexto("confPagamentoDuplicados", dups.length.toLocaleString("pt-BR"));
  }

  async function renderizarFiltroOP(forcar = false) {
    if (!opAtiva() || renderizando) return;
    renderizando = true;
    try {
      const dados = await carregarDados(forcar);
      renderizarTela(filtrarPagamentos(dados.pagamentos), dados.faccoes);
    } catch (error) {
      console.error("Erro ao aplicar filtro por OP em Pagamentos.", error);
      avisar("Não foi possível aplicar o filtro por OP. Nenhum dado foi alterado.", true);
    } finally {
      renderizando = false;
    }
  }

  function agendarRender(forcar = false, atraso = 420) {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(() => renderizarFiltroOP(forcar), atraso);
  }

  function restaurarTelaOriginal() {
    window.clearTimeout(renderTimer);
    const status = document.getElementById("pagamentoFiltroStatus");
    if (status) status.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function montarCampo() {
    const filtros = document.querySelector("#pagamentos .pagamento-filtros-entregas");
    if (!filtros) return false;
    if (document.getElementById(INPUT_ID)) return true;

    const label = document.createElement("label");
    label.id = LABEL_ID;
    label.innerHTML = `Nº OP
      <input id="${INPUT_ID}" type="text" inputmode="numeric" autocomplete="off" placeholder="Digite a OP" aria-label="Filtrar pagamentos pelo número da OP">`;

    const faccao = document.getElementById("pagamentoFiltroFaccao")?.closest("label");
    if (faccao) faccao.insertAdjacentElement("beforebegin", label);
    else filtros.prepend(label);
    return true;
  }

  function textoFiltros() {
    const filtros = filtrosAtuais();
    const periodo = filtros.inicio || filtros.fim
      ? `${filtros.inicio ? dataBR(filtros.inicio) : "-"} até ${filtros.fim ? dataBR(filtros.fim) : "-"}`
      : "Todo o período";
    const textoSelect = (id, padrao) => {
      const select = document.getElementById(id);
      return texto(select?.options?.[select.selectedIndex]?.textContent || padrao);
    };
    const processos = filtros.processos.size
      ? [...filtros.processos].join(", ")
      : textoSelect("pagamentoFiltroPreco", "Todos");
    return [
      `OP: ${texto(document.getElementById(INPUT_ID)?.value) || "Todas"}`,
      `Período: ${periodo}`,
      `Facção: ${textoSelect("pagamentoFiltroFaccao", "Todas")}`,
      `Referência: ${textoSelect("pagamentoFiltroReferencia", "Todas")}`,
      `Processos: ${processos || "Todos"}`,
      `Pagamento: ${textoSelect("pagamentoFiltroStatus", "Todos")}`
    ].join(" | ");
  }

  function abrirRelatorio(html) {
    const janela = window.open("", "_blank");
    if (!janela) {
      window.alert("O navegador bloqueou a impressão. Permita pop-ups e tente novamente.");
      return;
    }
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
  }

  async function relatorioSimplificado() {
    const dados = await carregarDados(true);
    const pagamentos = filtrarPagamentos(dados.pagamentos);
    if (!pagamentos.length) return window.alert("Não há pagamentos para a OP e os filtros selecionados.");
    const mapa = new Map();
    pagamentos.forEach(item => {
      const nome = texto(item?.faccao || item?.destino || "SEM FACÇÃO") || "SEM FACÇÃO";
      const chave = normalizar(nome);
      if (!mapa.has(chave)) mapa.set(chave, { nome, valor: 0 });
      mapa.get(chave).valor += statusPagamento(item) === "sem_valor" ? 0 : numero(item?.total);
    });
    const grupos = [...mapa.values()]
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
      .map(grupo => ({ ...localizarFaccao(grupo.nome, dados.faccoes), valor: grupo.valor }));
    const total = grupos.reduce((soma, grupo) => soma + grupo.valor, 0);
    const linhas = grupos.map(grupo => `<tr><td>${escapar(grupo.nome)}</td><td class="${grupo.pix ? "" : "sem"}">${escapar(grupo.pix || "NÃO CADASTRADO")}</td><td class="num">${escapar(moeda(grupo.valor))}</td></tr>`).join("");
    abrirRelatorio(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório simplificado de pagamentos</title><style>*{box-sizing:border-box}body{margin:22px;font-family:Arial;color:#0f172a}header{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #111827;padding-bottom:12px}h1{margin:0;font-size:23px}p{margin:5px 0;color:#475569;font-size:11px}.filtros{margin:13px 0;padding:9px 11px;border:1px solid #cbd5e1;background:#f8fafc;border-radius:8px;font-size:10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #94a3b8;padding:9px 10px}th{background:#e2e8f0;text-align:left}.num{text-align:right;font-weight:bold}.sem{color:#b91c1c;background:#fef2f2;font-weight:bold}tfoot td{background:#f8fafc;font-size:14px;font-weight:bold}@page{size:A4 portrait;margin:12mm}@media print{body{margin:0}}</style></head><body><header><div><h1>Relatório simplificado de pagamentos</h1><p>Nome, chave PIX e valor total por facção.</p></div><p><strong>Emitido em:</strong><br>${escapar(new Date().toLocaleString("pt-BR"))}</p></header><div class="filtros"><strong>Filtros:</strong> ${escapar(textoFiltros())}</div><table><thead><tr><th>Nome</th><th>PIX</th><th>Valor</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr><td colspan="2">TOTAL GERAL</td><td class="num">${escapar(moeda(total))}</td></tr></tfoot></table><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));<\/script></body></html>`);
  }

  async function relatorioCompleto() {
    const dados = await carregarDados(true);
    const pagamentos = filtrarPagamentos(dados.pagamentos);
    if (!pagamentos.length) return window.alert("Não há pagamentos para a OP e os filtros selecionados.");
    const mapa = new Map();
    pagamentos.forEach(item => {
      const nome = texto(item?.faccao || item?.destino || "SEM FACÇÃO") || "SEM FACÇÃO";
      const chave = normalizar(nome);
      if (!mapa.has(chave)) mapa.set(chave, { nome, itens: [] });
      mapa.get(chave).itens.push(item);
    });
    const secoes = [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })).map(grupo => {
      const cadastro = localizarFaccao(grupo.nome, dados.faccoes);
      const total = grupo.itens.reduce((soma, item) => soma + (statusPagamento(item) === "sem_valor" ? 0 : numero(item?.total)), 0);
      const linhas = grupo.itens.map(item => `<tr><td>${escapar(dataBR(item?.dataEntrega || item?.dataChegada))}</td><td>${escapar(item?.numeroOP || item?.op || "-")}</td><td>${escapar(item?.referencia || "-")}</td><td>${escapar(processoPagamento(item) || "-")}</td><td class="num">${numero(item?.quantidade).toLocaleString("pt-BR")}</td><td class="num">${statusPagamento(item) === "sem_valor" ? "A definir" : escapar(moeda(item?.valorUnitario))}</td><td class="num">${escapar(moeda(item?.descontoDefeito || 0))}</td><td class="num"><strong>${statusPagamento(item) === "sem_valor" ? "A definir" : escapar(moeda(item?.total))}</strong></td></tr>`).join("");
      return `<section><div class="head"><div><h2>${escapar(cadastro.nome)}</h2><p><strong>PIX:</strong> ${escapar(cadastro.pix || "NÃO CADASTRADO")}</p>${cadastro.titular ? `<p><strong>Titular:</strong> ${escapar(cadastro.titular)}</p>` : ""}</div><div class="right"><p><strong>Total:</strong> ${escapar(moeda(total))}</p></div></div><table><thead><tr><th>Data</th><th>OP</th><th>Ref.</th><th>Processo</th><th>Qtd.</th><th>Valor unit.</th><th>Desconto</th><th>Total</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr><td colspan="7">TOTAL DE ${escapar(cadastro.nome)}</td><td class="num">${escapar(moeda(total))}</td></tr></tfoot></table></section>`;
    }).join("");
    const totalGeral = pagamentos.reduce((soma, item) => soma + (statusPagamento(item) === "sem_valor" ? 0 : numero(item?.total)), 0);
    abrirRelatorio(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório completo de pagamentos</title><style>*{box-sizing:border-box}body{margin:20px;font-family:Arial;color:#0f172a}header{display:flex;justify-content:space-between;border-bottom:3px solid #111827;padding-bottom:12px}h1{margin:0;font-size:23px}p{margin:3px 0;font-size:10px}.filtros{margin:12px 0 16px;padding:9px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px}.head{display:flex;justify-content:space-between;padding:10px 12px;border:1px solid #94a3b8;border-bottom:0;background:#eef2ff}.head h2{margin:0 0 5px;font-size:17px}.right{text-align:right}section{margin-bottom:22px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #94a3b8;padding:6px 7px;font-size:9px}th{background:#e2e8f0;text-align:left}.num{text-align:right;white-space:nowrap}tfoot td{font-weight:bold;background:#f8fafc}@page{size:A4 landscape;margin:9mm}@media print{body{margin:0}thead{display:table-header-group}tr{page-break-inside:avoid}}</style></head><body><header><div><h1>Relatório completo de pagamentos</h1><p>Filtro por OP aplicado</p></div><div class="right"><p><strong>Emitido em:</strong> ${escapar(new Date().toLocaleString("pt-BR"))}</p><p><strong>Total geral:</strong> ${escapar(moeda(totalGeral))}</p></div></header><div class="filtros"><strong>Filtros:</strong> ${escapar(textoFiltros())}</div>${secoes}<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));<\/script></body></html>`);
  }

  async function confirmarPagamentosDaOP() {
    if (confirmandoLote) return;
    confirmandoLote = true;
    const botao = document.getElementById("btnMarcarPagamentosFiltrados");
    const original = botao?.textContent || "Confirmar pagamentos filtrados";
    try {
      if (botao) {
        botao.disabled = true;
        botao.textContent = "Conferindo pagamentos...";
      }
      const dados = await carregarDados(true);
      if (!dados.admin) return window.alert("Apenas administrador ativo pode fechar pagamentos.");
      const pagamentos = filtrarPagamentos(dados.pagamentos).filter(item => statusPagamento(item) !== "pago");
      if (!pagamentos.length) return window.alert("Nenhum pagamento pendente foi encontrado para esta OP e os filtros selecionados.");
      const semValor = pagamentos.filter(item => statusPagamento(item) === "sem_valor");
      if (semValor.length) return window.alert(`Fechamento bloqueado: ${semValor.length} pagamento(s) ainda aguardam definição de valor.`);
      const dups = duplicidades(pagamentos);
      if (dups.length) return window.alert(`Fechamento bloqueado: ${dups.length} possível(is) duplicidade(s) foram identificadas.`);
      if (pagamentos.length > 450) return window.alert("O filtro possui mais de 450 lançamentos. Reduza o período ou selecione uma facção.");
      const total = pagamentos.reduce((soma, item) => soma + numero(item?.total), 0);
      const opInformada = texto(document.getElementById(INPUT_ID)?.value);
      const confirmar = window.confirm([
        `Confirmar ${pagamentos.length} pagamento(s) filtrado(s) pela OP ${opInformada}?`,
        `Total: ${moeda(total)}`,
        "",
        "Esta ação marcará somente os pagamentos atualmente filtrados como pagos."
      ].join("\n"));
      if (!confirmar) return;

      const { fs, db, usuario } = dados.contexto;
      if (botao) botao.textContent = "Confirmando pagamentos...";
      for (let inicio = 0; inicio < pagamentos.length; inicio += 400) {
        const batch = fs.writeBatch(db);
        pagamentos.slice(inicio, inicio + 400).forEach(item => {
          batch.set(fs.doc(db, "entregasPagamento", item.id), {
            statusPagamento: "pago",
            pagoEm: fs.serverTimestamp(),
            pagoPor: usuario.uid,
            atualizadoPor: usuario.uid,
            atualizadoEm: fs.serverTimestamp()
          }, { merge: true });
        });
        await batch.commit();
      }
      try {
        await fs.addDoc(fs.collection(db, "logsAlteracoes"), {
          acao: "pagamentos_filtrados_por_op_fechados",
          tipoAlvo: "entregaPagamento",
          alvoId: "lote",
          detalhes: `${pagamentos.length} pagamentos | ${moeda(total)} | ${textoFiltros()}`,
          usuarioUid: usuario.uid,
          usuarioNome: dados.perfil?.nome || "",
          usuarioEmail: dados.perfil?.email || usuario.email || "",
          usuarioTipo: dados.perfil?.tipo || "admin",
          criadoEm: fs.serverTimestamp(),
          versao: VERSION
        });
      } catch (error) {
        console.warn("Pagamentos confirmados, mas o log adicional não foi criado.", error);
      }
      cache.expiraEm = 0;
      window.alert(`${pagamentos.length} pagamento(s) da OP filtrada foram marcados como pagos. Total: ${moeda(total)}.`);
      document.getElementById("btnAtualizarServidor")?.click();
      agendarRender(true, 1100);
    } catch (error) {
      console.error("Erro ao confirmar pagamentos filtrados pela OP.", error);
      window.alert("Não foi possível confirmar os pagamentos. Confira a conexão antes de tentar novamente.");
    } finally {
      confirmandoLote = false;
      if (botao) {
        botao.disabled = false;
        botao.textContent = original;
      }
    }
  }

  function eventos() {
    document.addEventListener("input", event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.id !== INPUT_ID) return;
      if (opAtiva()) agendarRender(false, 320);
      else restaurarTelaOriginal();
    }, true);

    document.addEventListener("change", event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
      if (!opAtiva()) return;
      if (input.matches("[data-processo-multiplo]") || [
        "pagamentoDataInicio",
        "pagamentoDataFim",
        "pagamentoFiltroFaccao",
        "pagamentoFiltroReferencia",
        "pagamentoFiltroPreco",
        "pagamentoFiltroStatus"
      ].includes(input.id)) agendarRender(false, 430);
    }, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      if (alvo.closest("#btnLimparFiltrosPagamento")) {
        const input = document.getElementById(INPUT_ID);
        if (input) input.value = "";
        window.setTimeout(restaurarTelaOriginal, 80);
        return;
      }

      if (!opAtiva()) return;

      if (alvo.closest("#btnRelatorioPagamentoSimplificado")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        relatorioSimplificado();
        return;
      }
      if (alvo.closest("#btnImprimirPagamento")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        relatorioCompleto();
        return;
      }
      if (alvo.closest("#btnMarcarPagamentosFiltrados")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        confirmarPagamentosDaOP();
        return;
      }
      if (alvo.closest("#btnAtualizarServidor") || alvo.closest("#listaEntregasPagamento button")) {
        cache.expiraEm = 0;
        agendarRender(true, 1100);
      }
    }, true);
  }

  function iniciar() {
    eventos();
    let tentativas = 0;
    const tentar = () => {
      tentativas += 1;
      if (montarCampo() || tentativas >= 40) return;
      window.setTimeout(tentar, 250);
    };
    tentar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
