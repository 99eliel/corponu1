Correção: filtro de OP lento no Manejo

Problema:
- O campo de filtro da OP carregava todas as OPs em uma lista de sugestões.
- Ao digitar, o sistema renderizava a tabela inteira em cada tecla.
- Com dados reais no Firebase, isso podia atrasar até a aparição do número digitado.

Correção aplicada:
- O filtro Nº OP agora é somente digitável, sem sugestões/datalist.
- O sistema aguarda poucos milissegundos antes de refiltrar, deixando a digitação fluida.
- As opções dos demais filtros continuam funcionando.
- A lógica CASA / DISPONÍVEL P CASA e DATA TECIDO preenchido foi preservada.
- Modo produção seguro preservado: não apaga nem sobrescreve dados já lançados.

Versão:
2026-07-27-op-digitada-sem-sugestao-1
