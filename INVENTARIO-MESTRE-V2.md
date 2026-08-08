# Corpo Nu Flow V2 — Inventário Mestre Funcional

Status: em levantamento

Objetivo: garantir que nenhuma função útil seja perdida durante a refatoração e que cada comportamento tenha um único responsável na arquitetura nova.

Legenda:

- **MANTER**: comportamento correto e necessário.
- **INCORPORAR**: comportamento necessário, mas deve ser absorvido por um módulo definitivo.
- **SUBSTITUIR**: lógica necessária, porém a implementação atual é frágil/remendada.
- **ELIMINAR APÓS EQUIVALÊNCIA**: patch ou fluxo legado que só sai depois que sua função estiver coberta pela V2.
- **REMOVER DA REGRA NOVA**: comportamento que deixou de existir por decisão de negócio.

---

# 1. Arquitetura e segurança

## Branches

- Produção: `main`
- Backup estável: `backup/pre-refatoracao-2026-08-08`
- Desenvolvimento V2: `refactor/corpo-nu-flow-v2`

A produção não será usada para testes da refatoração.

---

# 2. Ordens de Produção

## Comportamentos a preservar

### Sutiã

- cadastrar OP;
- editar OP;
- número da OP obrigatório;
- referência obrigatória;
- cor obrigatória;
- quantidade obrigatória;
- necessidade opcional;
- produto/referência deve existir;
- evitar OP duplicada;
- quantidade pertence à OP, não ao cadastro do produto.

Status: **MANTER / CONSOLIDAR**.

### Calcinha

- cadastro separado de Sutiã;
- OP, referência, cor e quantidade obrigatórios;
- necessidade opcional;
- serviço/facção podem ficar para o momento do envio;
- Cotton Line/Corpo Nu informado conforme fluxo de Manejo;
- impedir duplicidade;
- aparecer imediatamente após salvar.

Status: **MANTER / SUBSTITUIR IMPLEMENTAÇÃO ATUAL**.

Cadeia atual conhecida a consolidar:

- `corponu-dual-mode.js`
- `corponu-calcinha-planejamento-opcional-129.js`
- `corponu-calcinha-identidade-136.js`
- `corponu-calcinha-reparo-137.js`
- `corponu-calcinha-visibilidade-138.js`
- `corponu-ordens-necessidade-opcional-142.js`
- `corponu-ordens-necessidade-opcional-fix-144.js`
- `corponu-calcinha-salvamento-rapido-147.js`

Objetivo V2: um único módulo de Ordens com regras explícitas para Sutiã e Calcinha, sem alterar código-fonte como texto, sem Blob dinâmico e sem interceptar listeners antigos.

---

# 3. Manejo

## Comportamentos operacionais a preservar

- toda OP válida aparece no Manejo;
- separação Sutiã / Calcinha;
- filtros acumulativos;
- fases/processos internos;
- envio para facção;
- envio para célula;
- escolha de processo antes da facção;
- filtrar responsáveis/facções pelo processo permitido;
- Sutiã Completo pode ser enviado mesmo com Lateral/Bojo ainda não informados;
- dados não informados permanecem “não informados”, nunca viram “não” automaticamente.

Status: **MANTER / CONSOLIDAR**.

## Financeiro no Manejo

O código atual possui sincronização/criação de `entregasPagamento` a partir do Manejo.

Regra V2: **REMOVER DA REGRA NOVA**.

Manejo será exclusivamente produção. Nenhuma alteração de Manejo poderá criar, recalcular ou quitar pagamento.

---

# 4. Facções

## Responsabilidade V2

Facções passa a ser **100% operacional**.

### Preservar

- cadastro/edição de facção;
- processos permitidos;
- envio de OP;
- processo realizado/enviado;
- responsável/facção;
- quantidade enviada;
- chegada operacional;
- aviso de chegada por usuário comum;
- confirmação operacional pelo admin quando aplicável;
- faltas/defeitos quando fizerem parte do histórico de produção;
- reenvio;
- histórico.

### Não deve existir na V2

- criação automática de pagamento na chegada;
- cálculo financeiro disparado pela chegada;
- vínculo obrigatório entre data de chegada e competência financeira;
- render de Pagamentos como efeito colateral de Facções;
- botão Bipar na aba Facções.

Status: **MANTER PRODUÇÃO / REMOVER ACOPLAMENTO FINANCEIRO**.

---

# 5. Chegada

## Fluxo operacional

Usuário comum pode informar que a OP chegou sem gerar pagamento.

O aviso deve registrar quem informou e quando informou.

A confirmação administrativa não deve criar pagamento na V2.

Status: **MANTER COMO EVENTO OPERACIONAL**.

## Ligações financeiras atuais identificadas

### `app.js`

A função `gerarPagamentoPorMovimentacao()` exige movimentação de facção com `dataChegada` e cria/atualiza documentos em `entregasPagamento`.

Ela é chamada por:

- chegada normal de movimentação;
- chegada manual de facção.

Status V2: **REMOVER DA CHEGADA** e reaproveitar somente regras de cálculo necessárias no módulo financeiro definitivo.

### `corponu-chegada-manual-sutia-pagamento-automatico.js`

