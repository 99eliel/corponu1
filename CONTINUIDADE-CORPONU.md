# Continuidade do Sistema CorpoNu

## Versão em organização

`2026-07-30-organizacao-autoupdate-pagamentos-2`

## Repositório oficial

`99eliel/corponu1`

## Proteção criada antes da organização

- Branch de recuperação integral: `backup/main-antes-organizacao-20260730`.
- Commit estável preservado: `78f425eee1e26c659e815a5cc7e10288402beeed`.
- Branch de trabalho: `fix/organizar-carregamento-autoupdate-20260730`.
- A branch `main` não deve ser alterada diretamente durante correções grandes.

## Estrutura financeira mantida

- `corponu-pagamentos-seguro.js`: filtro agrupado por processo, relatórios completo e simplificado, confirmação reforçada, Central de Pendências de Valor e exclusão segura.
- `corponu-pagamentos-manual.js`: lançamento manual em Pagamentos, valor total opcional, chegada parcial e controle dos restantes.
- `corponu-atualizador.js`: verificação de novas versões e recarga automática.
- `corponu-release.json`: fonte oficial da versão nova.
- `version.json`: mantido temporariamente na identificação legada enquanto `update.js` ainda possui a constante antiga.

## Correção do carregamento

O `sw.js` passa a carregar, em conjunto, os dois módulos financeiros:

1. `corponu-pagamentos-seguro.js`;
2. `corponu-pagamentos-manual.js`.

Também remove da página controlada pelo PWA o resgate antigo que apagava caches e desregistrava o Service Worker. Os arquivos principais recebem a versão atual na URL para impedir que o navegador use JavaScript ou CSS antigo.

## Regra de versionamento

Em cada nova entrega:

1. Criar uma branch de backup da versão publicada.
2. Criar uma branch `fix/` ou `feature/` para trabalhar.
3. Alterar `LOCAL_RELEASE` em `corponu-atualizador.js`.
4. Alterar `APP_VERSION` em `sw.js`.
5. Alterar `version` e `updatedAt` em `corponu-release.json`.
6. Validar a sintaxe dos arquivos JavaScript.
7. Comparar a branch com a `main`.
8. Abrir Pull Request e publicar somente depois da conferência.
9. Não alterar `version.json` enquanto o atualizador legado do `update.js` não for removido de forma controlada.

## Recuperação de código

Se uma atualização causar problema:

- não continuar fazendo correções diretamente na versão defeituosa;
- comparar o commit problemático com a última versão estável;
- restaurar os arquivos pela branch de backup ou por um commit de reversão;
- publicar a recuperação com uma nova identificação de versão para que os computadores recarreguem automaticamente;
- corrigir o recurso defeituoso em outra branch antes de tentar publicar novamente.

## Atenção aos dados do Firebase

Restaurar o código não desfaz automaticamente operações que já tenham gravado, alterado ou excluído dados no Firestore. Para mudanças financeiras, importações ou alterações estruturais:

- criar backup/exportação antes da publicação;
- preservar `logsAlteracoes` e a auditoria;
- testar com uma OP de teste;
- preparar uma rotina corretiva caso algum dado precise ser reparado.

## Lançamento manual e entrega parcial

Exemplo: OP com 50 peças e chegada de 40.

- O pagamento é criado somente para 40 peças.
- A movimentação principal registra `quantidadeRecebida = 40` e `falta = 10`.
- Um documento restante registra as 10 peças pendentes.
- Uma chegada complementar gera pagamento apenas sobre a nova quantidade recebida.
- Se a chegada complementar também for parcial, o saldo continua pendente.

## Instrução para uma nova conversa

> Continue o desenvolvimento do CorpoNu pelo repositório `99eliel/corponu1`. Leia primeiro `CONTINUIDADE-CORPONU.md`, confira `corponu-release.json`, identifique a última branch de backup e nunca altere a `main` antes de criar um ponto de recuperação.
