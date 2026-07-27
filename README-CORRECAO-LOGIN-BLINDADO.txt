Correção blindada do login

1. O formulário de login não recarrega mais a página se o app.js atrasar ou falhar.
2. O botão Mostrar/Ocultar senha tem proteção direta no index.html.
3. O Firestore agora tenta cache persistente, mas se falhar entra em modo normal sem travar o login.
4. A inicialização das telas foi isolada: erro em Relatórios, Auditoria ou Manejo não impede login.
5. Versionamento atualizado para forçar cache novo.
