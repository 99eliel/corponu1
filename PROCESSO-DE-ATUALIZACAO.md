# Processo seguro de atualização — CorpoNu

## Fluxo obrigatório

1. Confirmar a versão atual em `corponu-release.json`.
2. Criar uma branch de backup partindo da `main`.
3. Criar uma branch de trabalho com prefixo `fix/` ou `feature/`.
4. Alterar somente os arquivos relacionados à solicitação.
5. Atualizar `sw.js`, `corponu-atualizador.js` e `corponu-release.json` com a mesma identificação.
6. Validar a sintaxe JavaScript.
7. Revisar o diff completo.
8. Testar sem concluir pagamentos reais.
9. Abrir Pull Request.
10. Publicar somente depois da conferência.

## Checklist para Pagamentos

- [ ] Os filtros acumulativos continuam funcionando.
- [ ] O filtro Processo agrupa por tipo de serviço.
- [ ] Relatório completo com PIX funciona.
- [ ] Relatório simplificado mostra Nome, PIX e Valor.
- [ ] Fechamento em lote exige confirmação reforçada.
- [ ] Pendências sem valor podem ser visualizadas e preenchidas.
- [ ] Exclusão não apaga OP nem movimentação produtiva.
- [ ] Lançamento manual cria pagamento apenas da quantidade recebida.
- [ ] Entrega parcial cria o saldo restante.
- [ ] Pagamento quitado não pode ser excluído pela Central de Pendências.

## Checklist do PWA

- [ ] A versão é igual em `sw.js`, `corponu-atualizador.js` e `corponu-release.json`.
- [ ] O novo Service Worker instala e assume o controle.
- [ ] Os módulos financeiros são carregados juntos.
- [ ] A página recarrega uma única vez.
- [ ] Não é necessário apagar cache manualmente.
- [ ] O sistema ainda abre quando a rede oscila.

## Reversão emergencial

1. Identificar o último commit estável ou a branch `backup/` correspondente.
2. Criar uma branch de recuperação a partir dessa versão.
3. Restaurar os arquivos afetados ou reverter o commit problemático.
4. Gerar uma nova versão no atualizador para distribuir a recuperação.
5. Abrir Pull Request de recuperação.
6. Verificar se houve alteração de dados no Firestore.
7. Quando necessário, executar uma correção de dados baseada em backup e auditoria.

## Regra crítica

Nunca fazer uma grande correção financeira diretamente na `main`. O código pode ser restaurado pelo Git, mas dados gravados no Firestore exigem backup, auditoria e, em alguns casos, uma rotina corretiva específica.
