# Continuidade do Sistema CorpoNu

## Versão atual

`2026-07-30-rastreamento-interno-sem-faccao-4`

## Repositório oficial

`99eliel/corponu1`

## Publicação e recuperação

- As atualizações validadas podem ser publicadas automaticamente na `main`.
- Antes de cada mudança relevante, deve ser criada uma branch de backup da versão publicada.
- Backup anterior à organização do PWA: `backup/main-antes-organizacao-20260730`.
- Backup da versão que apresentou loop, preservado apenas para diagnóstico: `backup/main-com-loop-20260730`.
- Backup anterior à separação do Rastreamento: `backup/main-antes-rastreamento-interno-20260730`.
- A `main` não deve receber alterações grandes sem um ponto de recuperação criado antes.

## Atualização automática

- `corponu-atualizador.js` é o único controlador de verificação de novas versões.
- O sistema reutiliza o mesmo registro do Service Worker e não registra `sw.js` com URLs concorrentes.
- `corponu-release.json` é a fonte oficial da versão nova.
- `sw.js`, `corponu-atualizador.js` e `corponu-release.json` devem usar a mesma identificação.
- A recarga é protegida para acontecer apenas uma vez por versão.
- `version.json` permanece temporariamente na identificação legada enquanto `update.js` ainda possui a constante antiga.

## Estrutura financeira mantida

- `corponu-pagamentos-seguro.js`: filtro agrupado por processo, relatórios completo e simplificado, confirmação reforçada, Central de Pendências de Valor e exclusão segura.
- `corponu-pagamentos-manual.js`: lançamento manual em Pagamentos, valor total opcional, chegada parcial e controle dos restantes.
- Uma OP com 50 peças e chegada de 40 gera pagamento somente de 40 e registra 10 como restantes pendentes.

## Separação entre Rastreamento e Facções

O Rastreamento é destinado à movimentação interna das peças. As operações externas de facção ficam exclusivamente na aba Facções.

### Rastreamento

- pode mover/corrigir a OP entre locais internos;
- não mostra a opção `EM_FACCAO` no ajuste manual;
- não mostra botão de chegada;
- permite bipar movimentações internas sem exigir data de chegada;
- registra usuário, data e auditoria do bipado interno.

### Facções

- envio para facção continua pelo fluxo próprio existente;
- chegada de facção é registrada somente na aba Facções;
- chegada parcial continua gerando pagamento apenas do recebido e saldo restante;
- movimentações de facção aparecem no Rastreamento apenas para consulta histórica;
- no Rastreamento, linhas de facção exibem `Gerenciar em Facções` e não oferecem Chegada nem Bipar.

### Arquivo responsável

- `corponu-rastreamento-interno.js`: aplica a separação operacional sem alterar o grande `app.js`.

## Regra de versionamento

Em cada nova entrega:

1. criar uma branch de backup da versão publicada;
2. criar uma branch `fix/` ou `feature/`;
3. alterar `LOCAL_RELEASE` em `corponu-atualizador.js`;
4. alterar `APP_VERSION` em `sw.js`;
5. alterar `version` e `updatedAt` em `corponu-release.json`;
6. incluir novos módulos no pré-cache, na injeção do HTML e no `networkFirst` do `sw.js`;
7. validar a sintaxe dos arquivos JavaScript;
8. comparar a branch com a `main`;
9. publicar e reler os arquivos da `main` para confirmar a gravação;
10. não alterar `version.json` até remover o atualizador legado de forma controlada.

## Recuperação de código

Se uma atualização causar problema:

- interromper novas funcionalidades;
- comparar o commit problemático com a última versão estável;
- restaurar os arquivos pela branch de backup ou por commit de reversão;
- publicar a recuperação com uma nova identificação para os computadores atualizarem;
- corrigir o recurso defeituoso em outra branch antes de tentar publicar novamente.

## Atenção aos dados do Firebase

Restaurar o código não desfaz automaticamente operações já gravadas no Firestore. Para pagamentos, importações ou alterações estruturais:

- criar backup/exportação antes da publicação;
- preservar `logsAlteracoes` e a auditoria;
- testar com uma OP que não esteja em pagamento real;
- preparar rotina corretiva quando algum dado precisar ser reparado.

## Instrução para uma nova conversa

> Continue o desenvolvimento do CorpoNu pelo repositório `99eliel/corponu1`. Leia primeiro `CONTINUIDADE-CORPONU.md`, confira `corponu-release.json`, identifique a última branch de backup e nunca altere a `main` antes de criar um ponto de recuperação.
