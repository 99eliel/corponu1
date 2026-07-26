Sistema otimizado para economia de leituras no Firestore.

Regra geral aplicada:
- Ao abrir telas grandes, carrega apenas lista inicial limitada.
- Manejo: 50 OPs iniciais.
- Produtos/Ordens: lista inicial econômica.
- Processos/Rastreamento/Facções/Células: movimentações iniciais limitadas.
- Pagamentos e logs: carregamento inicial limitado.
- Dados completos só são buscados quando o usuário preenche filtro/busca e clica em “Buscar no banco”.

Objetivo:
Evitar estouro de leituras sem esconder resultado quando o usuário realmente procura algo.
