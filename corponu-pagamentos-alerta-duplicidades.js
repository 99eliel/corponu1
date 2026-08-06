(() => {
  "use strict";

  const VERSION = "2026-08-06-duplicidade-sem-data-133";
  if (window.__CORPONU_DUPLICIDADE_FILTROS_LOADER_133__ === VERSION) return;
  window.__CORPONU_DUPLICIDADE_FILTROS_LOADER_133__ = VERSION;

  document.getElementById("alertaPagamentosDuplicadosFiltrado113")?.remove();
  document.getElementById("stylePagamentosDuplicadosFiltrado113")?.remove();
  document.getElementById("corponuDuplicidadeFiltro127")?.remove();
  document.getElementById("corponuDuplicidadeFiltroStyle127")?.remove();

  const existente = [...document.scripts].find(script =>
    String(script.src || "").includes("corponu-pagamentos-duplicidade-sem-data-133.js")
  );
  if (existente) return;

  const script = document.createElement("script");
  script.src = `./corponu-pagamentos-duplicidade-sem-data-133.js?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
  script.async = false;
  script.dataset.corponuModulo = "pagamentos-duplicidade-sem-data-133";
  script.onerror = () => console.error("Não foi possível carregar a verificação de duplicidades sem data.");
  document.head.appendChild(script);
})();