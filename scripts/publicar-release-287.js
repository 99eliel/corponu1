const fs = require('fs');

const OLD = '2026-09-04-faccoes-controlador-unificado-285';
const NEW = '2026-09-09-pagamento-regularizado-release-287';
const TARGETS_TEXT = ['index.html', 'corponu-atualizador.js', 'update.js'];
const TARGETS_JSON = ['corponu-release.json', 'version.json'];

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }

for (const path of TARGETS_TEXT) {
  const original = read(path);
  const count = original.split(OLD).length - 1;
  if (count < 1) throw new Error(`${path}: release antiga não encontrada`);
  const updated = original.split(OLD).join(NEW);
  if (updated.includes('servicePaymentHold') || updated.includes('data-service-hold="payment"')) {
    throw new Error(`${path}: bloqueio financeiro não deveria existir no estado normal`);
  }
  write(path, updated);
}

const notes = 'Produção normal após regularização do pagamento. Release 287 criada exclusivamente para restabelecer uma sequência de versão crescente e forçar atualização limpa dos arquivos do Corpo Nu Flow após o bloqueio 286. O código funcional consolidado da versão 285 foi preservado; nenhuma regra, documento ou dado do Firebase foi alterado.';
for (const path of TARGETS_JSON) {
  const obj = JSON.parse(read(path));
  if (obj.version !== OLD) throw new Error(`${path}: versão atual inesperada: ${obj.version}`);
  obj.version = NEW;
  obj.updatedAt = new Date().toISOString();
  obj.notes = notes;
  write(path, JSON.stringify(obj, null, 2) + '\n');
}

for (const path of [...TARGETS_TEXT, ...TARGETS_JSON]) {
  const source = read(path);
  if (!source.includes(NEW)) throw new Error(`${path}: nova release ausente`);
  if (source.includes(OLD)) throw new Error(`${path}: release 285 ainda presente`);
}

const html = read('index.html');
for (const token of ['style.css?v=' + NEW, 'update.js?v=' + NEW, 'app.js?v=' + NEW, 'corponu-atualizador.js?v=' + NEW]) {
  if (!html.includes(token)) throw new Error(`index.html sem cache-bust esperado: ${token}`);
}

console.log(`Release publicada: ${NEW}`);