Cria cálculo e pagamento de Sutiã Completo a partir da chegada manual.

Status V2: **ELIMINAR APÓS INCORPORAR O CÁLCULO NO FECHAMENTO FINANCEIRO**.

### `corponu-sutia-completo-chegada-rapida.js`

Mistura interface de chegada, conferência de componentes e regras de cálculo financeiro.

Status V2:

- conferência operacional de componentes: **INCORPORAR ONDE FIZER SENTIDO**;
- cálculo financeiro: **MOVER PARA FECHAMENTO DE PAGAMENTOS**;
- pagamento automático na chegada: **REMOVER DA REGRA NOVA**.

---

# 6. Fechamento de Pagamentos — NOVO FLUXO OFICIAL

## Objetivo

O fechamento mensal passa a ser independente de Facções e da data em que a chegada foi informada.

## Fluxo mínimo

1. abrir `Fechamento de Pagamentos`;
2. informar/buscar OP;
3. sistema carrega dados da OP;
4. escolher processo/serviço realizado;
5. carregar somente responsáveis/facções habilitados naquele processo;
6. escolher quem fez;
7. conferir quantidade a pagar;
8. aplicar regra de valor do processo;
9. quando necessário, conferir componentes;
10. adicionar lançamento ao financeiro;
11. lançamento fica disponível nos filtros/relatórios/fechamento mensal.

## Dados automáticos ao localizar OP

- OP;
- referência;
- cor;
- quantidade;
- Sutiã/Calcinha;
- componentes já conhecidos;
- informações relevantes da referência;
- valores já carregados em cache/store.

## Pagamento parcial/restante

O comportamento existente de parcial/restante precisa ser inventariado antes da implementação final.

Não será removido até entendermos todos os casos atualmente usados.

---

# 7. Base existente que pode ajudar no novo fechamento

## `corponu-pagamentos-manual.js`

Esse módulo antigo já possui parte importante do comportamento desejado:

- busca de OP;
- seleção de processo;
- seleção de responsável/facção;
- quantidade enviada/recebida;
- tratamento de restante;
- criação transacional;
- proteção contra duplicidade por IDs determinísticos;
- log de auditoria.

Problema: atualmente ele também cria registros em `movimentacoesProducao`, tratando pagamento + chegada como uma única operação.

Status V2: **USAR COMO REFERÊNCIA, NÃO COMO IMPLEMENTAÇÃO FINAL**.

A V2 deverá extrair dele somente as regras úteis para fechamento financeiro.

## `corponu-remover-lancamento-manual-pagamentos.js`

Patch criado posteriormente para esconder/remover o lançamento manual e obrigar o usuário a registrar saída/chegada em Facções.

Essa regra agora está invertida.

Status V2: **ELIMINAR** quando o novo fechamento estiver implementado.

---

# 8. Sutiã Completo — cálculo financeiro

## Preservar

- referência especial com regra própria;
- Lateral binária;
- Bojo binário;
- Fecho binário;
- Ponto de Luz binário;
- ausência de informação não equivale a “não”;
- valores de Lateral/Bojo vêm da tabela de processos/valores;
- descontos/regras já validados precisam ser reproduzidos exatamente.

## Nova localização da regra

Toda regra que altera o valor a pagar deve morar no domínio financeiro, e não no domínio de chegada/facções.

Status: **MANTER REGRA / MOVER IMPLEMENTAÇÃO**.

---

# 9. Pagamentos — visualização e quitação

## Preservar

- filtros acumulativos;
- período;
- responsável/facção;
- referência;
- processo;
- status;
- total;
- marcar filtrados como pagos com confirmação forte;
- relatório completo com PIX;
- relatório simplificado Nome + PIX + Valor;
- pendências sem valor;
- proteção contra duplicidades;
- edição/exclusão segura conforme regras existentes;
- histórico já existente.

## Alterar

A tela não deverá mais dizer que os valores “são criados quando a chegada da facção é registrada”.

Os lançamentos novos serão criados no **Fechamento de Pagamentos**.

---

# 10. Leituras Firestore — pontos já identificados para a segunda fase

Não otimizar agressivamente antes da equivalência funcional, mas registrar para correção:

- listeners de coleções inteiras;
- `movimentacoesProducao` completa em Facções/Rastreamento/Processos;
- `entregasPagamento` completa;
- consultas independentes dos patches mesmo quando o estado principal já possui os dados;
- consultas repetidas de Facções por processo;
- polling na confirmação de chegada;
- busca de OP por vários IDs/campos por compatibilidade histórica;
- múltiplos caches independentes;
- renderizações completas após pequenas gravações.

Objetivo posterior: store único, consultas por necessidade, paginação/período, cache compartilhado e nenhuma leitura duplicada entre módulos.

---

# 11. Próximos levantamentos

- Produtos/Referências;
- Ordens completas;
- Manejo completo;
- Processos/valores;
- Facções e seus subfluxos;
- Células;
- Rastreamento;
- Fechamento/Pagamentos e todos os patches financeiros;
- Relatórios;
- Usuários/permissões;
- Logs;
- Importação/backup;
- atualização/versionamento;
- regras Firebase;
- compatibilidade de dados legados.

Nenhum arquivo de produção será apagado durante o levantamento.
