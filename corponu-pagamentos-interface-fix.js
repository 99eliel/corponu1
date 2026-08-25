(() => {
  "use strict";

  const VERSION = "2026-08-25-pagamentos-estabilidade-241";
  const ARQUIVO = "corponu-faccoes-catalogo-processos-197.js";

  window.__CORPONU_PAGAMENTOS_INTERFACE_FIX__ = VERSION;

  // SAFE MODE 241
  // Bloqueia apenas os módulos auxiliares que duplicavam leitura da coleção
  // entregasPagamento ou mantinham observers/intervalos sobre a tabela/filtros.
  // O app.js continua sendo o único responsável pelos dados e render principal.
  window.__CORPONU_PAGAMENTOS_FILTRO_OP__ = "2026-08-02-filtro-op-pagamentos-90";
  window.__CORPONU_PAGAMENTOS_MULTIPLOS_PROCESSOS__ = "2026-07-30-pagamentos-multiplos-processos-35";
  window.__CORPONU_PAGAMENTOS_MULTIFILTRO_VISUAL__ = "2026-07-30-pagamentos-multifiltro-profissional-37";
  window.__CORPONU_PAGAMENTOS_ALERTA_SEM_VALOR_108__ = "2026-08-03-alerta-pagamentos-sem-valor-108";
  window.__CORPONU_DUPLICIDADE_TABELA_LOADER_135__ = "2026-08-06-duplicidade-tabela-135";
  window.__CORPONU_DUPLICIDADE_TABELA_135__ = "2026-08-06-duplicidade-tabela-135";

  // Remove resíduos visuais somente dessas camadas caso a página tenha sido
  // restaurada pelo navegador. Nenhum documento do Firebase é alterado.
  [
    "pagamentoFiltroProcessosMultiplos",
    "alertaPagamentosSemValorFiltrado108",
    "corponuDuplicidadeTabela135",
    "corponuDuplicidadeTabelaDetalhes135"
  ].forEach(id => document.getElementById(id)?.remove());

  // Mantém a sincronização global do catálogo de processos usada em Facções.
  if (![...document.scripts].some(script => String(script.src || "").includes(ARQUIVO))) {
    const script = document.createElement("script");
    script.src = `./${ARQUIVO}?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuModulo = "faccoes-catalogo-processos-197";
    script.onerror = () => console.error("Não foi possível sincronizar os processos ativos da aba Facções.");
    document.head.appendChild(script);
  }

  console.info(`[CorpoNu] Pagamentos em modo estável: ${VERSION}`);
})();
