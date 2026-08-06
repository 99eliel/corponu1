(() => {
  "use strict";

  const VERSION = "2026-08-06-duplicidade-sem-data-133";
  const ALERTA_ID = "corponuDuplicidadeFiltro133";
  if (window.__CORPONU_DUPLICIDADE_ESTABILIDADE_133__ === VERSION) return;
  window.__CORPONU_DUPLICIDADE_ESTABILIDADE_133__ = VERSION;

  const MutationObserverOriginal = window.MutationObserver;
  if (typeof MutationObserverOriginal !== "function") return;

  const dentroDoAlerta = node => {
    const elemento = node instanceof Element ? node : node?.parentElement;
    return Boolean(
      elemento &&
      (elemento.id === ALERTA_ID || elemento.closest?.(`#${ALERTA_ID}`))
    );
  };

  class MutationObserverFiltrado {
    constructor(callback) {
      this._interno = new MutationObserverOriginal((registros, observer) => {
        const relevantes = registros.filter(registro => {
          if (dentroDoAlerta(registro.target)) return false;
          const alterados = [...registro.addedNodes, ...registro.removedNodes];
          if (alterados.length && alterados.every(dentroDoAlerta)) return false;
          return true;
        });
        if (relevantes.length) callback(relevantes, observer);
      });
    }

    observe(...argumentos) {
      return this._interno.observe(...argumentos);
    }

    disconnect() {
      return this._interno.disconnect();
    }

    takeRecords() {
      return this._interno.takeRecords().filter(registro => !dentroDoAlerta(registro.target));
    }
  }

  window.MutationObserver = MutationObserverFiltrado;
  window.__restaurarMutationObserverDuplicidade133 = () => {
    if (window.MutationObserver === MutationObserverFiltrado) {
      window.MutationObserver = MutationObserverOriginal;
    }
  };
})();