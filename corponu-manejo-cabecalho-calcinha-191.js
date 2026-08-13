(() => {
  "use strict";

  const ARQUIVO = "corponu-manejo-calcinha-filtros-193.js";
  const VERSION = "2026-08-12-calcinha-filtros-corretos-193";

  if ([...document.scripts].some(script => String(script.src || "").includes(ARQUIVO))) return;

  const script = document.createElement("script");
  script.src = `./${ARQUIVO}?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
  script.async = false;
  script.dataset.corponuModulo = "manejo-calcinha-filtros-193";
  script.onerror = () => console.error("Não foi possível alinhar os filtros do Manejo Calcinha.");
  document.head.appendChild(script);
})();
