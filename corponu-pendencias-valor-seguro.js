(() => {
  "use strict";

  const VERSION = "2026-08-04-correcao-lateral-pagamento-117";
  if (window.__CORPONU_PENDENCIAS_VALOR_BOOTSTRAP__ === VERSION) return;
  window.__CORPONU_PENDENCIAS_VALOR_BOOTSTRAP__ = VERSION;

  const script = document.createElement("script");
  script.src = `./corponu-pendencias-valor-seguro-117.js?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
  script.async = false;
  script.dataset.corponuModulo = "pendencias-valor-seguro-117";
  script.onerror = () => console.error("Não foi possível carregar a correção segura das pendências de LATERAL.");
  document.head.appendChild(script);
})();
