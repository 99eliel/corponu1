(() => {
  "use strict";

  const VERSION = "2026-08-04-duplicidade-filtros-127";
  if (window.__CORPONU_DUPLICIDADE_FILTROS_LOADER_127__ === VERSION) return;
  window.__CORPONU_DUPLICIDADE_FILTROS_LOADER_127__ = VERSION;

  document.getElementById("alertaPagamentosDuplicadosFiltrado113")?.remove();
  document.getElementById("stylePagamentosDuplicadosFiltrado113")?.remove();

  const existente = [...document.scripts].find(script =>
    String(script.src || "").includes("corponu-pagamentos-duplicidade-filtros-127.js")
  );
  if (existente) return;

  const script = document.createElement("script");
  script.src = `./corponu-pagamentos-duplicidade-filtros-127.js?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
  script.async = false;
  script.dataset.corponuModulo = "pagamentos-duplicidade-filtros-127";
  script.onerror = () => console.error("Não foi possível carregar a verificação de duplicidades por filtro.");
  document.head.appendChild(script);
})();
