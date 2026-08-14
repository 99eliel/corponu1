(() => {
  "use strict";

  const VERSION = "2026-08-14-op-salvamento-rapido-199";
  const ARQUIVO = "corponu-op-salvamento-rapido-199.js";

  if (window.__CORPONU_CALCINHA_SALVAMENTO_RAPIDO_147__ === VERSION) return;
  window.__CORPONU_CALCINHA_SALVAMENTO_RAPIDO_147__ = VERSION;

  function carregar199() {
    if (window.__CORPONU_OP_SALVAMENTO_RAPIDO_199__ === VERSION) return;
    if ([...document.scripts].some(script => String(script.src || "").includes(ARQUIVO))) return;

    const script = document.createElement("script");
    script.src = `./${ARQUIVO}?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuModulo = "op-salvamento-rapido-199";
    script.onerror = () => console.error("Não foi possível carregar o salvamento rápido de OP.");
    document.head.appendChild(script);
  }

  carregar199();
})();
