# Corpo Nu Flow V2 — Testes Funcionais

Este arquivo é o contrato de validação da refatoração. Uma função antiga só poderá ser removida quando os casos equivalentes estiverem cobertos e validados na V2.

Status possíveis:

- `[ ]` não testado
- `[x]` validado

---

# 1. Segurança da refatoração

- [ ] `main` permanece sem alterações da V2 durante os testes.
- [ ] backup `backup/pre-refatoracao-2026-08-08` continua apontando para a versão estável.
- [ ] toda alteração da V2 ocorre em `refactor/corpo-nu-flow-v2`.

---

# 2. Ordens — Sutiã

- [ ] cadastrar OP com número, referência, cor e quantidade.
- [ ] salvar OP com necessidade vazia.
- [ ] editar OP existente.
- [ ] impedir OP duplicada.
- [ ] referência inexistente deve ser tratada corretamente.
- [ ] quantidade não muda com scroll acidental do mouse.
- [ ] quantidade existe somente na OP, não em Produto/Referência.

---

# 3. Ordens — Calcinha

- [ ] cadastrar Calcinha com OP, referência, cor e quantidade.
- [ ] necessidade pode ficar vazia.
- [ ] serviço pode ficar vazio no cadastro.
- [ ] facção pode ficar vazia no cadastro.
- [ ] OP aparece imediatamente após salvar.
- [ ] impedir duplicidade.
- [ ] editar sem transformar Calcinha em Sutiã.

---

# 4. Manejo

- [ ] Sutiã e Calcinha aparecem na aba correta.
- [ ] filtros acumulativos continuam funcionando.
- [ ] envio para facção exige processo permitido.
- [ ] lista somente facções habilitadas para o processo.
- [ ] envio para célula continua funcionando.
- [ ] Sutiã Completo pode ser enviado sem Lateral/Bojo informados.
- [ ] dado ausente continua “não informado”, sem virar “não”.
- [ ] nenhuma ação do Manejo cria documento financeiro novo.

---

# 5. Facções

- [ ] envio aparece imediatamente sem F5.
- [ ] usuário comum consegue informar chegada.
- [ ] aviso mostra usuário e horário uma única vez.
- [ ] aviso não cresce/duplica na interface.
- [ ] admin consegue confirmar chegada operacional.
- [ ] reenvio continua funcionando.
- [ ] faltas/defeitos operacionais continuam registráveis.
- [ ] botão Bipar não aparece na aba Facções.
- [ ] informar chegada não cria pagamento.
- [ ] confirmar chegada não cria pagamento.
- [ ] abrir Facções não carrega/renderiza Pagamentos como efeito colateral.

---

# 6. Fechamento de Pagamentos — novo fluxo

- [ ] existe área própria de Fechamento de Pagamentos.
- [ ] buscar OP por número funciona.
- [ ] OP encontrada carrega referência, cor, quantidade e tipo da peça.
- [ ] usuário escolhe processo realizado.
- [ ] responsáveis/facções são filtrados pelo processo.
- [ ] usuário escolhe quem realizou o serviço.
- [ ] competência mensal pode ser definida, ex.: `2026-08`.
- [ ] competência não é copiada automaticamente da data de chegada.
- [ ] lançamento pode ser criado mesmo sem chegada registrada em Facções.
- [ ] lançamento financeiro não cria movimentação operacional falsa.
- [ ] lançamento aparece imediatamente na área de Pagamentos.
- [ ] duplicidade acidental é bloqueada.
- [ ] casos legítimos de segundo serviço/retrabalho não são bloqueados incorretamente.

---

# 7. Quantidade parcial/restante

- [ ] quantidade da OP é carregada como referência inicial.
- [ ] pagamento parcial continua possível quando necessário.
- [ ] saldo/restante é calculado corretamente.
- [ ] segundo fechamento do restante não duplica o primeiro.
- [ ] total fechado nunca ultrapassa a quantidade permitida sem confirmação/regra explícita.

---

# 8. Sutiã Completo — fechamento financeiro

- [ ] referência normal usa valor-base correto.
- [ ] referência especial usa regra integral correta.
- [ ] Lateral já conhecida é reutilizada.
- [ ] Bojo já conhecido é reutilizado.
- [ ] Lateral ausente é perguntada antes de concluir quando necessária.
- [ ] Bojo ausente é perguntado antes de concluir quando necessário.
- [ ] Fecho ausente é perguntado quando necessário.
- [ ] Ponto de Luz ausente é perguntado quando necessário.
- [ ] “não informado” nunca é convertido silenciosamente para “não”.
- [ ] desconto de Lateral utiliza valor cadastrado correto.
- [ ] desconto de Bojo utiliza valor cadastrado correto.
- [ ] desconto de Fecho utiliza regra correta.
- [ ] desconto de Ponto de Luz utiliza regra correta.
- [ ] valor unitário final confere com a regra atual validada.
- [ ] valor total = quantidade financeira × valor unitário correto.

---

# 9. Pagamentos — consulta e fechamento mensal

- [ ] filtrar por competência mensal.
- [ ] filtrar por responsável/facção.
- [ ] filtrar por referência.
- [ ] filtrar por processo.
- [ ] filtrar por status.
- [ ] filtros acumulativos funcionam juntos.
- [ ] total exibido corresponde somente aos itens filtrados.
- [ ] marcar filtrados como pagos exige confirmação forte.
- [ ] pagamentos já pagos não são recriados.
- [ ] pendências sem valor continuam identificáveis.
- [ ] relatório completo com PIX continua funcionando.
- [ ] relatório simplificado exibe Nome + PIX + Valor.

---

# 10. Histórico legado

- [ ] pagamentos existentes antes da V2 continuam visíveis.
- [ ] movimentações antigas continuam rastreáveis.
- [ ] OPs antigas continuam editáveis/consultáveis conforme regra atual.
- [ ] refatoração não altera documentos históricos só para adequar interface.
- [ ] eventual migração de schema terá rotina separada, auditável e reversível.

---

# 11. Leituras/performance — validar depois da equivalência funcional

- [ ] abrir Facções não consulta Pagamentos.
- [ ] abrir Pagamentos não carrega histórico operacional inteiro sem necessidade.
- [ ] Facções por processo reutilizam cache/store compartilhado.
- [ ] OP é localizada sem sequência excessiva de consultas quando já está no store.
- [ ] listeners de telas pesadas são limitados ao necessário.
- [ ] listas históricas usam paginação/período.
- [ ] nenhuma ação pequena provoca múltiplos refreshes gerais.
- [ ] não existem múltiplos módulos lendo a mesma coleção para representar o mesmo estado.
