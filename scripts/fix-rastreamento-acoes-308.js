const fs = require('fs');

const OLD_RELEASE = '2026-09-10-rastreamento-acoes-historico-307';
const NEW_RELEASE = '2026-09-10-rastreamento-acoes-controlador-308';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function replaceExact(source, oldText, newText, expected, label) {
  const count = source.split(oldText).length - 1;
  if (count !== expected) throw new Error(`${label}: esperado ${expected}, encontrado ${count}`);
  return source.split(oldText).join(newText);
}

let app = read('app.js');

const oldController = `document.addEventListener("click", event => {\n  // Controlador canônico compartilhado: ações de telas renderizadas dinamicamente\n  // são resolvidas por data-attributes, sem depender de onclick inline ou observers.\n  const botaoAjusteRastreamento = event.target.closest?.("[data-rastreamento-ajuste-id]");`;

const newController = `document.addEventListener("click", event => {\n  // Controlador canônico compartilhado: ações de telas renderizadas dinamicamente\n  // são resolvidas por data-attributes, sem depender de onclick inline ou observers.\n  const botaoBiparRastreamento = event.target.closest?.("[data-bipar-op-direto]");\n  if (botaoBiparRastreamento) {\n    event.preventDefault();\n    const ordemId = String(botaoBiparRastreamento.dataset.biparOpDireto || "");\n    if (!ordemId) {\n      toast("Não foi possível identificar a OP para bipar.");\n      return;\n    }\n    biparOrdemDireto(ordemId);\n    return;\n  }\n\n  const botaoEnviarManejoRastreamento = event.target.closest?.("[data-enviar-manejo-direto]");\n  if (botaoEnviarManejoRastreamento) {\n    event.preventDefault();\n    const ordemId = String(botaoEnviarManejoRastreamento.dataset.enviarManejoDireto || "");\n    if (!ordemId) {\n      toast("Não foi possível identificar a OP para enviar ao manejo.");\n      return;\n    }\n    enviarOrdemParaManejoDireto(ordemId);\n    return;\n  }\n\n  const botaoAbrirManejoRastreamento = event.target.closest?.("[data-abrir-manejo-op]");\n  if (botaoAbrirManejoRastreamento) {\n    event.preventDefault();\n    const numeroOP = String(botaoAbrirManejoRastreamento.dataset.abrirManejoOp || "");\n    if (!numeroOP) {\n      toast("Não foi possível identificar a OP para abrir no manejo.");\n      return;\n    }\n    filtrarManejosPorOP(numeroOP);\n    return;\n  }\n\n  const botaoAjusteRastreamento = event.target.closest?.("[data-rastreamento-ajuste-id]");`;
app = replaceExact(app, oldController, newController, 1, 'controlador canônico');

app = replaceExact(
  app,
  `data-bipar-op-direto="\${escapeHtml(op.id)}" onclick="biparOrdemDireto('\${op.id}')"`,
  `data-bipar-op-direto="\${escapeHtml(op.id)}"`,
  2,
  'botões Bipar'
);

app = replaceExact(
  app,
  `data-enviar-manejo-direto="\${escapeHtml(op.id)}" onclick="enviarOrdemParaManejoDireto('\${op.id}')"`,
  `data-enviar-manejo-direto="\${escapeHtml(op.id)}"`,
  2,
  'botões Enviar para manejo'
);

app = replaceExact(
  app,
  `onclick="filtrarManejosPorOP('\${escapeHtml(op.numeroOP || op.id)}')"`,
  `data-abrir-manejo-op="\${escapeHtml(op.numeroOP || op.id)}"`,
  3,
  'botões Abrir manejo do Rastreamento'
);

if (app.includes(`data-bipar-op-direto="\${escapeHtml(op.id)}" onclick=`)) throw new Error('Bipar ainda depende de onclick inline');
if (app.includes(`data-enviar-manejo-direto="\${escapeHtml(op.id)}" onclick=`)) throw new Error('Enviar para manejo ainda depende de onclick inline');
if (!app.includes('const botaoBiparRastreamento =')) throw new Error('Controlador Bipar não foi criado');
if (!app.includes('const botaoEnviarManejoRastreamento =')) throw new Error('Controlador Enviar para manejo não foi criado');
if (!app.includes('const botaoAbrirManejoRastreamento =')) throw new Error('Controlador Abrir manejo não foi criado');
write('app.js', app);

for (const path of ['index.html', 'corponu-atualizador.js', 'update.js']) {
  let source = read(path);
  if (!source.includes(OLD_RELEASE)) throw new Error(`${path}: release antiga não encontrada`);
  source = source.split(OLD_RELEASE).join(NEW_RELEASE);
  write(path, source);
}

const notes = 'Produção. Consolida as ações operacionais do Rastreamento no controlador canônico do app.js. Bipar, Enviar para manejo, Abrir manejo e Mover/corrigir local passam a usar data-attributes e o mesmo listener central, eliminando dependência de onclick inline em conteúdo re-renderizado. Mantém os módulos legados desativados e não altera dados do Firebase.';
for (const path of ['corponu-release.json', 'version.json']) {
  const data = JSON.parse(read(path));
  if (data.version !== OLD_RELEASE) throw new Error(`${path}: versão inesperada ${data.version}`);
  data.version = NEW_RELEASE;
  data.updatedAt = new Date().toISOString();
  data.notes = notes;
  write(path, JSON.stringify(data, null, 2) + '\n');
}

console.log(`Ações do Rastreamento consolidadas: ${NEW_RELEASE}`);
