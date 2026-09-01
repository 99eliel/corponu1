const fs = require('fs');

const TARGET = 'corponu-faccoes-lateral-alca-v2-270.js';
const OLD_VERSION = '2026-09-01-lateral-alca-processo-sem-valor-277';
const NEW_VERSION = '2026-09-01-lateral-alca-calcinha-com-alca-278';

function fail(msg) {
  throw new Error(msg);
}

function replaceOnce(text, oldValue, newValue, label) {
  const first = text.indexOf(oldValue);
  if (first < 0) fail(`Bloco não encontrado: ${label}`);
  if (text.indexOf(oldValue, first + oldValue.length) >= 0) fail(`Bloco duplicado inesperadamente: ${label}`);
  return text.slice(0, first) + newValue + text.slice(first + oldValue.length);
}

let src = fs.readFileSync(TARGET, 'utf8');
if (!src.includes(OLD_VERSION)) fail('Versão 277 não encontrada no módulo alvo.');
if (src.includes('function opPossuiAlca(op)')) fail('Helper opPossuiAlca já existe; migração abortada.');

src = src.replaceAll(OLD_VERSION, NEW_VERSION);

const quantityMarker = '  function quantidadeDaOP(op) {';
const helper = [
  '  function opPossuiAlca(op) {',
  '    const valor = op?.possuiAlca ?? op?.produtoPossuiAlca ?? op?.alca;',
  '    if (typeof valor === "boolean") return valor;',
  '    if (typeof valor === "number") return valor === 1;',
  '    return ["SIM", "S", "TRUE", "1", "YES"].includes(norm(valor));',
  '  }',
  '',
  quantityMarker
].join('\n');
src = replaceOnce(src, quantityMarker, helper, 'helper de alça antes da quantidade da OP');

const oldRestriction = '      if (tipoDaOP(op) !== "sutia") return toast("Lateral e Alça atende somente OP de Sutiã.", "error");';
const newRestriction = [
  '      const tipo = tipoDaOP(op);',
  '      if (tipo === "calcinha" && !opPossuiAlca(op)) {',
  '        return toast("Essa OP de Calcinha não possui alça cadastrada.", "error");',
  '      }'
].join('\n');
src = replaceOnce(src, oldRestriction, newRestriction, 'trava exclusiva de Sutiã');

const renderRegex = /  function renderProcessosSaida\(\) \{[\s\S]*?\n  \}\n\n  function injetarEstilo\(\) \{/;
const renderMatches = src.match(new RegExp(renderRegex.source, 'g')) || [];
if (renderMatches.length !== 1) fail(`Quantidade inesperada do bloco renderProcessosSaida: ${renderMatches.length}`);
const renderReplacement = [
  '  function renderProcessosSaida() {',
  '    const select = document.getElementById("la2SaidaProcesso");',
  '    if (!select) return;',
  '    const calcinhaComAlca = Boolean(opSaida) && tipoDaOP(opSaida) === "calcinha" && opPossuiAlca(opSaida);',
  '    const opcoesLateral = calcinhaComAlca ? "" : `',
  '      <optgroup label="Lateral">',
  '        <option value="lateral">LATERAL</option>',
  '      </optgroup>',
  '    `;',
  '    select.innerHTML = `',
  '      <option value="">Selecione</option>',
  '      ${opcoesLateral}',
  '      <optgroup label="Alça">',
  '        <option value="alca">ALÇA</option>',
  '        <option value="cortagem-montagem">CORTAGEM E MONTAGEM</option>',
  '      </optgroup>',
  '    `;',
  '  }',
  '',
  '  function injetarEstilo() {'
].join('\n');
src = src.replace(renderRegex, renderReplacement);

const movementMarker = '        produtoNome: opSaida.produtoNome || opSaida.nomeProduto || "",';
const movementReplacement = [
  movementMarker,
  '        tipoPecaOrigem: tipoDaOP(opSaida),',
  '        possuiAlcaOrigem: opPossuiAlca(opSaida),'
].join('\n');
src = replaceOnce(src, movementMarker, movementReplacement, 'metadados de origem da movimentação');

if (src.includes('atende somente OP de Sutiã')) fail('Trava antiga permaneceu no módulo.');
if (!src.includes('tipo === "calcinha" && !opPossuiAlca(op)')) fail('Validação de Calcinha com alça ausente.');
if (!src.includes('const calcinhaComAlca = Boolean(opSaida)')) fail('Seletor contextual por tipo de peça ausente.');
if (!src.includes('tipoPecaOrigem: tipoDaOP(opSaida)')) fail('Metadado tipoPecaOrigem ausente.');
fs.writeFileSync(TARGET, src);

const notes = 'Produção. A aba Facções > Lateral e Alça passa a aceitar também OPs de Calcinha quando a própria OP estiver marcada com possuiAlca=true. Para Calcinha com alça, o seletor operacional oferece somente ALÇA e CORTAGEM E MONTAGEM; LATERAL continua exclusivo do fluxo de Sutiã. Calcinha sem alça é bloqueada. Novas movimentações registram tipoPecaOrigem e possuiAlcaOrigem para auditoria, sem migrar ou apagar histórico. Valores e pagamentos existentes não foram alterados e nenhuma regra do Firebase mudou.';
for (const file of ['corponu-release.json', 'version.json']) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.version = NEW_VERSION;
  data.updatedAt = '2026-09-01T14:45:00-03:00';
  data.notes = notes;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

for (const file of ['update.js', 'corponu-atualizador.js', 'index.html']) {
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes(OLD_VERSION)) fail(`Versão anterior não encontrada em ${file}`);
  text = text.replaceAll(OLD_VERSION, NEW_VERSION);
  fs.writeFileSync(file, text);
}

console.log('Lateral e Alça 278 aplicada: Calcinha com alça habilitada sem alterar histórico.');
