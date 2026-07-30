# Changelog CorpoNu

## 2026-07-30-recuperacao-pagamentos-autoupdate-5

- Recuperadas as mudanças recentes da aba Pagamentos.
- Restaurado filtro por categoria de processo, como ENCAPAR BOJO.
- Mantidos relatório simplificado e relatório completo com PIX.
- Mantida confirmação reforçada antes do fechamento em lote.
- Mantida Central de Pendências de Valor organizada.
- Mantida exclusão segura de lançamentos financeiros permitidos.
- Eliminada a dependência de inclusão do módulo no `index.html`.
- Módulo financeiro incorporado ao próprio `sw.js`.
- Service Worker passa a incorporar o módulo ao `update.js` durante a resposta.
- Instalação deixa de depender de pré-cache de arquivos novos.
- Ativação limpa apenas caches antigos do CorpoNu, assume os clientes e os navega
  automaticamente para a versão atual.
- Atualizações futuras são verificadas pela mudança do próprio `sw.js`.
- `version.json` permanece congelado temporariamente para não acionar o atualizador
  antigo que remove registros de Service Worker.
