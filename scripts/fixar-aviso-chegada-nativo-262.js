const fs = require('fs');

const OLD_RELEASE = '2026-08-27-faccoes-filtro-chegada-avisada-261';
const NEW_RELEASE = '2026-08-27-faccoes-aviso-chegada-sutia-262';
const AVISO_VERSION_ANTIGA = '2026-08-06-aviso-chegada-admin-130';
const AVISO_VERSION_NOVA = '2026-08-27-aviso-chegada-sutia-262';
const ABAS_VERSION_ANTIGA = '2026-08-26-faccoes-abas-sem-saida-lateral-254';
const ABAS_VERSION_NOVA = '2026-08-27-faccoes-abas-aviso-sutia-262';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function replaceOnce(text, search, replacement, label) {
  const first = text.indexOf(search);
  if (first < 0) throw new Error(`Bloco não encontrado: ${label}`);
  if (text.indexOf(search, first + search.length) >= 0) throw new Error(`Bloco duplicado inesperadamente: ${label}`);
  return text.slice(0, first) + replacement + text.slice(first + search.length);
}

// 1) app.js — o aviso passa a nascer na própria linha, exclusivamente para movimentações de Sutiã.
let app = read('app.js');
if (app.includes('function htmlChegadaAvisadaSutiaFaccoes(')) {
  throw new Error('O aviso nativo de Sutiã já existe no app.js.');
}

const markerFiltros = 'function getFiltrosFaccoesMovimentacoes() {';
const helper = [
  'function ehMovimentacaoSutiaFaccoes(mov) {',
  '  const contexto = normalizarTexto([mov?.area, mov?.setor, mov?.areaLabel, mov?.setorLabel].filter(Boolean).join(" "));',
  '  if (contexto.includes("calcinha") || contexto.includes("lateral") || contexto.includes("alca") || contexto.includes("corte")) return false;',
  '  if (contexto.includes("sutia")) return true;',
  '',
  '  const processo = normalizarTexto(mov?.processo || "");',
  '  return processo === "encapar bojo" || processo === "interlock" || processo.includes("sutia");',
  '}',
  '',
  'function htmlChegadaAvisadaSutiaFaccoes(mov) {',
  '  if (!ehMovimentacaoSutiaFaccoes(mov) || situacaoChegadaFaccoes(mov) !== "avisada") return "";',
  '',
  '  const nome = String(mov?.chegadaInformadaPorNome || "usuário").trim() || "usuário";',
  '  const data = dataISOParaBR(mov?.chegadaInformadaData) || mov?.chegadaInformadaData || "";',
  '  const detalhe = [`por ${nome}`, data].filter(Boolean).join(" • ");',
  '',
  '  return `',
  '    <span class="badge pending chegada-avisada-sutia" data-chegada-avisada-nativa="1" title="Chegada avisada${detalhe ? ` • ${escapeHtml(detalhe)}` : ""}">Chegada avisada</span>',
  '    ${detalhe ? `<small class="muted chegada-avisada-sutia" style="display:block;margin-top:4px">${escapeHtml(detalhe)}</small>` : ""}',
  '  `;',
  '}',
  '',
  ''
].join('\n');
app = replaceOnce(app, markerFiltros, helper + markerFiltros, 'helpers do aviso de Sutiã');

const statusCell = [
  '      <td>',
  '        <span class="badge ${classeStatusMovimento(mov.status)}">',
  '          ${escapeHtml(labelStatusMovimento(mov.status))}',
  '        </span>',
  '      </td>'
].join('\n');
const statusCellNovo = [
  '      <td>',
  '        <span class="badge ${classeStatusMovimento(mov.status)}">',
  '          ${escapeHtml(labelStatusMovimento(mov.status))}',
  '        </span>',
  '        ${htmlChegadaAvisadaSutiaFaccoes(mov)}',
  '      </td>'
].join('\n');
app = replaceOnce(app, statusCell, statusCellNovo, 'célula Status da tabela de Facções');

