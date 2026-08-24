(() => {
  "use strict";

  const VERSION = "2026-08-24-manejo-calcinha-fase-coordenada-229";
  const GUARD = "__CORPONU_MANEJO_CALCINHA_FASE_COORDENADA_229__";
  const DATALIST = "manejoFasesListCalcinha";
  const SELECT = "corponu-fase-calcinha-select-229";
  const INPUT = "corponu-fase-calcinha-input-229";
  const FIREBASE_VERSION = "10.12.5";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  const drafts = new Map();
  const outros = new Set();
  const salvando = new Set();
  let obsTabela = null;
  let obsLista = null;
  let firebasePromise = null;
  let aplicando = false;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").trim().toUpperCase();

  const escapeHtml = valor => String(valor ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function guardRenderAtivo() {
    return Boolean(document.querySelector('[data-corponu-render-guard-calcinha="229"]'));
  }

  function calcinhaAtiva() {
    const botao = document.querySelector('#manejo .manejo-setor-btn.active[data-setor="calcinha"]');
    if (!botao) return false;
    if (guardRenderAtivo()) return Boolean(document.getElementById("manejo")?.classList.contains("active"));
    return document.querySelector(".page.active")?.id === "manejo";
  }

  function idLinha(row) {
    if (!(row instanceof Element)) return "";
    const linha = row.querySelector(".corponu-manejo-line-select[data-order-id]");
    if (linha?.dataset?.orderId) return String(linha.dataset.orderId);
    const codigo = String(row.querySelector(".btn-save-manejo")?.getAttribute("onclick") || "");
    return codigo.match(/salvarManejoLinha\((?:'|\")([^'\"]+)(?:'|\")\)/)?.[1] || "";
  }

  function acharLinha(orderId) {
    const id = String(orderId || "");
    return [...document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")]
      .find(row => idLinha(row) === id) || null;
  }

  const inputFase = row => row?.querySelector('input[id$="-fase"]') || null;

  function fasesOficiais() {
    const lista = document.getElementById(DATALIST);
    if (!lista) return [];
    const unicas = new Map();
    lista.querySelectorAll("option").forEach(option => {
      const valor = String(option.value || option.textContent || "").trim();
      const chave = normalizar(valor);
      if (valor && chave && !unicas.has(chave)) unicas.set(chave, valor);
    });
    return [...unicas.values()];
  }

  function faseOficial(valor) {
    const chave = normalizar(valor);
    return chave ? fasesOficiais().find(fase => normalizar(fase) === chave) || "" : "";
  }

  function instalarEstilo() {
    if (document.getElementById("corponuFaseCalcinha229Style")) return;
    const style = document.createElement("style");
    style.id = "corponuFaseCalcinha229Style";
    style.textContent = `
      #listaManejoInline .${INPUT}{display:none!important}
      #listaManejoInline .${SELECT}{width:100%;min-width:150px;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:7px;padding:8px 30px 8px 9px;background:#fff;color:#0f172a;font:inherit;line-height:1.2}
      #listaManejoInline .${SELECT}:focus{outline:2px solid rgba(124,58,237,.22);border-color:#7c3aed}
      #listaManejoInline .${SELECT}:disabled{background:#f8fafc;color:#64748b;cursor:not-allowed}
      #listaManejoInline .btn-save-manejo[data-corponu-fase-salvando="229"]{opacity:.72;pointer-events:none}
      [data-corponu-render-guard-calcinha="229"]{display:none!important}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function syncDual(orderId, fase) {
    const mapa = window.corponuDualMode?.state?.maps?.ordens;
    if (!(mapa instanceof Map)) return;
    const id = String(orderId || "");
    const op = mapa.get(id);
    if (!op) return;
    const manejo = op?.manejosSetores?.calcinha || {};
    mapa.set(id, {
      ...op,
      manejosSetores: {
        ...(op.manejosSetores || {}),
        calcinha: { ...manejo, fase: normalizar(fase), setor: "calcinha", setorLabel: "Calcinha", status: "organizada" }
      },
      manejoStatusSetores: { ...(op.manejoStatusSetores || {}), calcinha: "organizada" }
    });
  }

  function montarSelect(row) {
    if (!calcinhaAtiva() || !(row instanceof Element)) return;
    const input = inputFase(row);
    const orderId = idLinha(row);
    if (!(input instanceof HTMLInputElement) || !orderId) return;

    input.classList.add(INPUT);
    input.setAttribute("list", DATALIST);

    const fases = fasesOficiais();
    const desejado = String(drafts.get(orderId)?.valor ?? input.value ?? "");
    const oficial = faseOficial(desejado);
    let select = row.querySelector(`.${SELECT}`);
    if (!(select instanceof HTMLSelectElement)) {
      select = document.createElement("select");
      select.className = SELECT;
      select.dataset.orderId = orderId;
      select.setAttribute("aria-label", "Fase da calcinha");
      input.insertAdjacentElement("afterend", select);
    }

    let disabled = false;
    let selecionado = oficial || desejado;
    const opcoes = [];
    if (!document.getElementById(DATALIST)) {
      opcoes.push('<option value="">Carregando fases da Calcinha...</option>');
      disabled = true;
      selecionado = "";
    } else if (!fases.length) {
      opcoes.push(`<option value="${escapeHtml(desejado)}">${escapeHtml(desejado || "Nenhuma fase cadastrada para Calcinha")}</option>`);
      disabled = true;
    } else {
      opcoes.push('<option value="">Selecione a fase</option>');
      if (desejado && !oficial) opcoes.push(`<option value="${escapeHtml(desejado)}" disabled>${escapeHtml(desejado)} (fase atual)</option>`);
      fases.forEach(fase => opcoes.push(`<option value="${escapeHtml(fase)}">${escapeHtml(fase)}</option>`));
    }

    const assinatura = `${disabled}|${selecionado}|${fases.map(normalizar).join("|")}`;
    if (select.dataset.assinatura !== assinatura) {
      select.innerHTML = opcoes.join("");
      select.dataset.assinatura = assinatura;
    }
    select.disabled = disabled;
    select.value = selecionado;
    if (drafts.has(orderId)) input.value = drafts.get(orderId).valor;
  }

  function aplicarSelects() {
    if (aplicando) return;
    aplicando = true;
    try {
      if (!calcinhaAtiva()) {
        document.querySelectorAll(`#listaManejoInline .${SELECT}`).forEach(el => el.remove());
        document.querySelectorAll(`#listaManejoInline .${INPUT}`).forEach(input => {
          input.classList.remove(INPUT);
          if (input.getAttribute("list") === DATALIST) input.setAttribute("list", "manejoFasesList");
        });
        return;
      }
      document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']").forEach(montarSelect);
    } finally {
      aplicando = false;
    }
  }

  function capturarAlteracao(event) {
    if (!calcinhaAtiva() || !(event.target instanceof Element)) return;
    const row = event.target.closest("#listaManejoInline tr[data-manejo-row='1']");
    const orderId = idLinha(row);
    if (!row || !orderId) return;
    const select = row.querySelector(`.${SELECT}`);
    const input = inputFase(row);

    if (event.target === select) {
      const valor = String(select.value || "");
      drafts.set(orderId, { valor, alteradoEm: Date.now() });
      if (input) { input.value = valor; input.setAttribute("list", DATALIST); }
      syncDual(orderId, valor);
      queueMicrotask(aplicarSelects);
      return;
    }
    if (event.target === input) return;
    if (event.target.matches("input,select,textarea")) outros.add(orderId);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModule, authModule, firestore]) => {
      const app = appModule.getApps()[0] || appModule.getApp();
      return { auth: authModule.getAuth(app), db: firestore.getFirestore(app), firestore };
    }).catch(error => { firebasePromise = null; throw error; });
    return firebasePromise;
  }

  async function persistirFase(orderId, fase) {
    const oficial = faseOficial(fase);
    if (!oficial) throw new Error("Selecione uma fase oficial da Calcinha.");
    const { auth, db, firestore } = await firebase();
    const user = auth.currentUser;
    if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
    await firestore.updateDoc(firestore.doc(db, "ordensProducao", String(orderId)), {
      "manejosSetores.calcinha.fase": oficial,
      "manejosSetores.calcinha.setor": "calcinha",
      "manejosSetores.calcinha.setorLabel": "Calcinha",
      "manejosSetores.calcinha.status": "organizada",
      "manejosSetores.calcinha.atualizadoPor": user.uid,
      "manejosSetores.calcinha.atualizadoEm": firestore.serverTimestamp(),
      "manejoStatusSetores.calcinha": "organizada",
      atualizadoPor: user.uid,
      atualizadoEm: firestore.serverTimestamp()
    });
    return oficial;
  }

  function criarRenderGuard() {
    if (!document.getElementById("manejo")?.classList.contains("active")) return null;
    const nav = [...document.querySelectorAll(".nav-btn[data-page]")].find(item => {
      const page = String(item.dataset.page || "");
      return page && page !== "manejo" && !item.classList.contains("hidden");
    });
    if (!nav || !document.body) return null;
    const guard = document.createElement("div");
    guard.id = nav.dataset.page;
    guard.className = "page active";
    guard.hidden = true;
    guard.dataset.corponuRenderGuardCalcinha = "229";
    guard.setAttribute("aria-hidden", "true");
    document.body.prepend(guard);
    return guard;
  }

  async function semRerenderManejo(executor) {
    const guard = criarRenderGuard();
    try {
      return await executor();
    } finally {
      await new Promise(resolve => setTimeout(resolve, 100));
      guard?.remove();
    }
  }

  function avisar(mensagem) {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = mensagem;
      toast.classList.remove("hidden");
      clearTimeout(window.__corponuFase229Toast);
      window.__corponuFase229Toast = setTimeout(() => toast.classList.add("hidden"), 5500);
    } else console.warn(`[CorpoNu] ${mensagem}`);
  }

  function visual(orderId, fase, emAndamento = false) {
    const row = acharLinha(orderId);
    if (!row) return;
    const input = inputFase(row);
    const select = row.querySelector(`.${SELECT}`);
    const botao = row.querySelector(".btn-save-manejo");
    if (fase) {
      if (input) input.value = fase;
      if (select instanceof HTMLSelectElement) select.value = fase;
    }
    if (botao instanceof HTMLButtonElement) {
      botao.disabled = emAndamento;
      if (emAndamento) botao.dataset.corponuFaseSalvando = "229";
      else botao.removeAttribute("data-corponu-fase-salvando");
    }
    if (!emAndamento) row.classList.remove("manejo-row-dirty", "manejo-row-pending");
  }

  function garantirWrapper() {
    const atual = window.salvarManejoLinha;
    if (typeof atual !== "function") return false;
    if (atual.__corponuFaseCalcinhaCoordenada229) return true;
    const interno = atual;

    const wrapper = async function corponuSalvarManejoCalcinha229(...args) {
      if (!calcinhaAtiva()) return interno.apply(this, args);
      const orderId = String(args[0] || "");
      if (!orderId || salvando.has(orderId)) return false;

      const row = acharLinha(orderId);
      const input = inputFase(row);
      const select = row?.querySelector(`.${SELECT}`);
      const draft = drafts.get(orderId);
      const fase = String(draft?.valor ?? select?.value ?? input?.value ?? "").trim();
      const faseMudou = Boolean(draft);
      const outrosMudaram = outros.has(orderId);
      const oficial = fase ? faseOficial(fase) : "";
      if (faseMudou && !oficial) { avisar("Selecione uma fase oficial da Calcinha antes de confirmar."); return false; }

      if (oficial) {
        if (input) input.value = oficial;
        if (select instanceof HTMLSelectElement) select.value = oficial;
        syncDual(orderId, oficial);
      }

      salvando.add(orderId);
      visual(orderId, oficial, true);
      try {
        const retorno = await semRerenderManejo(async () => {
          if (faseMudou && !outrosMudaram) return persistirFase(orderId, oficial);
          const resultado = await interno.apply(this, args);
          if (faseMudou) await persistirFase(orderId, oficial);
          return resultado;
        });
        drafts.delete(orderId);
        outros.delete(orderId);
        if (oficial) syncDual(orderId, oficial);
        visual(orderId, oficial, false);
        queueMicrotask(aplicarSelects);
        return retorno;
      } catch (error) {
        console.error("[Calcinha 229] Falha no salvamento.", error);
        visual(orderId, "", false);
        avisar(`As alterações não foram salvas: ${error?.message || "erro no Firestore"}`);
        return false;
      } finally {
        salvando.delete(orderId);
      }
    };
    Object.defineProperty(wrapper, "__corponuFaseCalcinhaCoordenada229", { value: true });
    window.salvarManejoLinha = wrapper;
    return true;
  }

  function observar() {
    const tabela = document.getElementById("listaManejoInline");
    if (tabela && obsTabela?.__target !== tabela) {
      obsTabela?.disconnect();
      obsTabela = new MutationObserver(() => queueMicrotask(aplicarSelects));
      obsTabela.observe(tabela, { childList: true, subtree: true });
      obsTabela.__target = tabela;
    }
    const lista = document.getElementById(DATALIST);
    if (lista && obsLista?.__target !== lista) {
      obsLista?.disconnect();
      obsLista = new MutationObserver(() => queueMicrotask(aplicarSelects));
      obsLista.observe(lista, { childList: true, subtree: true });
      obsLista.__target = lista;
    }
  }

  function iniciar() {
    instalarEstilo();
    window.addEventListener("input", capturarAlteracao, true);
    window.addEventListener("change", capturarAlteracao, true);
    window.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (alvo?.closest("#listaManejoInline .btn-save-manejo") && calcinhaAtiva()) garantirWrapper();
      if (alvo?.closest('.manejo-setor-btn[data-setor],.nav-btn[data-page]')) {
        [0, 80, 250].forEach(ms => setTimeout(() => { observar(); aplicarSelects(); garantirWrapper(); }, ms));
      }
    }, true);
    observar();
    aplicarSelects();
    garantirWrapper();
    setTimeout(() => firebase().catch(() => {}), 1000);
    [300, 900, 2000, 5000].forEach(ms => setTimeout(() => { observar(); aplicarSelects(); garantirWrapper(); }, ms));
    setInterval(() => { observar(); garantirWrapper(); }, 3000);
    console.info(`[CorpoNu] Manejo Calcinha coordenado ativo: ${VERSION}`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
