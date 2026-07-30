# Continuidade do desenvolvimento — CorpoNu

## Repositório oficial

`https://github.com/99eliel/corponu1`

## Versão desta entrega

`2026-07-29-pendencias-organizadas-auto-update-4`

## Arquivos adicionados ou substituídos

- `corponu-pagamentos-seguro.js`
- `sw.js`
- `corponu-release.json`

## Situação da aba Pagamentos

A aba possui:

- filtros acumulativos por período, facção, referência, processo e situação;
- processos agrupados por nome, em vez de um item para cada referência/preço;
- relatório completo com PIX;
- relatório simplificado com Nome, PIX e Valor;
- confirmação reforçada antes do fechamento em lote;
- central para resolver pagamentos sem valor;
- valores manuais para Sutiã Montagem e Sutiã Completo;
- valor global da Alça;
- valores unitários para os demais processos;
- pesquisa e filtros dentro da central de pendências;
- agrupamento das pendências por processo;
- exclusão segura de lançamento financeiro sem valor.

## Regra de exclusão da central

A exclusão atua somente em `entregasPagamento/{id}`.

Ela não deve apagar:

- ordem de produção;
- manejo;
- movimentação/chegada da facção;
- registros produtivos relacionados.

O código bloqueia pagamento quitado e registra a ação na auditoria. O botão é exibido para administrador ou para o usuário que criou o lançamento ainda não pago, em conformidade com a autorização já usada pela aplicação.

## Sistema de atualização automática

O novo controle de versão usa `corponu-release.json`, separado do `version.json` legado.

Motivo: `update.js` possui uma constante antiga vinculada ao `version.json`. Alterar somente o arquivo legado poderia gerar divergência permanente enquanto o navegador ainda carregasse o `update.js` anterior.

Fluxo novo:

1. `corponu-pagamentos-seguro.js` consulta `corponu-release.json` sem cache.
2. Ao encontrar versão diferente, registra `sw.js?release=<versão>`.
3. O Service Worker novo ativa imediatamente.
4. Caches antigos `op-confeccao-*` são removidos.
5. A aplicação recarrega uma única vez.
6. O novo Service Worker força a mesma versão em `app.js`, `update.js`, `style.css` e módulos auxiliares.

Para toda atualização futura, alterar a versão nos três pontos:

- constante `VERSION` de `corponu-pagamentos-seguro.js`;
- constante `APP_VERSION` de `sw.js`;
- campo `version` de `corponu-release.json`.

Nunca registrar o Service Worker com timestamp variável no endereço do script, pois isso pode provocar atualizações e recarregamentos repetitivos. Use somente a versão estável na query string.

## Cuidados nas próximas alterações

- Não duplicar eventos que já existam em `app.js` ou `update.js`.
- Não apagar uma chegada produtiva quando a intenção for excluir apenas o pagamento.
- Conferir permissões do Firestore antes de liberar exclusão para novos perfis.
- Preservar os cálculos e descontos já existentes.
- Incrementar a versão em toda entrega.
- Atualizar este documento e o changelog.

## Texto para iniciar uma nova conversa

> Continue o desenvolvimento do Sistema CorpoNu pelo repositório https://github.com/99eliel/corponu1. Leia primeiro o arquivo CONTINUIDADE-CORPONU.md e confira a versão publicada em corponu-release.json. A última etapa organizou a Central de Pendências de Valor, adicionou exclusão segura do lançamento financeiro e restaurou a atualização automática do PWA.
