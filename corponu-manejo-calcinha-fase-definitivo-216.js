(() => {
  "use strict";

  const VERSION = "2026-08-19-manejo-calcinha-fase-lista-real-219";
  const GUARD = "__CORPONU_MANEJO_CALCINHA_FASE_LISTA_REAL_219__";
  const STYLE_ID = "corponuManejoCalcinhaFaseSelect219Style";
  const SELECT_CLASS = "corponu-fase-select-219";
  const INPUT_CLASS = "corponu-fase-input-legado-219";
  const DATALIST_ID = "manejoFasesList";
  const DRAFT_TTL = 10 * 60 * 1000;

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  const drafts = new Map();
  let observerTabela = null;
  let observerFases = null;
  let wrapperInstalado = null;
  let aplicando = false;

  function calcinhaAtiva() {
    return document.querySelector(".page.active")?.id === "manejo" &&
      Boolean(document.querySelector('#manejo .manejo-setor-btn.active[data-setor="calcinha"]'));
  }

  function normalizar(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function escapeHtml(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function limparRestosVersoesAnteriores() {
    document.getElementById("corponuManejoCalcinhaFaseSelect218Style")?.remove();
    document.querySelectorAll("#listaManejoInline .corponu-fase-select-218").forEach(el => el.remove());
    document.querySelectorAll("#listaManejoInline .corponu-fase-input-legado-218").forEach(input => {
      input.classList.remove("corponu-fase-input-legado-218");
    });
  }

  function injetarEstilo() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body[data-corponu-manejo-tipo="calcinha"] #listaManejoInline .${INPUT_CLASS},
      body[data-corponu-manejo-estavel="calcinha"] #listaManejoInline .${INPUT_CLASS}{
        display:none!important;
      }
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
    (document.head || document.documentElement).appendChild(style);
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

  function draftValido(orderId) {
    const id = String(orderId || "");
    const draft = drafts.get(id);
    if (!draft) return null;
    if (Date.now() - draft.atualizadoEm > DRAFT_TTL) {
      drafts.delete(id);
      return null;
    }
    return draft;
  }

  function valorDesejado(orderId, input) {
    const draft = draftValido(orderId);
    return draft ? draft.valor : String(input?.value || "");
  }

  function sincronizarInputLegado(input, valor) {
    if (!(input instanceof HTMLInputElement)) return;
    input.value = String(valor || "");
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
          fase: String(faseValor || "").trim().toUpperCase()
        }
      }
    });
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
    sincronizarInputLegado(input, desejado);

    let select = row.querySelector(`.${SELECT_CLASS}`);
    if (!(select instanceof HTMLSelectElement)) {
      select = document.createElement("select");
      select.className = SELECT_CLASS;
      select.dataset.orderId = orderId;
      select.setAttribute("aria-label", "Fase da calcinha");
      input.insertAdjacentElement("afterend", select);
    }

    const atualNormalizado = normalizar(desejado);
    const valores = [...fases];
    if (desejado && !valores.some(fase => normalizar(fase) === atualNormalizado)) {
      valores.unshift(desejado);
    }

    const assinatura = valores.map(normalizar).join("|");
    if (select.dataset.assinatura219 !== assinatura) {
      select.innerHTML = [
        '<option value="">Selecione a fase</option>',
        ...valores.map(fase => `<option value="${escapeHtml(fase)}">${escapeHtml(fase)}</option>`)
      ].join("");
      select.dataset.assinatura219 = assinatura;
    }

    const oficial = [...select.options].find(option => normalizar(option.value) === atualNormalizado);
    select.value = oficial?.value || "";
    input.classList.add(INPUT_CLASS);
  }

  function removerSelectsForaDaCalcinha() {
    document.querySelectorAll(`#listaManejoInline .${SELECT_CLASS}`).forEach(el => el.remove());
    document.querySelectorAll(`#listaManejoInline .${INPUT_CLASS}`).forEach(input => {
      input.classList.remove(INPUT_CLASS);
    });
  }

  function aplicarSelects() {
    if (aplicando) return;
    aplicando = true;
    try {
      if (!calcinhaAtiva()) {
        removerSelectsForaDaCalcinha();
        return;
      }

      document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")
        .forEach(montarSelectDaLinha);
    } finally {
      aplicando = false;
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
    sincronizarInputLegado(input, valor);
    sincronizarEstadoDual(orderId, valor);

    // Não disparamos input/change no campo legado. O salvamento já lê o valor dele
    // diretamente e isso evita que listeners antigos redesenhem a linha no instante
    // em que o usuário escolhe uma fase.
  }

  function observarTabela() {
    const tbody = document.getElementById("listaManejoInline");
    if (!tbody) return false;
    if (observerTabela?.__target === tbody) return true;

    observerTabela?.disconnect?.();
    observerTabela = new MutationObserver(() => queueMicrotask(aplicarSelects));
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
    if (atual.__corponuFaseListaReal219 === true) {
      wrapperInstalado = atual;
      return true;
    }
    if (wrapperInstalado === atual) return true;

    const embrulhado = async function corponuSalvarManejoCalcinhaFaseListaReal219(...args) {
      if (!calcinhaAtiva()) return atual.apply(this, args);

      const orderId = String(args[0] || "");
      const row = localizarLinha(orderId);
      const input = inputFase(row);
      const select = row?.querySelector(`.${SELECT_CLASS}`);
      const fase = String(select?.value || input?.value || "");

      if (orderId) {
        registrarDraft(orderId, fase);
        sincronizarInputLegado(input, fase);
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
        [120, 450, 1000, 1800].forEach(delay => setTimeout(aplicarSelects, delay));

        setTimeout(() => {
          const atualDraft = drafts.get(orderId);
          const linhaAtual = localizarLinha(orderId);
          const inputAtual = inputFase(linhaAtual);
          if (atualDraft?.salvoEm && inputAtual && normalizar(inputAtual.value) === normalizar(atualDraft.valor)) {
            drafts.delete(orderId);
          }
        }, 2600);
      }
    };

    Object.defineProperty(embrulhado, "__corponuFaseListaReal219", {
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
    limparRestosVersoesAnteriores();
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

    // Os wrappers antigos terminam de se instalar nos primeiros segundos.
    // Este fica por fora somente para sincronizar a Fase antes da gravação da Linha.
    setTimeout(envolverSalvar, 7000);
    setTimeout(envolverSalvar, 10000);

    setInterval(() => {
      observarTabela();
      observarListaFases();
      const agora = Date.now();
      for (const [id, draft] of drafts.entries()) {
        if (agora - draft.atualizadoEm > DRAFT_TTL) drafts.delete(id);
      }
    }, 5000);

    console.info(`[CorpoNu] Fase Calcinha usando lista real: ${VERSION}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();