(() => {
  "use strict";

  const VERSION = "2026-08-19-manejo-calcinha-fase-selecao-217";
  const GUARD = "__CORPONU_MANEJO_CALCINHA_FASE_SELECAO_217__";
  const DRAFT_TTL = 10 * 60 * 1000;
  const drafts = new Map();
  let observerTabela = null;
  let wrapperInstalado = null;

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  function calcinhaAtiva() {
    return document.querySelector(".page.active")?.id === "manejo" &&
      Boolean(document.querySelector('#manejo .manejo-setor-btn.active[data-setor="calcinha"]'));
  }

  function normalizar(valor) {
    return String(valor ?? "").replace(/\s+/g, " ").trim().toUpperCase();
  }

  function orderIdDaLinha(row) {
    if (!(row instanceof Element)) return "";
    const select = row.querySelector(".corponu-manejo-line-select[data-order-id]");
    if (select?.dataset?.orderId) return String(select.dataset.orderId);

    const botao = row.querySelector(".btn-save-manejo");
    const onclick = String(botao?.getAttribute("onclick") || "");
    const match = onclick.match(/salvarManejoLinha\((?:'|\")([^'\"]+)(?:'|\")\)/);
    return match?.[1] || "";
  }

  function campoDaEntrada(campo) {
    if (!(campo instanceof HTMLInputElement) && !(campo instanceof HTMLSelectElement)) return "";
    if (campo.classList.contains("corponu-manejo-line-select")) return "linhaCalcinha";
    if (/-fase$/i.test(String(campo.id || ""))) return "fase";
    if (/-necessidade$/i.test(String(campo.id || ""))) return "necessidade";
    return "";
  }

  function entradaDaLinha(row, campo) {
    if (!(row instanceof Element)) return null;
    if (campo === "linhaCalcinha") return row.querySelector(".corponu-manejo-line-select");
    if (campo === "fase") return row.querySelector('input[id$="-fase"]');
    if (campo === "necessidade") return row.querySelector('input[id$="-necessidade"]');
    return null;
  }

  function localizarLinha(orderId) {
    const id = String(orderId || "");
    if (!id) return null;
    return [...document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")]
      .find(row => orderIdDaLinha(row) === id) || null;
  }

  function obterDraft(orderId, criar = false) {
    const id = String(orderId || "");
    if (!id) return null;
    let draft = drafts.get(id);
    if (!draft && criar) {
      draft = {
        orderId: id,
        valores: {},
        alterados: new Set(),
        atualizadoEm: Date.now(),
        salvoEm: 0,
        confirmados: new Set()
      };
      drafts.set(id, draft);
    }
    return draft || null;
  }

  function capturarCampo(campo) {
    if (!calcinhaAtiva()) return;
    const nomeCampo = campoDaEntrada(campo);
    if (!nomeCampo) return;
    const row = campo.closest("tr[data-manejo-row='1']");
    const orderId = orderIdDaLinha(row);
    if (!orderId) return;

    const draft = obterDraft(orderId, true);
    draft.valores[nomeCampo] = campo.value;
    draft.alterados.add(nomeCampo);
    draft.atualizadoEm = Date.now();
    draft.confirmados.delete(nomeCampo);
  }

  function capturarLinhaCompleta(orderId) {
    if (!calcinhaAtiva()) return null;
    const row = localizarLinha(orderId);
    if (!row) return null;

    const draft = obterDraft(orderId, true);
    ["fase", "necessidade", "linhaCalcinha"].forEach(nomeCampo => {
      const campo = entradaDaLinha(row, nomeCampo);
      if (!campo) return;
      draft.valores[nomeCampo] = campo.value;
      draft.alterados.add(nomeCampo);
    });
    draft.atualizadoEm = Date.now();
    return draft;
  }

  function sincronizarEstadoDual(orderId, draft) {
    if (!draft) return;
    const mapa = window.corponuDualMode?.state?.maps?.ordens;
    if (!(mapa instanceof Map)) return;

    const atual = mapa.get(String(orderId));
    if (!atual) return;

    const manejoAtual = atual?.manejosSetores?.calcinha || {};
    const fase = draft.valores.fase != null ? normalizar(draft.valores.fase) : manejoAtual.fase;
    const necessidade = draft.valores.necessidade != null
      ? String(draft.valores.necessidade || "").trim()
      : (manejoAtual.necessidade || "");
    const linha = draft.valores.linhaCalcinha != null
      ? String(draft.valores.linhaCalcinha || "").trim()
      : (manejoAtual.linhaCalcinha || atual.linhaCalcinha || "");

    const labelLinha = linha === "cotton_line"
      ? "COTTON LINE"
      : (linha === "corpo_nu" ? "CORPO NU" : (manejoAtual.linhaCalcinhaLabel || atual.linhaCalcinhaLabel || ""));

    mapa.set(String(orderId), {
      ...atual,
      linhaCalcinha: linha,
      linhaCalcinhaLabel: labelLinha,
      manejosSetores: {
        ...(atual.manejosSetores || {}),
        calcinha: {
          ...manejoAtual,
          fase,
          necessidade,
          necessidadeTexto: necessidade,
          linhaCalcinha: linha,
          linhaCalcinhaLabel: labelLinha,
          status: "organizada"
        }
      }
    });
  }

  function valoresIguais(campo, atual, desejado) {
    if (campo === "fase") return normalizar(atual) === normalizar(desejado);
    return String(atual ?? "") === String(desejado ?? "");
  }

  function restaurarDrafts() {
    if (!calcinhaAtiva() || !drafts.size) return;
    const agora = Date.now();

    for (const [orderId, draft] of drafts.entries()) {
      if (agora - draft.atualizadoEm > DRAFT_TTL) {
        drafts.delete(orderId);
        continue;
      }

      const row = localizarLinha(orderId);
      if (!row) continue;

      let todosConfirmados = Boolean(draft.salvoEm && draft.alterados.size);

      for (const nomeCampo of draft.alterados) {
        const campo = entradaDaLinha(row, nomeCampo);
        if (!campo) {
          todosConfirmados = false;
          continue;
        }

        const desejado = String(draft.valores[nomeCampo] ?? "");
        const atual = String(campo.value ?? "");
        const igual = valoresIguais(nomeCampo, atual, desejado);

        if (draft.salvoEm && igual) draft.confirmados.add(nomeCampo);
        else draft.confirmados.delete(nomeCampo);

        if (!igual) campo.value = desejado;
        campo.dataset.corponuDraft217 = "1";

        if (!draft.confirmados.has(nomeCampo)) todosConfirmados = false;
      }

      if (todosConfirmados && agora - draft.salvoEm >= 350) {
        drafts.delete(orderId);
      }
    }
  }

  function observarTabela() {
    const tbody = document.getElementById("listaManejoInline");
    if (!tbody) return false;
    if (observerTabela?.__target === tbody) return true;
    observerTabela?.disconnect?.();

    observerTabela = new MutationObserver(() => {
      restaurarDrafts();
    });
    observerTabela.observe(tbody, { childList: true, subtree: true });
    observerTabela.__target = tbody;
    return true;
  }

  function instalarEventos() {
    const registrar = event => {
      const campo = event.target;
      if (!(campo instanceof HTMLInputElement) && !(campo instanceof HTMLSelectElement)) return;
      if (!campo.closest("#listaManejoInline")) return;
      capturarCampo(campo);
    };

    document.addEventListener("input", registrar, true);
    document.addEventListener("change", event => {
      registrar(event);
      queueMicrotask(restaurarDrafts);
    }, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.closest('.manejo-setor-btn[data-setor], .nav-btn[data-page]')) {
        setTimeout(() => {
          observarTabela();
          restaurarDrafts();
        }, 0);
      }
    }, true);
  }

  function envolverSalvar() {
    const atual = window.salvarManejoLinha;
    if (typeof atual !== "function") return false;
    if (atual.__corponuFaseSelecao217 === true) {
      wrapperInstalado = atual;
      return true;
    }
    if (wrapperInstalado === atual) return true;

    const embrulhado = async function corponuSalvarManejoCalcinhaFaseSelecao217(...args) {
      if (!calcinhaAtiva()) return atual.apply(this, args);

      const orderId = String(args[0] || "");
      const draft = capturarLinhaCompleta(orderId);
      if (draft) sincronizarEstadoDual(orderId, draft);

      try {
        return await atual.apply(this, args);
      } finally {
        const atualDraft = obterDraft(orderId, false);
        if (atualDraft) {
          atualDraft.salvoEm = Date.now();
          atualDraft.atualizadoEm = Date.now();
          atualDraft.confirmados.clear();
          restaurarDrafts();
          setTimeout(restaurarDrafts, 120);
          setTimeout(restaurarDrafts, 400);
          setTimeout(restaurarDrafts, 900);
          setTimeout(restaurarDrafts, 1800);
        }
      }
    };

    Object.defineProperty(embrulhado, "__corponuFaseSelecao217", {
      value: true,
      configurable: false,
      enumerable: false
    });

    window.salvarManejoLinha = embrulhado;
    wrapperInstalado = embrulhado;
    return true;
  }

  function instalarWrapperDepoisDosLegados() {
    setTimeout(() => {
      envolverSalvar();
      restaurarDrafts();
    }, 7000);
  }

  function iniciar() {
    observarTabela();
    instalarEventos();
    instalarWrapperDepoisDosLegados();

    const observerEstrutura = new MutationObserver(() => {
      observarTabela();
      if (calcinhaAtiva()) restaurarDrafts();
    });
    const manejo = document.getElementById("manejo");
    if (manejo) observerEstrutura.observe(manejo, { childList: true, subtree: true });

    setInterval(() => {
      observarTabela();
      const agora = Date.now();
      for (const [id, draft] of drafts.entries()) {
        if (agora - draft.atualizadoEm > DRAFT_TTL) drafts.delete(id);
      }
    }, 5000);

    console.info(`[CorpoNu] Fase do Manejo Calcinha 217 ativa: ${VERSION}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();