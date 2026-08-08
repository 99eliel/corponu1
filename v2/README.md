# Corpo Nu Flow V2

Esta pasta contém a refatoração incremental do Corpo Nu Flow.

## Regras desta área

- Código V2 não deve depender de patches antigos.
- Regras de negócio devem ser testáveis sem DOM e sem Firebase sempre que possível.
- Facções e Manejo são operacionais e não criam pagamentos.
- Fechamento financeiro é independente da chegada e usa competência mensal própria.
- Nenhum módulo V2 entra na produção antes de validação funcional.

## Estrutura inicial

- `core/normalizacao.mjs`: normalização central de dados e aliases.
- `core/financeiro-regras.mjs`: validação e cálculo puro do fechamento financeiro.
- `tests/`: testes automatizados das regras V2.
