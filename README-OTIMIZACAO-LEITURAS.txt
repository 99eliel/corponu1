OTIMIZAÇÃO DE LEITURAS FIRESTORE

Esta versão foi criada para reduzir leituras do Firebase sem quebrar os filtros.

Mudanças principais:
1. Cache persistente do Firestore no navegador/PWA.
2. O Manejo não carrega mais o histórico inteiro de movimentações automaticamente.
3. O histórico/movimentações carrega só em Rastreamento, Processos, Facções ou Células.
4. Renderização otimizada: ao receber dados, o sistema redesenha só a tela aberta.
5. Os filtros continuam trabalhando sobre os dados carregados em memória.
6. Função manual disponível no console: atualizarDadosServidorAgora().

Regra de segurança:
- Não apaga dados.
- Não sobrescreve dados lançados.
- Não muda lógica de importação.
- Não muda regras de movimentação.
