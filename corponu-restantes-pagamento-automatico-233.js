(() => {
  "use strict";

  const VERSION = "2026-08-25-restantes-pontual-loader-239";
  const GUARD = "__CORPONU_RESTANTES_PONTUAL_LOADER_239__";
  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  if (document.querySelector('script[data-corponu-restantes-pontual="239"]')) return;

  const script = document.createElement("script");
  script.src = `./corponu-restantes-pontual-239.js?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
  script.async = false;
  script.dataset.corponuRestantesPontual = "239";
  script.onerror = () => console.error("Não foi possível carregar o cálculo pontual dos Restantes 239.");
  (document.head || document.documentElement).appendChild(script);
})();
