# Changelog — CorpoNu

## 2026-07-29 — Pagamentos seguros e relatório simplificado

Versão complementar: `2026-07-29-pagamentos-seguros-relatorio-simplificado-1`

### Alterações

- Reorganizados os botões da aba Pagamentos.
- O botão **Confirmar pagamentos filtrados** passa a ocupar o extremo direito da linha de ações.
- Criada confirmação reforçada para fechamento em lote:
  - mostra quantidade de lançamentos;
  - mostra o total filtrado;
  - mostra os filtros atuais;
  - exige confirmação por caixa de seleção;
  - exige digitação da palavra `PAGAR`.
- Preservada a validação financeira já existente antes da gravação no Firestore.
- Criado o botão **Relatório simplificado**.
- O relatório simplificado agrupa por facção/responsável e apresenta apenas:
  - Nome;
  - PIX;
  - Valor.
- Mantido o relatório detalhado existente, agora identificado como **Relatório completo com PIX**.
- Adicionado carregamento automático do módulo pelo Service Worker, sem necessidade de alterar o `index.html` nesta entrega.

### Arquivos

- Novo: `corponu-pagamentos-seguro.js`
- Atualizado: `sw.js`
- Documentação: `CONTINUIDADE-CORPONU.md`

### Banco e segurança

- Sem alteração nas coleções do Firestore.
- Sem alteração nas regras do Firestore.
- Sem alteração no cálculo ou na geração original dos pagamentos.
- A gravação continua sendo executada pela rotina segura já presente no `update.js`.
