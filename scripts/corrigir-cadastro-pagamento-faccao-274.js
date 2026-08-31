const fs = require('fs');

const OLD_RELEASE = '2026-08-31-faccoes-filtro-identidade-273';
const NEW_RELEASE = '2026-08-31-pagamentos-faccao-exata-274';
const OLD_PAYMENT_VERSION = '2026-07-30-recuperacao-pagamentos-autoupdate-5';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function replaceOnce(text, before, after, label) {
  const first = text.indexOf(before);
  assert(first >= 0, `${label}: bloco não encontrado.`);
  assert(text.indexOf(before, first + before.length) < 0, `${label}: bloco duplicado/ambíguo.`);
  return text.slice(0, first) + after + text.slice(first + before.length);
}

let pagamentos = read('corponu-pagamentos-seguro.js');

pagamentos = replaceOnce(
  pagamentos,
  ` * Versão: ${OLD_PAYMENT_VERSION}`,
  ` * Versão: ${NEW_RELEASE}`,
  'comentário de versão do módulo financeiro'
);
pagamentos = replaceOnce(
  pagamentos,
  `  const VERSION = "${OLD_PAYMENT_VERSION}";`,
  `  const VERSION = "${NEW_RELEASE}";`,
  'versão interna do módulo financeiro'
);

const antigoResolvedor = `  function localizarCadastroFaccao(nome, faccoes) {
    const chave = normalizarNome(nome);
    const candidatas = (faccoes || [])
      .filter(item => {
        const atual = normalizarNome(item?.nome);
        if (!atual || !chave) return false;
        if (atual === chave) return true;
        if (atual.includes(chave) || chave.includes(atual)) {
          return Math.abs(atual.length - chave.length) <= 18;
        }
        return false;
      })
      .sort((a, b) => pontuarCadastroFaccao(b) - pontuarCadastroFaccao(a));`;

const novoResolvedor = `  function localizarCadastroFaccao(nome, faccoes) {
    const chave = normalizarNome(nome);

    // Dados financeiros nunca podem ser inferidos por correspondência parcial de nome.
    // Ex.: CAMILA não pode herdar PIX/telefone de CAMILA FIRMINO ou CAMILA FURTADO.
    // Mantemos apenas igualdade normalizada (acentos, caixa e espaços são ignorados).
    const candidatas = (faccoes || [])
      .filter(item => chave && normalizarNome(item?.nome) === chave)
      .sort((a, b) => pontuarCadastroFaccao(b) - pontuarCadastroFaccao(a));`;

pagamentos = replaceOnce(
  pagamentos,
  antigoResolvedor,
  novoResolvedor,
  'resolvedor cadastral de facção em pagamentos'
);

const inicioResolvedor = pagamentos.indexOf('  function localizarCadastroFaccao(nome, faccoes) {');
const fimResolvedor = pagamentos.indexOf('\n  function agruparPorFaccao(pagamentos) {', inicioResolvedor);
assert(inicioResolvedor >= 0 && fimResolvedor > inicioResolvedor, 'resolvedor final não localizado.');
const blocoResolvedor = pagamentos.slice(inicioResolvedor, fimResolvedor);
assert(blocoResolvedor.includes('normalizarNome(item?.nome) === chave'), 'resolvedor não exige nome exato.');
assert(!blocoResolvedor.includes('atual.includes(chave)'), 'correspondência parcial antiga permaneceu no resolvedor.');
assert(!blocoResolvedor.includes('chave.includes(atual)'), 'correspondência parcial reversa permaneceu no resolvedor.');
write('corponu-pagamentos-seguro.js', pagamentos);

let html = read('index.html');
const ocorrenciasRelease = html.split(OLD_RELEASE).length - 1;
assert(ocorrenciasRelease >= 3, `index.html: release 273 apareceu apenas ${ocorrenciasRelease} vez(es).`);
html = html.split(OLD_RELEASE).join(NEW_RELEASE);
html = replaceOnce(
  html,
  '<script src="./corponu-pagamentos-seguro.js?v=2026-08-25-sutia-completo-automatico-251"></script>',
  `<script src="./corponu-pagamentos-seguro.js?v=${NEW_RELEASE}"></script>`,
  'cache-busting do módulo financeiro'
);
assert(html.includes(`corponu-pagamentos-seguro.js?v=${NEW_RELEASE}`), 'módulo financeiro não recebeu cache-busting 274.');
write('index.html', html);

let update = read('update.js');
update = replaceOnce(
  update,
  `const APP_VERSION = "${OLD_RELEASE}";`,
  `const APP_VERSION = "${NEW_RELEASE}";`,
  'release em update.js'
);
write('update.js', update);

let atualizador = read('corponu-atualizador.js');
atualizador = replaceOnce(
  atualizador,
  `const LOCAL_RELEASE = "${OLD_RELEASE}";`,
  `const LOCAL_RELEASE = "${NEW_RELEASE}";`,
  'release em corponu-atualizador.js'
);
write('corponu-atualizador.js', atualizador);

const notes = 'Produção. Corrige exclusivamente a resolução dos dados cadastrais de facção nos relatórios e na conferência de Pagamentos. O filtro de lançamentos permanece inalterado. O módulo financeiro deixou de usar correspondência parcial de nomes para buscar PIX, titular, cidade e telefone: agora somente um cadastro com nome normalizado exatamente igual pode fornecer esses dados. Assim CAMILA não pode mais herdar dados de CAMILA FIRMINO, CAMILA FURTADO ou qualquer outra facção com nome semelhante. Se um pagamento histórico não possuir cadastro com nome exato, o relatório mantém o nome do próprio pagamento e sinaliza PIX não cadastrado, em vez de associar dados de outra pessoa. Nenhum lançamento foi alterado, nenhuma leitura extra foi adicionada e nenhuma regra do Firebase mudou.';
for (const path of ['corponu-release.json', 'version.json']) {
  const json = JSON.parse(read(path));
  assert(json.version === OLD_RELEASE, `${path}: versão de origem inesperada (${json.version}).`);
  json.version = NEW_RELEASE;
  json.updatedAt = new Date().toISOString();
  json.notes = notes;
  write(path, JSON.stringify(json, null, 2) + '\n');
}

console.log(`Correção financeira preparada: ${NEW_RELEASE}`);
