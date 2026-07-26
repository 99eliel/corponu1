Otimização do Manejo com filtro global no banco

- O Manejo continua abrindo somente 50 OPs para economizar leituras.
- Os filtros da tela continuam filtrando instantaneamente os itens já carregados.
- O botão Buscar filtros no banco executa consulta no Firestore pelos critérios preenchidos.
- A busca global retorna até 50 resultados por vez e permite Carregar mais 50 quando houver mais.
- A importação da Lígia agora grava campos auxiliares de busca: faseBusca, referenciaBusca, corBusca, necessidadeBusca, numeroOPBusca e termosBuscaManejo.
- Isso permite pesquisar fases, referências, cores e OPs sem carregar todos os pedidos.

Observação: para usar 100% da busca global em dados já importados antes desta versão, reimporte o JSON da Lígia ou execute uma atualização dos campos de busca.
