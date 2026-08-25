(() => {
  "use strict";

  const VERSION = "2026-08-25-pagamentos-estabilidade-240";
  window.__CORPONU_PAGAMENTOS_MULTIPLOS_PROCESSOS__ = VERSION;

  // O multifiltro legado carregava toda a coleção entregasPagamento novamente
  // e repetia a montagem ao entrar em Pagamentos. Na 240 o filtro nativo do
  // app.js permanece ativo e este módulo vira somente compatibilidade.
  const select = document.getElementById("pagamentoFiltroPreco");
  select?.classList.remove("pag-multi-original");
  document.getElementById("pagamentoFiltroProcessosMultiplos")?.remove();
  document.getElementById("stylePagamentoMultiplosProcessos")?.remove();

  console.info(`[CorpoNu] Multifiltro pesado desativado para estabilidade: ${VERSION}`);
})();
