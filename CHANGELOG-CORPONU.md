# Changelog — CorpoNu

## 2026-07-29-pendencias-organizadas-auto-update-4

### Central de pendências de valor

- Interface reorganizada e mais intuitiva.
- Indicadores clicáveis para mostrar todas as pendências, valores totais de OP, Alça e valores unitários.
- Pesquisa por OP, referência, facção, processo e cor.
- Filtro por processo.
- Filtro por tipo de valor pendente.
- Lançamentos agrupados por processo.
- Identificação destacada de OP, referência, responsável, quantidade, chegada, cor e situação.
- Área global da Alça separada dos valores individuais.

### Exclusão segura

- Adicionado botão **Excluir** em cada pendência autorizada.
- Adicionada confirmação com os dados principais do lançamento.
- A exclusão remove somente o registro financeiro sem valor.
- OP e movimentação de facção são preservadas.
- Pagamentos já quitados não podem ser apagados por essa central.
- Ação registrada na auditoria do sistema.
- Lista, indicadores e tela de pagamentos são atualizados após a exclusão.

### Atualização automática

- Criado o manifesto independente `corponu-release.json`.
- Verificação automática ao abrir, a cada cinco minutos, ao recuperar foco e ao retornar para a página.
- Service Worker registrado com URL versionada e `updateViaCache: none`.
- Remoção automática somente dos caches antigos do CorpoNu.
- Página principal carregada em estratégia network-first.
- Arquivos principais carregados em network-first com a versão atual forçada.
- Inclusão automática do módulo `corponu-pagamentos-seguro.js` na página.
- Proteção contra ciclos de recarregamento.

### Firebase

- Nenhuma alteração nas coleções.
- Nenhuma alteração nas regras do Firestore.
- Nenhuma alteração nas regras do Storage.
