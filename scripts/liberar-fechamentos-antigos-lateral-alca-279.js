const fs = require('fs');

const TARGET = 'corponu-faccoes-lateral-alca-v2-270.js';
const OLD_VERSION = '2026-09-01-lateral-alca-calcinha-com-alca-278';
const NEW_VERSION = '2026-09-02-lateral-alca-fechamentos-antigos-279';

function fail(message) {
  throw new Error(message);
}

function replaceOnce(text, oldValue, newValue, label) {
  const first = text.indexOf(oldValue);
  if (first < 0) fail(`Bloco não encontrado: ${label}`);
  if (text.indexOf(oldValue, first + oldValue.length) >= 0) {
    fail(`Bloco duplicado inesperadamente: ${label}`);
  }
  return text.slice(0, first) + newValue + text.slice(first + oldValue.length);
}

let src = fs.readFileSync(TARGET, 'utf8');
if (!src.includes(OLD_VERSION)) fail('Versão 278 não encontrada no módulo alvo.');

src = src.replaceAll(OLD_VERSION, NEW_VERSION);

const oldBlock = [
  '      const tipo = tipoDaOP(op);',
  '      if (tipo === "calcinha" && !opPossuiAlca(op)) {',
  '        return toast("Essa OP de Calcinha não possui alça cadastrada.", "error");',
  '      }',
  '      opSaida = op;'
].join('\n');
const newBlock = [
  '      const tipo = tipoDaOP(op);',
  '      opSaida = op;'
].join('\n');
src = replaceOnce(src, oldBlock, newBlock, 'trava de possuiAlca na busca da OP');

const oldRender = [
  '    const calcinhaComAlca = Boolean(opSaida) && tipoDaOP(opSaida) === "calcinha" && opPossuiAlca(opSaida);',
  '    const opcoesLateral = calcinhaComAlca ? "" : `'
].join('\n');
const newRender = [
  '    const calcinha = Boolean(opSaida) && tipoDaOP(opSaida) === "calcinha";',
  '    const opcoesLateral = calcinha ? "" : `'
].join('\n');
src = replaceOnce(src, oldRender, newRender, 'seletor contextual de processo para Calcinha');

if (src.includes('Essa OP de Calcinha não possui alça cadastrada.')) {
  fail('A trava por possuiAlca permaneceu no módulo.');
}
if (!src.includes('const calcinha = Boolean(opSaida) && tipoDaOP(opSaida) === "calcinha";')) {
  fail('Seletor contextual por tipo de peça não foi aplicado.');
}
if (!src.includes('possuiAlcaOrigem: opPossuiAlca(opSaida)')) {
  fail('Metadado de auditoria possuiAlcaOrigem foi perdido.');
}
fs.writeFileSync(TARGET, src);

const notes = 'Produção. Facções > Lateral e Alça passa a permitir lançamentos de OPs de Calcinha mesmo quando a referência atual não estiver marcada com possuiAlca, atendendo fechamentos antigos. Para qualquer Calcinha, o seletor continua oferecendo somente ALÇA e CORTAGEM E MONTAGEM; LATERAL permanece exclusivo do fluxo de Sutiã. O campo possuiAlcaOrigem continua sendo gravado apenas para auditoria e não bloqueia mais a operação. Nenhuma OP, referência, movimentação histórica, pagamento ou regra do Firebase foi alterada.';
for (const file of ['corponu-release.json', 'version.json']) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.version = NEW_VERSION;
  data.updatedAt = '2026-09-02T07:39:00-03:00';
  data.notes = notes;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

for (const file of ['update.js', 'corponu-atualizador.js', 'index.html']) {
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes(OLD_VERSION)) fail(`Versão 278 não encontrada em ${file}`);
  text = text.replaceAll(OLD_VERSION, NEW_VERSION);
  fs.writeFileSync(file, text);
}

console.log('Versão 279 aplicada: possuiAlca deixou de bloquear fechamentos antigos.');
