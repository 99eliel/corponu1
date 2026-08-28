const fs = require('fs');
const path = require('path');

const originalPath = path.resolve('scripts/proteger-chegada-usuario-comum-266.js');
let source = fs.readFileSync(originalPath, 'utf8');

const oldLine = "app = replaceOnce(app, oldRowAction, newRowAction, 'ação de chegada na tabela de Facções');";
const scopedBlock = [
  "const inicioRenderFaccoes = app.indexOf('function renderFaccoesMovimentacoes() {');",
  "const fimRenderFaccoes = app.indexOf('\\nfunction editarFaccao(', inicioRenderFaccoes);",
  "if (inicioRenderFaccoes < 0 || fimRenderFaccoes < 0) throw new Error('Limites de renderFaccoesMovimentacoes não encontrados');",
  "let trechoRenderFaccoes = app.slice(inicioRenderFaccoes, fimRenderFaccoes);",
  "trechoRenderFaccoes = replaceOnce(trechoRenderFaccoes, oldRowAction, newRowAction, 'ação de chegada dentro de renderFaccoesMovimentacoes');",
  "app = app.slice(0, inicioRenderFaccoes) + trechoRenderFaccoes + app.slice(fimRenderFaccoes);"
].join('\n');

if (!source.includes(oldLine)) {
  throw new Error('Linha genérica da primeira migração não encontrada para restringir');
}
if (source.indexOf(oldLine) !== source.lastIndexOf(oldLine)) {
  throw new Error('Linha genérica duplicada no script de migração');
}

source = source.replace(oldLine, scopedBlock);

const tempPath = path.resolve('/tmp/proteger-chegada-usuario-comum-266-exec.js');
fs.writeFileSync(tempPath, source, 'utf8');
require(tempPath);
