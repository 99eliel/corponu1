CORREÇÃO - NÚMERO DA OP DIGITÁVEL

Agora, ao adicionar uma ordem de produção manualmente, o usuário precisa digitar o Nº da OP antes de salvar.

Regras aplicadas:
- O número digitado vira o numeroOP da ordem.
- O número digitado também é usado como ID seguro no Firestore.
- O sistema bloqueia OP duplicada antes de salvar.
- Ao editar uma OP existente, o número fica bloqueado para evitar quebrar rastreamento e movimentações.
- Mantidas as regras de SILK + DATA TECIDO obrigatórios para movimentar.
- Mantido modo produção seguro, sem apagar ou sobrescrever dados já lançados.
