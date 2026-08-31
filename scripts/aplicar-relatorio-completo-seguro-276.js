const fs = require('fs');

const OLD = '2026-08-31-pagamentos-pix-destinoid-275';
const RELEASE = '2026-08-31-pagamentos-relatorio-completo-seguro-276';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function replaceOnce(text, before, after, label) {
  const first = text.indexOf(before);
  assert(first >= 0, label + ': bloco não encontrado.');
  assert(text.indexOf(before, first + before.length) < 0, label + ': bloco duplicado/ambíguo.');
  return text.slice(0, first) + after + text.slice(first + before.length);
}

let js = read('corponu-pagamentos-seguro.js');
const oldVersionCount = js.split(OLD).length - 1;
assert(oldVersionCount >= 2, 'Versão 275 não encontrada como esperado no módulo de pagamentos.');
js = js.split(OLD).join(RELEASE);

const oldInterceptor = `  function interceptarRelatorioCompletoAgrupado(event) {
    const botao = event.target?.closest?.("#btnImprimirPagamento");
    if (!botao || !obterFiltros().processo) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    gerarRelatorioCompletoDoProcesso();
  }`;

const newInterceptor = `  function interceptarRelatorioCompletoSeguro(event) {
    const botao = event.target?.closest?.("#btnImprimirPagamento");
    if (!botao) return;

    // O relatório completo deve ter uma única origem de dados, inclusive quando
    // o filtro Processo estiver em "Todos". Assim o clique nunca cai no relatório
    // legado do app.js, que não possui a resolução financeira por destinoId.
    event.preventDefault();
    event.stopImmediatePropagation();
    gerarRelatorioCompletoDoProcesso();
  }`;

js = replaceOnce(js, oldInterceptor, newInterceptor, 'interceptor do relatório completo');
js = replaceOnce(
  js,
  'window.addEventListener("click", interceptarRelatorioCompletoAgrupado, true);',
  'window.addEventListener("click", interceptarRelatorioCompletoSeguro, true);',
  'listener do relatório completo'
);

assert(!js.includes('interceptarRelatorioCompletoAgrupado'), 'Nome antigo do interceptor ainda existe.');
assert(js.includes('if (!botao) return;'), 'Interceptor universal do relatório completo não foi instalado.');
assert(js.includes('resolverIdentidadesFaccaoPagamentos(pagamentos, dados)'), 'Resolução por identidade da facção desapareceu.');
assert(js.includes('movimento?.destinoId'), 'Resolução por destinoId desapareceu.');
write('corponu-pagamentos-seguro.js', js);

for (const path of ['index.html', 'update.js', 'corponu-atualizador.js']) {
  let content = read(path);
  const count = content.split(OLD).length - 1;
  assert(count >= 1, path + ': versão 275 não encontrada.');
  content = content.split(OLD).join(RELEASE);
  write(path, content);
}

const notes = 'Produção. Corrige o Relatório completo com PIX quando o filtro Processo está em Todos. O botão agora usa sempre o gerador financeiro seguro da versão 275, sem deixar o clique cair no relatório legado do app.js. Relatório completo e simplificado passam a compartilhar a mesma resolução de identidade da facção: ID gravado no pagamento, ou movimentacaoId -> destinoId -> cadastro exato; nome exato fica apenas como fallback histórico. Nenhum pagamento e nenhuma regra do Firebase foram alterados.';
for (const path of ['corponu-release.json', 'version.json']) {
  const json = JSON.parse(read(path));
  assert(json.version === OLD, path + ': versão atual inesperada: ' + json.version);
  json.version = RELEASE;
  json.updatedAt = '2026-08-31T16:15:00-03:00';
  json.notes = notes;
  write(path, JSON.stringify(json, null, 2) + '\n');
}

console.log('Relatório completo unificado com o gerador seguro: ' + RELEASE);
