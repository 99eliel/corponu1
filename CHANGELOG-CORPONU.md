# Changelog — CorpoNu

## 2026-07-29-pendencias-valores-financeiro-3

### Pagamentos
- Corrigido o botão `Conferir agora`, que antes somente recarregava a conferência.
- Renomeado para `Ver pendências de valor`.
- Criada central financeira com todos os pagamentos sem valor.
- Incluída busca por OP, referência, facção e processo.
- Incluídos contadores de pendências por tipo.
- Permitida definição do valor total final por OP em Sutiã Montagem e Sutiã Completo.
- Permitida definição do valor padrão global de uma Alça, com multiplicação por duas e recálculo dos lançamentos abertos.
- Incluída definição administrativa do valor unitário por Referência + Processo, com recálculo dos lançamentos equivalentes.
- Após salvar um valor, o pagamento passa automaticamente para `pendente`, sem ser marcado como pago.
- Incluídos registros adicionais em `logsAlteracoes`.

### Segurança
- Nenhum pagamento é quitado pela central de valores.
- A confirmação de pagamentos filtrados continua separada e protegida pela confirmação reforçada.
- Mantidas as regras atuais do Firebase e as permissões financeiras existentes.

## 2026-07-29-pagamentos-processos-agrupados-2
- Filtro de pagamentos agrupado pelo nome do processo.
- Relatório simplificado com Nome, PIX e Valor.
- Confirmação reforçada para fechamento em lote.
