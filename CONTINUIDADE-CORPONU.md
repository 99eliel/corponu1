# Continuidade do Sistema CorpoNu

## Versão de recuperação ativa

`2026-07-30-recuperacao-pagamentos-autoupdate-5`

## Motivo da recuperação

As melhorias financeiras foram entregues inicialmente em um arquivo adicional
`corponu-pagamentos-seguro.js`, carregado por injeção do Service Worker. O branch
`main` publicado voltou a apresentar o Service Worker e o manifesto de versão antigos,
e os arquivos adicionais não estavam disponíveis na raiz. Com isso, o módulo deixou
de carregar e as melhorias desapareceram.

## Arquitetura temporária segura

O `sw.js` de recuperação contém internamente o módulo financeiro completo. Quando o
navegador solicita `update.js`, o Service Worker busca o arquivo original no servidor,
anexa o módulo e entrega a resposta combinada. Portanto:

- nenhuma alteração é necessária no `index.html`;
- `update.js` e `app.js` originais permanecem preservados;
- a instalação não falha por ausência de arquivos novos;
- a ativação navega automaticamente as janelas abertas para a versão nova;
- o arquivo legível `corponu-pagamentos-seguro.js` é apenas fonte de manutenção.

## Regra crítica de versão

Enquanto o `update.js` principal continuar declarando
`2026-07-29-restantes-faccoes-complementares-1`, não alterar o `version.json` para uma
versão diferente. O atualizador antigo interpreta a diferença apagando caches,
desregistrando todos os Service Workers e solicitando Ctrl+F5 em uma segunda tentativa.

As próximas atualizações devem trocar a constante `APP_VERSION` do `sw.js` e o módulo
incorporado. Depois será feita uma refatoração controlada do atualizador principal para
unificar `index.html`, `update.js`, `sw.js` e `version.json` sem risco aos computadores.

## Funcionalidades financeiras recuperadas

- filtro agrupado por processo;
- fechamento filtrado com confirmação forte;
- relatório completo com PIX;
- relatório simplificado com Nome, PIX e Valor;
- visualização de todos os lançamentos aguardando valor;
- preenchimento de valor total, valor de Alça e valor unitário;
- Central de Pendências organizada por processo;
- pesquisa e filtros dentro da central;
- exclusão segura do lançamento financeiro permitido;
- recálculo da aba Pagamentos após salvar/excluir.

## Instrução para uma nova conversa

Leia este arquivo e confira o branch `main` do repositório
`https://github.com/99eliel/corponu1`. Antes de gerar uma atualização, confirme a versão
real do `sw.js` publicado. Preserve a recuperação de arquivo único até que o atualizador
principal seja refatorado e testado em uma versão estável separada.
