(() => {
  "use strict";

  const VERSION = "2026-08-17-manejo-calcinha-estavel-204";
  const DATA_MODO = "corponuManejoEstavel";
  const QUIETO_MS = 450;
  const ESPERA_MINIMA_APOS_SAVE = 450;
  const LIMITE_FINALIZACAO = 3500;

  if (window.__CORPONU_MANEJO_CALCINHA_ESTAVEL__ === VERSION) return;
  window.__CORPONU_MANEJO_CALCINHA_ESTAVEL__ = VERSION;

  let observadorPagina = null;
  let observadorPaginaPausado = false;
  let protecaoAtual = null;
  let wrapperInstalado = null;
  let timerInstalacao = 0;

  function manejoCalcinhaAtivo() {
    const pagina = document.querySelector(".page.active")?.id || "";
    const botao = document.querySelector('.manejo-setor-btn.active[data-setor="calcinha"]');
    return pagina === "manejo" && Boolean(botao);
  }

  function marcarModoAtual() {
    if (!document.body) return;
    if (manejoCalcinhaAtivo()) {
      document.body.dataset[DATA_MODO] = "calcinha";
    } else {
      delete document.body.dataset[DATA_MODO];
    }
  }

  function injetarEstilos() {
    if (document.getElementById("corponuManejoCalcinhaEstavel204Styles")) return;
    const style = document.createElement("style");
    style.id = "corponuManejoCalcinhaEstavel204Styles";
    style.textContent = `
      body[data-corponu-manejo-estavel="calcinha"] #listaManejoInline tr[data-manejo-row="1"] > td:has(.silk-fields),
      body[data-corponu-manejo-estavel="calcinha"] #listaManejoInline tr[data-manejo-row="1"] > td:has(.tecido-fields) {
        display: none !important;
        visibility: hidden !important;
      }
      #corponuManejoCalcinhaFreeze204 {
        position: fixed;
        z-index: 2147483000;
        overflow: hidden;
        background: #fff;
        pointer-events: auto;
        cursor: wait;
        margin: 0;
        padding: 0;
      }
      #corponuManejoCalcinhaFreeze204 * {
        pointer-events: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ocultarCamposSutiaAgora() {
    marcarModoAtual();
    if (!manejoCalcinhaAtivo()) return;

    document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1'] > td").forEach(cell => {
      if (!(cell instanceof HTMLElement)) return;
      if (cell.querySelector(".silk-fields") || cell.querySelector(".tecido-fields")) {
        cell.style.setProperty("display", "none", "important");
        cell.dataset.corponuCalcinhaOculto204 = "1";
      }
    });
  }

  function restaurarCamposSutia() {
    document.querySelectorAll('[data-corponu-calcinha-oculto204="1"]').forEach(cell => {
      if (!(cell instanceof HTMLElement)) return;
      cell.style.removeProperty("display");
      delete cell.dataset.corponuCalcinhaOculto204;
    });
  }

  function obterObservadorPagina() {
    const lista = window.corponuDualMode?.state?.observers;
    if (!Array.isArray(lista) || !lista.length) return null;
    const candidato = lista[lista.length - 1];
    if (!candidato || typeof candidato.disconnect !== "function" || typeof candidato.observe !== "function") return null;
    observadorPagina = candidato;
    return observadorPagina;
  }

  function pausarObservadorPaginaSeCalcinha() {
    if (!manejoCalcinhaAtivo()) return;
    const observer = observadorPagina || obterObservadorPagina();
    if (!observer || observadorPaginaPausado) return;

    try {
      observer.takeRecords?.();
      observer.disconnect();
      observadorPaginaPausado = true;
    } catch (_) {}
  }

  function restaurarObservadorPaginaSeNecessario() {
    if (!observadorPaginaPausado) return;
    if (manejoCalcinhaAtivo()) return;

    const observer = observadorPagina || obterObservadorPagina();
    if (!observer) return;
    const shell = document.getElementById("appShell") || document.body;
    if (!shell) return;

    try {
      observer.observe(shell, {
        attributes: true,
        subtree: true,
        attributeFilter: ["class"]
      });
      observadorPaginaPausado = false;
    } catch (_) {}
  }

  function copiarEstadoCampos(origem, copia) {
    const origemCampos = origem.querySelectorAll("input, select, textarea");
    const copiaCampos = copia.querySelectorAll("input, select, textarea");

    origemCampos.forEach((campo, indice) => {
      const clone = copiaCampos[indice];
      if (!clone) return;

      if (campo instanceof HTMLInputElement) {
        clone.value = campo.value;
        clone.checked = campo.checked;
      } else if (campo instanceof HTMLSelectElement) {
        clone.value = campo.value;
        [...clone.options].forEach((option, optionIndex) => {
          option.selected = Boolean(campo.options[optionIndex]?.selected);
        });
      } else if (campo instanceof HTMLTextAreaElement) {
        clone.value = campo.value;
        clone.textContent = campo.value;
      }
    });
  }

  function limparCloneVisual(clone) {
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach(elemento => elemento.removeAttribute("id"));
    clone.querySelectorAll("[onclick]").forEach(elemento => elemento.removeAttribute("onclick"));
    clone.querySelectorAll("input, select, textarea, button, a").forEach(elemento => {
      elemento.setAttribute("tabindex", "-1");
      elemento.setAttribute("aria-hidden", "true");
    });
  }

  function criarProtecaoVisual() {
    if (!manejoCalcinhaAtivo()) return null;
    if (protecaoAtual) {
      protecaoAtual.profundidade += 1;
      return protecaoAtual;
    }

    ocultarCamposSutiaAgora();

    const tabela = document.querySelector("#manejo .manejo-inline-table");
    const wrapper = tabela?.closest(".table-wrap") || tabela?.parentElement;
    if (!tabela || !wrapper) return null;

    const rect = wrapper.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const clone = wrapper.cloneNode(true);
    copiarEstadoCampos(wrapper, clone);
    limparCloneVisual(clone);

    const overlay = document.createElement("div");
    overlay.id = "corponuManejoCalcinhaFreeze204";
    overlay.style.left = `${Math.round(rect.left)}px`;
    overlay.style.top = `${Math.round(rect.top)}px`;
    overlay.style.width = `${Math.round(rect.width)}px`;
    overlay.style.height = `${Math.round(rect.height)}px`;

    clone.style.margin = "0";
    clone.style.width = "100%";
    clone.style.height = "100%";
    clone.style.maxWidth = "none";
    overlay.appendChild(clone);
    document.body.appendChild(overlay);

    try {
      clone.scrollLeft = wrapper.scrollLeft;
      clone.scrollTop = wrapper.scrollTop;
    } catch (_) {}

    const visibilidadeAnterior = wrapper.style.visibility;
    wrapper.style.visibility = "hidden";

    const tbody = document.getElementById("listaManejoInline");
    const sessao = {
      profundidade: 1,
      overlay,
      wrapper,
      visibilidadeAnterior,
      tbody,
      ultimaMutacao: Date.now(),
      finalizando: false,
      observer: null,
      timerSeguranca: 0
    };

    if (tbody) {
      sessao.observer = new MutationObserver(() => {
        sessao.ultimaMutacao = Date.now();
        ocultarCamposSutiaAgora();
      });
      sessao.observer.observe(tbody, { childList: true, subtree: true });
    }

    sessao.timerSeguranca = window.setTimeout(() => {
      if (protecaoAtual === sessao) revelarEstadoFinal(sessao, true);
    }, 10000);

    protecaoAtual = sessao;
    return sessao;
  }

  function revelarEstadoFinal(sessao, forcar = false) {
    if (!sessao || protecaoAtual !== sessao) return;
    if (!forcar && sessao.profundidade > 0) return;

    ocultarCamposSutiaAgora();

    requestAnimationFrame(() => {
      ocultarCamposSutiaAgora();
      requestAnimationFrame(() => {
        if (protecaoAtual !== sessao) return;

        try { sessao.observer?.disconnect(); } catch (_) {}
        clearTimeout(sessao.timerSeguranca);

        sessao.wrapper.style.visibility = sessao.visibilidadeAnterior || "";
        sessao.overlay.remove();
        protecaoAtual = null;

        if (!manejoCalcinhaAtivo()) {
          restaurarCamposSutia();
          restaurarObservadorPaginaSeNecessario();
        }
      });
    });
  }

  function finalizarProtecaoQuandoEstavel(sessao) {
    if (!sessao || protecaoAtual !== sessao) return;
    sessao.profundidade = Math.max(0, sessao.profundidade - 1);
    if (sessao.profundidade > 0 || sessao.finalizando) return;
    sessao.finalizando = true;

    const inicio = Date.now();
    const verificar = () => {
      if (protecaoAtual !== sessao) return;
      ocultarCamposSutiaAgora();

      const agora = Date.now();
      const quieto = agora - sessao.ultimaMutacao >= QUIETO_MS;
      const minimo = agora - inicio >= ESPERA_MINIMA_APOS_SAVE;
      const limite = agora - inicio >= LIMITE_FINALIZACAO;

      if ((quieto && minimo) || limite) {
        sessao.profundidade = 0;
        revelarEstadoFinal(sessao, true);
        return;
      }

      setTimeout(verificar, 90);
    };

    setTimeout(verificar, 90);
  }

  function ehCampoFaseCalcinha(alvo) {
    if (!(alvo instanceof HTMLInputElement)) return false;
    if (!manejoCalcinhaAtivo()) return false;
    if (!alvo.closest("#listaManejoInline")) return false;
    return /-fase$/i.test(String(alvo.id || ""));
  }

  function prepararEdicaoFase(evento) {
    if (!ehCampoFaseCalcinha(evento.target)) return;
    marcarModoAtual();
    pausarObservadorPaginaSeCalcinha();
    ocultarCamposSutiaAgora();
  }

  function prepararCliqueConcluir(evento) {
    const botao = evento.target?.closest?.("#listaManejoInline .btn-save-manejo");
    if (!botao || !manejoCalcinhaAtivo()) return;

    if (protecaoAtual) {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      return;
    }

    const ativo = document.activeElement;
    if (ativo instanceof HTMLInputElement && ativo.closest("#listaManejoInline")) {
      ativo.blur();
    }

    marcarModoAtual();
    pausarObservadorPaginaSeCalcinha();
    ocultarCamposSutiaAgora();
    criarProtecaoVisual();
  }

  function envolverSalvarAtual() {
    const atual = window.salvarManejoLinha;
    if (typeof atual !== "function") return false;
    if (atual.__corponuCalcinhaEstavel204 === true) {
      wrapperInstalado = atual;
      return true;
    }
    if (wrapperInstalado === atual) return true;

    const embrulhado = async function corponuSalvarManejoCalcinhaEstavel204(...args) {
      if (!manejoCalcinhaAtivo()) {
        return atual.apply(this, args);
      }

      pausarObservadorPaginaSeCalcinha();
      ocultarCamposSutiaAgora();
      const sessao = criarProtecaoVisual();

      try {
        return await atual.apply(this, args);
      } finally {
        if (sessao) finalizarProtecaoQuandoEstavel(sessao);
      }
    };

    Object.defineProperty(embrulhado, "__corponuCalcinhaEstavel204", {
      value: true,
      configurable: false,
      enumerable: false
    });

    window.salvarManejoLinha = embrulhado;
    wrapperInstalado = embrulhado;
    return true;
  }

  function sincronizarModo() {
    marcarModoAtual();
    if (manejoCalcinhaAtivo()) {
      pausarObservadorPaginaSeCalcinha();
      ocultarCamposSutiaAgora();
    } else {
      restaurarCamposSutia();
      restaurarObservadorPaginaSeNecessario();
    }
    envolverSalvarAtual();
  }

  function instalar() {
    injetarEstilos();
    sincronizarModo();

    ["focusin", "input", "change"].forEach(tipo => {
      document.addEventListener(tipo, prepararEdicaoFase, true);
    });
    document.addEventListener("click", prepararCliqueConcluir, true);

    document.addEventListener("click", evento => {
      if (evento.target?.closest?.(".manejo-setor-btn[data-setor], .nav-btn[data-page]")) {
        setTimeout(sincronizarModo, 0);
        setTimeout(sincronizarModo, 80);
        setTimeout(sincronizarModo, 300);
      }
    }, true);

    let tentativas = 0;
    timerInstalacao = window.setInterval(() => {
      tentativas += 1;
      sincronizarModo();
      if (tentativas >= 40 && typeof window.salvarManejoLinha === "function" && window.corponuDualMode?.state?.observers?.length) {
        clearInterval(timerInstalacao);
        timerInstalacao = 0;
      }
    }, 250);

    window.addEventListener("pageshow", sincronizarModo);
    window.addEventListener("focus", sincronizarModo);

    console.info(`[CorpoNu] Manejo Calcinha estável ativo: ${VERSION}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", instalar, { once: true });
  } else {
    instalar();
  }
})();
