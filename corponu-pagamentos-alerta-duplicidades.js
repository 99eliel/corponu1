(() => {
  "use strict";

  const VERSION_DUPLICIDADE = "2026-08-06-duplicidade-tabela-135";
  const VERSION_RESTAURACAO_OPS = "2026-08-06-ops-excluidas-restauracao-139";
  const VERSION_NECESSIDADE_OPCIONAL = "2026-08-07-calcinha-aba-fix-144";
  const VERSION_ATUALIZACAO_SAIDA_FACCOES = "2026-08-07-faccoes-saida-atualizacao-imediata-143";
  const VERSION_IDENTIDADE_FLOW = "2026-08-07-corpo-nu-flow-identidade-145";
  const VERSION_CALCINHA_SALVAMENTO_RAPIDO = "2026-08-07-calcinha-salvamento-rapido-147";
  const VERSION_QUANTIDADE_SEM_SCROLL = "2026-08-07-quantidade-sem-scroll-148";
  const VERSION_MANEJO_FASES_SUTIA = "2026-08-08-manejo-fases-gerenciadas-163";
  const VERSION_MANEJO_LAYOUT_FASES = "2026-08-08-manejo-colunas-fixas-166";
  const VERSION_FASE_LATERAL_SETA = "2026-08-08-manejo-fase-lateral-seta-167";
  const VERSION_MANEJO_INTERFACE = "2026-08-08-manejo-interface-168";
  const VERSION_FILTRO_LATERAL_VISUAL = "2026-08-08-manejo-filtro-lateral-visual-169";
  const VERSION_FILTRO_LATERAL_POSICAO = "2026-08-08-manejo-filtro-lateral-posicao-170";
  const VERSION_FILTRO_LATERAL_PADRAO = "2026-08-08-manejo-filtro-lateral-padrao-171";
  const VERSION_MANEJO_RESPONSIVO = "2026-08-09-manejo-responsivo-172";

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

  carregarScript(
    "corponu-identidade-corpo-nu-flow-145.js",
    "identidade-corpo-nu-flow-145",
    VERSION_IDENTIDADE_FLOW,
    "Não foi possível carregar a identidade Corpo Nu Flow."
  );

  carregarScript(
    "corponu-quantidade-sem-scroll-148.js",
    "quantidade-sem-scroll-148",
    VERSION_QUANTIDADE_SEM_SCROLL,
    "Não foi possível ativar a proteção da quantidade da OP contra o scroll do mouse."
  );

  carregarScript(
    "corponu-ops-excluidas-restauracao-139.js",
    "ops-excluidas-restauracao-139",
    VERSION_RESTAURACAO_OPS,
    "Não foi possível carregar a lixeira/restauração de OPs excluídas."
  );

  carregarScript(
    "corponu-calcinha-salvamento-rapido-147.js",
    "calcinha-salvamento-rapido-147",
    VERSION_CALCINHA_SALVAMENTO_RAPIDO,
    "Não foi possível ativar o salvamento rápido das OPs de Calcinha."
  );

  carregarScript(
    "corponu-ordens-necessidade-opcional-fix-144.js",
    "ordens-necessidade-opcional-fix-144",
    VERSION_NECESSIDADE_OPCIONAL,
    "Não foi possível carregar a correção da aba Calcinha com necessidade opcional."
  );

  carregarScript(
    "corponu-faccoes-saida-atualizacao-imediata-143.js",
    "faccoes-saida-atualizacao-imediata-143",
    VERSION_ATUALIZACAO_SAIDA_FACCOES,
    "Não foi possível atualizar a lista de Facções imediatamente após a saída."
  );

  carregarScript(
    "corponu-manejo-fases-sutia-163.js",
    "manejo-fases-sutia-163",
    VERSION_MANEJO_FASES_SUTIA,
    "Não foi possível carregar o gerenciador de Fase Bojo e Fase Lateral no Manejo Sutiã."
  );

  carregarScript(
    "corponu-manejo-layout-fases-164.js",
    "manejo-layout-colunas-fixas-166",
    VERSION_MANEJO_LAYOUT_FASES,
    "Não foi possível organizar as colunas do Manejo Sutiã."
  );

  carregarScript(
    "corponu-manejo-fase-lateral-seta-167.js",
    "manejo-fase-lateral-seta-167",
    VERSION_FASE_LATERAL_SETA,
    "Não foi possível carregar a seta de sugestões da Fase Lateral."
  );

  carregarScript(
    "corponu-manejo-interface-168.js",
    "manejo-interface-168",
    VERSION_MANEJO_INTERFACE,
    "Não foi possível carregar a organização visual do Manejo."
  );

  carregarScript(
    "corponu-manejo-filtro-lateral-visual-169.js",
    "manejo-filtro-lateral-visual-169",
    VERSION_FILTRO_LATERAL_VISUAL,
    "Não foi possível organizar o filtro da Fase Lateral."
  );

  carregarScript(
    "corponu-manejo-filtro-lateral-posicao-170.js",
    "manejo-filtro-lateral-posicao-170",
    VERSION_FILTRO_LATERAL_POSICAO,
    "Não foi possível manter o filtro da Fase Lateral preso ao botão."
  );

  carregarScript(
    "corponu-manejo-filtro-lateral-padrao-171.js",
    "manejo-filtro-lateral-padrao-171",
    VERSION_FILTRO_LATERAL_PADRAO,
    "Não foi possível padronizar o filtro da Fase Lateral."
  );

  carregarScript(
    "corponu-manejo-responsivo-172.js",
    "manejo-responsivo-172",
    VERSION_MANEJO_RESPONSIVO,
    "Não foi possível adaptar o Manejo à largura da tela."
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