const textoBusca = [
  '      mov.dataEnvio,',
  '      mov.dataChegada',
  '    ].join(" "));'
].join('\n');
const textoBuscaNovo = [
  '      mov.dataEnvio,',
  '      mov.dataChegada,',
  '      ehMovimentacaoSutiaFaccoes(mov) && situacaoChegadaFaccoes(mov) === "avisada" ? "chegada avisada aguardando baixa" : "",',
  '      mov.chegadaInformadaPorNome,',
  '      mov.chegadaInformadaData',
  '    ].join(" "));'
].join('\n');
app = replaceOnce(app, textoBusca, textoBuscaNovo, 'texto de busca da tabela de Facções');
write('app.js', app);

// 2) Abas de Facções — informa explicitamente qual aba está ativa e garante que o selo só possa aparecer em Sutiã.
let abas = read('corponu-faccoes-tres-abas-saida.js');
abas = replaceOnce(abas, `const V = "${ABAS_VERSION_ANTIGA}";`, `const V = "${ABAS_VERSION_NOVA}";`, 'versão das três abas');

const marcarInicio = [
  '  function marcar(a) {',
  '    const x = abas();',
  '    const c = document.getElementById("abaFaccaoCorte");',
  '    if (!x) return;'
].join('\n');
const marcarInicioNovo = [
  '  function marcar(a) {',
  '    const x = abas();',
  '    const c = document.getElementById("abaFaccaoCorte");',
  '    if (!x) return;',
  '    x.p.dataset.faccaoAbaAtiva = a;'
].join('\n');
abas = replaceOnce(abas, marcarInicio, marcarInicioNovo, 'marcação da aba ativa');

const cssTrecho = `s.textContent = \`#faccoes tr.\${CLASSE_TIPO_INCOMPATIVEL}{display:none!important}`;
const cssTrechoNovo = `s.textContent = \`#faccoes:not([data-faccao-aba-ativa="sutia"]) .chegada-avisada-sutia{display:none!important}#faccoes tr.\${CLASSE_TIPO_INCOMPATIVEL}{display:none!important}`;
abas = replaceOnce(abas, cssTrecho, cssTrechoNovo, 'CSS exclusivo do aviso na aba Sutiã');
write('corponu-faccoes-tres-abas-saida.js', abas);

// 3) Módulo antigo — para de desenhar o badge transitório, mas preserva ações de reenvio e todo o fluxo usuário/admin.
let aviso = read('corponu-aviso-chegada-admin-130.js');
aviso = replaceOnce(aviso, `const VERSION = "${AVISO_VERSION_ANTIGA}";`, `const VERSION = "${AVISO_VERSION_NOVA}";`, 'versão do módulo de aviso');

const badgeCabecalho = [
  '  function badge(cel, m) {',
  '    if (!cel || !m) return;',
  '    let b = cel.querySelector(`[data-aviso-chegada-badge="${CSS.escape(m.id)}"]`);',
  '    if (!b) { b = document.createElement("span"); b.dataset.avisoChegadaBadge = m.id; b.style.cssText = "display:inline-flex;margin:3px 4px 3px 0;padding:5px 8px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:900;white-space:normal"; cel.prepend(b); }',
  '    setText(b, `Chegada avisada por ${m.chegadaInformadaPorNome || "usuário"}${m.chegadaInformadaEm || m.chegadaInformadaData ? ` • ${dataBR(m.chegadaInformadaEm || m.chegadaInformadaData)}` : ""}`);'
].join('\n');
const badgeCabecalhoNovo = [
  '  function badge(cel, m) {',
  '    if (!cel || !m) return;',
  '    cel.querySelector(`[data-aviso-chegada-badge="${CSS.escape(m.id)}"]`)?.remove();'
].join('\n');
aviso = replaceOnce(aviso, badgeCabecalho, badgeCabecalhoNovo, 'remoção do badge transitório antigo');
write('corponu-aviso-chegada-admin-130.js', aviso);

