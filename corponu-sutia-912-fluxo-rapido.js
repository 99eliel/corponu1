(() => {
  "use strict";

  const VERSION = "2026-08-03-sutia-912-fluxo-rapido-94";
  const FORM_MANUAL = "formChegadaManualFaccao";
  const FORM_NORMAL = "formChegadaMovimentacao";

  if (window.__CORPONU_SUTIA_912_FLUXO_RAPIDO__ === VERSION) return;
  window.__CORPONU_SUTIA_912_FLUXO_RAPIDO__ = VERSION;

  const addOriginal = EventTarget.prototype.addEventListener;
  const removeOriginal = EventTarget.prototype.removeEventListener;
  const wrappers = new WeakMap();

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  const referencia = valor => texto(valor).replace(/\s+/g, "").toUpperCase();

  function captura(options) {
    return options === true || Boolean(options && typeof options === "object" && options.capture);
  }

  function chave(type, options) {
    return `${type}|${captura(options) ? "1" : "0"}`;
  }

  function ehChegadaManual912(alvo) {
    if (!(alvo instanceof HTMLFormElement) || alvo.id !== FORM_MANUAL) return false;
    const processo = normalizar(document.getElementById("chegadaManualProcesso")?.value);
    const ref = referencia(document.getElementById("chegadaManualRef")?.value);
    return processo === "SUTIA COMPLETO" && ref === "912";
  }

  function ehChegadaNormal912(alvo) {
    return alvo instanceof HTMLFormElement &&
      alvo.id === FORM_NORMAL &&
      alvo.dataset.sutia912Rapido === "1";
  }

  function deveEnvolver(alvo, type, listener) {
    if (type !== "submit" || typeof listener !== "function") return false;
    if (!(alvo instanceof HTMLFormElement)) return false;
    return (alvo.id === FORM_MANUAL && listener.name === "aoSubmitChegadaManual") ||
      (alvo.id === FORM_NORMAL && listener.name === "aoSubmitChegadaPadrao");
  }

  function mapaDoAlvo(alvo) {
    let mapa = wrappers.get(alvo);
    if (!mapa) {
      mapa = new Map();
      wrappers.set(alvo, mapa);
    }
    return mapa;
  }

  EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (!deveEnvolver(this, type, listener)) {
      return addOriginal.call(this, type, listener, options);
    }

    const mapa = mapaDoAlvo(this);
    const id = chave(type, options);
    let porListener = mapa.get(id);
    if (!porListener) {
      porListener = new WeakMap();
      mapa.set(id, porListener);
    }

    let wrapper = porListener.get(listener);
    if (!wrapper) {
      wrapper = function(event) {
        if (ehChegadaManual912(this) || ehChegadaNormal912(this)) {
          return;
        }
        return listener.call(this, event);
      };
      porListener.set(listener, wrapper);
    }

    return addOriginal.call(this, type, wrapper, options);
  };

  EventTarget.prototype.removeEventListener = function(type, listener, options) {
    if (deveEnvolver(this, type, listener)) {
      const wrapper = wrappers.get(this)?.get(chave(type, options))?.get(listener);
      if (wrapper) return removeOriginal.call(this, type, wrapper, options);
    }
    return removeOriginal.call(this, type, listener, options);
  };
})();