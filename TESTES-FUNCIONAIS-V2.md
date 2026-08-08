# Corpo Nu Flow V2 — Testes Funcionais

Este arquivo é o contrato de validação da refatoração. Uma função antiga só poderá ser removida quando os casos equivalentes estiverem cobertos e validados na V2.

Status dos checkboxes:

- `[ ]` ainda precisa de validação manual do usuário
- `[x]` validado manualmente pelo usuário

> Observação: passar no CI/teste automatizado não marca automaticamente um item como `[x]`. A cobertura automatizada é registrada separadamente para não confundir teste técnico com validação operacional.

---

# 1. Segurança da refatoração

- [ ] `main` permanece sem alterações da V2 durante os testes.
- [ ] backup `backup/pre-refatoracao-2026-08-08` continua apontando para a versão estável.
- [ ] toda alteração da V2 ocorre em `refactor/corpo-nu-flow-v2`.

Cobertura automatizada: CI executado apenas sobre a branch V2 e pacote de homologação gerado sem publicação na produção.

---

# 2. Ordens — Sutiã

- [ ] cadastrar OP com número, referência, cor e quantidade.
- [ ] salvar OP com necessidade vazia.
- [ ] editar OP existente.
- [ ] impedir OP duplicada.
- [ ] referência inexistente deve ser tratada corretamente.
- [ ] quantidade não muda com scroll acidental do mouse.
- [ ] quantidade existe somente na OP, não em Produto/Referência.
- [ ] OP nova não grava `possuiAlca`, `possuiBojo` ou `possuiRenda`.
- [ ] editar OP antiga não perde Manejo, necessidade ou dados operacionais úteis.

Cobertura automatizada: criação, edição, duplicidade, produto correto, limpeza dos três campos legados e ausência de dupla atualização do store.

---

# 3. Ordens — Calcinha

- [ ] cadastrar Calcinha com OP, referência, cor e quantidade.
- [ ] necessidade pode ficar vazia.
- [ ] serviço pode ficar vazio no cadastro.
- [ ] facção pode ficar vazia no cadastro.
- [ ] OP aparece imediatamente após salvar.
- [ ] impedir duplicidade.
- [ ] editar sem transformar Calcinha em Sutiã.

Cobertura automatizada: regras, conversão controlada de documento legado e atualização imediata pelo store.

---

# 4. Contrato Mestre da OP / compatibilidade legada

- [ ] OP antiga real abre normalmente na V2.
- [ ] `numeroOP`, referência, cor, quantidade e tipo são preservados.
- [ ] antiga `fase` do Manejo aparece em `Fase Bojo`.
- [ ] `Fase Lateral` nasce vazia quando nunca foi informada.
- [ ] campos antigos Facção/Chegada/Falta/CELU do Manejo não reaparecem na V2.
- [ ] `componentesConsolidados` existentes são preservados como estado operacional.
- [ ] revisão manual antiga ativa de Lateral/Bojo é reconhecida.
- [ ] revisão cancelada/inativa não é tratada como estado atual.
- [ ] normalização não regrava automaticamente documentos históricos no Firebase.

Cobertura automatizada: formatos reais extraídos do backup de produção de 2026-08-08, incluindo referência 912, Calcinha e componentes consolidados.

---

# 5. Manejo

- [ ] Sutiã e Calcinha aparecem na aba correta.
- [ ] filtros acumulativos continuam funcionando.
- [ ] `Fase Bojo` mantém os valores da antiga Fase.
- [ ] `Fase Lateral` é independente e começa vazia nos dados antigos.
- [ ] editar `Fase Lateral` não apaga `Fase Bojo` e vice-versa.
- [ ] Necessidade continua sendo texto livre e opcional.
- [ ] campos Facção, Chegada, Falta e CELU não aparecem na linha.
- [ ] não existe função Enviar para Célula no Manejo.
- [ ] envio para facção exige processo permitido.
- [ ] facção é escolhida apenas no momento do envio.
- [ ] lista somente facções habilitadas para o processo.
- [ ] Sutiã Completo pode ser enviado sem Lateral/Bojo informados.
- [ ] dado ausente continua “não informado”, sem virar “não”.
- [ ] nenhuma ação do Manejo cria documento financeiro novo.

Cobertura automatizada: regras, filtros, persistência, envio operacional e travas arquiteturais contra Célula/financeiro.

---

# 6. Facções / Chegadas

