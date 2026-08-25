(() => {
  "use strict";

  const VERSION = "2026-08-25-manejo-calcinha-interface-estavel-232";
  const GUARD = "__CORPONU_MANEJO_CALCINHA_INTERFACE_ESTAVEL_232__";
  const LOCK_KEY = "__CORPONU_MANEJO_CALCINHA_RENDER_LOCK_232__";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  let instalado = false;
  let timer = 0;

  function calcinhaAtiva() {
    const pagina = document.querySelector(".page.active")?.id || "";
    const setor = document.querySelector('#manejo .manejo-setor-btn.active[data-setor="calcinha"]');
    return pagina === "manejo" && Boolean(setor);
  }

  function obterTrava() {
    let trava = window[LOCK_KEY];
    if (!trava || typeof trava !== "object") {
      trava = {
        ativo: false,
        contador: 0,
        pendente: false,
        ordens: new Set(),
        inicio: 0
      };
      window[LOCK_KEY] = trava;
    }
    if (!(trava.ordens instanceof Set)) trava.ordens = new Set();
    return trava;
  }

  function iniciarTrava(orderId) {
    const trava = obterTrava();
    trava.contador = Math.max(0, Number(trava.contador || 0)) + 1;
    trava.ativo = true;
    trava.pendente = false;
    trava.inicio = Date.now();
    if (orderId) trava.ordens.add(String(orderId));
    return trava;
  }

  function aguardarCallbacksTardios() {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.setTimeout(resolve, 180);
        });
      });
    });
  }

  async function finalizarTrava(orderId, trava) {
    // O setDoc/updateDoc pode resolver instantes antes do onSnapshot associado.
    // Mantemos a trava por mais dois frames + uma margem curta para capturar esse
    // callback tardio sem provocar qualquer nova renderização da tabela.
    await aguardarCallbacksTardios();

    const atual = obterTrava();
    if (atual !== trava) return;

    if (orderId) atual.ordens.delete(String(orderId));
    atual.contador = Math.max(0, Number(atual.contador || 0) - 1);

    if (atual.contador === 0) {
      atual.ativo = false;
      atual.pendente = false;
      atual.inicio = 0;
      atual.ordens.clear();
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
    if (atual.__corponuManejoCalcinhaInterfaceEstavel232 === true) {
      instalado = true;
      return true;
    }

    // A trava precisa ficar por fora da camada 223 para cobrir o salvamento normal
    // e também a confirmação autoritativa da Fase. Se a 223 ainda não carregou,
    // apenas aguardamos; não alteramos a cadeia parcialmente.
    if (atual.__corponuFaseCalcinhaSemPiscar223 !== true) return false;

    const interno = atual;

    const wrapper = async function corponuSalvarManejoCalcinhaInterfaceEstavel232(...args) {
      if (!calcinhaAtiva()) return interno.apply(this, args);

      const orderId = String(args[0] || "");
      const trava = iniciarTrava(orderId);
      try {
        return await interno.apply(this, args);
      } finally {
        await finalizarTrava(orderId, trava);
      }
    };

    Object.defineProperty(wrapper, "__corponuManejoCalcinhaInterfaceEstavel232", {
      value: true,
      configurable: false,
      enumerable: false
    });

    // Preservar as marcas evita que timers antigos reembrulhem a função e
    // multipliquem salvamentos/confirmações.
    propagarMarca(wrapper, interno, "__corponuFaseCalcinhaSemPiscar223");
    propagarMarca(wrapper, interno, "__corponuCalcinhaFluido205");
    propagarMarca(wrapper, interno, "__corponuFaseCalcinhaValidacaoCoordenada230");

    window.salvarManejoLinha = wrapper;
    instalado = true;

    if (timer) {
      clearInterval(timer);
      timer = 0;
    }

    console.info(`[CorpoNu] Interface estável do Manejo Calcinha ativa: ${VERSION}`);
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
