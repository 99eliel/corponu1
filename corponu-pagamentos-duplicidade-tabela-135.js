(() => {
  "use strict";

  const VERSION = "2026-08-25-pagamentos-estabilidade-240";
  window.__CORPONU_DUPLICIDADE_TABELA_135__ = VERSION;

  // A conferência visual antiga percorria a tabela a cada 1,6 s e também em
  // mudanças/cliques. A proteção contra gravação duplicada continua nos fluxos
  // de dados; removemos somente a varredura visual contínua da aba Pagamentos.
  [
    "corponuDuplicidadeTabela135",
    "corponuDuplicidadeTabelaDetalhes135",
    "corponuDuplicidadeTabelaStyle135"
  ].forEach(id => document.getElementById(id)?.remove());
  document.querySelectorAll(".cn-duplicidade-tabela-135").forEach(el => {
    el.classList.remove("cn-duplicidade-tabela-135");
    delete el.dataset.cnDuplicidadeGrupo135;
  });

  console.info(`[CorpoNu] Varredura visual contínua de duplicidades desativada: ${VERSION}`);
})();