// 4) Release/cache.
let index = read('index.html');
if (!index.includes(OLD_RELEASE)) throw new Error('Release 261 não encontrado no index.html');
index = index.split(OLD_RELEASE).join(NEW_RELEASE);
index = index.replace(/<meta name="app-version" content="[^"]+"\s*\/>/, `<meta name="app-version" content="${NEW_RELEASE}" />`);
write('index.html', index);

let update = read('update.js');
if (!update.includes(`const APP_VERSION = "${OLD_RELEASE}";`)) throw new Error('APP_VERSION 261 não encontrado');
update = update.replace(`const APP_VERSION = "${OLD_RELEASE}";`, `const APP_VERSION = "${NEW_RELEASE}";`);
write('update.js', update);

let atualizador = read('corponu-atualizador.js');
if (!atualizador.includes(`const LOCAL_RELEASE = "${OLD_RELEASE}";`)) throw new Error('LOCAL_RELEASE 261 não encontrado');
atualizador = atualizador.replace(`const LOCAL_RELEASE = "${OLD_RELEASE}";`, `const LOCAL_RELEASE = "${NEW_RELEASE}";`);
write('corponu-atualizador.js', atualizador);

const notes = 'Produção. Corrigido o aviso de chegada da aba Sutiã em Facções. O selo Chegada avisada agora é renderizado pela própria linha da movimentação, portanto não some quando a tabela é redesenhada. O aviso visual é exclusivo da aba Sutiã e de movimentações identificadas como Sutiã (area/setor Sutiã ou processos Sutiã, ENCAPAR BOJO e INTERLOCK). Calcinha e Lateral/Alça não recebem esse selo. O módulo antigo deixou de injetar o badge transitório que causava o efeito de aparecer/sumir, mas preserva confirmação do administrador, aviso do usuário e reenvio. O filtro de Chegada da versão 261 permanece funcionando. Nenhuma regra do Firebase foi alterada.';
write('corponu-release.json', JSON.stringify({ version: NEW_RELEASE, updatedAt: '2026-08-27T17:40:00-03:00', notes }, null, 2) + '\n');
write('version.json', JSON.stringify({ version: NEW_RELEASE, updatedAt: '2026-08-27T17:40:00-03:00', notes: 'Aviso Chegada avisada estabilizado e restrito exclusivamente à aba Sutiã de Facções.' }, null, 2) + '\n');

// Pós-condições.
const appFinal = read('app.js');
const abasFinal = read('corponu-faccoes-tres-abas-saida.js');
const avisoFinal = read('corponu-aviso-chegada-admin-130.js');
for (const token of ['function ehMovimentacaoSutiaFaccoes(', 'function htmlChegadaAvisadaSutiaFaccoes(', '${htmlChegadaAvisadaSutiaFaccoes(mov)}', 'chegada-avisada-sutia']) {
  if (!appFinal.includes(token)) throw new Error(`Pós-condição app ausente: ${token}`);
}
for (const token of ['data-faccao-aba-ativa="sutia"', 'x.p.dataset.faccaoAbaAtiva = a;', ABAS_VERSION_NOVA]) {
  if (!abasFinal.includes(token)) throw new Error(`Pós-condição abas ausente: ${token}`);
}
if (!avisoFinal.includes(AVISO_VERSION_NOVA)) throw new Error('Versão nova do módulo de aviso não aplicada');
if (avisoFinal.includes('b.dataset.avisoChegadaBadge = m.id')) throw new Error('O módulo antigo ainda cria o badge transitório');
if (!avisoFinal.includes('data-aviso-reenvio-badge')) throw new Error('A lógica de reenvio foi removida indevidamente');
if (!read('corponu-atualizador.js').includes(NEW_RELEASE) || !read('update.js').includes(NEW_RELEASE)) throw new Error('Release 262 incompleto');

console.log('Aviso de chegada exclusivo e nativo da aba Sutiã aplicado com sucesso.');
