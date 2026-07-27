Correção segura - filtros Campo vazio no Manejo

Base: resgate funcional com dados.

Alteração aplicada:
- Adicionada opção Campo vazio nos filtros principais do Manejo.
- SILK mantém Preenchido/Sem silk e também aceita Campo vazio.
- DATA TECIDO mantém Preenchido/Sem tecido e também aceita Campo vazio.
- NECESSIDADE mantém URGENTE/Sem necessidade e também aceita Campo vazio.
- A lógica CASA x DISPONÍVEL P CASA continua preservada, com comparação exata quando o valor existe na lista.
- Não altera dados, não importa, não apaga e não mexe no login.
