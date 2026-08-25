(() => {
  "use strict";

  const VERSION = "2026-08-25-pagamentos-estabilidade-241";
  const DATASET_KEY = "corponuPagamentosSeguro";

  // MODO LEVE 241
  // O app.js já é o responsável por carregar e renderizar entregasPagamento.
  // A versão antiga deste módulo fazia uma segunda leitura completa da coleção,
  // observava/reconstruía o filtro de processos e mantinha rotinas paralelas.
  // Com o histórico atual isso podia provocar disputa de renderização e travar
  // a thread principal. Este arquivo permanece apenas por compatibilidade com
  // o index.html, sem consultar Firestore, sem observer e sem setInterval.
  document.documentElement.dataset[DATASET_KEY] = VERSION;
  window.__CORPONU_PAGAMENTOS_SEGURO_LEVE_241__ = VERSION;

  console.info(`[CorpoNu] Pagamentos seguro legado em modo leve: ${VERSION}`);
})();
