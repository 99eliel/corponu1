Manejo econômico com filtro global

Regra aplicada:
- Ao abrir o Manejo, carrega somente 50 OPs para economizar leituras no Firestore.
- O sistema não carrega todos os pedidos automaticamente.
- Quando usar filtros/busca e clicar em “Buscar filtros no banco”, ele busca em todas as OPs e carrega todos os resultados encontrados para aquela busca.
- Se a busca encontrar 80, mostra 80. Se encontrar 200, mostra 200.
- O botão de carregar mais sem filtro fica desabilitado para evitar leitura desnecessária.

Objetivo:
Economizar leituras sem esconder resultados quando o usuário pesquisar.
