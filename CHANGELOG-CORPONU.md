# Changelog CorpoNu

## 2026-07-30-rastreamento-interno-sem-faccao-4

- Criado o módulo `corponu-rastreamento-interno.js` para separar a movimentação interna das operações de facção.
- Removida a opção **Em facção / aguardando chegada** do ajuste manual de local.
- Removido o botão **Chegada** da aba Rastreamento.
- Movimentações de facção continuam visíveis no histórico, mas exibem **Gerenciar em Facções** e não podem ser finalizadas pelo Rastreamento.
- Chegada, pagamento e finalização de facção continuam exclusivamente na aba Facções.
- Movimentações internas podem ser bipadas diretamente, sem exigir data de chegada.
- O bipado interno mantém usuário, data e auditoria no Firestore.
- Criada branch de recuperação `backup/main-antes-rastreamento-interno-20260730` antes da alteração.
- Mantido um único controlador de atualização do PWA, sem reintroduzir o loop de carregamento.

## 2026-07-30-hotfix-loop-carregamento-3

- Corrigido o loop de carregamento causado por múltiplos registros e URLs diferentes do mesmo Service Worker.
- O sistema passou a reutilizar um único registro do PWA.
- A recarga passou a ser limitada a uma vez por versão.
- O atualizador embutido no módulo financeiro antigo foi bloqueado.

## 2026-07-30-organizacao-autoupdate-pagamentos-2

- Criada branch de backup `backup/main-antes-organizacao-20260730` antes de qualquer publicação.
- Criada branch de trabalho `fix/organizar-carregamento-autoupdate-20260730`.
- Corrigido o `sw.js` para carregar simultaneamente `corponu-pagamentos-seguro.js` e `corponu-pagamentos-manual.js`.
- Restauradas em conjunto as melhorias anteriores de Pagamentos e o lançamento manual.
- O Service Worker remove da página controlada o resgate legado que apagava caches e desregistrava o PWA.
- Arquivos principais passam a receber a mesma versão na URL para evitar JavaScript e CSS antigos.
- Atualização automática verifica `corponu-release.json` a cada minuto, ao voltar para a aba, ao recuperar foco e ao voltar a ficar online.
- Atualizações usam `skipWaiting`, `clients.claim` e recarga única protegida contra repetição.
- Mantido `version.json` na versão legada para impedir a rotina antiga destrutiva do `update.js`.
- Documentado o processo de recuperação de código e a diferença entre restaurar código e reparar dados do Firestore.

## 2026-07-30-lancamento-manual-pagamentos-restantes-1

- Criado **Novo lançamento manual** diretamente na aba Pagamentos.
- Busca a OP pelo número e preenche referência, cor, produto e quantidade.
- Permite selecionar processo e facção responsável.
- Permite informar a quantidade da OP/enviada e a quantidade realmente recebida.
- Permite informar o valor total final no próprio lançamento ou deixá-lo em branco.
- Quando o valor fica em branco, o pagamento é criado como `sem_valor` para preenchimento posterior pelo financeiro.
- Quando o valor é informado, o pagamento é criado como pendente com valor total manual.
- Entregas parciais criam automaticamente um documento `restante_faccao`.
- Criado painel **Restantes pendentes para pagamento** dentro da aba Pagamentos.
- O financeiro pode registrar a chegada complementar e gerar o pagamento apenas das peças recebidas.
- Se a chegada complementar também for parcial, um novo saldo restante é criado automaticamente.
- Adicionado atualizador automático independente por `corponu-release.json`.
- O novo Service Worker injeta os módulos financeiros sem exigir alteração do `index.html`.
- `version.json` foi sincronizado com o atualizador legado para impedir ciclos de limpeza de cache e desregistro do PWA.