- [ ] envio aparece imediatamente sem F5.
- [ ] usuário comum consegue informar chegada.
- [ ] status mostra usuário/chegada uma única vez na própria linha.
- [ ] aviso não cresce/duplica na interface.
- [ ] admin consegue confirmar chegada operacional.
- [ ] reenvio continua funcionando.
- [ ] faltas/defeitos operacionais continuam registráveis.
- [ ] botão Bipar não aparece na aba Facções.
- [ ] informar chegada não cria pagamento.
- [ ] confirmar chegada não cria pagamento.
- [ ] abrir Facções não carrega/renderiza Pagamentos como efeito colateral.
- [ ] componentes informados na confirmação são consolidados na OP sem criar pagamento.

Cobertura automatizada: regras, concorrência por transação, reenvio, componentes e proibição de referência financeira na área operacional.

---

# 7. Fechamento de Pagamentos — novo fluxo

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
- [ ] lançamento aparece imediatamente na área financeira/store.
- [ ] duplicidade acidental é bloqueada.
- [ ] casos legítimos de segundo serviço/retrabalho não são bloqueados incorretamente.
- [ ] ALÇA pode ser fechada sem existir `possuiAlca` na OP.
- [ ] ENCAPAR BOJO pode ser fechado sem existir `possuiBojo` na OP.
- [ ] ausência de valor/configuração retorna erro e nunca usa preço monetário escondido no código.

Cobertura automatizada: service, chave determinística, transação atômica e Motor de Valores central.

---

# 8. Quantidade parcial/restante

- [ ] quantidade da OP é carregada como referência inicial.
- [ ] pagamento parcial continua possível quando necessário.
- [ ] saldo/restante é calculado corretamente.
- [ ] segundo fechamento do restante não duplica o primeiro.
- [ ] total fechado nunca ultrapassa a quantidade permitida sem confirmação/regra explícita.

---

# 9. Sutiã Completo — fechamento financeiro

- [ ] referência normal usa valor-base configurado correto.
- [ ] referência especial 912 usa regra integral correta.
- [ ] referência 912 não pergunta Lateral/Bojo/Fecho/Ponto de Luz para calcular o Sutiã Completo.
- [ ] Lateral já conhecida é reutilizada.
- [ ] Bojo já conhecido é reutilizado.
- [ ] Lateral já conhecida não é perguntada novamente.
- [ ] Bojo já conhecido não é perguntado novamente.
- [ ] somente componentes realmente ausentes aparecem para resposta no Fechamento.
- [ ] Fecho ausente é perguntado quando necessário.
- [ ] Ponto de Luz ausente é perguntado quando necessário.
- [ ] “não informado” nunca é convertido silenciosamente para “não”.
- [ ] desconto de Lateral utiliza valor cadastrado da referência.
- [ ] desconto de Bojo utiliza valor de ENCAPAR BOJO cadastrado da referência.
- [ ] desconto de Fecho utiliza configuração financeira.
- [ ] desconto de Ponto de Luz utiliza configuração financeira.
- [ ] valor unitário final confere com a regra atual validada.
- [ ] valor total = quantidade financeira × valor unitário correto.

Cobertura automatizada: referência normal, referência 912, componentes consolidados/revisão antiga, conferência seletiva e ausência de consulta de Lateral/Bojo na 912.

---

# 10. Pagamentos — consulta e fechamento mensal

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

# 11. Histórico legado

- [ ] pagamentos existentes antes da V2 continuam visíveis.
- [ ] movimentações antigas continuam rastreáveis.
- [ ] OPs antigas continuam editáveis/consultáveis conforme regra atual.
- [ ] refatoração não altera documentos históricos só para adequar interface.
- [ ] eventual migração de schema terá rotina separada, auditável e reversível.

Observação: o backup de produção recebido em 2026-08-08 possui OPs/componentes úteis para compatibilidade, mas não contém histórico preenchido em `movimentacoesProducao` ou `entregasPagamento`; portanto a validação histórica financeira ainda precisa de outra fonte/dados reais quando chegar essa etapa.

---

# 12. Leituras/performance — validar depois da equivalência funcional

- [ ] abrir Facções não consulta Pagamentos.
- [ ] abrir Pagamentos não carrega histórico operacional inteiro sem necessidade.
- [ ] Facções por processo reutilizam cache/store compartilhado.
- [ ] OP é localizada sem sequência excessiva de consultas quando já está no store.
- [ ] preços da mesma referência são reutilizados/cacheados no mesmo cálculo.
- [ ] referência especial não consulta valores de componentes que não utiliza.
- [ ] listeners de telas pesadas são limitados ao necessário.
- [ ] listas históricas usam paginação/período.
- [ ] nenhuma ação pequena provoca múltiplos refreshes gerais.
- [ ] não existem múltiplos módulos lendo a mesma coleção para representar o mesmo estado.
