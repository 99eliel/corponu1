(() => {
  "use strict";

  const VERSION = "2026-08-01-revisao-componentes-automaticos-59";
  const FB = "10.12.5";
  const PROCESSOS = ["LATERAL", "ENCAPAR BOJO"];
  const OCULTA = "rev-auto59-oculta";

  if (window.__CORPONU_REVISAO_AUTO59__ === VERSION) return;
  window.__CORPONU_REVISAO_AUTO59__ = VERSION;

  let ctxPromise = null;
  let registros = new Map();
  let cacheEm = 0;
  let carregando = false;
  let observer = null;
  let sincronizando = false;

  const txt = value => String(value ?? "").trim();
  const norm = value => txt(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toUpperCase();
  const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const num = value => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const text = txt(value);
    if (!text) return 0;
    const parsed = Number(text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const ms = value => {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  };
  const dataBR = value => ms(value)
    ? new Date(ms(value)).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";

  async function ctx() {
    if (ctxPromise) return ctxPromise;
    ctxPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      return { auth: authMod.getAuth(app), db: fs.getFirestore(app), fs };
    }).catch(error => {
      ctxPromise = null;
      throw error;
    });
    return ctxPromise;
  }

  async function aguardarLogin(auth) {
    for (let i = 0; i < 40 && !auth.currentUser; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
  }

  function chegou(mov) {
    const status = norm(mov.status);
    if (mov.cancelado === true || mov.excluido === true || ["CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA"].includes(status)) return false;
    return Boolean(txt(mov.dataChegada || mov.dataRetorno)) ||
      ["RETORNOU", "RECEBIDO", "RECEBIDA", "CONCLUIDO", "CONCLUIDA", "FINALIZADO", "FINALIZADA"].includes(status) ||
      num(mov.quantidadeRecebida) > 0;
  }

  function qtdRecebida(mov) {
    const recebida = num(mov.quantidadeRecebida);
    if (recebida > 0) return recebida;
    return Math.max(0, num(mov.quantidadeEnviada) - num(mov.falta));
  }

  function resumo(lista, total) {
    const validos = lista.filter(chegou);
    if (!validos.length) return { pronto: false, parcial: false, quantidade: 0, faccao: "", data: "", usuario: "" };
    validos.sort((a, b) => ms(b.atualizadoEm || b.dataChegada || b.criadoEm) - ms(a.atualizadoEm || a.dataChegada || a.criadoEm));
    const ultimo = validos[0];
    const quantidade = validos.reduce((sum, item) => sum + qtdRecebida(item), 0);
    return {
      pronto: quantidade > 0,
      parcial: total > 0 && quantidade > 0 && quantidade < total,
      quantidade: total > 0 ? Math.min(total, quantidade) : quantidade,
      faccao: txt(ultimo.destino || ultimo.faccao || ultimo.destinoNome),
      data: ultimo.atualizadoEm || ultimo.dataChegada || ultimo.criadoEm || "",
      usuario: txt(ultimo.atualizadoPorNome || ultimo.criadoPorNome || ultimo.usuarioNome || "Automático")
    };
  }

  function mapear(op, grupo) {
    const revisao = op.revisaoComponentesConfeccao || {};
    const total = Math.max(0, num(op.quantidade || op.quantidadeTotal));
    const lateralAuto = resumo(grupo.lateral, total);
    const bojoAuto = resumo(grupo.bojo, total);
    const lateralSalva = op.componentesConsolidados?.lateral || {};
    const bojoSalvo = op.componentesConsolidados?.bojo || {};
    return {
      id: op.id,
      numero: txt(op.numeroOP || op.numeroOPExterno || op.id),
      referencia: txt(op.referencia),
      cor: txt(op.cor),
      quantidade: total,
      lateral: lateralAuto.pronto || revisao.lateralFeita === true || op.lateralFeitaConfeccao === true || lateralSalva.pronto === true,
      bojo: bojoAuto.pronto || revisao.bojoFeito === true || op.bojoEncapadoConfeccao === true || op.bojoProntoConfeccao === true || bojoSalvo.pronto === true,
      lateralAuto,
      bojoAuto,
      data: ms(lateralAuto.data) >= ms(bojoAuto.data) ? lateralAuto.data : bojoAuto.data,
      usuario: ms(lateralAuto.data) >= ms(bojoAuto.data) ? lateralAuto.usuario : bojoAuto.usuario
    };
  }

  async function carregar(forcar = false) {
    if (!forcar && registros.size && Date.now() - cacheEm < 30000) {
      sincronizar();
      mesclarFaccoes();
      reaplicarFiltros();
      return;
    }
    if (carregando) return;
    carregando = true;
    try {
      const { auth, db, fs } = await ctx();
      await aguardarLogin(auth);
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, "movimentacoesProducao"),
        fs.where("processo", "in", PROCESSOS)
      ));
      const grupos = new Map();
      snap.docs.forEach(docSnap => {
        const mov = { id: docSnap.id, ...docSnap.data() };
        if (!mov.opId || !chegou(mov)) return;
        const grupo = grupos.get(mov.opId) || { lateral: [], bojo: [] };
        grupo[norm(mov.processo) === "LATERAL" ? "lateral" : "bojo"].push(mov);
        grupos.set(mov.opId, grupo);
      });

      const novo = new Map();
      const ids = [...grupos.keys()];
      for (let i = 0; i < ids.length; i += 12) {
        const lote = ids.slice(i, i + 12);
        const ops = await Promise.all(lote.map(async id => {
          const opSnap = await fs.getDoc(fs.doc(db, "ordensProducao", id));
          return opSnap.exists() ? { id: opSnap.id, ...opSnap.data() } : null;
        }));
        ops.filter(Boolean).forEach(op => novo.set(op.id, mapear(op, grupos.get(op.id))));
      }
      registros = novo;
      cacheEm = Date.now();
      sincronizar();
      mesclarFaccoes();
      reaplicarFiltros();
    } catch (error) {
      console.error("Não foi possível mostrar lateral/bojo automáticos na revisão.", error);
    } finally {
      carregando = false;
    }
  }

  function estilo() {
    if (document.getElementById("styleRevAuto59")) return;
    const style = document.createElement("style");
    style.id = "styleRevAuto59";
    style.textContent = `#listaRev tr.${OCULTA}{display:none!important}#listaRev tr[data-rev-auto59="1"]{background:#fafcff}#listaRev .rev-auto59-faccao{display:block;margin-top:4px;color:#475569;font-size:10px;font-weight:800}#listaRev .rev-auto59-origem{display:block;margin-top:3px;color:#7c3aed;font-size:10px;font-weight:900}`;
    document.head.appendChild(style);
  }

  function preencherComponente(celula, tipo, item, forcar = false) {
    if (!celula) return;
    const auto = tipo === "lateral" ? item.lateralAuto : item.bojoAuto;
    const pronto = tipo === "lateral" ? item.lateral : item.bojo;
    if (!forcar && !auto.pronto) return;
    const titulo = pronto ? (auto.parcial ? "Parcial" : (tipo === "lateral" ? "Feita" : "Pronto")) : "Não";
    celula.innerHTML = `<span class="rev-pill ${pronto ? "sim" : "nao"}">${titulo}</span>`;
    if (!pronto) return;
    if (auto.faccao) celula.insertAdjacentHTML("beforeend", `<small class="rev-auto59-faccao">Facção: ${esc(auto.faccao)}</small>`);
    if (auto.parcial) celula.insertAdjacentHTML("beforeend", `<small class="rev-auto59-origem">${auto.quantidade}${item.quantidade ? ` de ${item.quantidade}` : ""} peças</small>`);
    else if (auto.pronto) celula.insertAdjacentHTML("beforeend", `<small class="rev-auto59-origem">Automático pela chegada</small>`);
  }

  function criarLinha(item) {
    const tr = document.createElement("tr");
    tr.dataset.revAuto59 = "1";
    tr.dataset.revAutoId59 = item.id;
    tr.innerHTML = `<td><strong>${esc(item.numero)}</strong></td><td><strong>${esc(item.referencia || "-")}</strong></td><td>${esc(item.cor || "-")}</td><td>${Number(item.quantidade || 0).toLocaleString("pt-BR")}</td><td></td><td></td><td><strong>R$ 0,00</strong></td><td>${esc(item.usuario || "Automático")}</td><td>${esc(dataBR(item.data))}</td><td><button class="btn btn-sm" type="button" data-editar-auto59="${esc(item.id)}">Editar</button></td>`;
    preencherComponente(tr.cells[4], "lateral", item, true);
    preencherComponente(tr.cells[5], "bojo", item, true);
    return tr;
  }

  function sincronizar() {
    const tbody = document.getElementById("listaRev");
    if (!tbody || sincronizando || !registros.size) return;
    sincronizando = true;
    observer?.disconnect();
    try {
      const panel = tbody.closest(".panel");
      const title = panel?.querySelector(".panel-header h3");
      const subtitle = panel?.querySelector(".panel-header p");
      if (title) title.textContent = "OPs com lateral ou bojo registrados";
      if (subtitle) subtitle.textContent = "Inclui revisões manuais e chegadas automáticas de LATERAL e ENCAPAR BOJO.";

      tbody.querySelectorAll('tr[data-rev-auto59="1"]').forEach(row => row.remove());
      const rows = [...tbody.querySelectorAll("tr")].filter(row => !row.querySelector(".rev-vazio"));
      const byNumber = new Map(rows.map(row => [norm(row.cells?.[0]?.textContent), row]));
      if (!rows.length) tbody.innerHTML = "";

      [...registros.values()].sort((a, b) => ms(b.data) - ms(a.data)).forEach(item => {
        let row = byNumber.get(norm(item.numero));
        if (!row) {
          row = criarLinha(item);
          tbody.appendChild(row);
        } else {
          row.dataset.revAutoId59 = item.id;
          preencherComponente(row.cells?.[4], "lateral", item);
          preencherComponente(row.cells?.[5], "bojo", item);
        }
      });
    } finally {
      sincronizando = false;
      observar(tbody);
    }
  }

  function itemDaLinha(row) {
    const id = txt(row.dataset.revAutoId59);
    if (id && registros.has(id)) return registros.get(id);
    const number = norm(row.cells?.[0]?.textContent);
    return [...registros.values()].find(item => norm(item.numero) === number) || null;
  }

  function mesclarFaccoes() {
    const select = document.getElementById("revFiltroFaccao57");
    if (!select) return;
    const current = select.value;
    const names = new Set([...select.options].slice(1).map(option => txt(option.value || option.textContent)).filter(Boolean));
    registros.forEach(item => {
      if (item.lateralAuto.faccao) names.add(item.lateralAuto.faccao);
      if (item.bojoAuto.faccao) names.add(item.bojoAuto.faccao);
    });
    select.innerHTML = '<option value="">Todas as facções</option>' + [...names].sort((a, b) => a.localeCompare(b, "pt-BR")).map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
    if ([...select.options].some(option => option.value === current)) select.value = current;
  }

  function confereComponente(item, filter) {
    if (filter === "com_lateral") return item.lateral;
    if (filter === "com_bojo") return item.bojo;
    if (filter === "ambos") return item.lateral && item.bojo;
    if (filter === "somente_lateral") return item.lateral && !item.bojo;
    if (filter === "somente_bojo") return item.bojo && !item.lateral;
    return true;
  }

  function aplicarFiltros() {
    const tbody = document.getElementById("listaRev");
    if (!tbody) return;
    sincronizar();
    const faccao = norm(document.getElementById("revFiltroFaccao57")?.value);
    const componente = txt(document.getElementById("revFiltroComponente57")?.value || "todos");
    const busca = norm(document.getElementById("buscaRevLista")?.value);

    [...tbody.querySelectorAll("tr")].forEach(row => {
      if (row.querySelector(".rev-vazio")) return;
      const item = itemDaLinha(row);
      if (!item) return;
      const names = [item.lateralAuto.faccao, item.bojoAuto.faccao].map(norm);
      const searchText = norm([item.numero, item.referencia, item.cor, ...names].join(" "));
      const show = (!busca || searchText.includes(busca)) && (!faccao || names.includes(faccao)) && confereComponente(item, componente);
      row.classList.remove("revf57-oculta");
      row.classList.toggle(OCULTA, !show);
    });

    const rows = [...tbody.querySelectorAll("tr")].filter(row => !row.querySelector(".rev-vazio"));
    const visible = rows.filter(row => !row.classList.contains("revf57-oculta") && !row.classList.contains(OCULTA)).length;
    const status = document.getElementById("revFiltrosStatus57");
    if (status) status.textContent = `${visible} de ${rows.length} OP(s) exibida(s).`;
  }

  function reaplicarFiltros() {
    [30, 100, 250].forEach(delay => setTimeout(aplicarFiltros, delay));
  }

  function observar(tbody) {
    if (!tbody) return;
    if (!observer) observer = new MutationObserver(() => {
      if (!sincronizando) setTimeout(() => { sincronizar(); reaplicarFiltros(); }, 50);
    });
    observer.disconnect();
    observer.observe(tbody, { childList: true, subtree: true });
  }

  function preparar(forcar = false) {
    const tbody = document.getElementById("listaRev");
    if (!tbody) return false;
    estilo();
    observar(tbody);
    ["revFiltroFaccao57", "revFiltroComponente57"].forEach(id => {
      const field = document.getElementById(id);
      if (field && !field.dataset.revAuto59) {
        field.dataset.revAuto59 = "1";
        field.addEventListener("change", reaplicarFiltros);
      }
    });
    const search = document.getElementById("buscaRevLista");
    if (search && !search.dataset.revAuto59) {
      search.dataset.revAuto59 = "1";
      search.addEventListener("input", reaplicarFiltros);
    }
    const refresh = document.getElementById("btnAtualizarRev");
    if (refresh && !refresh.dataset.revAuto59) {
      refresh.dataset.revAuto59 = "1";
      refresh.addEventListener("click", () => {
        cacheEm = 0;
        setTimeout(() => carregar(true), 500);
      });
    }
    carregar(forcar);
    return true;
  }

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const edit = target?.closest("[data-editar-auto59]");
    if (edit) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const item = registros.get(edit.dataset.editarAuto59);
      const input = document.getElementById("revNumeroOP");
      if (item && input) {
        input.value = item.numero;
        document.getElementById("btnBuscarRevOP")?.click();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    if (target?.closest('[data-page="revisao-componentes"]')) {
      cacheEm = 0;
      [100, 450, 900].forEach((delay, index) => setTimeout(() => preparar(index === 0), delay));
    }
  }, true);

  document.addEventListener("submit", event => {
    if (!["formChegadaMovimentacao", "formChegadaManualFaccao"].includes(event.target?.id)) return;
    [1000, 2500, 5000].forEach(delay => setTimeout(() => {
      if (document.getElementById("revisaoComponentes")?.classList.contains("active")) {
        cacheEm = 0;
        carregar(true);
      }
    }, delay));
  }, true);

  function iniciar() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (preparar() || attempts >= 35) clearInterval(timer);
    }, 300);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();