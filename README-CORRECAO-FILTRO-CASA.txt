CORREÇÃO - FILTRO CASA / DISPONÍVEL P CASA

Versão: 2026-07-27-ligia-filtro-casa-1

Problema corrigido:
- Ao filtrar FASE = CASA, o sistema também trazia DISPONÍVEL P CASA, porque o filtro usava busca por texto contendo "casa".

Nova regra:
- Se o valor digitado/selecionado existir exatamente na lista do filtro, o sistema compara EXATO.
  Exemplo: CASA mostra somente CASA.
  Exemplo: DISPONÍVEL P CASA mostra somente DISPONÍVEL P CASA.
- Se o usuário digitar apenas parte do texto, o filtro continua funcionando como busca parcial.
  Exemplo: digitando "cas" pode listar todos que contenham esse texto.

Arquivos alterados:
- app.js
- index.html, sw.js e version.json apenas para atualizar a versão e forçar o PWA/navegador a baixar o código novo.

Como testar:
1. Subir todos os arquivos no hosting.
2. Abrir o sistema e aguardar atualizar.
3. Ir no Manejo.
4. No filtro FASE, selecionar CASA.
5. Confirmar que não aparece DISPONÍVEL P CASA.
6. Depois selecionar DISPONÍVEL P CASA e confirmar que não aparece CASA.
