const fs = require('fs');
const path = require('path');

const originalPath = path.resolve('scripts/proteger-chegada-usuario-comum-266.js');
let source = fs.readFileSync(originalPath, 'utf8');

const oldBlock = `const oldRowAction = \`        \\${mov.status !== "finalizado" && mov.status !== "encaminhado" ? \\`<button class="btn btn-sm btn-success" onclick="registrarChegadaMovimentacao('\\${mov.id}')">Chegada</button>\\` : ""}\`;\nconst newRowAction = \`        \\${htmlAcaoChegadaFaccoes(mov)}\`;\napp = replaceOnce(app, oldRowAction, newRowAction, 'ação de chegada na tabela de Facções');`;

const newBlock = `const oldRowAction = \`        \\${mov.status !== "finalizado" && mov.status !== "encaminhado" ? \\`<button class="btn btn-sm btn-success" onclick="registrarChegadaMovimentacao('\\${mov.id}')">Chegada</button>\\` : ""}\`;\nconst newRowAction = \`        \\${htmlAcaoChegadaFaccoes(mov)}\`;\nconst inicioRenderFaccoes = app.indexOf('function renderFaccoesMovimentacoes() {');\nconst fimRenderFaccoes = app.indexOf('\\nfunction editarFaccao(', inicioRenderFaccoes);\nif (inicioRenderFaccoes < 0 || fimRenderFaccoes < 0) throw new Error('Limites de renderFaccoesMovimentacoes não encontrados');\nlet trechoRenderFaccoes = app.slice(inicioRenderFaccoes, fimRenderFaccoes);\ntrechoRenderFaccoes = replaceOnce(trechoRenderFaccoes, oldRowAction, newRowAction, 'ação de chegada dentro de renderFaccoesMovimentacoes');\napp = app.slice(0, inicioRenderFaccoes) + trechoRenderFaccoes + app.slice(fimRenderFaccoes);`;

if (!source.includes(oldBlock)) {
  throw new Error('Bloco genérico da primeira migração não encontrado para restringir');
}
source = source.replace(oldBlock, newBlock);

const tempPath = path.resolve('/tmp/proteger-chegada-usuario-comum-266-exec.js');
fs.writeFileSync(tempPath, source, 'utf8');
require(tempPath);
