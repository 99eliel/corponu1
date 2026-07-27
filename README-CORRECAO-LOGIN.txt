# Correção de login

Esta versão corrige o problema em que um erro de carregamento/renderização de alguma tela poderia derrubar o usuário logo após autenticar.

Mudanças:
- Login não é mais encerrado por erro visual de uma tela.
- Abertura de telas agora tem proteção com try/catch.
- Renderização da página ativa também foi protegida.
- Mantidas as otimizações: sem Dashboard, carregar mais, relatórios sob demanda e auditoria sob demanda.

Depois de subir, usar Ctrl + F5. Se o navegador ainda puxar cache antigo, rodar limparVersaoSistema() no console.
