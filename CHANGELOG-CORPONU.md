# Changelog — CorpoNu

## 2026-07-29 — Pagamentos por processo agrupado 2

### Alterado
- O filtro **Processo** da aba Pagamentos deixou de listar uma opção para cada combinação de referência, processo e preço.
- O filtro agora lista o serviço de forma agrupada, como **ENCAPAR BOJO**, **ALÇA**, **CALCINHA MONTAGEM**, **CALCINHA COMPLETA**, **SUTIÃ MONTAGEM** e **SUTIÃ COMPLETO**.
- Ao selecionar um processo, todas as referências e todos os valores correspondentes são reunidos no mesmo fechamento.
- Os filtros de período, facção, referência e situação de pagamento continuam acumulativos.
- Cards, conferência, tabela-resumo e lançamentos detalhados são recalculados pelo processo escolhido.
- Relatório detalhado, relatório simplificado e fechamento em lote agora respeitam o processo agrupado.

### Segurança preservada
- Confirmação reforçada antes do pagamento em lote.
- Exibição da quantidade e do total que serão fechados.
- Confirmação obrigatória por caixa de seleção e digitação de `PAGAR`.
- Bloqueio de pagamentos sem valor, possíveis duplicidades e lotes acima do limite seguro.
- Registro de auditoria do fechamento.

### PWA
- Service Worker atualizado para `2026-07-29-pagamentos-processos-agrupados-2`.
- Novo cache força o carregamento dos arquivos atualizados.

### Banco de dados
- Nenhuma coleção ou regra do Firebase foi alterada.
