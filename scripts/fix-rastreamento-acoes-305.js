const fs = require('fs');

const OLD_RELEASE = '2026-09-09-calcinha-faccoes-id-oficial-304';
const NEW_RELEASE = '2026-09-10-rastreamento-acoes-canonicas-305';
const LEGACY_SCRIPT = '<script src="./corponu-rastreamento-interno.js?v=2026-07-30-rastreamento-enviar-manejo-17"></script>\n';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }

// A causa raiz é um módulo legado que sobrescreve as ações nativas do Rastreamento,
// remove Bipar de linhas de facção e restringe Editar local. O app.js atual já possui
// as ações canônicas; portanto a correção estrutural é simplesmente não executar o legado.
let index = read('index.html');
const occurrences = index.split(LEGACY_SCRIPT).length - 1;
if (occurrences !== 1) {
  throw new Error(`index.html: esperado exatamente 1 carregamento do módulo legado; encontrado ${occurrences}`);
}
index = index.replace(LEGACY_SCRIPT, '');
if (index.includes('corponu-rastreamento-interno.js')) {
  throw new Error('index.html: módulo legado ainda está sendo carregado');
}
index = index.split(OLD_RELEASE).join(NEW_RELEASE);
write('index.html', index);

// Confirma que a implementação canônica já existe no core antes de aposentar o legado.
const app = read('app.js');
for (const required of [
  'async function biparOrdemDireto(opId)',
  'onclick="biparOrdemDireto(\'${op.id}\')"',
  'onclick="abrirModalAjusteMigracao(\'${op.id}\')"',
  'window.biparOrdemDireto = biparOrdemDireto;',
  'window.abrirModalAjusteMigracao = abrirModalAjusteMigracao;'
]) {
  if (!app.includes(required)) throw new Error(`app.js: ação canônica ausente: ${required}`);
}

for (const path of ['corponu-atualizador.js', 'update.js']) {
  let source = read(path);
  const count = source.split(OLD_RELEASE).length - 1;
  if (count < 1) throw new Error(`${path}: release 304 não encontrada`);
  source = source.split(OLD_RELEASE).join(NEW_RELEASE);
  write(path, source);
}

const notes = 'Produção. Remove do carregamento o módulo legado corponu-rastreamento-interno.js, que sobrescrevia as ações atuais, removia Bipar de movimentações de facção e restringia Editar local. O Rastreamento passa a usar exclusivamente as ações canônicas já existentes no app.js. Nenhum dado do Firebase é alterado.';
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
  if (!source.includes(NEW_RELEASE)) throw new Error(`${path}: release 305 ausente`);
  if (source.includes(OLD_RELEASE)) throw new Error(`${path}: release 304 ainda presente`);
}

console.log(`Rastreamento corrigido estruturalmente: ${NEW_RELEASE}`);
