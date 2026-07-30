# Changelog CorpoNu

## 2026-07-30-lancamento-manual-pagamentos-restantes-1

- Criado **Novo lançamento manual** diretamente na aba Pagamentos.
- Busca a OP pelo número e preenche referência, cor, produto e quantidade.
- Permite selecionar processo e facção responsável.
- Permite informar a quantidade da OP/enviada e a quantidade realmente recebida.
- Permite informar o valor total final no próprio lançamento ou deixá-lo em branco.
- Quando o valor fica em branco, o pagamento é criado como `sem_valor` para preenchimento posterior pelo financeiro.
- Quando o valor é informado, o pagamento é criado como pendente com valor total manual.
- Entregas parciais criam automaticamente um documento `restante_faccao`.
- Criado painel **Restantes pendentes para pagamento** dentro da aba Pagamentos.
- O financeiro pode registrar a chegada complementar e gerar o pagamento apenas das peças recebidas.
- Se a chegada complementar também for parcial, um novo saldo restante é criado automaticamente.
- Adicionado atualizador automático independente por `corponu-release.json`.
- O novo Service Worker injeta os módulos financeiros sem exigir alteração do `index.html`.
- `version.json` foi sincronizado com o atualizador legado para impedir ciclos de limpeza de cache e desregistro do PWA.
