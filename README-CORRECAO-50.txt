CORREÇÃO - MIGRAÇÃO LÍGIA APARECENDO SÓ 50

O número 50 é a quantidade de REFERÊNCIAS ÚNICAS da planilha da Lígia, não a quantidade de OPs.
A base correta tem:
- 746 OPs em ordensProducao
- 50 referências únicas em produtos
- 216 movimentações ativas
- 198 relatórios separados

Possível causa técnica:
- O importador antigo começava pelos 50 produtos/referências. Se alguma coleção seguinte estivesse bloqueada pelas regras do Firebase, a importação parava e parecia que "sumiu tudo", ficando só os 50 produtos.

Correções feitas nesta versão:
1. A importação agora grava as OPs primeiro, antes das referências.
2. Dashboard agora mostra OPs cadastradas primeiro.
3. Card de referências mostra “Referências únicas” para não confundir com OPs.
4. Importador de backup agora reconhece dados-ligia-migracao.json diretamente.
5. O botão “Importar dados da Lígia embutidos” valida as contagens após importar.
6. O sistema mostra no toast quantas OPs e quantas referências ficaram no Firestore.
7. Se alguma coleção auxiliar falhar, o sistema avisa para publicar novamente o firebase-rules.txt.
8. Versionamento atualizado para forçar o PWA a buscar a versão nova.

COMO TESTAR
1. Suba todos os arquivos deste ZIP no hosting.
2. Publique novamente as regras do arquivo firebase-rules.txt no Firestore Rules.
3. Abra o sistema e aguarde atualizar.
4. Vá em Importar / Backup.
5. Clique em “Ver resumo dos dados”.
6. Clique em “Importar dados da Lígia embutidos”.
7. Depois confira no Dashboard:
   - OPs cadastradas: 746
   - Referências únicas: 50

IMPORTANTE
Use somente dados-ligia-migracao.json nesta fase. Não use a planilha de pagamentos ainda.
