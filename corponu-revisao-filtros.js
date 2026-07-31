(() => {
  "use strict";

  const VERSION = "2026-07-31-revisao-filtros-57";
  const FB = "10.12.5";
  const PAINEL_ID = "revFiltrosAvancados57";
  const STATUS_ID = "revFiltrosStatus57";
  const CACHE_MS = 30000;

  if (window.__CORPONU_REVISAO_FILTROS__ === VERSION) return;
  window.__CORPONU_REVISAO_FILTROS__ = VERSION;

  let firebasePromise = null;
  let registros = [];
  let cacheEm = 0;
  let carregando = null;
  let observadorTabela = null;
  let tbodyObservado = null;
  let aplicando = false;

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

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      return { auth: authMod.getAuth(app), db: fs.getFirestore(app), fs };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function aguardarUsuario(auth) {
    if (auth.currentUser) return auth.currentUser;
    for (let tentativa = 0; tentativa < 40; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 150));
      if (auth.currentUser) return auth.currentUser;
    }
    throw new Error("Usuário ainda não autenticado.");
  }

  function responsaveis(op) {
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

  function mapearRegistro(id, dados) {
    const revisao = dados?.revisaoComponentesConfeccao || {};
    const nomes = responsaveis(dados);
    return {
      id,
      numero: texto(dados?.numeroOP || dados?.numeroOPExterno || dados?.op || id),
      referencia: texto(dados?.referencia),
      cor: texto(dados?.cor),
      lateral: revisao.lateralFeita === true || dados?.lateralFeitaConfeccao === true,
      bojo: revisao.bojoFeito === true || dados?.bojoEncapadoConfeccao === true || dados?.bojoProntoConfeccao === true,
      faccaoLateral: nomes.lateral,
      faccaoBojo: nomes.bojo
    };
  }

  async function carregarRegistros(forcar = false) {
    if (!forcar && registros.length && Date.now() - cacheEm < CACHE_MS) return registros;
    if (carregando) return carregando;

    carregando = (async () => {
      const { auth, db, fs } = await firebase();
      await aguardarUsuario(auth);
      const consulta = fs.query(
        fs.collection(db, "ordensProducao"),
        fs.where("revisaoComponentesConfeccao.ativa", "==", true)
      );
      const snap = await fs.getDocs(consulta);
      registros = snap.docs.map(docSnap => mapearRegistro(docSnap.id, docSnap.data()));
      cacheEm = Date.now();
      preencherFaccoes();
      aplicarFiltros();
      return registros;
    })().catch(error => {
      console.error("Não foi possível carregar os filtros da revisão.", error);
      atualizarStatus("Não foi possível carregar as facções das revisões.", true);
      return registros;
    }).finally(() => {
      carregando = null;
    });

    return carregando;
  }

  function registroDaLinha(linha) {
    const primeiraCelula = linha?.cells?.[0];
    const numero = normalizar(primeiraCelula?.textContent);
    if (!numero) return null;
    return registros.find(item => normalizar(item.numero) === numero) || null;
  }

  function injetarEstilos() {
    if (document.getElementById("styleRevisaoFiltros57")) return;
    const style = document.createElement("style");
    style.id = "styleRevisaoFiltros57";
    style.textContent = `
      #${PAINEL_ID}{display:grid;grid-template-columns:minmax(190px,1fr) minmax(200px,1fr) auto;gap:10px;align-items:end;margin:0 0 14px;padding:13px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc}
      #${PAINEL_ID} label{display:block;margin:0;color:#334155;font-size:11px;font-weight:900}
      #${PAINEL_ID} select{width:100%;min-height:42px;margin-top:5px;padding:9px 11px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;font:700 12px/1.3 inherit}
      #${PAINEL_ID} select:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.11)}
      #${PAINEL_ID} .revf57-acoes{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      #${STATUS_ID}{grid-column:1/-1;margin:0;color:#64748b;font-size:11px;font-weight:800}
      #${STATUS_ID}.erro{color:#991b1b}
      #listaRev .revf57-faccao{display:block;margin-top:4px;color:#475569;font-size:10px;font-weight:800;line-height:1.25}
      #listaRev tr.revf57-oculta{display:none!important}
      @media(max-width:760px){#${PAINEL_ID}{grid-template-columns:1fr}#${PAINEL_ID} .revf57-acoes{justify-content:stretch}#${PAINEL_ID} .revf57-acoes .btn{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function garantirPainel() {
    const tbody = document.getElementById("listaRev");
    const panel = tbody?.closest(".panel");
    const tableWrap = tbody?.closest(".table-wrap");
    if (!tbody || !panel || !tableWrap) return false;

    injetarEstilos();

    let filtros = document.getElementById(PAINEL_ID);
    if (!filtros) {
      filtros = document.createElement("div");
      filtros.id = PAINEL_ID;
      filtros.innerHTML = `
        <label>
          Filtrar por facção
          <select id="revFiltroFaccao57">
            <option value="">Todas as facções</option>
          </select>
        </label>
        <label>
          Filtrar por componente
          <select id="revFiltroComponente57">
            <option value="todos">Todas as revisões</option>
            <option value="com_lateral">Com lateral</option>
            <option value="com_bojo">Com bojo</option>
            <option value="ambos">Lateral e bojo</option>
            <option value="somente_lateral">Somente lateral</option>
            <option value="somente_bojo">Somente bojo</option>
          </select>
        </label>
        <div class="revf57-acoes">
          <button type="button" class="btn" id="btnLimparFiltrosRev57">Limpar filtros</button>
        </div>
        <p id="${STATUS_ID}">Carregando revisões...</p>`;
      panel.insertBefore(filtros, tableWrap);

      document.getElementById("revFiltroFaccao57")?.addEventListener("change", aplicarFiltros);
      document.getElementById("revFiltroComponente57")?.addEventListener("change", aplicarFiltros);
      document.getElementById("btnLimparFiltrosRev57")?.addEventListener("click", () => {
        const faccao = document.getElementById("revFiltroFaccao57");
        const componente = document.getElementById("revFiltroComponente57");
        const busca = document.getElementById("buscaRevLista");
        if (faccao) faccao.value = "";
        if (componente) componente.value = "todos";
        if (busca) {
          busca.value = "";
          busca.dispatchEvent(new Event("input", { bubbles: true }));
        }
        window.setTimeout(aplicarFiltros, 50);
      });
    }

    observarTabela(tbody);
    return true;
  }

  function preencherFaccoes() {
    const select = document.getElementById("revFiltroFaccao57");
    if (!select) return;
    const atual = select.value;
    const nomes = new Set();
    registros.forEach(item => {
      if (item.faccaoLateral) nomes.add(item.faccaoLateral);
      if (item.faccaoBojo) nomes.add(item.faccaoBojo);
    });
    select.innerHTML = '<option value="">Todas as facções</option>' + [...nomes]
      .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" }))
      .map(nome => `<option value="${escapar(nome)}">${escapar(nome)}</option>`)
      .join("");
    if ([...select.options].some(option => option.value === atual)) select.value = atual;
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

  function adicionarFaccaoNaCelula(celula, nome) {
    if (!celula) return;
    let detalhe = celula.querySelector(".revf57-faccao");
    if (!nome) {
      detalhe?.remove();
      return;
    }
    if (!detalhe) {
      detalhe = document.createElement("small");
      detalhe.className = "revf57-faccao";
      celula.appendChild(detalhe);
    }
    const desejado = `Facção: ${nome}`;
    if (detalhe.textContent !== desejado) detalhe.textContent = desejado;
  }

  function atualizarStatus(mensagem, erro = false) {
    const status = document.getElementById(STATUS_ID);
    if (!status) return;
    status.textContent = mensagem;
    status.classList.toggle("erro", erro);
  }

  function aplicarFiltros() {
    if (aplicando) return;
    const tbody = document.getElementById("listaRev");
    if (!tbody) return;

    aplicando = true;
    try {
      const faccao = normalizar(document.getElementById("revFiltroFaccao57")?.value);
      const componente = texto(document.getElementById("revFiltroComponente57")?.value || "todos");
      const linhas = [...tbody.querySelectorAll("tr")].filter(linha => !linha.querySelector(".rev-vazio"));
      let visiveis = 0;

      linhas.forEach(linha => {
        const item = registroDaLinha(linha);
        if (!item) {
          linha.classList.remove("revf57-oculta");
          return;
        }

        adicionarFaccaoNaCelula(linha.cells?.[4], item.lateral ? item.faccaoLateral : "");
        adicionarFaccaoNaCelula(linha.cells?.[5], item.bojo ? item.faccaoBojo : "");

        const nomes = [item.faccaoLateral, item.faccaoBojo].map(normalizar);
        const passouFaccao = !faccao || nomes.includes(faccao);
        const passouComponente = componenteConfere(item, componente);
        const mostrar = passouFaccao && passouComponente;
        linha.classList.toggle("revf57-oculta", !mostrar);
        if (mostrar) visiveis += 1;
      });

      if (!linhas.length) {
        atualizarStatus("Nenhuma revisão carregada para aplicar os filtros.");
      } else {
        atualizarStatus(`${visiveis} de ${linhas.length} revisão(ões) exibida(s).`);
      }
    } finally {
      aplicando = false;
    }
  }

  function observarTabela(tbody) {
    if (tbodyObservado === tbody && observadorTabela) return;
    observadorTabela?.disconnect();
    tbodyObservado = tbody;
    observadorTabela = new MutationObserver(() => {
      window.setTimeout(aplicarFiltros, 0);
    });
    observadorTabela.observe(tbody, { childList: true, subtree: true });
  }

  function instalarEventosGlobais() {
    const busca = document.getElementById("buscaRevLista");
    if (busca && busca.dataset.revf57 !== "1") {
      busca.dataset.revf57 = "1";
      busca.addEventListener("input", () => window.setTimeout(aplicarFiltros, 30));
      busca.addEventListener("change", () => window.setTimeout(aplicarFiltros, 30));
    }

    const atualizar = document.getElementById("btnAtualizarRev");
    if (atualizar && atualizar.dataset.revf57 !== "1") {
      atualizar.dataset.revf57 = "1";
      atualizar.addEventListener("click", () => {
        window.setTimeout(() => carregarRegistros(true), 400);
      });
    }
  }

  function preparar() {
    if (!garantirPainel()) return false;
    instalarEventosGlobais();
    carregarRegistros(false);
    return true;
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo?.closest('[data-page="revisao-componentes"]')) return;
    [80, 350, 800].forEach(atraso => window.setTimeout(preparar, atraso));
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      let tentativas = 0;
      const intervalo = window.setInterval(() => {
        tentativas += 1;
        if (preparar() || tentativas >= 35) window.clearInterval(intervalo);
      }, 300);
    }, { once: true });
  } else {
    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      if (preparar() || tentativas >= 35) window.clearInterval(intervalo);
    }, 300);
  }
})();
