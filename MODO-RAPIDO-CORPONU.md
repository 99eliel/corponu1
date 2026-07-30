# Modo de Manutenção Rápida — CorpoNu

## Objetivo

Permitir várias mini mudanças no mesmo dia sem editar `app.js`, `sw.js` ou o atualizador a cada ajuste.

## Arquivos usados nas mini mudanças

1. `corponu-ajustes-rapidos.js` — recebe as alterações pequenas de interface e comportamento.
2. `corponu-release.json` — recebe uma nova identificação para os computadores recarregarem automaticamente.

## Fluxo diário

1. Criar uma única branch de backup da `main` no início da sessão.
2. Criar uma única branch de manutenção do dia.
3. Registrar todas as mini mudanças em `corponu-ajustes-rapidos.js`.
4. Alterar a versão em `corponu-release.json` ao finalizar o lote.
5. Abrir Pull Request.
6. Aguardar a validação automática de JavaScript e JSON.
7. Publicar na `main`.
8. Confirmar a versão publicada relendo `corponu-release.json`.

## Regra dos ajustes

Cada ajuste deve ser idempotente: executá-lo várias vezes não pode duplicar botões, eventos, avisos ou registros.

Exemplo de estrutura:

```javascript
const api = window.CorpoNuAjustesRapidos;

api.registrar("exemplo", () => {
  const elemento = document.querySelector("#meuElemento");
  if (!elemento) return;
  elemento.textContent = "Novo texto";
}, { observarDom: true });
```

## Quando NÃO usar o modo rápido

Não usar para:

- mudanças nas regras do Firestore;
- migração ou exclusão em massa de dados;
- cálculos financeiros novos;
- alteração estrutural do fluxo de pagamentos;
- mudança no Service Worker;
- autenticação e permissões críticas;
- refatoração grande do `app.js`.

Esses casos continuam exigindo branch exclusiva, backup próprio e testes específicos.

## Atualização automática

O `corponu-atualizador.js` consulta `corponu-release.json` a cada 30 segundos, ao voltar para a aba, ao recuperar foco e ao voltar a ficar online.

Para uma mini mudança, não é necessário mudar a versão interna do Service Worker. O sistema salva a nova release e recarrega a página uma única vez. O arquivo `corponu-ajustes-rapidos.js` é servido com estratégia de rede primeiro, recebendo o código atualizado mesmo que sua URL permaneça igual.

## Recuperação

Antes desta implantação foi criada a branch:

`backup/main-antes-modo-rapido-20260730`

Se o modo rápido apresentar problema, restaure a versão por essa branch e publique uma nova release de recuperação.
