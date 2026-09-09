const fs = require('fs');

const OLD_RELEASE = '2026-09-09-reconfirmacao-chegada-integrada-303';
const NEW_RELEASE = '2026-09-09-calcinha-faccoes-id-oficial-304';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function replaceOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`${label}: trecho esperado não encontrado`);
  if (source.indexOf(oldText, first + oldText.length) >= 0) throw new Error(`${label}: trecho ambíguo`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

let dual = read('corponu-dual-mode.js');

// Atualiza a versão interna do controlador Sutiã/Calcinha para a release atual.
dual = replaceOnce(
  dual,
  'const VERSION = "2026-09-04-faccoes-controlador-unificado-285";',
  `const VERSION = "${NEW_RELEASE}";`,
  'versão interna do dual-mode'
);

const oldResolver = `  function getMovementFromRow(row) {\n    const id = rowIdByFunction(row, ["registrarChegadaMovimentacao", "biparMovimentacao", "encaminharMovimentacao", "editarMovimentacaoRegistradaUsuario", "excluirMovimentacaoRegistradaUsuario", "abrirModalEditarLocalMovimentacao"]);\n    if (id && state.maps.movimentacoes.has(String(id))) return state.maps.movimentacoes.get(String(id));\n    const op = normalize(row.cells[0]?.textContent);\n    const ref = normalize(row.cells[1]?.textContent);\n    const destination = normalize(row.cells[4]?.textContent || row.cells[3]?.textContent);\n    return [...state.maps.movimentacoes.values()].find(item => normalize(item.numeroOP) === op && normalize(item.referencia) === ref && (!destination || normalize(item.destino) === destination));\n  }`;

const newResolver = `  function getMovementFromRow(row) {\n    if (!row) return null;\n\n    // Desde o controlador unificado de Facções, as ações usam data-movimentacao-id.\n    // Esse é o identificador oficial da linha e deve ter prioridade sobre qualquer leitura visual de colunas.\n    const dataId = String(\n      row.dataset?.movimentacaoId ||\n      row.querySelector?.('[data-movimentacao-id]')?.dataset?.movimentacaoId ||\n      ''\n    ).trim();\n    if (dataId && state.maps.movimentacoes.has(dataId)) {\n      return state.maps.movimentacoes.get(dataId);\n    }\n\n    // Compatibilidade apenas para linhas antigas que ainda possuam chamadas inline.\n    const idLegado = rowIdByFunction(row, [\n      "registrarChegadaMovimentacao",\n      "biparMovimentacao",\n      "encaminharMovimentacao",\n      "editarMovimentacaoRegistradaUsuario",\n      "excluirMovimentacaoRegistradaUsuario",\n      "abrirModalEditarLocalMovimentacao"\n    ]);\n    if (idLegado && state.maps.movimentacoes.has(String(idLegado))) {\n      return state.maps.movimentacoes.get(String(idLegado));\n    }\n\n    // Último recurso para registros realmente antigos sem ID no DOM.\n    // Não assume mais que a coluna 4 é a facção: a tabela atual é OP, REF, COR, FACÇÃO, PROCESSO.\n    const op = normalize(row.cells[0]?.textContent);\n    const ref = normalize(row.cells[1]?.textContent);\n    const candidatos = [...state.maps.movimentacoes.values()].filter(item =>\n      normalize(item.numeroOP) === op && normalize(item.referencia) === ref\n    );\n    if (candidatos.length <= 1) return candidatos[0] || null;\n\n    const colunaFaccao = normalize(row.cells[3]?.textContent);\n    const colunaProcesso = normalize(row.cells[4]?.textContent);\n    return candidatos.find(item =>\n      normalize(item.destino || item.faccao) === colunaFaccao &&\n      normalize(item.processo || item.servicoNome || item.processoMovimentacao) === colunaProcesso\n    ) || candidatos[0] || null;\n  }`;

dual = replaceOnce(dual, oldResolver, newResolver, 'resolução da movimentação da linha de Facções');

if (!dual.includes("row.querySelector?.('[data-movimentacao-id]')?.dataset?.movimentacaoId")) {
  throw new Error('ID oficial data-movimentacao-id não foi integrado');
}
if (dual.includes('const destination = normalize(row.cells[4]?.textContent || row.cells[3]?.textContent);')) {
  throw new Error('fallback antigo que confundia processo com facção ainda existe');
}
write('corponu-dual-mode.js', dual);

// Release crescente e cache-bust do carregador principal.
for (const path of ['index.html', 'corponu-atualizador.js', 'update.js']) {
  let source = read(path);
  const count = source.split(OLD_RELEASE).length - 1;
  if (count < 1) throw new Error(`${path}: release 303 não encontrada`);
  source = source.split(OLD_RELEASE).join(NEW_RELEASE);
  write(path, source);
}

const notes = 'Produção. Corrige a aba Facções > Calcinha após a migração do controlador de ações para data-movimentacao-id. O dual-mode passa a resolver cada linha pelo ID oficial da movimentação e mantém fallback legado sem confundir a coluna Processo com Facção. Contadores e dados existentes são preservados; Firebase, chegada, pagamentos e demais abas não são alterados.';
for (const path of ['corponu-release.json', 'version.json']) {
  const data = JSON.parse(read(path));
  if (data.version !== OLD_RELEASE) throw new Error(`${path}: versão inesperada ${data.version}`);
  data.version = NEW_RELEASE;
  data.updatedAt = new Date().toISOString();
  data.notes = notes;
  write(path, JSON.stringify(data, null, 2) + '\n');
}

for (const path of ['index.html', 'corponu-atualizador.js', 'update.js', 'corponu-release.json', 'version.json']) {
  const source = read(path);
  if (!source.includes(NEW_RELEASE)) throw new Error(`${path}: release 304 ausente`);
  if (source.includes(OLD_RELEASE)) throw new Error(`${path}: release 303 ainda presente`);
}

console.log(`Calcinha Facções corrigida: ${NEW_RELEASE}`);
