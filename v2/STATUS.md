# Status da refatoração V2

## Fase atual

Fluxo central da OP e núcleo financeiro desacoplado implementados em arquitetura V2 e cobertos por testes automatizados.

## Implementado na V2

- Ordens de Sutiã e Calcinha sem `possuiAlca`, `possuiBojo` ou `possuiRenda` na OP.
- Manejo com `Fase Bojo` + `Fase Lateral`, sem Facção/Chegada/Falta/CELU na linha e sem envio para Célula.
- Facções/Chegadas puramente operacionais, sem geração de pagamentos.
- Fechamento de Pagamentos independente da chegada e baseado em competência mensal.
- Contrato Mestre da OP V2 (`op-contrato.mjs`).
- Normalizador de OP legada para o contrato V2 (`op-normalizador.mjs`).
- Compatibilidade testada com formatos reais encontrados no backup de produção de 2026-08-08.
- Motor de componentes compatível com `componentesConsolidados`, revisão manual antiga e campos legados explícitos.
- Revisão de componentes cancelada/inativa não é tratada como informação atual.
- Motor central de valores (`motor-valores.mjs`).
- ALÇA e ENCAPAR BOJO continuam processos financeiros independentes e não dependem de flags na OP.
- SUTIÃ COMPLETO reutiliza componentes já conhecidos da OP.
- Referência especial configurada (atualmente 912) usa regra especial e não consulta/desconta Lateral/Bojo.
- Fechamento pergunta somente componentes ainda não informados.
- Valores monetários não possuem fallback hardcoded na V2: ausência de configuração gera erro explícito.

## Cobertura automatizada

O CI valida atualmente:

- sintaxe JavaScript;
- testes automatizados V2;
- JSON;
- geração do pacote de homologação;
- proibição de `MutationObserver`, polling e listeners Firestore nas telas V2 protegidas;
- proibição de acoplamento financeiro no Manejo/Facções;
- compatibilidade de OPs antigas com o contrato V2;
- cálculo de ALÇA, ENCAPAR BOJO, SUTIÃ COMPLETO e referência especial;
- conferência seletiva de componentes no Fechamento.

Último checkpoint deste bloco: **CI verde**.

## Aguardando validação manual

A aprovação operacional pelo usuário ainda é necessária antes de qualquer substituição da versão estável, especialmente para:

- OPs reais antigas no fluxo completo;
- Manejo com as duas fases;
- chegada/reenvio em Facções;
- Sutiã Completo com componentes conhecidos e faltantes;
- referência especial;
- fechamento mensal e pagamentos.

## Ainda não conectado à produção

Nenhum arquivo da pasta `v2/` é carregado pela `main` ou pelo sistema estável.
A branch de trabalho é `refactor/corpo-nu-flow-v2` e o backup `backup/pre-refatoracao-2026-08-08` permanece intocado.
