(() => {
  "use strict";

  const VERSION = "2026-08-19-manejo-calcinha-fase-definitivo-216";
  const GUARD = "__CORPONU_MANEJO_CALCINHA_FASE_DEFINITIVO_216__";
  const DRAFT_TTL = 10 * 60 * 1000;
  const drafts = new Map();
  let focoAtual = null;
  let observerTabela = null;
  let wrapperInstalado = null;
  let timerLimpeza = 0;

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  function calcinhaAtiva() {
    return document.querySelector(".page.active")?.id === "manejo" &&
      Boolean(document.querySelector('#manejo .manejo-setor-btn.active[data-setor="calcinha"]'));
  }

  function controleEditavel(elemento) {
    return elemento instanceof HTMLInputElement || elemento instanceof HTMLSelectElement;
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

  function campoDaEntrada(input) {
    if (!controleEditavel(input)) return "";
    if (input.classList.contains("corponu-manejo-line-select")) return "linhaCalcinha";
    if (input instanceof HTMLInputElement && /-fase$/i.test(String(input.id || ""))) return "fase";
    if (input instanceof HTMLInputElement && /-necessidade$/i.test(String(input.id || ""))) return "necessidade";
    return "";
  }

  function entradaDaLinha(row, campo) {
    if (!(row instanceof Element)) return null;
    if (campo === "linhaCalcinha") return row.querySelector(".corponu-manejo-line-select");
    if (campo === "fase") return row.querySelector('input[id$="-fase"]');
    if (campo === "necessidade") return row.querySelector('input[id$="-necessidade"]');
    return null;
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

  function capturarCampo(input, marcarAlterado = true) {
    if (!calcinhaAtiva() || !controleEditavel(input)) return;
    const campo = campoDaEntrada(input);
    if (!campo) return;
    const row = input.closest("tr[data-manejo-row='1']");
    const orderId = orderIdDaLinha(row);
    if (!orderId) return;

    const draft = obterDraft(orderId, true);
    draft.valores[campo] = input.value;
    if (marcarAlterado) draft.alterados.add(campo);
    draft.atualizadoEm = Date.now();
    draft.confirmados.delete(campo);
  }

  function capturarLinhaCompleta(orderId) {
    if (!calcinhaAtiva()) return null;
    const id = String(orderId || "");
    if (!id) return null;
    const row = [...document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")]
      .find(item => orderIdDaLinha(item) === id);
    if (!row) return null;

    const draft = obterDraft(id, true);
    ["fase", "necessidade", "linhaCalcinha"].forEach(campo => {
      const input = entradaDaLinha(row, campo);
      if (!controleEditavel(input)) return;
      draft.valores[campo] = input.value;
      draft.alterados.add(campo);
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

    const proximoManejo = {
      ...manejoAtual,
      fase,
      necessidade,
      necessidadeTexto: necessidade,
      linhaCalcinha: linha,
      linhaCalcinhaLabel: linha === "cotton_line" ? "COTTON LINE" : (linha === "corpo_nu" ? "CORPO NU" : (manejoAtual.linhaCalcinhaLabel || "")),
      status: "organizada"
    };

    mapa.set(String(orderId), {
      ...atual,
      linhaCalcinha: linha,
      linhaCalcinhaLabel: proximoManejo.linhaCalcinhaLabel,
      manejosSetores: {
        ...(atual.manejosSetores || {}),
        calcinha: proximoManejo
      }
    });
  }

  function restaurarDrafts() {
    if (!calcinhaAtiva() || !drafts.size) return;
    const agora = Date.now();

    for (const [orderId, draft] of drafts.entries()) {
      if (agora - draft.atualizadoEm > DRAFT_TTL && !draft.salvoEm) {
        drafts.delete(orderId);
        continue;
      }

      const row = [...document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")]
        .find(item => orderIdDaLinha(item) === orderId);
      if (!row) continue;

      let todosConfirmados = draft.salvoEm > 0 && draft.alterados.size > 0;

      for (const campo of draft.alterados) {
        const input = entradaDaLinha(row, campo);
        if (!controleEditavel(input)) {
          todosConfirmados = false;
          continue;
        }

        const desejado = String(draft.valores[campo] ?? "");
        const veioDoRender = String(input.value ?? "");
        const igual = campo === "fase"
          ? normalizar(veioDoRender) === normalizar(desejado)
          : veioDoRender === desejado;

        if (draft.salvoEm && igual) draft.confirmados.add(campo);
        else draft.confirmados.delete(campo);

        if (!igual) input.value = desejado;
        input.dataset.corponuDraft216 = "1";
        if (!draft.confirmados.has(campo)) todosConfirmados = false;
      }

      if (focoAtual?.orderId === orderId) {
        const input = entradaDaLinha(row, focoAtual.campo);
        if (input instanceof HTMLInputElement && document.activeElement !== input) {
          try {
            input.focus({ preventScroll: true });
            const tamanho = input.value.length;
            const inicio = Math.min(Number(focoAtual.inicio ?? tamanho), tamanho);
            const fim = Math.min(Number(focoAtual.fim ?? inicio), tamanho);
            input.setSelectionRange?.(inicio, fim);
          } catch (_) {}
        }
      }

      if (todosConfirmados && agora - draft.salvoEm >= 350) {
        drafts.delete(orderId);
        if (focoAtual?.orderId === orderId) focoAtual = null;
      }
    }
  }

  function observarTabela() {
    const tbody = document.getElementById("listaManejoInline");
    if (!tbody) return false;
    if (observerTabela?.__target === tbody) return true;
    observerTabela?.disconnect?.();

    observerTabela = new MutationObserver(() => {
      // A restauração acontece no microtask do MutationObserver, antes do próximo paint.
      restaurarDrafts();
    });
    observerTabela.observe(tbody, { childList: true, subtree: true });
    observerTabela.__target = tbody;
    return true;
  }

  function registrarFoco(input) {
    if (!calcinhaAtiva() || !(input instanceof HTMLInputElement)) return;
    const campo = campoDaEntrada(input);
    if (!campo) return;
    const row = input.closest("tr[data-manejo-row='1']");
    const orderId = orderIdDaLinha(row);
    if (!orderId) return;
    focoAtual = {
      orderId,
      campo,
      inicio: input.selectionStart,
      fim: input.selectionEnd,
      momento: Date.now()
    };
  }

  function atualizarSelecao(input) {
    if (!(input instanceof HTMLInputElement) || !focoAtual) return;
    const row = input.closest("tr[data-manejo-row='1']");
    if (orderIdDaLinha(row) !== focoAtual.orderId || campoDaEntrada(input) !== focoAtual.campo) return;
    focoAtual.inicio = input.selectionStart;
    focoAtual.fim = input.selectionEnd;
    focoAtual.momento = Date.now();
  }

  function instalarEventosRascunho() {
    document.addEventListener("pointerdown", event => {
      const alvo = event.target;
      const controlado = controleEditavel(alvo) && Boolean(alvo.closest("#listaManejoInline")) && Boolean(campoDaEntrada(alvo));
      if (!controlado) focoAtual = null;
    }, true);

    document.addEventListener("focusin", event => {
      const input = event.target;
      if (!controleEditavel(input) || !input.closest("#listaManejoInline")) return;
      registrarFoco(input);
      capturarCampo(input, false);
    }, true);

    document.addEventListener("input", event => {
      const input = event.target;
      if (!controleEditavel(input) || !input.closest("#listaManejoInline")) return;
      capturarCampo(input, true);
      if (input instanceof HTMLInputElement) atualizarSelecao(input);
    }, true);

    document.addEventListener("change", event => {
      const input = event.target;
      if (!controleEditavel(input) || !input.closest("#listaManejoInline")) return;
      capturarCampo(input, true);
      if (input instanceof HTMLInputElement) atualizarSelecao(input);
      queueMicrotask(restaurarDrafts);
    }, true);

    document.addEventListener("keyup", event => {
      if (event.target instanceof HTMLInputElement) atualizarSelecao(event.target);
    }, true);

    document.addEventListener("mouseup", event => {
      if (event.target instanceof HTMLInputElement) atualizarSelecao(event.target);
    }, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.closest('.manejo-setor-btn[data-setor], .nav-btn[data-page]')) {
        setTimeout(() => {
          observarTabela();
          restaurarDrafts();
        }, 0);
        setTimeout(restaurarDrafts, 80);
        setTimeout(restaurarDrafts, 250);
      }
    }, true);
  }

  function envolverSalvar() {
    const atual = window.salvarManejoLinha;
    if (typeof atual !== "function") return false;
    if (atual.__corponuFaseDefinitivo216 === true) {
      wrapperInstalado = atual;
      return true;
    }
    if (wrapperInstalado === atual) return true;

    const embrulhado = async function corponuSalvarManejoCalcinhaFaseDefinitivo216(...args) {
      if (!calcinhaAtiva()) return atual.apply(this, args);

      const orderId = String(args[0] || "");
      const draft = capturarLinhaCompleta(orderId);
      if (draft) {
        // O wrapper antigo da LINHA faz uma segunda gravação a partir deste Map.
        // Atualizamos a cópia antes do save para ela nunca restaurar uma Fase velha.
        sincronizarEstadoDual(orderId, draft);
      }

      let retorno;
      try {
        retorno = await atual.apply(this, args);
      } finally {
        const atualDraft = obterDraft(orderId, false);
        if (atualDraft) {
          atualDraft.salvoEm = Date.now();
          atualDraft.atualizadoEm = Date.now();
          atualDraft.confirmados.clear();
          // O rascunho só some quando um novo render vier com os mesmos valores.
          restaurarDrafts();
          setTimeout(restaurarDrafts, 120);
          setTimeout(restaurarDrafts, 400);
          setTimeout(restaurarDrafts, 900);
          setTimeout(restaurarDrafts, 1800);
        }
      }
      return retorno;
    };

    Object.defineProperty(embrulhado, "__corponuFaseDefinitivo216", {
      value: true,
      configurable: false,
      enumerable: false
    });

    window.salvarManejoLinha = embrulhado;
    wrapperInstalado = embrulhado;
    return true;
  }

  function instalarWrapperDepoisDosLegados() {
    // O 205 termina suas tentativas de instalação em cerca de 6 s. Entramos depois
    // dele para manter uma cadeia única e evitar wrappers recursivos.
    setTimeout(() => {
      envolverSalvar();
      restaurarDrafts();
    }, 7000);
  }

  function iniciar() {
    observarTabela();
    instalarEventosRascunho();
    instalarWrapperDepoisDosLegados();

    const observerEstrutura = new MutationObserver(() => {
      observarTabela();
      if (calcinhaAtiva()) restaurarDrafts();
    });
    const manejo = document.getElementById("manejo");
    if (manejo) observerEstrutura.observe(manejo, { childList: true, subtree: true });

    timerLimpeza = setInterval(() => {
      observarTabela();
      const agora = Date.now();
      for (const [id, draft] of drafts.entries()) {
        if (agora - draft.atualizadoEm > DRAFT_TTL) drafts.delete(id);
      }
      if (calcinhaAtiva()) restaurarDrafts();
    }, 3000);

    console.info(`[CorpoNu] Fase do Manejo Calcinha protegida: ${VERSION}`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();