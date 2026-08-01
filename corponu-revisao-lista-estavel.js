(() => {
  "use strict";

  const VERSION = "2026-08-01-revisao-lista-estavel-60";
  const FB = "10.12.5";
  const PROCESSOS = ["LATERAL", "ENCAPAR BOJO"];
  const PAINEL_ID = "revFiltrosAvancados60";
  const STATUS_ID = "revFiltrosStatus60";
  const LINHA_AUTO = "revListaAuto60";
  const OCULTA = "revListaOculta60";
  const CACHE_MS = 30000;

  if (window.__CORPONU_REVISAO_LISTA_ESTAVEL__ === VERSION) return;
  window.__CORPONU_REVISAO_LISTA_ESTAVEL__ = VERSION;

  let contextoPromise = null;
  let registros = new Map();
  let cacheEm = 0;
  let carregando = null;
  let timerBusca = 0;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
  const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const numero = valor => {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    const bruto = texto(valor);
    if (!bruto) return 0;
    const convertido = Number(bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto);
    return Number.isFinite(convertido) ? convertido : 0;
  };
  const millis = valor => {
    if (!valor) return 0;
    if (typeof valor.toMillis === "function") return valor.toMillis();
    if (typeof valor.toDate === "function") return valor.toDate().getTime();
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? 0 : data.getTime();
  };
  const dataHoraBR = valor => millis(valor)
    ? new Date(millis(valor)).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
    : "-";

  function processoCanonico(valor) {
    const chave = normalizar(valor);
    if (["ENCAPAR BOJO", "ENCAPAR BOJOS", "ENCAPA BOJO", "BOJO"].includes(chave)) return "ENCAPAR BOJO";
    if (chave === "LATERAL") return "LATERAL";
    return chave;
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      return { auth: authMod.getAuth(app), db: fs.getFirestore(app), fs };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  async function aguardarUsuario(auth) {
    for (let tentativa = 0; tentativa < 40 && !auth.currentUser; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 150));
    }
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
  }

  function movimentoValido(mov) {
    const status = normalizar(mov?.status);
    if (mov?.cancelado === true || mov?.excluido === true || ["CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA"].includes(status)) return false;
    return Boolean(texto(mov?.dataChegada || mov?.dataRetorno)) ||
      ["RETORNOU", "RECEBIDO", "RECEBIDA", "CONCLUIDO", "CONCLUIDA", "FINALIZADO", "FINALIZADA"].includes(status) ||
      numero(mov?.quantidadeRecebida) > 0;
  }

  function quantidadeRecebida(mov) {
    const recebida = numero(mov?.quantidadeRecebida);
    if (recebida > 0) return recebida;
    return Math.max(0, numero(mov?.quantidadeEnviada) - numero(mov?.falta));
  }

  function resumoAutomatico(lista, total) {
    const validos = (lista || []).filter(movimentoValido);
    if (!validos.length) {
      return { pronto: false, parcial: false, quantidade: 0, faccao: "", data: "", usuario: "" };
    }

    validos.sort((a, b) => millis(b.atualizadoEm || b.dataChegada || b.criadoEm) - millis(a.atualizadoEm || a.dataChegada || a.criadoEm));
    const ultimo = validos[0];
    const quantidade = validos.reduce((soma, item) => soma + quantidadeRecebida(item), 0);
    return {
      pronto: quantidade > 0,
      parcial: total > 0 && quantidade > 0 && quantidade < total,
      quantidade: total > 0 ? Math.min(total, quantidade) : quantidade,
      faccao: texto(ultimo.destino || ultimo.faccao || ultimo.destinoNome),
      data: ultimo.atualizadoEm || ultimo.dataChegada || ultimo.criadoEm || "",
      usuario: texto(ultimo.atualizadoPorNome || ultimo.criadoPorNome || ultimo.usuarioNome || "Automático")
    };
  }

  function responsaveisManuais(op) {
    const revisao = op?.revisaoComponentesConfeccao || {};
    return {
      lateral: texto(
        revisao.lateralFeitaPorNome ||
        revisao.lateralResponsavel ||
        revisao.quemFezLateral ||
        op?.lateralFeitaPorNome ||
        op?.revisaoLateralFeitaPor
      ),
      bojo: texto(
        revisao.bojoFeitoPorNome ||
        revisao.bojoResponsavel ||
        revisao.quemFezBojo ||
        op?.bojoEncapadoPorNome ||
        op?.revisaoBojoFeitoPor
      )
    };
  }

  function montarRegistro(op, grupo = { lateral: [], bojo: [] }) {
    const revisao = op?.revisaoComponentesConfeccao || {};
    const total = Math.max(0, numero(op?.quantidade || op?.quantidadeTotal));
    const lateralAuto = resumoAutomatico(grupo.lateral, total);
    const bojoAuto = resumoAutomatico(grupo.bojo, total);
    const responsaveis = responsaveisManuais(op);
    const lateralSalva = op?.componentesConsolidados?.lateral || {};
    const bojoSalvo = op?.componentesConsolidados?.bojo || {};
    const lateralManual = revisao.lateralFeita === true || op?.lateralFeitaConfeccao === true;
    const bojoManual = revisao.bojoFeito === true || op?.bojoEncapadoConfeccao === true || op?.bojoProntoConfeccao === true;
    const lateral = lateralAuto.pronto || lateralManual || lateralSalva.pronto === true;
    const bojo = bojoAuto.pronto || bojoManual || bojoSalvo.pronto === true;
    const dataManual = revisao.atualizadoEm || revisao.criadoEm || op?.revisaoComponentesAtualizadaEm || "";
    const dataAutomatica = millis(lateralAuto.data) >= millis(bojoAuto.data) ? lateralAuto.data : bojoAuto.data;
    const data = millis(dataAutomatica) >= millis(dataManual) ? dataAutomatica : dataManual;
    const usuarioManual = texto(revisao.usuarioNome || revisao.registradoPorNome || "");
    const usuarioAuto = millis(lateralAuto.data) >= millis(bojoAuto.data) ? lateralAuto.usuario : bojoAuto.usuario;

    return {
      id: op.id,
      numero: texto(op?.numeroOP || op?.numeroOPExterno || op?.op || op.id),
      referencia: texto(op?.referencia),
      cor: texto(op?.cor),
      quantidade: total,
      revisaoAtiva: revisao.ativa === true,
      lateral,
      bojo,
      lateralManual,
      bojoManual,
      faccaoLateral: lateralAuto.faccao || responsaveis.lateral || texto(lateralSalva.responsavel),
      faccaoBojo: bojoAuto.faccao || responsaveis.bojo || texto(bojoSalvo.responsavel),
      lateralAuto,
      bojoAuto,
      usuario: usuarioManual || usuarioAuto || "Automático",
      data
    };
  }

  async function carregarMovimentos(fs, db) {
    try {
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, "movimentacoesProducao"),
        fs.where("processo", "in", PROCESSOS)
      ));
      return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (erroConsulta) {
      console.warn("Consulta direta dos componentes não disponível; usando leitura compatível.", erroConsulta);
      const snap = await fs.getDocs(fs.collection(db, "movimentacoesProducao"));
      return snap.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .filter(item => PROCESSOS.includes(processoCanonico(item.processo || item.servicoNome)));
    }
  }

  async function carregarOpsPorIds(fs, db, ids) {
    const resultado = new Map();
    const unicos = [...new Set(ids.filter(Boolean))];

    for (let indice = 0; indice < unicos.length; indice += 25) {
      const lote = unicos.slice(indice, indice + 25);
      try {
        const snap = await fs.getDocs(fs.query(
          fs.collection(db, "ordensProducao"),
          fs.where(fs.documentId(), "in", lote)
        ));
        snap.docs.forEach(docSnap => resultado.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
      } catch (_) {
        const ops = await Promise.all(lote.map(async id => {
          const snap = await fs.getDoc(fs.doc(db, "ordensProducao", id));
          return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        }));
        ops.filter(Boolean).forEach(op => resultado.set(op.id, op));
      }
    }
    return resultado;
  }

  async function carregarDados(forcar = false) {
    if (!forcar && registros.size && Date.now() - cacheEm < CACHE_MS) {
      sincronizarTabela();
      aplicarFiltros();
      return registros;
    }
    if (carregando) return carregando;

    carregando = (async () => {
      const { auth, db, fs } = await contexto();
      await aguardarUsuario(auth);

      const [movimentos, revisoesSnap] = await Promise.all([
        carregarMovimentos(fs, db),
        fs.getDocs(fs.query(
          fs.collection(db, "ordensProducao"),
          fs.where("revisaoComponentesConfeccao.ativa", "==", true)
        ))
      ]);

      const grupos = new Map();
      movimentos.forEach(mov => {
        const processo = processoCanonico(mov.processo || mov.servicoNome);
        if (!PROCESSOS.includes(processo) || !mov.opId || !movimentoValido(mov)) return;
        const grupo = grupos.get(mov.opId) || { lateral: [], bojo: [] };
        grupo[processo === "LATERAL" ? "lateral" : "bojo"].push(mov);
        grupos.set(mov.opId, grupo);
      });

      const ops = new Map();
      revisoesSnap.docs.forEach(docSnap => ops.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
      const faltantes = [...grupos.keys()].filter(id => !ops.has(id));
      const opsAutomaticas = await carregarOpsPorIds(fs, db, faltantes);
      opsAutomaticas.forEach((op, id) => ops.set(id, op));

      const novos = new Map();
      ops.forEach((op, id) => {
        const item = montarRegistro(op, grupos.get(id));
        if (item.revisaoAtiva || item.lateralAuto.pronto || item.bojoAuto.pronto) novos.set(id, item);
      });

      registros = novos;
      cacheEm = Date.now();
      preencherFaccoes();
      sincronizarTabela();
      aplicarFiltros();
      return registros;
    })().catch(error => {
      console.error("Não foi possível carregar a lista estável de revisão.", error);
      definirStatus("Não foi possível atualizar a lista agora.", true);
      return registros;
    }).finally(() => {
      carregando = null;
    });

    return carregando;
  }

  function injetarEstilos() {
    if (document.getElementById("styleRevisaoListaEstavel60")) return;
    const style = document.createElement("style");
    style.id = "styleRevisaoListaEstavel60";
    style.textContent = `
      #${PAINEL_ID}{display:grid;grid-template-columns:minmax(190px,1fr) minmax(210px,1fr) auto;gap:10px;align-items:end;margin:0 0 14px;padding:13px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc}
      #${PAINEL_ID} label{display:block;margin:0;color:#334155;font-size:11px;font-weight:900}
      #${PAINEL_ID} select{width:100%;min-height:42px;margin-top:5px;padding:9px 11px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;font:700 12px/1.3 inherit}
      #${PAINEL_ID} .rev60-acoes{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      #${STATUS_ID}{grid-column:1/-1;margin:0;color:#64748b;font-size:11px;font-weight:800}
      #${STATUS_ID}.erro{color:#991b1b}
      #listaRev tr.${OCULTA}{display:none!important}
      #listaRev tr[data-rev-lista-auto60="1"]{background:#fafcff}
      #listaRev .rev60-faccao{display:block;margin-top:4px;color:#475569;font-size:10px;font-weight:800;line-height:1.25}
      #listaRev .rev60-origem{display:block;margin-top:3px;color:#7c3aed;font-size:10px;font-weight:900;line-height:1.25}
      #listaRev tr>td:nth-child(7),#listaRev thead th:nth-child(7){display:none!important}
      #listaRev{table-layout:auto}
      @media(max-width:760px){#${PAINEL_ID}{grid-template-columns:1fr}#${PAINEL_ID} .rev60-acoes{justify-content:stretch}#${PAINEL_ID} .rev60-acoes .btn{flex:1}}
    `;
    document.head.appendChild(style);

    const tbody = document.getElementById("listaRev");
    const tabela = tbody?.closest("table");
    if (tabela) tabela.classList.add("rev60-sem-desconto");
    const styleTabela = document.createElement("style");
    styleTabela.id = "styleRevisaoSemDesconto60";
    styleTabela.textContent = `table.rev60-sem-desconto th:nth-child(7),table.rev60-sem-desconto td:nth-child(7){display:none!important}`;
    document.head.appendChild(styleTabela);
  }

  function garantirPainel() {
    const tbody = document.getElementById("listaRev");
    const panel = tbody?.closest(".panel");
    const tableWrap = tbody?.closest(".table-wrap");
    if (!tbody || !panel || !tableWrap) return false;

    injetarEstilos();

    const titulo = panel.querySelector(".panel-header h3");
    const subtitulo = panel.querySelector(".panel-header p");
    if (titulo) titulo.textContent = "OPs com lateral ou bojo registrados";
    if (subtitulo) subtitulo.textContent = "Inclui revisões manuais e chegadas automáticas de LATERAL e ENCAPAR BOJO.";

    let filtros = document.getElementById(PAINEL_ID);
    if (!filtros) {
      document.getElementById("revFiltrosAvancados57")?.remove();
      filtros = document.createElement("div");
      filtros.id = PAINEL_ID;
      filtros.innerHTML = `
        <label>Filtrar por facção
          <select id="revFiltroFaccao60"><option value="">Todas as facções</option></select>
        </label>
        <label>Filtrar por componente
          <select id="revFiltroComponente60">
            <option value="todos">Todas as OPs</option>
            <option value="com_lateral">Com lateral</option>
            <option value="com_bojo">Com bojo</option>
            <option value="ambos">Lateral e bojo</option>
            <option value="somente_lateral">Somente lateral</option>
            <option value="somente_bojo">Somente bojo</option>
          </select>
        </label>
        <div class="rev60-acoes"><button type="button" class="btn" id="btnLimparFiltrosRev60">Limpar filtros</button></div>
        <p id="${STATUS_ID}">Carregando OPs...</p>`;
      panel.insertBefore(filtros, tableWrap);

      document.getElementById("revFiltroFaccao60")?.addEventListener("change", aplicarFiltros);
      document.getElementById("revFiltroComponente60")?.addEventListener("change", aplicarFiltros);
      document.getElementById("btnLimparFiltrosRev60")?.addEventListener("click", () => {
        const faccao = document.getElementById("revFiltroFaccao60");
        const componente = document.getElementById("revFiltroComponente60");
        const busca = document.getElementById("buscaRevLista");
        if (faccao) faccao.value = "";
        if (componente) componente.value = "todos";
        if (busca) {
          busca.value = "";
          busca.dispatchEvent(new Event("input", { bubbles: true }));
        }
        sincronizarTabela();
        aplicarFiltros();
      });
    }
    return true;
  }

  function preencherFaccoes() {
    const select = document.getElementById("revFiltroFaccao60");
    if (!select) return;
    const atual = select.value;
    const nomes = new Set();
    registros.forEach(item => {
      if (item.faccaoLateral) nomes.add(item.faccaoLateral);
      if (item.faccaoBojo) nomes.add(item.faccaoBojo);
    });
    const html = '<option value="">Todas as facções</option>' + [...nomes]
      .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" }))
      .map(nome => `<option value="${escapar(nome)}">${escapar(nome)}</option>`)
      .join("");
    if (select.innerHTML !== html) select.innerHTML = html;
    if ([...select.options].some(option => option.value === atual)) select.value = atual;
  }

  function itemPorLinha(linha) {
    const id = texto(linha?.dataset?.revId60 || linha?.dataset?.revAutoId60);
    if (id && registros.has(id)) return registros.get(id);
    const numero = normalizar(linha?.cells?.[0]?.textContent);
    if (!numero) return null;
    return [...registros.values()].find(item => normalizar(item.numero) === numero) || null;
  }

  function escreverComponente(celula, tipo, item) {
    if (!celula || !item) return;
    const auto = tipo === "lateral" ? item.lateralAuto : item.bojoAuto;
    const pronto = tipo === "lateral" ? item.lateral : item.bojo;
    const faccao = tipo === "lateral" ? item.faccaoLateral : item.faccaoBojo;
    const parcial = auto.pronto && auto.parcial;
    const titulo = pronto ? (parcial ? "Parcial" : (tipo === "lateral" ? "Feita" : "Pronto")) : "Não";
    const assinatura = [titulo, faccao, parcial ? `${auto.quantidade}/${item.quantidade}` : "", auto.pronto ? "auto" : "manual"].join("|");
    if (celula.dataset.revAssinatura60 === assinatura) return;
    celula.dataset.revAssinatura60 = assinatura;
    celula.innerHTML = `<span class="rev-pill ${pronto ? "sim" : "nao"}">${titulo}</span>`;
    if (pronto && faccao) celula.insertAdjacentHTML("beforeend", `<small class="rev60-faccao">Facção: ${escapar(faccao)}</small>`);
    if (auto.pronto) {
      const detalhe = parcial
        ? `${auto.quantidade}${item.quantidade ? ` de ${item.quantidade}` : ""} peças • automático pela chegada`
        : "Automático pela chegada";
      celula.insertAdjacentHTML("beforeend", `<small class="rev60-origem">${escapar(detalhe)}</small>`);
    }
  }

  function criarLinhaAutomatica(item) {
    const linha = document.createElement("tr");
    linha.dataset.revListaAuto60 = "1";
    linha.dataset.revAutoId60 = item.id;
    linha.innerHTML = `
      <td><strong>${escapar(item.numero)}</strong></td>
      <td><strong>${escapar(item.referencia || "-")}</strong></td>
      <td>${escapar(item.cor || "-")}</td>
      <td>${Number(item.quantidade || 0).toLocaleString("pt-BR")}</td>
      <td></td><td></td><td></td>
      <td>${escapar(item.usuario || "Automático")}</td>
      <td>${escapar(dataHoraBR(item.data))}</td>
      <td><button class="btn btn-sm" type="button" data-editar-auto60="${escapar(item.id)}">Editar</button></td>`;
    escreverComponente(linha.cells[4], "lateral", item);
    escreverComponente(linha.cells[5], "bojo", item);
    return linha;
  }

  function sincronizarTabela() {
    const tbody = document.getElementById("listaRev");
    if (!tbody || !registros.size) return;

    tbody.querySelectorAll('tr[data-rev-lista-auto60="1"]').forEach(linha => linha.remove());
    const linhasManuais = [...tbody.querySelectorAll("tr")].filter(linha => !linha.querySelector(".rev-vazio"));
    const porNumero = new Map(linhasManuais.map(linha => [normalizar(linha.cells?.[0]?.textContent), linha]));
    if (!linhasManuais.length) tbody.innerHTML = "";

    [...registros.values()]
      .sort((a, b) => millis(b.data) - millis(a.data))
      .forEach(item => {
        let linha = porNumero.get(normalizar(item.numero));
        if (!linha) {
          linha = criarLinhaAutomatica(item);
          tbody.appendChild(linha);
        } else {
          linha.dataset.revId60 = item.id;
          escreverComponente(linha.cells?.[4], "lateral", item);
          escreverComponente(linha.cells?.[5], "bojo", item);
          if (linha.cells?.[6]) linha.cells[6].textContent = "";
        }
      });
  }

  function componenteConfere(item, filtro) {
    if (!item || filtro === "todos") return true;
    if (filtro === "com_lateral") return item.lateral;
    if (filtro === "com_bojo") return item.bojo;
    if (filtro === "ambos") return item.lateral && item.bojo;
    if (filtro === "somente_lateral") return item.lateral && !item.bojo;
    if (filtro === "somente_bojo") return item.bojo && !item.lateral;
    return true;
  }

  function definirStatus(mensagem, erro = false) {
    const status = document.getElementById(STATUS_ID);
    if (!status) return;
    if (status.textContent !== mensagem) status.textContent = mensagem;
    status.classList.toggle("erro", erro);
  }

  function aplicarFiltros() {
    const tbody = document.getElementById("listaRev");
    if (!tbody) return;

    const faccao = normalizar(document.getElementById("revFiltroFaccao60")?.value);
    const componente = texto(document.getElementById("revFiltroComponente60")?.value || "todos");
    const busca = normalizar(document.getElementById("buscaRevLista")?.value);
    const linhas = [...tbody.querySelectorAll("tr")].filter(linha => !linha.querySelector(".rev-vazio"));
    let visiveis = 0;

    linhas.forEach(linha => {
      const item = itemPorLinha(linha);
      if (!item) {
        linha.classList.remove(OCULTA);
        return;
      }
      const faccoes = [item.faccaoLateral, item.faccaoBojo].map(normalizar);
      const buscaTexto = normalizar([item.numero, item.referencia, item.cor, ...faccoes].join(" "));
      const mostrar = (!busca || buscaTexto.includes(busca)) &&
        (!faccao || faccoes.includes(faccao)) &&
        componenteConfere(item, componente);
      linha.classList.toggle(OCULTA, !mostrar);
      if (mostrar) visiveis += 1;
    });

    definirStatus(`${visiveis} de ${linhas.length} OP(s) exibida(s).`);
  }

  function sincronizarDepois(atrasos = [80, 350, 850]) {
    atrasos.forEach(atraso => window.setTimeout(() => {
      garantirPainel();
      sincronizarTabela();
      preencherFaccoes();
      aplicarFiltros();
    }, atraso));
  }

  function instalarEventos() {
    const busca = document.getElementById("buscaRevLista");
    if (busca && busca.dataset.revListaEstavel60 !== "1") {
      busca.dataset.revListaEstavel60 = "1";
      busca.addEventListener("input", () => {
        window.clearTimeout(timerBusca);
        timerBusca = window.setTimeout(() => {
          sincronizarTabela();
          aplicarFiltros();
        }, 80);
      });
    }

    const atualizar = document.getElementById("btnAtualizarRev");
    if (atualizar && atualizar.dataset.revListaEstavel60 !== "1") {
      atualizar.dataset.revListaEstavel60 = "1";
      atualizar.addEventListener("click", () => {
        cacheEm = 0;
        window.setTimeout(() => carregarDados(true), 500);
        sincronizarDepois([700, 1300]);
      });
    }
  }

  function preparar(forcar = false) {
    if (!garantirPainel()) return false;
    instalarEventos();
    carregarDados(forcar);
    sincronizarDepois();
    return true;
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;

    const editarAuto = alvo.closest("[data-editar-auto60]");
    if (editarAuto) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const item = registros.get(editarAuto.dataset.editarAuto60);
      const input = document.getElementById("revNumeroOP");
      if (item && input) {
        input.value = item.numero;
        document.getElementById("btnBuscarRevOP")?.click();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (alvo.closest('[data-page="revisao-componentes"]')) {
      cacheEm = 0;
      [100, 500, 1000].forEach((atraso, indice) => window.setTimeout(() => preparar(indice === 0), atraso));
    }
  }, true);

  document.addEventListener("submit", event => {
    const id = event.target?.id;
    if (!["formRevisaoComponentes", "formChegadaMovimentacao", "formChegadaManualFaccao"].includes(id)) return;
    cacheEm = 0;
    [900, 2200, 4500].forEach(atraso => window.setTimeout(() => {
      const pagina = document.getElementById("revisaoComponentes");
      if (pagina?.classList.contains("active") || id === "formRevisaoComponentes") carregarDados(true);
    }, atraso));
  }, true);

  function iniciar() {
    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      if (preparar() || tentativas >= 35) window.clearInterval(intervalo);
    }, 300);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
