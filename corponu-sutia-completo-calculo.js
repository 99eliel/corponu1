(() => {
  "use strict";

  const VERSION = "2026-09-22-sutia-lateral-padrao-312";
  const BASE_FILE = "corponu-sutia-completo-calculo-base-174.js";
  const GUARD = "__CORPONU_SUTIA_COMPLETO_LOADER__";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  const existente = [...document.scripts].find(script =>
    String(script.src || "").includes(BASE_FILE) &&
    script.dataset.corponuSutiaCompletoBase === VERSION
  );
  if (existente) return;

  const script = document.createElement("script");
  script.src = `./${BASE_FILE}?v=${encodeURIComponent(VERSION)}`;
  script.async = false;
  script.dataset.corponuSutiaCompletoBase = VERSION;
  script.onerror = () => console.error("Não foi possível carregar a regra oficial do Sutiã Completo.");
  document.head.appendChild(script);
})();
