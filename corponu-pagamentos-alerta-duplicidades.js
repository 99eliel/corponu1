(() => {
  "use strict";

  const VERSION = "2026-08-06-rollback-duplicidade-134";
  if (window.__CORPONU_DUPLICIDADE_FILTROS_ROLLBACK_134__ === VERSION) return;
  window.__CORPONU_DUPLICIDADE_FILTROS_ROLLBACK_134__ = VERSION;

  // Desfaz imediatamente a alteração global instalada pela versão 133, caso ela
  // ainda esteja ativa nesta aba.
  try {
    const restaurar = window.__restaurarMutationObserverDuplicidade133;
    if (typeof restaurar === "function") restaurar();
  } catch (error) {
    console.warn("[Pagamentos 134] Não foi necessário restaurar o observer.", error);
  }

  // Remove somente os elementos visuais das versões de conferência anteriores.
  document.getElementById("alertaPagamentosDuplicadosFiltrado113")?.remove();
  document.getElementById("stylePagamentosDuplicadosFiltrado113")?.remove();
  document.getElementById("corponuDuplicidadeFiltro127")?.remove();
  document.getElementById("corponuDuplicidadeFiltroStyle127")?.remove();
  document.getElementById("corponuDuplicidadeFiltro133")?.remove();
  document.getElementById("corponuDuplicidadeFiltroStyle133")?.remove();

  // Retorna temporariamente ao verificador 127, que é somente leitura e não
  // interfere na montagem da tabela de pagamentos.
  const existente = [...document.scripts].find(script =>
    String(script.src || "").includes("corponu-pagamentos-duplicidade-filtros-127.js")
  );
  if (existente) return;

  const script = document.createElement("script");
  script.src = `./corponu-pagamentos-duplicidade-filtros-127.js?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
  script.async = false;
  script.dataset.corponuModulo = "pagamentos-duplicidade-filtros-127-restaurado";
  script.onerror = () => console.error("Não foi possível restaurar a conferência anterior de duplicidades.");
  document.head.appendChild(script);
})();
