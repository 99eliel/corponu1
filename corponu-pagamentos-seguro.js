(() => {
  "use strict";

  const VERSION = "2026-08-25-pagamentos-estabilidade-240";
  const DATASET_KEY = "corponuPagamentosSeguro";

  // A aba Pagamentos já é mantida pelo app.js. A versão antiga deste módulo
  // fazia uma segunda leitura completa de entregasPagamento, reinstalava um
  // service worker e observava o select de processos. Com histórico grande,
  // isso duplicava memória, CPU e renderizações. A 240 mantém este arquivo
  // apenas como compatibilidade para os loaders antigos, sem novas leituras.
  document.documentElement.dataset[DATASET_KEY] = VERSION;
  window.__CORPONU_PAGAMENTOS_ESTABILIDADE_240__ = VERSION;

  // Limpa apenas elementos visuais pertencentes ao módulo antigo, caso uma
  // navegação em cache tenha deixado resíduos. Nenhum dado do Firestore é tocado.
  [
    "corponuToastAtualizacaoAutomatica",
    "modalConfirmacaoFortePagamentos",
    "modalPendenciasValoresFinanceiro",
    "modalExcluirPendenciaFinanceiro"
  ].forEach(id => document.getElementById(id)?.remove());

  console.info(`[CorpoNu] Pagamentos seguro legado em modo leve: ${VERSION}`);
})();
