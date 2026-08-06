(() => {
  "use strict";

  const VERSION = "2026-08-06-chegada-estabilidade-132";
  if (window.__CORPONU_CHEGADA_ESTABILIDADE__ === VERSION) return;
  window.__CORPONU_CHEGADA_ESTABILIDADE__ = VERSION;

  // A proteção 131 precisa acompanhar novas linhas inseridas na tabela, mas não
  // deve reagir a toda mudança visual de classe da página inteira. Esta correção
  // remove apenas a observação de atributos do observer com a assinatura usada
  // pela proteção de chegada. Os demais observers do sistema permanecem intactos.
  const observarOriginal = MutationObserver.prototype.observe;
  MutationObserver.prototype.observe = function observarEstavel(alvo, opcoes = {}) {
    const filtro = Array.isArray(opcoes?.attributeFilter) ? opcoes.attributeFilter : [];
    const observerDaChegada = alvo === document.documentElement
      && opcoes?.childList === true
      && opcoes?.subtree === true
      && opcoes?.attributes === true
      && filtro.includes("class")
      && filtro.includes("onclick");

    if (observerDaChegada) {
      return observarOriginal.call(this, alvo, {
        childList: true,
        subtree: true
      });
    }

    return observarOriginal.call(this, alvo, opcoes);
  };

  // Evita que a própria proteção substitua repetidamente um texto que já está
  // correto. Reescrever textContent gera childList e alimentava o ciclo visual.
  const descritorTexto = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
  const seletorProtegido = [
    "[data-avisar-chegada]",
    "[data-avisar-chegada-131]",
    "[data-chegada-corte]",
    "[onclick*='registrarChegadaMovimentacao']",
    "[data-chegada-aviso-131]"
  ].join(",");

  if (descritorTexto?.get && descritorTexto?.set && descritorTexto.configurable) {
    Object.defineProperty(Node.prototype, "textContent", {
      configurable: descritorTexto.configurable,
      enumerable: descritorTexto.enumerable,
      get: descritorTexto.get,
      set(valor) {
        try {
          if (
            this instanceof Element
            && this.matches(seletorProtegido)
            && String(descritorTexto.get.call(this) ?? "") === String(valor ?? "")
          ) {
            return;
          }
        } catch (error) {
          // Mantém o comportamento nativo caso o elemento não aceite matches.
        }
        descritorTexto.set.call(this, valor);
      }
    });
  }
})();
