(() => {
  "use strict";

  const VERSION_DUPLICIDADE = "2026-08-06-duplicidade-tabela-135";
  const VERSION_RESTAURACAO_OPS = "2026-08-06-ops-excluidas-restauracao-139";
  const VERSION_NECESSIDADE_OPCIONAL = "2026-08-07-calcinha-aba-fix-144";
  const VERSION_ATUALIZACAO_SAIDA_FACCOES = "2026-08-07-faccoes-saida-atualizacao-imediata-143";

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

  // 144 carrega a regra 142 de necessidade opcional com proteção contra o
  // MutationObserver que entrava em ciclo ao abrir a aba Calcinha.
  carregarScript(
    "corponu-ordens-necessidade-opcional-fix-144.js",
    "ordens-necessidade-opcional-fix-144",
    VERSION_NECESSIDADE_OPCIONAL,
    "Não foi possível carregar a correção da aba Calcinha com necessidade opcional."
  );

  // 143 garante que, depois de uma saída registrada em Sutiã ou Calcinha,
  // a tabela principal de Facções seja atualizada imediatamente, sem exigir F5.
  carregarScript(
    "corponu-faccoes-saida-atualizacao-imediata-143.js",
    "faccoes-saida-atualizacao-imediata-143",
    VERSION_ATUALIZACAO_SAIDA_FACCOES,
    "Não foi possível atualizar a lista de Facções imediatamente após a saída."
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
