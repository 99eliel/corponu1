# Continuidade do Sistema CorpoNu

## Versão complementar atual

`2026-07-29-pendencias-valores-financeiro-3`

## Repositório

`https://github.com/99eliel/corponu1`

## Arquivo complementar carregado pelo Service Worker

`corponu-pagamentos-seguro.js`

O `sw.js` injeta este arquivo no `index.html` sem exigir alterações no arquivo principal.

## Estado da aba Pagamentos

A aba possui:

- filtros acumulativos por período, facção, referência, processo e situação;
- processo agrupado pelo nome do serviço;
- relatório completo com PIX;
- relatório simplificado com Nome, PIX e Valor;
- confirmação reforçada antes de fechar pagamentos filtrados;
- central de pendências de valores.

## Central de pendências de valores

O botão `Ver pendências de valor`, localizado no painel de conferência, busca todos os documentos ativos da coleção `entregasPagamento` cujo status efetivo seja `sem_valor`.

### Tipos tratados

1. **Sutiã Montagem e Sutiã Completo**
   - valor total final informado individualmente por OP;
   - grava `formaValorPagamento: total_manual_op`;
   - muda o status para `pendente`;
   - não marca como pago.

2. **Alça**
   - documento global `precosReferencia/valor-padrao-alca`;
   - valor informado corresponde a uma alça;
   - quantidade de alças = quantidade de sutiãs × 2;
   - recalcula todos os pagamentos de Alça ainda abertos.

3. **Demais processos**
   - valor unitário cadastrado por Referência + Processo;
   - recálculo de todos os pagamentos sem valor com a mesma combinação;
   - mantido como operação administrativa pelas regras atuais.

## Coleções utilizadas nesta atualização

- `entregasPagamento`
- `precosReferencia`
- `usuarios`
- `faccoes`
- `logsAlteracoes`

## Regras que não podem ser quebradas

- Informar valor não significa pagar.
- Somente a rotina específica de confirmação pode marcar como pago.
- Sutiã Montagem e Sutiã Completo usam valor total manual, não tabela unitária.
- Alça usa valor global de uma alça multiplicado por duas.
- Desconto registrado continua reduzindo o total calculado.
- Mudanças financeiras precisam registrar usuário e data.
- O PWA deve continuar com cache busting e atualização automática.

## Próximo ponto de retomada

Testar a central com dados reais e verificar:

- se os 4 lançamentos atualmente indicados aparecem;
- se o tipo de cada um está correto;
- se, após informar um valor, o lançamento desaparece das pendências;
- se o total da aba Pagamentos é atualizado corretamente;
- se usuários financeiros não administradores possuem as permissões esperadas para os tipos utilizados.

## Mensagem para iniciar uma conversa nova

> Continue o Sistema CorpoNu pelo repositório https://github.com/99eliel/corponu1. Leia primeiro o arquivo CONTINUIDADE-CORPONU.md. A versão complementar atual é 2026-07-29-pendencias-valores-financeiro-3. Preserve o fluxo de pagamentos, a central de pendências e o versionamento do PWA.
