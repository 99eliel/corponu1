CORREÇÃO - RASTREAMENTO GLOBAL + EDIÇÃO DE LOCAL

Versão: 2026-07-27-rastreamento-global-editar-local-1

O que foi feito:
1. A busca do Rastreamento agora é global.
   - Pesquisa em ordensProducao, mesmo quando a OP não tem movimentação ativa.
   - Encontra OPs no Manejo, em Facção, em Célula, Relatórios separados, Bipadas e Canceladas.
   - Exemplo: OP com FASE=PRODUÇÃO aparece como Relatório células / já nas células.

2. Qualquer OP encontrada no Rastreamento pode ter local corrigido pelo admin.
   - Botão: Editar local.
   - Permite mover para Manejo, Disponível casa, Em facção, Em célula, Relatório células, Finalizado/Bipado ou Cancelada.
   - Salva histórico em ajustesMigracao.

3. Correção segura de Manejo.
   - Ao mover uma OP oculta/relatório para Manejo, Facção ou Célula, o sistema retira o ocultarDoManejo.
   - A OP volta a aparecer na tela de Manejo correta conforme tipo da peça.

4. A busca do rastreamento não usa datalist pesado.
   - Digitação fica mais leve.
   - Filtro roda com pequeno atraso para não travar.

Importante:
- Esta versão mantém o modo produção seguro.
- Não limpa dados já lançados.
- Não sobrescreve OP existente na importação segura.
- Não use mais versões com “limpa anterior” depois que usuários começaram a lançar dados reais.
