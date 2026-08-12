(() => {
  "use strict";

  const ARQUIVO = "corponu-manejo-calcinha-colunas-filtros-192.js";
  const VERSION = "2026-08-12-calcinha-colunas-filtros-192";

  if ([...document.scripts].some(script => String(script.src || "").includes(ARQUIVO))) return;

  const script = document.createElement("script");
  script.src = `./${ARQUIVO}?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
  script.async = false;
  script.dataset.corponuModulo = "manejo-calcinha-colunas-filtros-192";
  script.onerror = () => console.error("Não foi possível alinhar as colunas e filtros do Manejo Calcinha.");
  document.head.appendChild(script);
})();
