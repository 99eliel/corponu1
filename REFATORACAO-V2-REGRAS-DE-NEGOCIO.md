# Corpo Nu Flow V2 — Regras de negócio consolidadas

Este documento registra as regras que serão consideradas oficiais durante a refatoração do Corpo Nu Flow.

## 1. Regra principal: Facções não gera pagamento

A área **Facções** passa a ser exclusivamente operacional.

Ela poderá registrar e exibir, conforme o fluxo de produção:

- envio de OP para facção;
- processo enviado;
- facção/responsável;
- quantidade enviada;
- informação de chegada;
- confirmação operacional da chegada;
- faltas/defeitos quando aplicável;
- reenvios;
- histórico operacional.

### Proibido na nova arquitetura

Nenhuma ação da área Facções deverá:

- criar pagamento automaticamente;
- fechar pagamento;
- marcar pagamento como pendente ou pago;
- usar a data de chegada como data obrigatória de fechamento financeiro;
- disparar renderização da área financeira como efeito colateral.

A chegada de uma OP e o fechamento financeiro passam a ser eventos independentes.

---

## 2. Nova área: Fechamento de Pagamentos

O fechamento mensal será realizado em uma área própria.

### Fluxo básico

1. Usuário abre **Fechamento de Pagamentos**.
2. Informa ou localiza a **OP**.
3. O sistema carrega automaticamente os dados conhecidos da OP.
4. Usuário escolhe o **serviço/processo realizado**.
5. O sistema mostra somente os responsáveis/facções habilitados para aquele processo.
6. Usuário informa **quem realizou o serviço**.
7. Usuário confirma a **competência do fechamento** (ex.: `08/2026`).
8. O sistema determina o valor aplicável usando a tabela de processos/valores e as regras específicas do processo.
9. O lançamento é adicionado ao fechamento financeiro.
10. O pagamento fica disponível para filtro, conferência, relatório e quitação.

### Competência financeira

Cada lançamento financeiro novo deverá possuir uma competência própria, preferencialmente armazenada em formato normalizado como `YYYY-MM`.

Exemplo:

- fechamento visual: `08/2026`;
- valor persistido: `2026-08`.

A competência é definida no momento do fechamento financeiro e **não é herdada automaticamente da data de chegada**.

Consequências:

- uma OP pode chegar hoje e ser incluída em outro fechamento conforme a rotina financeira;
- registrar chegada não altera o conjunto de pagamentos do mês;
- abrir ou confirmar Facções não muda filtros financeiros;
- o financeiro poderá filtrar diretamente por competência, sem depender de datas operacionais.

A data de chegada da OP não define automaticamente em qual fechamento mensal ela deverá entrar.

---

## 3. Dados carregados ao informar a OP

Sempre que possível, o sistema deve reutilizar dados já existentes sem fazer novas consultas desnecessárias.

Ao localizar uma OP, o fechamento poderá utilizar:

- número da OP;
- referência;
- cor;
- quantidade;
- tipo da peça: Sutiã ou Calcinha;
- dados de componentes já conhecidos;
- histórico operacional necessário para conferência;
- tabela de valores já carregada em memória/cache.

A quantidade da OP continua pertencendo à **OP**, e não ao cadastro de Produto/Referência.

O fechamento financeiro deve funcionar mesmo que não exista chegada de Facções vinculada à OP, desde que os dados necessários ao pagamento possam ser conferidos no próprio fechamento.

---

## 4. Quantidade e fechamento parcial

A quantidade da OP será a referência inicial para o fechamento.

A arquitetura deve preservar a possibilidade de existir quantidade parcial/restante quando a operação real exigir, sem obrigar o pagamento a depender do registro de chegada em Facções.

A regra exata de interface para parcial/restante será consolidada durante o inventário das funções financeiras atuais, para não perder comportamento existente.

---

## 5. Sutiã Completo

O fechamento de **Sutiã Completo** continuará respeitando as regras de componentes e descontos.

### Lateral e Bojo

- são binários: fez ou não fez;
- informação ausente não significa automaticamente “não”; 
- se já houver informação confiável no sistema, o fechamento deverá reutilizá-la;
- se a informação necessária ao cálculo ainda estiver ausente, o fluxo de fechamento deverá solicitar a definição antes de concluir o lançamento financeiro.

### Fecho e Ponto de Luz

- são binários: tem ou não tem;
- dados já informados no fluxo produtivo podem ser reutilizados;
- se ainda forem necessários ao cálculo e estiverem ausentes, o fechamento deverá pedir a informação.

### Referências especiais

As regras especiais já existentes serão inventariadas antes da consolidação definitiva do cálculo.

---

## 6. Separação de responsabilidades da V2

A arquitetura deverá possuir responsáveis únicos por domínio:

- **Ordens**: cadastro e edição da OP;
- **Manejo**: preparação interna e encaminhamento;
- **Facções**: movimentação operacional externa;
- **Chegadas**: registro operacional de retorno;
- **Fechamento de Pagamentos**: criação dos lançamentos financeiros e definição da competência;
- **Pagamentos**: conferência, filtros, relatórios e quitação;
- **Relatórios**: leitura e apresentação de dados consolidados.

Nenhum módulo deverá depender de alteração visual posterior por patch para corrigir comportamento de outro módulo.

---

## 7. Regra de segurança durante a refatoração

A versão estável anterior à refatoração permanece preservada em:

`backup/pre-refatoracao-2026-08-08`

Todo desenvolvimento da V2 ocorre em:

`refactor/corpo-nu-flow-v2`

A `main` não será usada para testes da refatoração antes da validação funcional.

Nenhuma função antiga será removida sem:

1. identificar o comportamento que ela implementa;
2. identificar os dados que lê e grava;
3. implementar o comportamento correspondente na V2, quando ainda necessário;
4. validar o resultado esperado.
