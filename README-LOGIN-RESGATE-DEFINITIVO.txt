Correção de login - resgate definitivo

Esta versão cria um login-core.js separado do app.js para o login não depender do carregamento das telas pesadas.
Também limpa cache/service worker antigo uma única vez nesta versão e recarrega a página com loginResgate=1.

O app.js foi ajustado para reutilizar o Firebase já inicializado pelo login-core, evitando erro de app duplicado.

Não altera dados do Firestore.
