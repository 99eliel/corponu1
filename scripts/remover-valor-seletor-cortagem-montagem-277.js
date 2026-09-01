const fs = require('fs');

const RELEASE_ANTIGO = '2026-08-31-pagamentos-relatorio-completo-seguro-276';
const RELEASE_NOVO = '2026-09-01-lateral-alca-processo-sem-valor-277';
const MODULO_VERSAO_ANTIGA = '2026-08-31-faccoes-processos-estavel-272';
const MODULO = 'corponu-faccoes-lateral-alca-v2-270.js';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function replaceOnce(text, before, after, label) {
  const first = text.indexOf(before);
  assert(first >= 0, label + ': bloco não encontrado.');
  assert(text.indexOf(before, first + before.length) < 0, label + ': bloco duplicado/ambíguo.');
  return text.slice(0, first) + after + text.slice(first + before.length);
}

let js = read(MODULO);
js = replaceOnce(
  js,
  'const VERSION = "' + MODULO_VERSAO_ANTIGA + '";',
  'const VERSION = "' + RELEASE_NOVO + '";',
  'versão interna da V2'
);
js = replaceOnce(
  js,
  '<option value="cortagem-montagem">CORTAGEM E MONTAGEM — ${dinheiro4(VALOR_FIXO_CORTAGEM_MONTAGEM)}</option>',
  '<option value="cortagem-montagem">CORTAGEM E MONTAGEM</option>',
  'opção Cortagem e montagem do modal de saída'
);

assert(js.includes('valorFixo: VALOR_FIXO_CORTAGEM_MONTAGEM'), 'Regra financeira fixa desapareceu.');
assert(js.includes('valorFixoUnitario: processo.tipoValor === "fixo" ? processo.valorFixo : null'), 'Persistência do valor fixo desapareceu.');
assert(js.includes('origem: "fixo_cortagem_montagem"'), 'Resolução financeira fixa desapareceu.');
assert(!js.includes('CORTAGEM E MONTAGEM — ${dinheiro4(VALOR_FIXO_CORTAGEM_MONTAGEM)}'), 'Preço ainda está exposto no seletor operacional.');
write(MODULO, js);

for (const path of ['index.html', 'update.js', 'corponu-atualizador.js']) {
  let content = read(path);
  const count = content.split(RELEASE_ANTIGO).length - 1;
  assert(count >= 1, path + ': release 276 não encontrado para cache busting.');
  content = content.split(RELEASE_ANTIGO).join(RELEASE_NOVO);
  write(path, content);
}

const notes = 'Produção. Ajuste visual da aba Facções > Lateral e Alça: o seletor operacional de processo passa a exibir apenas CORTAGEM E MONTAGEM, sem mostrar o valor financeiro. O valor fixo de R$ 0,0540 permanece preservado na regra interna, no registro da movimentação e no cálculo do pagamento. A configuração financeira continua pertencendo à aba Processos. Nenhum dado existente e nenhuma regra do Firebase foram alterados.';
for (const path of ['corponu-release.json', 'version.json']) {
  const json = JSON.parse(read(path));
  assert(json.version === RELEASE_ANTIGO, path + ': versão atual inesperada: ' + json.version);
  json.version = RELEASE_NOVO;
  json.updatedAt = '2026-09-01T10:25:00-03:00';
  json.notes = notes;
  write(path, JSON.stringify(json, null, 2) + '\n');
}

console.log('Seletor operacional sem preço; regra financeira preservada: ' + RELEASE_NOVO);
