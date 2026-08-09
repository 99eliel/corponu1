(() => {
  "use strict";

  const VERSION = "2026-08-08-manejo-fases-gerenciadas-163";
  const FB_VERSION = "10.12.5";
  const CONFIG_DOC = "fasesManejoLateralSutia";
  const DATALIST_ID = "manejoFasesLateralList";
  const PANEL_ID = "painelSugestoesFasesLateralAdmin163";
  const POPUP_ID = "popupFiltroFaseLateral163";
  const STYLE_ID = "corponuManejoFasesGerenciadas163Style";
  const ROW_FILTER_ATTR = "data-filtro-fase-lateral-163";

  if (window.__CORPONU_MANEJO_FASES_GERENCIADAS_163__ === VERSION) return;
  window.__CORPONU_MANEJO_FASES_GERENCIADAS_163__ = VERSION;

  let contexto = null;
  let contextoPromise = null;
  let unsubscribeAuth = null;
  let unsubscribeConfig = null;
  let usuarioAtual = null;
  let usuarioEhAdmin = false;
  let sugestoesLateral = [];
  let observerTabela = null;
  let aplicandoEstrutura = false;
  const selecionadasLateral = new Set();

  const texto = valor => String(valor ?? "").replace(/\s+/g, " ").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  const escapeHtml = valor => texto(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function ordenarLista(lista) {
    const mapa = new Map();
    (Array.isArray(lista) ? lista : []).forEach(item => {
      const valor = texto(item).toUpperCase();
      if (!valor) return;
      const chave = normalizar(valor);
      if (!mapa.has(chave)) mapa.set(chave, valor);
    });
    return [...mapa.values()].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" }));
  }

  function setorAtual() {
    return document.querySelector('.manejo-setor-btn.active[data-setor]')?.dataset?.setor || "sutia";
  }

  function injetarEstilos() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #manejo .fase-dupla-head-163{min-width:300px!important;padding-left:8px!important;padding-right:8px!important}
      #manejo .fase-dupla-head-grid-163{display:grid;grid-template-columns:minmax(135px,1fr) minmax(135px,1fr);gap:10px;align-items:center}
      #manejo .fase-dupla-head-grid-163>span{display:block;text-align:left;white-space:nowrap}
      #manejo .fase-dupla-filter-host-163{min-width:300px!important;padding:6px 7px!important}
      #manejo .fase-dupla-filter-grid-163{display:grid;grid-template-columns:minmax(135px,1fr) minmax(135px,1fr);gap:8px;align-items:center}
      #manejo .fase-filter-sub-163{position:relative;min-width:0}
      #manejo .fase-filter-sub-163>input,#manejo .fase-filter-sub-163>select{width:100%!important;min-width:0!important;box-sizing:border-box!important;padding-right:38px!important}
      #manejo .fase-filter-sub-163>.btn-filtro-excel-manejo{right:4px!important;top:50%!important;transform:translateY(-50%)!important}
      #manejo .fase-dupla-data-grid-163{display:grid;grid-template-columns:minmax(135px,1fr) minmax(135px,1fr);gap:8px;align-items:start;min-width:290px}
      #manejo .fase-dupla-data-grid-163 .fase-plus{min-width:0}
      #manejo .fase-dupla-data-grid-163 .fase-lateral-campo-163{width:100%;min-width:0;box-sizing:border-box}
      #manejo tr[${ROW_FILTER_ATTR}="oculta"]{display:none!important}
      #${POPUP_ID}{position:fixed;z-index:100000;width:min(360px,calc(100vw - 24px));max-height:min(520px,calc(100vh - 24px));overflow:auto;background:#fff;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 18px 48px rgba(15,23,42,.24);padding:12px}
      #${POPUP_ID} .fl163-top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}
      #${POPUP_ID} .fl163-top strong{font-size:14px}
      #${POPUP_ID} .fl163-fechar{border:0;background:transparent;font-size:20px;cursor:pointer;line-height:1}
      #${POPUP_ID} .fl163-busca{width:100%;box-sizing:border-box;margin-bottom:10px}
      #${POPUP_ID} .fl163-lista{display:grid;gap:5px;max-height:300px;overflow:auto;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px 0}
      #${POPUP_ID} .fl163-opcao{display:flex;gap:8px;align-items:center;padding:7px 8px;border-radius:8px;cursor:pointer}
      #${POPUP_ID} .fl163-opcao:hover{background:#f8fafc}
      #${POPUP_ID} .fl163-acoes{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
      #${PANEL_ID} .fl163-admin-grid{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:8px;align-items:end}
      #${PANEL_ID} .fl163-lista-admin{display:grid;gap:7px;margin-top:12px}
      #${PANEL_ID} .fl163-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
      @media(max-width:760px){#manejo .fase-dupla-head-grid-163,#manejo .fase-dupla-filter-grid-163,#manejo .fase-dupla-data-grid-163{grid-template-columns:minmax(125px,1fr) minmax(125px,1fr)}#${PANEL_ID} .fl163-admin-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  async function obterContextoFirebase() {
    if (contexto) return contexto;
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      contexto = { authMod, fs, auth: authMod.getAuth(app), db: fs.getFirestore(app) };
      return contexto;
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  function garantirDatalist() {
    let datalist = document.getElementById(DATALIST_ID);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = DATALIST_ID;
      document.body.appendChild(datalist);
    }
    datalist.innerHTML = sugestoesLateral.map(item => `<option value="${escapeHtml(item)}"></option>`).join("");
    document.querySelectorAll("#manejo .fase-lateral-campo-163").forEach(input => input.setAttribute("list", DATALIST_ID));
  }

  function ajustarTituloGerenciadorBojo() {
    const painel = document.getElementById("painelSugestoesFasesAdmin");
    if (!painel) return;
    const titulo = painel.querySelector("h3, h4, strong");
    if (titulo && !/BOJO/i.test(titulo.textContent || "")) {
      titulo.textContent = "Sugestões de Fase Bojo (Sutiã)";
    }
    const descricao = painel.querySelector("p");
    if (descricao && !/bojo/i.test(descricao.textContent || "")) {
      descricao.textContent = "Gerencie as opções oficiais que aparecem no campo e no filtro acumulativo da Fase Bojo.";
    }
  }

  function renderPainelAdmin() {
    ajustarTituloGerenciadorBojo();
    if (!usuarioEhAdmin) {
      document.getElementById(PANEL_ID)?.remove();
      return;
    }

    const pagina = document.getElementById("usuarios");
    if (!pagina) return;
    let painel = document.getElementById(PANEL_ID);
    if (!painel) {
      painel = document.createElement("section");
      painel.id = PANEL_ID;
      painel.className = "panel";
      painel.style.gridColumn = "1 / -1";
      painel.innerHTML = `
        <div class="panel-header">
          <div>
            <h3>Sugestões de Fase Lateral (Sutiã)</h3>
            <p>Cadastre antes do uso as opções oficiais da Fase Lateral. Elas aparecem no campo das OPs e no filtro acumulativo.</p>
          </div>
          <span id="contadorFaseLateral163" class="badge pending">0 opção(ões)</span>
        </div>
        <div class="fl163-admin-grid">
          <label>Nova sugestão
            <input id="novaSugestaoFaseLateral163" type="text" placeholder="Ex: CORTAR LATERAL" autocomplete="off" />
          </label>
          <button class="btn btn-primary" id="btnAdicionarSugestaoFaseLateral163" type="button">Adicionar sugestão</button>
        </div>
        <div class="notice small" id="statusFaseLateral163">Lista oficial sincronizada com todos os usuários.</div>
        <div class="fl163-lista-admin" id="listaSugestoesFaseLateral163"></div>
      `;
      const ancora = document.getElementById("painelSugestoesFasesAdmin") || document.getElementById("painelSugestoesFasesCalcinhaAdmin");
      if (ancora?.parentElement) ancora.insertAdjacentElement("afterend", painel);
      else pagina.appendChild(painel);

      painel.querySelector("#btnAdicionarSugestaoFaseLateral163")?.addEventListener("click", () => {
        const input = document.getElementById("novaSugestaoFaseLateral163");
        adicionarSugestao(input?.value || "").then(ok => { if (ok && input) input.value = ""; });
      });
      painel.querySelector("#novaSugestaoFaseLateral163")?.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        painel.querySelector("#btnAdicionarSugestaoFaseLateral163")?.click();
      });
      painel.addEventListener("click", event => {
        const botao = event.target instanceof Element ? event.target.closest("[data-remover-fase-lateral]") : null;
        if (!botao) return;
        removerSugestao(botao.dataset.removerFaseLateral || "");
      });
    }

    const contador = painel.querySelector("#contadorFaseLateral163");
    if (contador) contador.textContent = `${sugestoesLateral.length} opção(ões)`;
    const lista = painel.querySelector("#listaSugestoesFaseLateral163");
    if (lista) {
      lista.innerHTML = sugestoesLateral.length
        ? sugestoesLateral.map(item => `
          <div class="fl163-item">
            <strong>${escapeHtml(item)}</strong>
            <button class="btn btn-sm btn-danger" type="button" data-remover-fase-lateral="${escapeHtml(item)}">Remover</button>
          </div>`).join("")
        : '<div class="notice small">Nenhuma sugestão cadastrada ainda. A Fase Lateral começa vazia.</div>';
    }
  }

  async function alterarLista(transformar) {
    if (!usuarioEhAdmin || !usuarioAtual || !contexto) return false;
    const { fs, db } = contexto;
    const ref = fs.doc(db, "configuracoes", CONFIG_DOC);
    await fs.runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      const atual = ordenarLista(snap.exists() ? snap.data()?.sugestoes : sugestoesLateral);
      const proxima = ordenarLista(transformar(atual));
      tx.set(ref, {
        sugestoes: proxima,
        tipo: "fase_lateral_sutia",
        atualizadoPor: usuarioAtual.uid,
        atualizadoEm: fs.serverTimestamp(),
        versao: VERSION
      }, { merge: true });
    });
    return true;
  }

  async function adicionarSugestao(valor) {
    const fase = texto(valor).toUpperCase();
    if (!fase) return false;
    if (sugestoesLateral.some(item => normalizar(item) === normalizar(fase))) return false;
    try {
      return await alterarLista(lista => [...lista, fase]);
    } catch (error) {
      console.error("[Fase Lateral 163] Falha ao adicionar sugestão.", error);
      return false;
    }
  }

  async function removerSugestao(valor) {
    if (!valor || !confirm(`Remover a sugestão "${valor}" da Fase Lateral?`)) return;
    try {
      await alterarLista(lista => lista.filter(item => normalizar(item) !== normalizar(valor)));
    } catch (error) {
      console.error("[Fase Lateral 163] Falha ao remover sugestão.", error);
    }
  }

  function iniciarSnapshotConfig() {
    if (!contexto) return;
    unsubscribeConfig?.();
    const { fs, db } = contexto;
    unsubscribeConfig = fs.onSnapshot(fs.doc(db, "configuracoes", CONFIG_DOC), snap => {
      sugestoesLateral = ordenarLista(snap.exists() ? snap.data()?.sugestoes : []);
      [...selecionadasLateral].forEach(item => {
        if (item !== "Campo vazio" && !sugestoesLateral.some(s => normalizar(s) === normalizar(item))) selecionadasLateral.delete(item);
      });
      garantirDatalist();
      renderPainelAdmin();
      atualizarIndicadorFiltroLateral();
      aplicarFiltroLateral();
    }, error => console.warn("[Fase Lateral 163] Não foi possível sincronizar sugestões.", error));
  }

  async function configurarUsuario(user) {
    usuarioAtual = user || null;
    usuarioEhAdmin = false;
    if (!user || !contexto) {
      unsubscribeConfig?.();
      unsubscribeConfig = null;
      renderPainelAdmin();
      return;
    }
    try {
      const { fs, db } = contexto;
      const perfil = await fs.getDoc(fs.doc(db, "usuarios", user.uid));
      usuarioEhAdmin = perfil.exists() && perfil.data()?.ativo === true && perfil.data()?.tipo === "admin";
    } catch (error) {
      console.warn("[Fase Lateral 163] Não foi possível conferir perfil administrativo.", error);
    }
    iniciarSnapshotConfig();
    renderPainelAdmin();
  }

  function limparColunasAntigas() {
    document.querySelectorAll('#manejo [data-fase-lateral-161], #manejo [data-fase-lateral-162]').forEach(el => el.remove());
  }

  function localizarEstruturaFase() {
    const filtro = document.getElementById("filtroManejoFase");
    const thFiltro = filtro?.closest("th") || null;
    const indice = thFiltro && Number.isInteger(thFiltro.cellIndex) ? thFiltro.cellIndex : -1;
    const headRow = document.querySelector("#manejo .manejo-head-row");
    const thHead = indice >= 0 ? headRow?.cells?.[indice] || null : null;
    return { filtro, thFiltro, indice, thHead };
  }

  function moverBotaoBojoParaSubcampo(thFiltro, wrapBojo) {
    const botao = thFiltro?.querySelector('.btn-filtro-excel-manejo[data-filtro-id="filtroManejoFase"]');
    if (botao && botao.parentElement !== wrapBojo) wrapBojo.appendChild(botao);
  }

  function prepararCabecalhoSutia(thHead) {
    if (!thHead) return;
    thHead.classList.add("fase-dupla-head-163");
    if (!thHead.querySelector(".fase-dupla-head-grid-163")) {
      thHead.innerHTML = '<div class="fase-dupla-head-grid-163"><span>FASE BOJO</span><span>FASE LATERAL</span></div>';
    }
  }

  function prepararFiltroSutia(filtro, thFiltro) {
    if (!filtro || !thFiltro) return;
    thFiltro.classList.add("fase-dupla-filter-host-163");
    let grid = thFiltro.querySelector(".fase-dupla-filter-grid-163");
    if (!grid) {
      grid = document.createElement("div");
      grid.className = "fase-dupla-filter-grid-163";
      const bojo = document.createElement("div");
      bojo.className = "fase-filter-sub-163 fase-bojo-filter-163";
      const lateral = document.createElement("div");
      lateral.className = "fase-filter-sub-163 fase-lateral-filter-163";
      grid.append(bojo, lateral);
      thFiltro.appendChild(grid);
      bojo.appendChild(filtro);
      lateral.innerHTML = `
        <input id="filtroManejoFaseLateral" type="text" value="" placeholder="Todas" readonly aria-label="Filtro Fase Lateral" />
        <button type="button" class="btn-filtro-excel-manejo btn-filtro-lateral-163" aria-label="Abrir filtro acumulativo da Fase Lateral" title="Filtrar Fase Lateral">
          <span aria-hidden="true">▾</span><span class="filtro-excel-count" hidden></span>
        </button>`;
      lateral.querySelector(".btn-filtro-lateral-163")?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        abrirPopupFiltroLateral(event.currentTarget);
      });
    }
    const bojo = grid.querySelector(".fase-bojo-filter-163");
    if (bojo && filtro.parentElement !== bojo) bojo.appendChild(filtro);
    moverBotaoBojoParaSubcampo(thFiltro, bojo);
  }

  function prepararLinhasSutia(indice) {
    if (indice < 0) return;
    document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']").forEach(row => {
      const td = row.cells?.[indice];
      if (!td) return;
      let grid = td.querySelector(".fase-dupla-data-grid-163");
      if (!grid) {
        const conteudoBojo = td.querySelector(".fase-plus") || td.firstElementChild;
        grid = document.createElement("div");
        grid.className = "fase-dupla-data-grid-163";
        const bojo = document.createElement("div");
        bojo.className = "fase-bojo-data-163";
        const lateral = document.createElement("div");
        lateral.className = "fase-lateral-data-163";
        td.appendChild(grid);
        grid.append(bojo, lateral);
        if (conteudoBojo) bojo.appendChild(conteudoBojo);
        lateral.innerHTML = `<input class="fase-lateral-campo-163" type="text" value="" list="${DATALIST_ID}" placeholder="Digite a fase lateral" autocomplete="off" />`;
      }
    });
  }

  function restaurarCalcinha() {
    fecharPopupFiltroLateral();
    document.querySelectorAll("#listaManejoInline .fase-dupla-data-grid-163").forEach(grid => {
      const td = grid.closest("td");
      const bojo = grid.querySelector(".fase-bojo-data-163");
      if (td && bojo) [...bojo.childNodes].forEach(node => td.insertBefore(node, grid));
      grid.remove();
    });
    const { filtro, thFiltro, thHead } = localizarEstruturaFase();
    if (thHead) {
      thHead.classList.remove("fase-dupla-head-163");
      thHead.textContent = "FASE";
    }
    const grid = thFiltro?.querySelector(".fase-dupla-filter-grid-163");
    if (grid && thFiltro) {
      const bojo = grid.querySelector(".fase-bojo-filter-163");
      if (filtro) thFiltro.insertBefore(filtro, grid);
      const botao = bojo?.querySelector('.btn-filtro-excel-manejo[data-filtro-id="filtroManejoFase"]');
      if (botao) thFiltro.appendChild(botao);
      grid.remove();
      thFiltro.classList.remove("fase-dupla-filter-host-163");
    }
    document.querySelectorAll(`#manejo tr[${ROW_FILTER_ATTR}]`).forEach(row => row.removeAttribute(ROW_FILTER_ATTR));
  }

  function aplicarEstrutura() {
    if (aplicandoEstrutura) return;
    aplicandoEstrutura = true;
    try {
      limparColunasAntigas();
      injetarEstilos();
      garantirDatalist();
      if (setorAtual() !== "sutia") {
        restaurarCalcinha();
        return;
      }
      const { filtro, thFiltro, indice, thHead } = localizarEstruturaFase();
      if (!filtro || !thFiltro || indice < 0 || !thHead) return;
      prepararCabecalhoSutia(thHead);
      prepararFiltroSutia(filtro, thFiltro);
      prepararLinhasSutia(indice);
      aplicarFiltroLateral();
    } finally {
      aplicandoEstrutura = false;
    }
  }

  function opcoesFiltroLateral() {
    return ["Campo vazio", ...sugestoesLateral];
  }

  function fecharPopupFiltroLateral() {
    document.getElementById(POPUP_ID)?.remove();
  }

  function atualizarIndicadorFiltroLateral() {
    const input = document.getElementById("filtroManejoFaseLateral");
    const botao = document.querySelector("#manejo .btn-filtro-lateral-163");
    if (!input || !botao) return;
    const qtd = selecionadasLateral.size;
    input.value = qtd === 0 ? "" : qtd === 1 ? [...selecionadasLateral][0] : `${qtd} selecionadas`;
    input.placeholder = qtd ? "" : "Todas";
    botao.classList.toggle("ativo", qtd > 0);
    const badge = botao.querySelector(".filtro-excel-count");
    if (badge) {
      badge.hidden = qtd === 0;
      badge.textContent = String(qtd);
    }
  }

  function posicionarPopup(botao, popup) {
    const rect = botao.getBoundingClientRect();
    const largura = Math.min(360, Math.max(280, window.innerWidth - 24));
    let left = Math.max(12, Math.min(rect.right - largura, window.innerWidth - largura - 12));
    let top = rect.bottom + 8;
    if (top + 420 > window.innerHeight && rect.top > 420) top = Math.max(12, rect.top - 420);
    popup.style.width = `${largura}px`;
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  function abrirPopupFiltroLateral(botao) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    fecharPopupFiltroLateral();
    const temp = new Set(selecionadasLateral);
    const popup = document.createElement("div");
    popup.id = POPUP_ID;
    popup.className = "popup-filtro-excel-manejo";
    const renderLista = termo => {
      const busca = normalizar(termo);
      const itens = opcoesFiltroLateral().filter(item => !busca || normalizar(item).includes(busca));
      const lista = popup.querySelector(".fl163-lista");
      if (!lista) return;
      lista.innerHTML = itens.length ? itens.map(item => `
        <label class="fl163-opcao" data-valor="${escapeHtml(item)}">
          <input type="checkbox" value="${escapeHtml(item)}" ${temp.has(item) ? "checked" : ""} />
          <span>${escapeHtml(item)}</span>
        </label>`).join("") : '<div class="notice small">Nenhuma opção encontrada.</div>';
      lista.querySelectorAll('input[type="checkbox"]').forEach(input => input.addEventListener("change", () => {
        if (input.checked) temp.add(input.value); else temp.delete(input.value);
      }));
    };
    popup.innerHTML = `
      <div class="fl163-top"><strong>Filtrar Fase Lateral</strong><button class="fl163-fechar" type="button">×</button></div>
      <input class="fl163-busca" type="text" placeholder="Pesquisar opção..." autocomplete="off" />
      <div class="fl163-lista"></div>
      <div class="fl163-acoes">
        <button class="btn btn-sm" type="button" data-fl163-limpar>Limpar</button>
        <button class="btn btn-sm btn-primary" type="button" data-fl163-aplicar>Aplicar</button>
      </div>`;
    document.body.appendChild(popup);
    renderLista("");
    posicionarPopup(botao, popup);
    popup.querySelector(".fl163-fechar")?.addEventListener("click", fecharPopupFiltroLateral);
    popup.querySelector(".fl163-busca")?.addEventListener("input", event => renderLista(event.target.value));
    popup.querySelector("[data-fl163-limpar]")?.addEventListener("click", () => {
      temp.clear();
      renderLista(popup.querySelector(".fl163-busca")?.value || "");
    });
    popup.querySelector("[data-fl163-aplicar]")?.addEventListener("click", () => {
      selecionadasLateral.clear();
      temp.forEach(item => selecionadasLateral.add(item));
      fecharPopupFiltroLateral();
      atualizarIndicadorFiltroLateral();
      aplicarFiltroLateral();
    });
  }

  function linhaCombinaFiltroLateral(row) {
    if (!selecionadasLateral.size) return true;
    const valor = texto(row.querySelector(".fase-lateral-campo-163")?.value || "");
    return [...selecionadasLateral].some(opcao => {
      if (opcao === "Campo vazio") return !valor;
      return normalizar(valor) === normalizar(opcao);
    });
  }

  function aplicarFiltroLateral() {
    if (setorAtual() !== "sutia") return;
    document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']").forEach(row => {
      row.setAttribute(ROW_FILTER_ATTR, linhaCombinaFiltroLateral(row) ? "visivel" : "oculta");
    });
    setTimeout(atualizarResumoVisivel, 30);
  }

  function linhaVisivel(row) {
    if (!(row instanceof HTMLTableRowElement)) return false;
    if (row.getAttribute(ROW_FILTER_ATTR) === "oculta") return false;
    if (row.hidden) return false;
    const estilo = getComputedStyle(row);
    return estilo.display !== "none" && estilo.visibility !== "hidden";
  }

  function atualizarResumoVisivel() {
    if (setorAtual() !== "sutia" || !selecionadasLateral.size) return;
    const rows = [...document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")].filter(linhaVisivel);
    const inteiro = n => Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    const totalOps = rows.length;
    const totalPecas = rows.reduce((s, row) => s + Number(row.dataset.qti || 0), 0);
    const totalFalta = rows.reduce((s, row) => s + Number(row.dataset.falta || 0), 0);
    const organizadas = rows.filter(row => ["organizada", "bipado"].includes(String(row.dataset.status || "").toLowerCase())).length;
    const pendentes = rows.filter(row => String(row.dataset.status || "").toLowerCase() === "pendente").length;
    const set = (id, valor) => { const el = document.getElementById(id); if (el) el.textContent = valor; };
    set("somaManejoOps", inteiro(totalOps));
    set("somaManejoPecas", inteiro(totalPecas));
    set("somaManejoFalta", inteiro(totalFalta));
    set("somaManejoStatus", `${inteiro(organizadas)} org. | ${inteiro(pendentes)} pend.`);
    set("somaManejoPecasCompacto", `${inteiro(totalPecas)} peças`);
    set("somaManejoResumoCompacto", `${inteiro(totalOps)} OPs | ${inteiro(totalFalta)} falta | ${inteiro(organizadas)} org. | ${inteiro(pendentes)} pend.`);
  }

  function instalarEventos() {
    document.addEventListener("pointerdown", event => {
      const popup = document.getElementById(POPUP_ID);
      if (!popup) return;
      if (popup.contains(event.target)) return;
      if (event.target.closest?.(".btn-filtro-lateral-163")) return;
      fecharPopupFiltroLateral();
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") fecharPopupFiltroLateral();
    }, true);

    document.addEventListener("input", event => {
      if (event.target instanceof Element && event.target.matches("#manejo .fase-lateral-campo-163")) {
        aplicarFiltroLateral();
      }
    }, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.closest("#btnLimparFiltrosManejo")) {
        selecionadasLateral.clear();
        setTimeout(() => { atualizarIndicadorFiltroLateral(); aplicarFiltroLateral(); }, 20);
      }
      if (alvo.closest(".manejo-setor-btn, [data-page='manejo'], [data-target='manejo']")) {
        setTimeout(aplicarEstrutura, 20);
        setTimeout(aplicarEstrutura, 180);
      }
      if (alvo.closest('[data-page="usuarios"], [data-target="usuarios"]')) {
        setTimeout(renderPainelAdmin, 80);
      }
      if (alvo.closest(".btn-filtro-excel-aplicar")) setTimeout(() => { aplicarFiltroLateral(); atualizarResumoVisivel(); }, 60);
    }, true);

    window.addEventListener("resize", () => fecharPopupFiltroLateral());
  }

  function observarTabela() {
    const tbody = document.getElementById("listaManejoInline");
    if (!tbody) {
      setTimeout(observarTabela, 300);
      return;
    }
    if (observerTabela) return;
    observerTabela = new MutationObserver(() => {
      if (aplicandoEstrutura) return;
      requestAnimationFrame(() => {
        aplicarEstrutura();
        setTimeout(aplicarEstrutura, 40);
      });
    });
    observerTabela.observe(tbody, { childList: true, subtree: false });
  }

  async function iniciarFirebase() {
    try {
      const ctx = await obterContextoFirebase();
      unsubscribeAuth?.();
      unsubscribeAuth = ctx.authMod.onAuthStateChanged(ctx.auth, user => configurarUsuario(user));
    } catch (error) {
      setTimeout(iniciarFirebase, 500);
    }
  }

  function iniciar() {
    injetarEstilos();
    garantirDatalist();
    instalarEventos();
    observarTabela();
    aplicarEstrutura();
    setTimeout(aplicarEstrutura, 250);
    setTimeout(renderPainelAdmin, 500);
    iniciarFirebase();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
