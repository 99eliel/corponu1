(() => {
  "use strict";

  const VERSION = "2026-08-24-manejo-calcinha-antipisca-231";
  const GUARD = "__CORPONU_MANEJO_CALCINHA_ANTIPISCA_231__";
  const SNAPSHOT_ATTR = "corponuAntipiscaCalcinha231";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  let instalado = false;
  let timer = 0;

  function calcinhaAtiva() {
    const pagina = document.querySelector(".page.active")?.id || "";
    const setor = document.querySelector('#manejo .manejo-setor-btn.active[data-setor="calcinha"]');
    return pagina === "manejo" && Boolean(setor);
  }

  function tabelaManejoAtual() {
    return document.getElementById("listaManejoInline")?.closest("table") || null;
  }

  function seletorSnapshot() {
    return '[data-corponu-antipisca-calcinha231="1"]';
  }

  function limparClone(clone) {
    [clone, ...clone.querySelectorAll("*")].forEach(elemento => {
      elemento.removeAttribute?.("id");
      elemento.removeAttribute?.("onclick");
      elemento.removeAttribute?.("onchange");
      elemento.removeAttribute?.("oninput");
      elemento.removeAttribute?.("tabindex");
      elemento.removeAttribute?.("name");
    });
  }

  function congelarTabela() {
    const tabela = tabelaManejoAtual();
    if (!(tabela instanceof HTMLElement)) return null;

    const wrapper = tabela.closest(".table-wrap") || tabela.parentElement;
    if (!(wrapper instanceof HTMLElement)) return null;

    wrapper.querySelectorAll(seletorSnapshot()).forEach(item => item.remove());

    const tabelaRect = tabela.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    if (!tabelaRect.width || !tabelaRect.height) return null;

    const clone = tabela.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return null;
    limparClone(clone);
    clone.dataset[SNAPSHOT_ATTR] = "1";
    clone.setAttribute("aria-hidden", "true");

    const posicaoCalculada = window.getComputedStyle(wrapper).position;
    const posicaoInlineAnterior = wrapper.style.position;
    const alterouPosicao = posicaoCalculada === "static";
    if (alterouPosicao) wrapper.style.position = "relative";

    const left = tabelaRect.left - wrapperRect.left + wrapper.scrollLeft;
    const top = tabelaRect.top - wrapperRect.top + wrapper.scrollTop;

    Object.assign(clone.style, {
      position: "absolute",
      left: `${left}px`,
      top: `${top}px`,
      width: `${tabelaRect.width}px`,
      minWidth: `${tabelaRect.width}px`,
      height: `${tabelaRect.height}px`,
      margin: "0",
      pointerEvents: "none",
      userSelect: "none",
      zIndex: "2147482000",
      visibility: "visible"
    });

    const visibilidadeAnterior = tabela.style.visibility;
    tabela.style.visibility = "hidden";
    wrapper.appendChild(clone);

    const esconderTabelaReal = () => {
      const atual = tabelaManejoAtual();
      if (atual instanceof HTMLElement) atual.style.visibility = "hidden";
    };

    const observer = new MutationObserver(esconderTabelaReal);
    observer.observe(wrapper, { childList: true, subtree: true });

    return {
      wrapper,
      tabela,
      clone,
      observer,
      visibilidadeAnterior,
      posicaoInlineAnterior,
      alterouPosicao
    };
  }

  function aguardarEstadoVisualFinal() {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.setTimeout(resolve, 70));
      });
    });
  }

  async function liberarTabela(congelamento) {
    if (!congelamento) return;

    await aguardarEstadoVisualFinal();
    congelamento.observer?.disconnect?.();

    const atual = tabelaManejoAtual();
    if (atual instanceof HTMLElement) atual.style.visibility = "";

    if (congelamento.tabela?.isConnected) {
      congelamento.tabela.style.visibility = congelamento.visibilidadeAnterior || "";
    }

    congelamento.clone?.remove?.();

    if (congelamento.alterouPosicao && congelamento.wrapper?.isConnected) {
      congelamento.wrapper.style.position = congelamento.posicaoInlineAnterior || "";
    }
  }

  function propagarMarca(destino, origem, nome) {
    if (!origem?.[nome]) return;
    try {
      Object.defineProperty(destino, nome, {
        value: true,
        configurable: false,
        enumerable: false
      });
    } catch (_) {
      try { destino[nome] = true; } catch (_) {}
    }
  }

  function instalar() {
    if (instalado) return true;

    const atual = window.salvarManejoLinha;
    if (typeof atual !== "function") return false;
    if (atual.__corponuManejoCalcinhaAntipisca231 === true) {
      instalado = true;
      return true;
    }

    // O antipisca precisa ficar POR FORA da 223 para cobrir também o updateDoc
    // autoritativo da Fase. Se a 223 ainda não entrou na cadeia, aguardamos.
    if (atual.__corponuFaseCalcinhaSemPiscar223 !== true) return false;

    const interno = atual;

    const wrapper = async function corponuSalvarManejoCalcinhaAntipisca231(...args) {
      if (!calcinhaAtiva()) return interno.apply(this, args);

      const congelamento = congelarTabela();
      try {
        return await interno.apply(this, args);
      } finally {
        await liberarTabela(congelamento);
      }
    };

    Object.defineProperty(wrapper, "__corponuManejoCalcinhaAntipisca231", {
      value: true,
      configurable: false,
      enumerable: false
    });

    propagarMarca(wrapper, interno, "__corponuFaseCalcinhaSemPiscar223");
    propagarMarca(wrapper, interno, "__corponuCalcinhaFluido205");
    propagarMarca(wrapper, interno, "__corponuFaseCalcinhaValidacaoCoordenada230");

    window.salvarManejoLinha = wrapper;
    instalado = true;
    if (timer) {
      clearInterval(timer);
      timer = 0;
    }

    console.info(`[CorpoNu] Antipisca Manejo Calcinha ativo: ${VERSION}`);
    return true;
  }

  function iniciar() {
    if (instalar()) return;

    let tentativas = 0;
    timer = window.setInterval(() => {
      tentativas += 1;
      if (instalar() || tentativas >= 40) {
        clearInterval(timer);
        timer = 0;
      }
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
