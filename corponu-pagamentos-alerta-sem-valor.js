(() => {
  "use strict";

  const VERSION = "2026-08-25-pagamentos-estabilidade-240";
  window.__CORPONU_PAGAMENTOS_ALERTA_SEM_VALOR_108__ = VERSION;

  // O alerta antigo mantinha cache próprio de toda entregasPagamento e usava
  // observer da página para refiltrar a coleção. O app.js já possui os dados e
  // a Central de valores pode ser aberta explicitamente quando necessária.
  document.getElementById("alertaPagamentosSemValorFiltrado108")?.remove();
  document.getElementById("stylePagamentosSemValorFiltrado108")?.remove();

  console.info(`[CorpoNu] Alerta pesado de sem valor desativado: ${VERSION}`);
})();
