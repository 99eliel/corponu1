Correção final do login

- Login agora é processado diretamente no submit, sem depender apenas do onAuthStateChanged.
- Mensagens visíveis abaixo do botão Entrar indicam se o problema é senha/Auth, perfil em usuarios ou permissão do Firestore.
- Campo ativo ausente no usuário antigo não bloqueia mais o acesso; somente ativo=false bloqueia.
- PDF.js saiu do carregamento inicial e só é carregado quando usar importador PDF, evitando travar o módulo principal.
- Login e mostrar senha são configurados antes de qualquer tela pesada.
- Não altera dados do Firebase.
