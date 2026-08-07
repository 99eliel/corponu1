(() => {
  "use strict";

  const VERSION_DUPLICIDADE = "2026-08-06-duplicidade-tabela-135";
  const VERSION_RESTAURACAO_OPS = "2026-08-06-ops-excluidas-restauracao-139";
  const VERSION_NECESSIDADE_OPCIONAL = "2026-08-07-ordens-necessidade-opcional-142";

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

  // 139 adiciona, somente para administradores, uma lixeira sob demanda para
  // visualizar e restaurar OPs marcadas com excluida=true sem recriar documentos.
  carregarScript(
    "corponu-ops-excluidas-restauracao-139.js",
    "ops-excluidas-restauracao-139",
    VERSION_RESTAURACAO_OPS,
    "Não foi possível carregar a lixeira/restauração de OPs excluídas."
  );

  // 142 unifica a regra do cadastro de OP: em Sutiã e Calcinha, somente OP,
  // referência, cor e quantidade são obrigatórios. A própria 142 carrega em
  // sequência as proteções 137, 138 e 136 da Calcinha para preservar a identidade.
  carregarScript(
    "corponu-ordens-necessidade-opcional-142.js",
    "ordens-necessidade-opcional-142",
    VERSION_NECESSIDADE_OPCIONAL,
    "Não foi possível tornar a necessidade opcional nas OPs."
  );

  if (window.__CORPONU_DUPLICIDADE_TABELA_LOADER_135__ === VERSION_DUPLICIDADE) return;
  window.__CORPONU_DUPLICIDADE_TABELA_LOADER_135__ = VERSION_DUPLICIDADE;

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
