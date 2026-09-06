const fs = require('fs');

const OLD_RELEASE = '2026-09-04-faccoes-controlador-unificado-285';
const NEW_RELEASE = '2026-09-06-bloqueio-pagamento-286';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value, 'utf8'); }
function replaceExact(source, from, to, expected, label) {
  const count = source.split(from).length - 1;
  if (count !== expected) throw new Error(`${label}: esperado ${expected}, encontrado ${count}`);
  return source.split(from).join(to);
}

let html = read('index.html');
if (html.includes('id="servicePaymentHold"')) throw new Error('Tela de bloqueio já existe no HTML.');
html = replaceExact(
  html,
  '<body>\n  <section id="authScreen" class="auth-screen">',
  `<body data-service-hold="payment">\n  <section id="servicePaymentHold" class="service-payment-hold" role="alert" aria-live="assertive" aria-label="Serviço suspenso por pendência financeira">\n    <div class="service-payment-card">\n      <img class="service-payment-logo" src="https://i.imgur.com/xTyvuMa.png" alt="Corpo Nu Flow" />\n      <span class="service-payment-status">Serviço temporariamente suspenso</span>\n      <h1>Pagamento mensal pendente</h1>\n      <p>Pagamento mensal não debitado por parte do contratante do serviço.</p>\n      <div class="service-payment-due">Vencimento mensal: <strong>todo dia 5</strong></div>\n      <p>Por favor, regularize as pendências para que os serviços necessários possam ter continuidade.</p>\n      <small>O acesso será restabelecido após a regularização da pendência.</small>\n    </div>\n  </section>\n\n  <section id="authScreen" class="auth-screen">`,
  1,
  'inserção estrutural da tela de bloqueio'
);
html = replaceExact(html, OLD_RELEASE, NEW_RELEASE, 6, 'versões do HTML');
write('index.html', html);

let css = read('style.css');
if (css.includes('/* Corpo Nu Flow • bloqueio financeiro 286 */')) throw new Error('CSS do bloqueio 286 já existe.');
css += `\n\n/* Corpo Nu Flow • bloqueio financeiro 286 */\n.service-payment-hold{display:none;position:fixed;inset:0;z-index:2147483647;min-height:100vh;padding:24px;align-items:center;justify-content:center;background:radial-gradient(circle at top,#eef5fb 0,#dbe8f3 38%,#cbdbea 100%);font-family:Arial,sans-serif;color:#14283e}\nbody[data-service-hold="payment"]{overflow:hidden!important}\nbody[data-service-hold="payment"]> :not(#servicePaymentHold):not(script):not(style){display:none!important}\nbody[data-service-hold="payment"] .service-payment-hold{display:flex!important}\n.service-payment-card{width:min(620px,100%);padding:42px 38px;background:#fff;border:1px solid #c8d7e6;border-radius:24px;box-shadow:0 28px 80px rgba(22,52,82,.20);text-align:center}\n.service-payment-logo{display:block;width:92px;height:92px;object-fit:contain;margin:0 auto 18px}\n.service-payment-status{display:inline-flex;align-items:center;justify-content:center;padding:7px 12px;border-radius:999px;background:#fff1f2;color:#9f1239;font-size:12px;font-weight:900;letter-spacing:.02em;text-transform:uppercase}\n.service-payment-card h1{margin:18px 0 12px;font-size:30px;line-height:1.12;color:#163b68}\n.service-payment-card p{margin:10px auto;max-width:510px;font-size:16px;line-height:1.6;color:#435b72}\n.service-payment-due{margin:22px auto;padding:14px 16px;border:1px solid #f0c36a;border-radius:14px;background:#fff8e8;color:#7a4a00;font-size:15px}\n.service-payment-card small{display:block;margin-top:22px;padding-top:18px;border-top:1px solid #e3ebf3;color:#718296;font-size:12px;line-height:1.5}\n@media(max-width:620px){.service-payment-hold{padding:16px}.service-payment-card{padding:32px 22px;border-radius:20px}.service-payment-card h1{font-size:25px}.service-payment-card p{font-size:15px}.service-payment-logo{width:76px;height:76px}}\n`;
write('style.css', css);

const notes = 'Produção. Acesso temporariamente suspenso por pendência financeira do contratante. A tela de bloqueio agora faz parte da estrutura base do Corpo Nu Flow, sem popup ou módulo injetado: o body possui um único estado data-service-hold="payment", a aplicação e o login ficam inacessíveis enquanto esse estado estiver ativo, e a mensagem informa que o vencimento mensal ocorre todo dia 5 e solicita a regularização das pendências para continuidade dos serviços. Para restabelecer o acesso, basta remover/desativar esse único estado da estrutura base. Nenhum documento, regra ou dado do Firebase foi alterado. A reorganização de Facções da versão 285 permanece preservada.';
for (const path of ['corponu-release.json', 'version.json']) {
  const obj = JSON.parse(read(path));
  if (obj.version !== OLD_RELEASE) throw new Error(`${path}: versão inesperada ${obj.version}`);
  obj.version = NEW_RELEASE;
  obj.updatedAt = '2026-09-06T01:35:00-03:00';
  obj.notes = notes;
  write(path, JSON.stringify(obj, null, 2) + '\n');
}

for (const path of ['corponu-atualizador.js', 'update.js']) {
  let source = read(path);
  const count = source.split(OLD_RELEASE).length - 1;
  if (count < 1) throw new Error(`${path}: release atual não encontrada`);
  source = source.split(OLD_RELEASE).join(NEW_RELEASE);
  write(path, source);
}

const finalHtml = read('index.html');
for (const token of [
  'data-service-hold="payment"',
  'id="servicePaymentHold"',
  'Pagamento mensal não debitado por parte do contratante do serviço.',
  'Vencimento mensal: <strong>todo dia 5</strong>',
  'Por favor, regularize as pendências para que os serviços necessários possam ter continuidade.'
]) {
  if (!finalHtml.includes(token)) throw new Error(`HTML final sem: ${token}`);
}
const finalCss = read('style.css');
for (const token of ['body[data-service-hold="payment"]', '.service-payment-hold', 'z-index:2147483647']) {
  if (!finalCss.includes(token)) throw new Error(`CSS final sem: ${token}`);
}
for (const path of ['index.html', 'corponu-atualizador.js', 'update.js', 'corponu-release.json', 'version.json']) {
  if (!read(path).includes(NEW_RELEASE)) throw new Error(`${path}: release 286 ausente`);
}
if (!read('corponu-release.json').includes('reorganização de Facções da versão 285 permanece preservada')) {
  throw new Error('Release não documenta preservação da Facções 285.');
}

console.log('Bloqueio financeiro 286 aplicado estruturalmente sem alterar Firebase.');
