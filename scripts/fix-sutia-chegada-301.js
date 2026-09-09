const fs = require('fs');

const OLD_RELEASE = '2026-09-09-faccoes-acoes-desempenho-300';
const NEW_RELEASE = '2026-09-09-sutia-completo-chegada-direta-301';
const RAPID_FILE = 'corponu-sutia-completo-chegada-rapida.js';
const UPDATE_FILE = 'update.js';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

function replaceOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`${label}: trecho esperado não encontrado`);
  if (source.indexOf(oldText, first + oldText.length) >= 0) {
    throw new Error(`${label}: trecho apareceu mais de uma vez; abortando para não aplicar correção ambígua`);
  }
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

// 1) Sutiã Completo passa a ser dono direto do submit quando o painel dele está ativo.
let rapid = read(RAPID_FILE);
rapid = replaceOnce(
  rapid,
  'const VERSION = "2026-08-11-chegada-sutia-rapida-180";',
  `const VERSION = "${NEW_RELEASE}";`,
  'versão interna do fluxo rápido'
);

const requestSubmitPatch = `  function instalarMarcadorReenvioSubmit() {\n    if (window.__CORPONU_REQUEST_SUBMIT_MARCADO_107__) return;\n    const original = HTMLFormElement.prototype.requestSubmit;\n    if (typeof original !== "function") return;\n    window.__CORPONU_REQUEST_SUBMIT_MARCADO_107__ = true;\n    HTMLFormElement.prototype.requestSubmit = function(submitter) {\n      if ([FORM_PADRAO, FORM_MANUAL].includes(this.id)) {\n        const painelId = this.id === FORM_MANUAL\n          ? "sutCompletoComponentesChegadaManual"\n          : "sutCompletoComponentesChegada";\n        if (document.getElementById(painelId)) this.dataset.sc107ReenvioSubmit = "1";\n      }\n      return original.call(this, submitter);\n    };\n  }\n\n`;
rapid = replaceOnce(rapid, requestSubmitPatch, '', 'remoção do monkey patch de requestSubmit');

rapid = replaceOnce(
  rapid,
  '    if (form.dataset.sc107ReenvioSubmit !== "1") return;\n    delete form.dataset.sc107ReenvioSubmit;\n\n',
  '',
  'remoção da trava sc107ReenvioSubmit'
);

rapid = replaceOnce(
  rapid,
  '    instalarMarcadorReenvioSubmit();\n',
  '',
  'remoção da instalação do marcador requestSubmit'
);

if (!rapid.includes('event.preventDefault();\n    event.stopImmediatePropagation();')) {
  throw new Error('fluxo rápido perdeu a interceptação exclusiva do submit');
}
if (!rapid.includes('if (manual) void salvarManual(form);\n    else void salvarPadrao(form);')) {
  throw new Error('fluxo rápido perdeu o roteamento de salvamento');
}
if (rapid.includes('sc107ReenvioSubmit') || rapid.includes('instalarMarcadorReenvioSubmit')) {
  throw new Error('dependência antiga de requestSubmit ainda presente no fluxo rápido');
}
write(RAPID_FILE, rapid);

// 2) O revalidador mantém apenas processo/facção confirmados; não precisa mais criar marca auxiliar.
let update = read(UPDATE_FILE);
update = replaceOnce(
  update,
  "      form.dataset.sc107ReenvioSubmit = '1';\n",
  '',
  'remoção da marca auxiliar no revalidador'
);
update = replaceOnce(update, OLD_RELEASE, NEW_RELEASE, 'versão do update.js');
if (update.includes('sc107ReenvioSubmit')) {
  throw new Error('update.js ainda depende de sc107ReenvioSubmit');
}
write(UPDATE_FILE, update);

// 3) Nova release crescente força cache-bust de todos os módulos, sem mexer nas regras de negócio.
for (const path of ['index.html', 'corponu-atualizador.js']) {
  let source = read(path);
  const count = source.split(OLD_RELEASE).length - 1;
  if (count < 1) throw new Error(`${path}: release 300 não encontrada`);
  source = source.split(OLD_RELEASE).join(NEW_RELEASE);
  write(path, source);
}

const notes = 'Produção. Corrige estruturalmente a confirmação de chegada do Sutiã Completo. O módulo específico passa a assumir diretamente qualquer submit quando o painel de Sutiã Completo está ativo, removendo a dependência antiga de requestSubmit/sc107ReenvioSubmit. O revalidador continua apenas confirmando processo e facção quando necessário. O salvamento permanece atômico e exclusivo do Sutiã Completo, sem alterar regras de outros processos ou dados existentes.';
for (const path of ['corponu-release.json', 'version.json']) {
  const obj = JSON.parse(read(path));
  if (obj.version !== OLD_RELEASE) throw new Error(`${path}: versão inesperada ${obj.version}`);
  obj.version = NEW_RELEASE;
  obj.updatedAt = new Date().toISOString();
  obj.notes = notes;
  write(path, JSON.stringify(obj, null, 2) + '\n');
}

// 4) Validações de consistência da publicação.
for (const path of ['index.html', 'corponu-atualizador.js', 'update.js', 'corponu-release.json', 'version.json']) {
  const source = read(path);
  if (!source.includes(NEW_RELEASE)) throw new Error(`${path}: release 301 ausente`);
  if (source.includes(OLD_RELEASE)) throw new Error(`${path}: release 300 antiga ainda presente`);
}

const html = read('index.html');
for (const token of [
  `style.css?v=${NEW_RELEASE}`,
  `update.js?v=${NEW_RELEASE}`,
  `app.js?v=${NEW_RELEASE}`,
  `corponu-atualizador.js?v=${NEW_RELEASE}`
]) {
  if (!html.includes(token)) throw new Error(`index.html sem cache-bust esperado: ${token}`);
}

console.log(`Correção pronta: ${NEW_RELEASE}`);
