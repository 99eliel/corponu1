(() => {
  "use strict";

  const VERSION = "2026-08-06-duplicidade-tabela-135";
  if (window.__CORPONU_DUPLICIDADE_TABELA_LOADER_135__ === VERSION) return;
  window.__CORPONU_DUPLICIDADE_TABELA_LOADER_135__ = VERSION;

  // Garante que qualquer alteração global instalada pela tentativa 133 seja
  // desfeita antes de carregar a conferência visual da tabela.
  try {
    const restaurar = window.__restaurarMutationObserverDuplicidade133;
    if (typeof restaurar === "function") restaurar();
  } catch (error) {
    console.warn("[Pagamentos 135] Observer global já estava normal.", error);
  }

  [
    "alertaPagamentosDuplicadosFiltrado113",
    "stylePagamentosDuplicadosFiltrado113",
    "corponuDuplicidadeFiltro127",
    "corponuDuplicidadeFiltroStyle127",
    "corponuDuplicidadeFiltro133",
    "corponuDuplicidadeFiltroStyle133",
    "corponuDuplicidadeTabela135",
    "corponuDuplicidadeTabelaStyle135"
  ].forEach(id => document.getElementById(id)?.remove());

  const existente = [...document.scripts].find(script =>
    String(script.src || "").includes("corponu-pagamentos-duplicidade-tabela-135.js")
  );
  if (existente) return;

  const script = document.createElement("script");
  script.src = `./corponu-pagamentos-duplicidade-tabela-135.js?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
  script.async = false;
  script.dataset.corponuModulo = "pagamentos-duplicidade-tabela-135";
  script.onerror = () => console.error("Não foi possível carregar a conferência visual de duplicidades.");
  document.head.appendChild(script);
})();
