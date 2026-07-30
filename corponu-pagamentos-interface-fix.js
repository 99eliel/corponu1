(() => {
  "use strict";
  const VERSION = "2026-07-30-pagamentos-interface-organizada-30";
  if (window.__CORPONU_PAGAMENTOS_INTERFACE_FIX__ === VERSION) return;
  window.__CORPONU_PAGAMENTOS_INTERFACE_FIX__ = VERSION;

  function estabilizar() {
    document.querySelectorAll("#pagV30Tabs .pag-v30-tab small").forEach(contador => contador.remove());
  }

  function iniciar() {
    estabilizar();
    const observer = new MutationObserver(estabilizar);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();