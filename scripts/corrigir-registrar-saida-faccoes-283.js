const fs = require('fs');

const OLD_RELEASE = '2026-09-03-sutia-bases-especiais-282';
const NEW_RELEASE = '2026-09-04-faccoes-registrar-saida-restaurado-283';
const TARGET = 'corponu-faccoes-tres-abas-saida.js';

function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.writeFileSync(p, s, 'utf8'); }
function replaceOnce(src, from, to, label) {
  const count = src.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: esperado 1 trecho, encontrado ${count}`);
  return src.replace(from, to);
}

let source = read(TARGET);
source = replaceOnce(
  source,
  'const V = "2026-08-31-faccoes-processos-estavel-272";',
  `const V = "${NEW_RELEASE}";`,
  'versão interna do módulo de abas'
);

source = replaceOnce(
  source,
  '    const x = abas();\n    if (!x || !document.getElementById("abaFaccaoCorte")) return;\n\n    const ag = painelGeral()?.querySelector(":scope > .panel-header .actions") || painelGeral()?.querySelector(".panel-header .actions");',
  '    const x = abas();\n    // O botão geral pertence ao fluxo Sutiã/Calcinha e não depende do painel de Lateral e Alça.\n    // Lateral e Alça possui interface e botão de saída próprios.\n    if (!x) return;\n\n    const ag = painelGeral()?.querySelector(":scope > .panel-header .actions") || painelGeral()?.querySelector(".panel-header .actions");',
  'desacoplamento do botão Registrar saída'
);

write(TARGET, source);

const notes = 'Produção. Restaurado estruturalmente o botão Registrar saída da aba Facções para Sutiã e Calcinha. O módulo de três abas estava condicionando a criação do botão geral à existência do antigo elemento abaFaccaoCorte. A versão atual de Lateral e Alça usa painel próprio e não cria mais esse ID legado, fazendo o módulo abortar antes de inserir Registrar saída. A dependência foi removida: o botão geral agora depende apenas das abas Sutiã/Calcinha, enquanto Lateral e Alça permanece com seu botão de saída independente. Nenhuma regra do Firebase foi alterada.';
for (const p of ['corponu-release.json', 'version.json']) {
  const obj = JSON.parse(read(p));
  if (obj.version !== OLD_RELEASE) throw new Error(`${p}: versão atual inesperada ${obj.version}`);
  obj.version = NEW_RELEASE;
  obj.updatedAt = '2026-09-04T10:55:00-03:00';
  obj.notes = notes;
  write(p, JSON.stringify(obj, null, 2) + '\n');
}

for (const p of ['corponu-atualizador.js', 'update.js', 'index.html']) {
  let text = read(p);
  const count = text.split(OLD_RELEASE).length - 1;
  if (!count) throw new Error(`${p}: release antiga não encontrada`);
  text = text.split(OLD_RELEASE).join(NEW_RELEASE);
  write(p, text);
}

const finalSource = read(TARGET);
if (finalSource.includes('if (!x || !document.getElementById("abaFaccaoCorte")) return;')) {
  throw new Error('dependência antiga de abaFaccaoCorte ainda presente em preparar()');
}
for (const token of [
  `const V = "${NEW_RELEASE}";`,
  'b.id = "btnSaidaAbas";',
  'b.textContent = "Registrar saída";',
  'if (!x) return;'
]) {
  if (!finalSource.includes(token)) throw new Error(`pós-condição ausente: ${token}`);
}

console.log('Correção 283 aplicada: Registrar saída desacoplado de abaFaccaoCorte.');
