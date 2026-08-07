(() => {
  "use strict";

  const VERSION = "2026-08-07-quantidade-sem-scroll-148";
  const SELETOR = "#ordemQuantidade";

  if (window.__CORPONU_QUANTIDADE_SEM_SCROLL_148__ === VERSION) return;
  window.__CORPONU_QUANTIDADE_SEM_SCROLL_148__ = VERSION;

  function protegerCampo(campo) {
    if (!(campo instanceof HTMLInputElement) || campo.dataset.semScroll148 === "1") return;
    campo.dataset.semScroll148 = "1";

    campo.addEventListener("wheel", () => {
      const valorAntes = campo.value;

      // Inputs type=number alteram o valor com a rodinha somente quando estão
      // focados. Removemos o foco sem cancelar o wheel, então a página continua
      // rolando normalmente.
      if (document.activeElement === campo) campo.blur();

      // Proteção adicional para navegadores que ainda aplicam o step depois do
      // handler de wheel: restaura exatamente o valor que o usuário digitou.
      window.requestAnimationFrame(() => {
        if (campo.value !== valorAntes) {
          campo.value = valorAntes;
          campo.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
    }, { passive: true });
  }

  function aplicar() {
    document.querySelectorAll(SELETOR).forEach(protegerCampo);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aplicar, { once: true });
  } else {
    aplicar();
  }

  const observer = new MutationObserver(aplicar);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
