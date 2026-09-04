const fs = require('fs');

const OLD_RELEASE = '2026-09-04-faccoes-registrar-saida-restaurado-283';
const NEW_RELEASE = '2026-09-04-base-corpo-nu-flow-estavel-284';

function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.writeFileSync(p, s, 'utf8'); }
function replaceExact(src, from, to, expected, label) {
  const count = src.split(from).length - 1;
  if (count !== expected) throw new Error(`${label}: esperado ${expected}, encontrado ${count}`);
  return src.split(from).join(to);
}

let html = read('index.html');
html = replaceExact(html, '<title>Sistema OP Confecção</title>', '<title>Corpo Nu Flow</title>\n  <link rel="icon" type="image/png" href="https://i.imgur.com/xTyvuMa.png" />', 1, 'titulo e favicon');
html = replaceExact(html, 'https://i.imgur.com/tJDOlNO.png', 'https://i.imgur.com/xTyvuMa.png', 2, 'logo png');
html = replaceExact(html, 'https://i.imgur.com/tJDOlNO.jpg', 'https://i.imgur.com/xTyvuMa.jpg', 2, 'logo jpg');
html = replaceExact(html, 'https://i.imgur.com/tJDOlNO.jpeg', 'https://i.imgur.com/xTyvuMa.jpeg', 2, 'logo jpeg');
html = replaceExact(html, 'alt="Logo da empresa"', 'alt="Logo Corpo Nu Flow"', 2, 'alt das logos');
html = replaceExact(html, '<h1>OP Confecção</h1>', '<h1>Corpo Nu Flow</h1>', 2, 'nome da marca');
html = replaceExact(html, '<p>Controle de Produção com Firebase</p>', '<p>Sistema Integrado de Gestão da Produção</p>', 1, 'subtitulo login');
html = replaceExact(html, '<p>Controle de Produção</p>', '<p>Sistema Integrado de Gestão da Produção</p>', 1, 'subtitulo sidebar');
write('index.html', html);

let loader = read('corponu-atualizador.js');
loader = replaceExact(loader,
`  const MODULOS_POR_PAGINA = Object.freeze({\n    manejo: [`,
`  const MODULOS_POR_PAGINA = Object.freeze({\n    ordens: [\n      ["corponu-quantidade-sem-scroll-148.js", "quantidade-sem-scroll-148", "Não foi possível ativar a proteção da quantidade da OP contra o scroll do mouse."],\n      ["corponu-ops-excluidas-restauracao-139.js", "ops-excluidas-restauracao-139", "Não foi possível carregar a lixeira/restauração de OPs excluídas."]\n    ],\n\n    manejo: [`,
1,
'modulos oficiais da pagina Ordens');
loader = replaceExact(loader,
`      ["corponu-pendencias-modal-estavel.js", "pendencias-modal-estavel", "Não foi possível restaurar a abertura das pendências."],\n      ["corponu-pendencias-valor-seguro.js", "pendencias-valor-seguro", "Não foi possível salvar valores pendentes com segurança."],`,
`      ["corponu-pendencias-modal-estavel.js", "pendencias-modal-estavel", "Não foi possível restaurar a abertura das pendências."],\n      ["corponu-pendencias-motivo-171.js", "pendencias-motivo-171", "Não foi possível mostrar o motivo específico das pendências financeiras."],\n      ["corponu-pendencias-valor-seguro.js", "pendencias-valor-seguro", "Não foi possível salvar valores pendentes com segurança."],`,
1,
'motivo das pendencias em Pagamentos');
write('corponu-atualizador.js', loader);

const notes = 'Produção. Estabilizada a identidade base do sistema após identificar uma dependência histórica escondida: Corpo Nu Flow era aplicado por um módulo carregado indiretamente pela tela Pagamentos. Com o carregamento sob demanda e a renovação de cache, o HTML-base antigo OP Confecção voltou a aparecer. A identidade oficial agora nasce diretamente no index.html com título, nome, subtítulo, logo e favicon Corpo Nu Flow, sem depender de JavaScript ou de visitar Pagamentos. Também foram explicitados no carregador os módulos próprios da página Ordens (proteção do campo quantidade e restauração de OPs excluídas) e o motivo de pendências permanece explicitamente pertencente a Pagamentos, reduzindo dependências escondidas. A correção 283 do botão Registrar saída permanece preservada. Nenhum documento ou regra do Firebase foi alterado.';

for (const p of ['corponu-release.json', 'version.json']) {
  const obj = JSON.parse(read(p));
  if (obj.version !== OLD_RELEASE) throw new Error(`${p}: versão atual inesperada ${obj.version}`);
  obj.version = NEW_RELEASE;
  obj.updatedAt = '2026-09-04T11:04:00-03:00';
  obj.notes = notes;
  write(p, JSON.stringify(obj, null, 2) + '\n');
}

for (const p of ['corponu-atualizador.js', 'update.js', 'index.html']) {
  let text = read(p);
  const count = text.split(OLD_RELEASE).length - 1;
  if (!count) throw new Error(`${p}: release 283 não encontrada`);
  text = text.split(OLD_RELEASE).join(NEW_RELEASE);
  write(p, text);
}

const finalHtml = read('index.html');
for (const token of ['<title>Corpo Nu Flow</title>', '<h1>Corpo Nu Flow</h1>', 'Sistema Integrado de Gestão da Produção', 'xTyvuMa.png']) {
  if (!finalHtml.includes(token)) throw new Error(`identidade ausente: ${token}`);
}
if (finalHtml.includes('<h1>OP Confecção</h1>') || finalHtml.includes('<title>Sistema OP Confecção</title>')) {
  throw new Error('identidade antiga ainda presente no HTML-base');
}
const finalLoader = read('corponu-atualizador.js');
for (const token of ['ordens: [', 'corponu-quantidade-sem-scroll-148.js', 'corponu-ops-excluidas-restauracao-139.js', 'corponu-pendencias-motivo-171.js']) {
  if (!finalLoader.includes(token)) throw new Error(`loader sem responsabilidade explícita: ${token}`);
}
const saida = read('corponu-faccoes-tres-abas-saida.js');
if (!saida.includes('b.id = "btnSaidaAbas";') || !saida.includes('b.textContent = "Registrar saída";')) throw new Error('correção 283 do Registrar saída não foi preservada');
if (saida.includes('if (!x || !document.getElementById("abaFaccaoCorte")) return;')) throw new Error('dependência antiga do Registrar saída voltou');

console.log('Base 284 estabilizada com identidade Corpo Nu Flow canônica e correção 283 preservada.');
