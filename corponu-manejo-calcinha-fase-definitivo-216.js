(() => {
  "use strict";

  const VERSION = "2026-08-19-manejo-calcinha-fase-select-218";
  const GUARD = "__CORPONU_MANEJO_CALCINHA_FASE_SELECT_218__";
  const STYLE_ID = "corponuManejoCalcinhaFaseSelect218Style";
  const SELECT_CLASS = "corponu-fase-select-218";
  const INPUT_CLASS = "corponu-fase-input-legado-218";
  const DATALIST_ID = "manejoFasesListCalcinha";
  const DRAFT_TTL = 10 * 60 * 1000;

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  const drafts = new Map();
  let observerTabela = null;
  let observerFases = null;
  let wrapperInstalado = null;
  let atualizandoDom = false;

  function calcinhaAtiva() {
    return document.querySelector(".page.active")?.id === "manejo" &&
      Boolean(document.querySelector('#manejo .manejo-setor-btn.active[data-setor="calcinha"]'));
  }

  function normalizar(valor) {
    return String(valor ?? "").replace(/\s+/g, " ").trim().toUpperCase();
  }

  function injetarEstilo() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #listaManejoInline .${INPUT_CLASS}{display:none!important;}
      #listaManejoInline .${SELECT_CLASS}{
        width:100%;
        min-width:150px;
        box-sizing:border-box;
        border:1px solid #cbd5e1;
        border-radius:7px;
        padding:8px 30px 8px 9px;
        background:#fff;
        color:#0f172a;
        font:inherit;
        line-height:1.2;
      }
      #listaManejoInline .${SELECT_CLASS}:focus{
        outline:2px solid rgba(124,58,237,.22);
        border-color:#7c3aed;
      }
    `;
    document.head.appendChild(style);
  }

  function orderIdDaLinha(row) {
    if (!(row instanceof Element)) return "";
    const linhaSelect = row.querySelector(".corponu-manejo-line-select[data-order-id]");
    if (linhaSelect?.dataset?.orderId) return String(linhaSelect.dataset.orderId);

    const botao = row.querySelector(".btn-save-manejo");
    const onclick = String(botao?.getAttribute("onclick") || "");
    const match = onclick.match(/salvarManejoLinha\((?:'|\")([^'\"]+)(?:'|\")\)/);
    return match?.[1] || "";
  }

  function localizarLinha(orderId) {
    const id = String(orderId || "");
    if (!id) return null;
    return [...document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")]
      .find(row => orderIdDaLinha(row) === id) || null;
  }

  function inputFase(row) {
    return row?.querySelector('input[id$="-fase"]') || null;
  }

  function fasesPermitidas() {
    const datalist = document.getElementById(DATALIST_ID);
    if (!datalist) return [];

    const mapa = new Map();
    datalist.querySelectorAll("option").forEach(option => {
      const valor = String(option.value || option.textContent || "").trim();
      const chave = normalizar(valor);
      if (valor && chave && !mapa.has(chave)) mapa.set(chave, valor);
    });
    return [...mapa.values()];
  }

  function registrarDraft(orderId, valor) {
    const id = String(orderId || "");
    if (!id) return;
    drafts.set(id, {
      valor: String(valor || ""),
      atualizadoEm: Date.now(),
      salvoEm: drafts.get(id)?.salvoEm || 0
    });
  }

  function valorDesejado(orderId, input) {
    const draft = drafts.get(String(orderId));
    if (draft && Date.now() - draft.atualizadoEm <= DRAFT_TTL) return draft.valor;
    if (draft) drafts.delete(String(orderId));
    return String(input?.value || "");
  }

  function sincronizarInputLegado(input, valor, dispararEventos = false) {
    if (!(input instanceof HTMLInputElement)) return;
    const proximo = String(valor || "");
    const mudou = String(input.value || "") !== proximo;
    input.value = proximo;

    if (dispararEventos && mudou) {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function montarSelectDaLinha(row) {
    if (!calcinhaAtiva() || !(row instanceof Element)) return;
    const input = inputFase(row);
    if (!(input instanceof HTMLInputElement)) return;

    const orderId = orderIdDaLinha(row);
    if (!orderId) return;

    const fases = fasesPermitidas();
    if (!fases.length) {
      input.classList.remove(INPUT_CLASS);
      row.querySelector(`.${SELECT_CLASS}`)?.remove();
      return;
    }

    const desejado = valorDesejado(orderId, input);
    if (desejado && String(input.value || "") !== desejado) {
      sincronizarInputLegado(input, desejado, false);
    }

    let select = row.querySelector(`.${SELECT_CLASS}`);
    if (!(select instanceof HTMLSelectElement)) {
      select = document.createElement("select");
      select.className = SELECT_CLASS;
      select.dataset.orderId = orderId;
      select.setAttribute("aria-label", "Fase da calcinha");
      input.insertAdjacentElement("afterend", select);
    }

    const atualNormalizado = normalizar(desejado);
    const opcoes = [`<option value="">Selecione a fase</option>`];
    const existeAtual = fases.some(fase => normalizar(fase) === atualNormalizado);

    if (desejado && !existeAtual) {
      const seguro = String(desejado)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
      opcoes.push(`<option value="${seguro}">${seguro}</option>`);
    }

    fases.forEach(fase => {
      const seguro = String(fase)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
      opcoes.push(`<option value="${seguro}">${seguro}</option>`);
    });

    const html = opcoes.join("");
    if (select.dataset.opcoes218 !== html) {
      select.innerHTML = html;
      select.dataset.opcoes218 = html;
    }

    const opcaoOficial = [...select.options].find(option => normalizar(option.value) === atualNormalizado);
    select.value = opcaoOficial?.value || "";
    input.classList.add(INPUT_CLASS);
  }

  function aplicarSelects() {
    if (atualizandoDom) return;
    atualizandoDom = true;
    try {
      if (!calcinhaAtiva()) {
        document.querySelectorAll(`#listaManejoInline .${SELECT_CLASS}`).forEach(el => el.remove());
        document.querySelectorAll(`#listaManejoInline .${INPUT_CLASS}`).forEach(input => input.classList.remove(INPUT_CLASS));
        return;
      }

      document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")
        .forEach(montarSelectDaLinha);
    } finally {
      atualizandoDom = false;
    }
  }

  function aoMudarSelect(event) {
    const select = event.target?.closest?.(`.${SELECT_CLASS}`);
    if (!(select instanceof HTMLSelectElement) || !calcinhaAtiva()) return;

    const row = select.closest("tr[data-manejo-row='1']");
    const input = inputFase(row);
    const orderId = orderIdDaLinha(row);
    if (!(input instanceof HTMLInputElement) || !orderId) return;

    const valor = String(select.value || "");
    registrarDraft(orderId, valor);
    sincronizarInputLegado(input, valor, true);

    // Atualiza imediatamente a cópia em memória usada pelo módulo da Linha.
    sincronizarEstadoDual(orderId, valor);
  }

  function sincronizarEstadoDual(orderId, faseValor) {
    const mapa = window.corponuDualMode?.state?.maps?.ordens;
    if (!(mapa instanceof Map)) return;
    const id = String(orderId || "");
    const atual = mapa.get(id);
    if (!atual) return;

    const manejoAtual = atual?.manejosSetores?.calcinha || {};
    mapa.set(id, {
      ...atual,
      manejosSetores: {
        ...(atual.manejosSetores || {}),
        calcinha: {
          ...manejoAtual,
          fase: normalizar(faseValor)
        }
      }
    });
  }

  function observarTabela() {
    const tbody = document.getElementById("listaManejoInline");
    if (!tbody) return false;
    if (observerTabela?.__target === tbody) return true;
    observerTabela?.disconnect?.();

    observerTabela = new MutationObserver(() => {
      queueMicrotask(aplicarSelects);
    });
    observerTabela.observe(tbody, { childList: true, subtree: true });
    observerTabela.__target = tbody;
    return true;
  }

  function observarListaFases() {
    const datalist = document.getElementById(DATALIST_ID);
    if (!datalist) return false;
    if (observerFases?.__target === datalist) return true;
    observerFases?.disconnect?.();

    observerFases = new MutationObserver(() => queueMicrotask(aplicarSelects));
    observerFases.observe(datalist, { childList: true, subtree: true, attributes: true });
    observerFases.__target = datalist;
    return true;
  }

  function envolverSalvar() {
    const atual = window.salvarManejoLinha;
    if (typeof atual !== "function") return false;
    if (atual.__corponuFaseSelect218 === true) {
      wrapperInstalado = atual;
      return true;
    }
    if (wrapperInstalado === atual) return true;

    const embrulhado = async function corponuSalvarManejoCalcinhaFaseSelect218(...args) {
      if (!calcinhaAtiva()) return atual.apply(this, args);

      const orderId = String(args[0] || "");
      const row = localizarLinha(orderId);
      const input = inputFase(row);
      const select = row?.querySelector(`.${SELECT_CLASS}`);
      const fase = String(select?.value || input?.value || "");

      if (orderId) {
        registrarDraft(orderId, fase);
        sincronizarInputLegado(input, fase, false);
        sincronizarEstadoDual(orderId, fase);
      }

      try {
        return await atual.apply(this, args);
      } finally {
        const draft = drafts.get(orderId);
        if (draft) {
          draft.salvoEm = Date.now();
          draft.atualizadoEm = Date.now();
        }
        queueMicrotask(aplicarSelects);
        setTimeout(aplicarSelects, 120);
        setTimeout(aplicarSelects, 450);
        setTimeout(aplicarSelects, 1000);
        setTimeout(() => {
          const atualDraft = drafts.get(orderId);
          if (atualDraft?.salvoEm && Date.now() - atualDraft.salvoEm > 1500) drafts.delete(orderId);
          aplicarSelects();
        }, 1800);
      }
    };

    Object.defineProperty(embrulhado, "__corponuFaseSelect218", {
      value: true,
      configurable: false,
      enumerable: false
    });

    window.salvarManejoLinha = embrulhado;
    wrapperInstalado = embrulhado;
    return true;
  }

  function instalarEventos() {
    document.addEventListener("change", aoMudarSelect, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.closest('.manejo-setor-btn[data-setor], .nav-btn[data-page]')) {
        [0, 60, 180, 400].forEach(delay => setTimeout(() => {
          observarTabela();
          observarListaFases();
          aplicarSelects();
        }, delay));
      }
    }, true);
  }

  function iniciar() {
    injetarEstilo();
    observarTabela();
    observarListaFases();
    instalarEventos();
    aplicarSelects();

    [80, 250, 700, 1500].forEach(delay => setTimeout(() => {
      observarTabela();
      observarListaFases();
      aplicarSelects();
    }, delay));

    // Wrappers antigos de Manejo terminam de se instalar nos primeiros segundos.
    // Entramos por fora só para sincronizar a fase antes da segunda gravação da Linha.
    setTimeout(envolverSalvar, 7000);
    setTimeout(envolverSalvar, 10000);

    setInterval(() => {
      observarTabela();
      observarListaFases();
      if (calcinhaAtiva()) aplicarSelects();

      const agora = Date.now();
      for (const [id, draft] of drafts.entries()) {
        if (agora - draft.atualizadoEm > DRAFT_TTL) drafts.delete(id);
      }
    }, 3000);

    console.info(`[CorpoNu] Fase Calcinha com select estável ativa: ${VERSION}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();