# Continuidade do Sistema CorpoNu

## Versão desta entrega

`2026-07-30-lancamento-manual-pagamentos-restantes-1`

## Arquivos novos

- `corponu-pagamentos-manual.js`: lançamento manual financeiro e restantes dentro de Pagamentos.
- `corponu-atualizador.js`: atualizador automático novo, baseado em `corponu-release.json`.
- `corponu-release.json`: fonte oficial das novas versões após esta migração.

## Arquivos substituídos

- `sw.js`: injeta os módulos novos, atualiza pela rede, elimina caches antigos e recarrega os clientes.
- `version.json`: mantido em `2026-07-29-restantes-faccoes-complementares-1` para ficar igual ao `APP_VERSION` interno do `update.js` legado.

## Regra de versionamento daqui para frente

Em cada nova entrega:

1. Alterar a constante `LOCAL_RELEASE` em `corponu-atualizador.js`.
2. Alterar `APP_VERSION` em `sw.js`.
3. Alterar a versão em `corponu-release.json`.
4. Atualizar os parâmetros `?v=` dos módulos novos dentro do `sw.js`.
5. Não alterar `version.json`, enquanto o `update.js` legado ainda possuir a versão fixa `2026-07-29-restantes-faccoes-complementares-1`.

## Estrutura criada pelo lançamento manual

A operação grava atomicamente:

- `movimentacoesProducao/{id}` para a chegada principal;
- `entregasPagamento/{id}` para o pagamento das peças recebidas;
- `movimentacoesProducao/{id-restante-1}` quando houver saldo pendente;
- `logsAlteracoes/{id}` para auditoria.

## Entrega parcial

Exemplo: OP com 50 peças e chegada de 40.

- Pagamento: quantidade 40.
- Movimentação principal: `quantidadeRecebida = 40` e `falta = 10`.
- Restante: novo documento com `quantidadeEnviada = 10`, `origemRestanteFaccao = true` e `status = restante_pendente`.

## Valor financeiro

- Campo preenchido: pagamento fica `pendente` com valor total manual.
- Campo vazio: pagamento fica `sem_valor` e aparece na Central de Pendências.

## Instrução para uma nova conversa

Leia este arquivo e revise os cinco arquivos da versão antes de alterar Pagamentos, atualização automática ou controle de restantes.
