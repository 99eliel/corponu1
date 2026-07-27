CORREÇÃO - DIVERGÊNCIA PLANILHA LÍGIA ATUALIZADA

Motivo:
A planilha da Lígia foi atualizada. O banco anterior tinha OPs e somas da versão antiga.
Se apenas importar por cima, o Firestore mantém OPs antigas que saíram da planilha, causando divergência.

Correção aplicada:
1. dados-ligia-migracao.json foi regenerado a partir de Planilha Lígia(1).xlsx / aba FACÇÃO.
2. O importador agora limpa a migração antiga da Lígia antes de inserir a nova.
3. Produtos/facções/células continuam sendo mesclados, mas OPs, movimentações e relatórios antigos da migração são limpos.

Conferência principal:
- OPs: 718
- Peças totais: 147614
- BOJOS ENCAPADOS: 60 OPs / 10808 peças
- Referências únicas: 50
- Movimentações: 253
- Relatórios separados: 172

Não inclui planilha de pagamentos.
