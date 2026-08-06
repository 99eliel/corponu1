TESTE DA ROTINA DE CHEGADA — VERSÃO 130

Objetivo
- Usuário comum apenas avisa que a mercadoria chegou.
- O aviso não cria nem altera pagamento.
- Após o aviso, o usuário pode reenviar a OP para outra facção imediatamente.
- Cada reenvio é outra movimentação e terá outro pagamento quando sua chegada for confirmada.
- Somente o administrador confirma a chegada e gera o pagamento.

Cenário 1 — aviso simples
1. Entrar como usuário comum.
2. Abrir Facções.
3. Clicar em Avisar que chegou.
4. Confirmar que aparece Chegada avisada.
5. Conferir que não surgiu pagamento novo.

Cenário 2 — reenvio antes da confirmação
1. No mesmo registro avisado, clicar em Reenviar facção.
2. Escolher processo, facção, quantidade e data.
3. Confirmar o reenvio.
4. Conferir que uma nova movimentação foi criada e que ainda não existe pagamento dela.

Cenário 3 — confirmação administrativa
1. Entrar como administrador.
2. Abrir o registro com Chegada avisada.
3. Clicar em Confirmar chegada.
4. Conferir data, falta, defeito e demais dados.
5. Salvar e confirmar que o pagamento foi gerado somente nesse momento.
6. Repetir depois com a chegada da movimentação de reenvio para confirmar que ela gera outro pagamento isolado.

Backup
backup/2026-08-06-antes-aviso-chegada-sem-pagamento-130
