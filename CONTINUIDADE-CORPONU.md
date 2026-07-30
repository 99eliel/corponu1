# Continuidade do Sistema CorpoNu

## Versão atual

`2026-07-30-modo-manutencao-rapida-5`

## Repositório oficial

`99eliel/corponu1`

## Publicação e recuperação

- As atualizações validadas podem ser publicadas automaticamente na `main`.
- Antes de cada sessão relevante, criar uma branch de backup da versão publicada.
- Backup anterior à organização do PWA: `backup/main-antes-organizacao-20260730`.
- Backup da versão que apresentou loop, preservado apenas para diagnóstico: `backup/main-com-loop-20260730`.
- Backup anterior à separação do Rastreamento: `backup/main-antes-rastreamento-interno-20260730`.
- Backup anterior ao modo rápido: `backup/main-antes-modo-rapido-20260730`.

## Modo de manutenção rápida

Para mini mudanças de interface ou comportamento localizado, alterar normalmente somente:

1. `corponu-ajustes-rapidos.js`;
2. `corponu-release.json`.

Não modificar `sw.js`, `corponu-atualizador.js`, `app.js` ou a documentação a cada mini ajuste.

O módulo `corponu-ajustes-rapidos.js` fornece a API global `window.CorpoNuAjustesRapidos`. Todo ajuste deve ser idempotente, sem duplicar eventos ou elementos quando reaplicado.

O procedimento completo está em `MODO-RAPIDO-CORPONU.md`.

## Atualização automática

- `corponu-atualizador.js` é o único controlador de verificação de novas versões.
- O sistema reutiliza o mesmo registro do Service Worker e não registra `sw.js` com URLs concorrentes.
- `corponu-release.json` é a fonte oficial das releases.
- A verificação ocorre a cada 30 segundos, ao voltar para a aba, ao recuperar foco e ao voltar a ficar online.
- Quando a release muda, a página recarrega uma única vez, mesmo que o Service Worker não tenha sido alterado.
- O arquivo `corponu-ajustes-rapidos.js` usa estratégia de rede primeiro para receber o código novo após a recarga.
- `version.json` permanece temporariamente na identificação legada enquanto `update.js` ainda possui a constante antiga.

## Validação automática

O workflow `.github/workflows/validar-corponu.yml` verifica:

- sintaxe de todos os JavaScript da raiz;
- validade de todos os JSON da raiz;
- presença de uma versão em `corponu-release.json`.

Uma alteração não deve ser publicada quando essa validação falhar.

## Estrutura financeira mantida

- `corponu-pagamentos-seguro.js`: filtro agrupado por processo, relatórios completo e simplificado, confirmação reforçada, Central de Pendências de Valor e exclusão segura.
- `corponu-pagamentos-manual.js`: lançamento manual em Pagamentos, valor total opcional, chegada parcial e controle dos restantes.
- Uma OP com 50 peças e chegada de 40 gera pagamento somente de 40 e registra 10 como restantes pendentes.

## Separação entre Rastreamento e Facções

O Rastreamento é destinado à movimentação interna. Envio, chegada, pagamento e finalização de facção ficam exclusivamente na aba Facções.

### Rastreamento

- pode mover/corrigir a OP entre locais internos;
- não mostra `EM_FACCAO` no ajuste manual;
- não mostra botão de chegada;
- permite bipar movimentações internas sem exigir data de chegada;
- registra usuário, data e auditoria do bipado interno.

### Facções

- mantém o fluxo próprio de envio e chegada;
- chegada parcial continua gerando pagamento apenas do recebido e saldo restante;
- movimentações aparecem no Rastreamento apenas para consulta e exibem `Gerenciar em Facções`.

## Regra para mini mudanças

1. usar uma branch de manutenção do dia;
2. agrupar as mini mudanças solicitadas na sessão;
3. alterar `corponu-ajustes-rapidos.js`;
4. atualizar somente `corponu-release.json` no fechamento do lote;
5. aguardar a validação automática;
6. publicar e reler a `main`.

## Regra para mudanças grandes

Alterações financeiras estruturais, regras do Firebase, autenticação, migrações, exclusões em massa e mudanças no Service Worker continuam exigindo:

1. backup exclusivo;
2. branch exclusiva;
3. testes específicos;
4. nova versão do Service Worker quando realmente necessário;
5. plano de reversão.

## Recuperação de código

Se uma atualização causar problema:

- interromper novas funcionalidades;
- comparar o commit problemático com a última versão estável;
- restaurar os arquivos pela branch de backup ou por commit de reversão;
- publicar a recuperação com uma nova release;
- corrigir novamente em outra branch.

## Atenção aos dados do Firebase

Restaurar o código não desfaz automaticamente operações gravadas no Firestore. Para pagamentos, importações ou alterações estruturais:

- criar backup/exportação antes da publicação;
- preservar `logsAlteracoes` e a auditoria;
- testar com uma OP que não esteja em pagamento real;
- preparar rotina corretiva quando algum dado precisar ser reparado.

## Instrução para uma nova conversa

> Continue o desenvolvimento do CorpoNu pelo repositório `99eliel/corponu1`. Leia `CONTINUIDADE-CORPONU.md` e `MODO-RAPIDO-CORPONU.md`, confira `corponu-release.json`, identifique a última branch de backup e use `corponu-ajustes-rapidos.js` para mini mudanças.
