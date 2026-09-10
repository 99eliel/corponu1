const fs = require('fs');

const OLD_RELEASE = '2026-09-10-rastreamento-acoes-canonicas-305';
const NEW_RELEASE = '2026-09-10-rastreamento-controlador-unico-306';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }

function replaceExact(source, oldText, newText, expected, label) {
  const count = source.split(oldText).length - 1;
  if (count !== expected) throw new Error(`${label}: esperado ${expected}, encontrado ${count}`);
  return source.split(oldText).join(newText);
}

let app = read('app.js');

const oldControllerStart = `document.addEventListener("click", event => {\n  const botaoAcoesManejo = event.target.closest?.("[data-manejo-acoes-id]");`;
const newControllerStart = `document.addEventListener("click", event => {\n  // Controlador canônico compartilhado: ações de telas renderizadas dinamicamente\n  // são resolvidas por data-attributes, sem depender de onclick inline ou observers.\n  const botaoAjusteRastreamento = event.target.closest?.("[data-rastreamento-ajuste-id]");\n  if (botaoAjusteRastreamento) {\n    event.preventDefault();\n    const ordemId = String(botaoAjusteRastreamento.dataset.rastreamentoAjusteId || "");\n    if (!ordemId) {\n      toast("Não foi possível identificar a OP para corrigir o local.");\n      return;\n    }\n    abrirModalAjusteMigracao(ordemId);\n    return;\n  }\n\n  const botaoAcoesManejo = event.target.closest?.("[data-manejo-acoes-id]");`;
app = replaceExact(app, oldControllerStart, newControllerStart, 1, 'controlador central');

app = replaceExact(
  app,
  `onclick="abrirModalAjusteMigracao('\${op.id}')"`,
  `type="button" data-rastreamento-ajuste-id="\${escapeHtml(op.id)}"`,
  2,
  'ações de ajuste da busca global/histórico'
);

app = replaceExact(
  app,
  `onclick="abrirModalAjusteMigracao('\${ordem.id}')"`,
  `type="button" data-rastreamento-ajuste-id="\${escapeHtml(ordem.id)}"`,
  1,
  'ação de ajuste da listagem de movimentações'
);

if ((app.match(/data-rastreamento-ajuste-id=/g) || []).length !== 4) {
  // três botões + uma ocorrência no seletor do controlador
  throw new Error('Quantidade inesperada de referências ao controlador de ajuste');
}
if (app.includes(`onclick="abrirModalAjusteMigracao('`)) {
  throw new Error('Ainda existe onclick inline para abrir o ajuste de migração');
}
write('app.js', app);

let index = read('index.html');
const legacyEnviarManejo = `  <script src="./corponu-rastreamento-enviar-manejo.js?v=2026-07-30-rastreamento-enviar-manejo-17"></script>\n`;
index = replaceExact(index, legacyEnviarManejo, '', 1, 'módulo legado enviar-manejo');
index = replaceExact(index, OLD_RELEASE, NEW_RELEASE, 6, 'release no index.html');
write('index.html', index);

for (const path of ['corponu-atualizador.js', 'update.js']) {
  let source = read(path);
  source = replaceExact(source, OLD_RELEASE, NEW_RELEASE, 1, `release em ${path}`);
  write(path, source);
}

const notes = 'Produção. Consolida o Rastreamento no controlador canônico do app.js. Mover/corrigir local e Editar local deixam de depender de onclick inline e passam a usar o listener central já existente, preservando o funcionamento após re-renderizações. Remove do carregamento o módulo legado corponu-rastreamento-enviar-manejo.js, cuja injeção, observer e listener em captura duplicavam a função nativa enviarOrdemParaManejoDireto. Nenhum dado do Firebase é alterado.';
for (const path of ['corponu-release.json', 'version.json']) {
  const data = JSON.parse(read(path));
  if (data.version !== OLD_RELEASE) throw new Error(`${path}: versão inesperada ${data.version}`);
  data.version = NEW_RELEASE;
  data.updatedAt = new Date().toISOString();
  data.notes = notes;
  write(path, JSON.stringify(data, null, 2) + '\n');
}

if (read('index.html').includes('corponu-rastreamento-enviar-manejo.js')) {
  throw new Error('Módulo legado ainda está carregado no index');
}
if (!read('app.js').includes('botaoAjusteRastreamento')) {
  throw new Error('Controlador de ajuste não foi criado');
}

console.log(`Rastreamento consolidado: ${NEW_RELEASE}`);
