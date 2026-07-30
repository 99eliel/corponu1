# Continuidade do Sistema CorpoNu

## Repositório oficial
`https://github.com/99eliel/corponu1`

## Base analisada
Versão principal encontrada no repositório antes desta atualização:
`2026-07-29-restantes-faccoes-complementares-1`

## Complemento atual
`2026-07-29-pagamentos-processos-agrupados-2`

Arquivos do complemento:
- `corponu-pagamentos-seguro.js`
- `sw.js`

## Alteração mais recente
Na aba Pagamentos, o campo Processo anteriormente usava o ID específico da tabela de preços. Por isso eram exibidas opções como:

`1 - CALCINHA MONTAGEM - R$ 0,3300`

Agora o campo trabalha pelo nome canônico do serviço. Exemplo:

`ENCAPAR BOJO`

Ao selecionar ENCAPAR BOJO, o sistema inclui todas as entregas cujo processo seja bojo/encapar bojo, mesmo que tenham referências e valores unitários diferentes.

## Processos oficiais reconhecidos
- ENCAPAR BOJO
- ALÇA
- CALCINHA MONTAGEM
- CALCINHA COMPLETA
- SUTIÃ MONTAGEM
- SUTIÃ COMPLETO

Aliases importantes:
- BOJO, ENCAPAR e ENCAPAR BOJOS → ENCAPAR BOJO
- ALCA, ALCAS e ALÇAS → ALÇA
- SUTIA MONTAGEM → SUTIÃ MONTAGEM
- SUTIA COMPLETO → SUTIÃ COMPLETO

## Fluxo da aba Pagamentos após o complemento
1. O usuário escolhe período e filtros.
2. O filtro Processo reúne todos os registros do serviço selecionado.
3. A tela recalcula facções, entregas, peças e total.
4. A conferência verifica valores ausentes, PIX ausentes e duplicidades.
5. O relatório completo mostra os lançamentos detalhados.
6. O relatório simplificado mostra somente Nome, PIX e Valor.
7. O fechamento em lote exige confirmação reforçada e a palavra PAGAR.

## Regras que devem ser preservadas
- Não marcar pagamento como pago apenas por gerar relatório.
- Não fechar registros com valor indefinido.
- Não fechar possíveis duplicidades sem revisão.
- O processo selecionado deve respeitar também os filtros de data, facção, referência e status.
- SUTIÃ MONTAGEM e SUTIÃ COMPLETO podem depender de valor total manual da OP.
- Pagamentos já pagos não devem voltar ao fechamento de pendentes.
- Não alterar regras do Firebase sem analisar os perfis e operações atuais.

## PWA e atualização
O `sw.js` injeta `corponu-pagamentos-seguro.js` na resposta do `index.html`, evitando a necessidade de modificar o HTML principal nesta correção.

Ao criar uma nova versão:
- alterar a versão no módulo;
- alterar `APP_VERSION` e `PAYMENTS_PATCH_VERSION` no `sw.js`;
- gerar um novo nome de cache;
- atualizar este documento e o changelog.

## Teste obrigatório antes de pagamento real
- Selecionar um mês conhecido.
- Selecionar ENCAPAR BOJO.
- Conferir se aparecem várias referências e valores de bojo.
- Conferir total por facção.
- Gerar relatório simplificado.
- Cancelar a primeira tentativa de fechamento para testar a proteção.
- Só depois fechar registros reais.

## Instrução para uma nova conversa
Leia primeiro este arquivo e o código atual do repositório. Preserve o funcionamento existente, faça alterações pontuais, entregue os arquivos prontos para substituir, atualize o versionamento do PWA e registre a mudança no changelog.
