(() => {
  "use strict";

  const VERSION_DUPLICIDADE = "2026-08-06-duplicidade-tabela-135";
  const VERSION_CALCINHA = "2026-08-06-calcinha-identidade-136";

  function carregarScript(nomeArquivo, modulo, versao, mensagemErro) {
    const existente = [...document.scripts].find(script =>
      String(script.src || "").includes(nomeArquivo)
    );
    if (existente) return existente;

    const script = document.createElement("script");
    script.src = `./${nomeArquivo}?v=${encodeURIComponent(versao)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuModulo = modulo;
    script.onerror = () => console.error(mensagemErro);
    document.head.appendChild(script);
    return script;
  }

  // Proteção global da OP de calcinha. É carregada antes da conferência visual
  // porque precisa capturar o formulário antes dos listeners legados.
  carregarScript(
    "corponu-calcinha-identidade-136.js",
    "calcinha-identidade-136",
    VERSION_CALCINHA,
    "Não foi possível carregar a proteção da identidade das OPs de calcinha."
  );

  if (window.__CORPONU_DUPLICIDADE_TABELA_LOADER_135__ === VERSION_DUPLICIDADE) return;
  window.__CORPONU_DUPLICIDADE_TABELA_LOADER_135__ = VERSION_DUPLICIDADE;

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

  carregarScript(
    "corponu-pagamentos-duplicidade-tabela-135.js",
    "pagamentos-duplicidade-tabela-135",
    VERSION_DUPLICIDADE,
    "Não foi possível carregar a conferência visual de duplicidades."
  );
})();
