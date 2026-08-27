const fs = require('fs');

const OLD_RELEASE = '2026-08-27-faccoes-filtro-chegada-avisada-261';
const NEW_RELEASE = '2026-08-27-faccoes-aviso-chegada-nativo-262';
const AVISO_VERSION = '2026-08-27-aviso-chegada-nativo-262';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function replaceOnce(text, search, replacement, label) {
  const first = text.indexOf(search);
  if (first < 0) throw new Error(`Bloco não encontrado: ${label}`);
  if (text.indexOf(search, first + search.length) >= 0) throw new Error(`Bloco duplicado: ${label}`);
  return text.slice(0, first) + replacement + text.slice(first + search.length);
}

// ---------------- app.js: tabela oficial de Facções ----------------
let app = read('app.js');
if (app.includes('function htmlChegadaAvisadaFaccoes(')) {
  throw new Error('htmlChegadaAvisadaFaccoes já existe; abortando para não duplicar.');
}

const markerSituacao = `function getFiltrosFaccoesMovimentacoes() {`;
const helperNativo = `function htmlChegadaAvisadaFaccoes(mov) {\n  if (situacaoChegadaFaccoes(mov) !== "avisada") return "";\n\n  const nome = String(mov?.chegadaInformadaPorNome || "usuário").trim() || "usuário";\n  const data = dataISOParaBR(mov?.chegadaInformadaData) || mov?.chegadaInformadaData || "";\n  const detalhe = [nome ? \`por \${nome}\` : "", data].filter(Boolean).join(" • ");\n\n  return \`\n    <span class="badge pending" data-chegada-avisada-nativa="1" title="Chegada avisada\${detalhe ? ` • ${escapeHtml(detalhe)}` : ""}">Chegada avisada</span>\n    \${detalhe ? `<small class="muted" style="display:block;margin-top:4px">${escapeHtml(detalhe)}</small>` : ""}\n  \`;\n}\n\n`;
app = replaceOnce(app, markerSituacao, helperNativo + markerSituacao, 'helper nativo antes de getFiltrosFaccoesMovimentacoes');

const textoBusca = `      mov.dataEnvio,\n      mov.dataChegada\n    ].join(" "));`;
const textoBuscaNovo = `      mov.dataEnvio,\n      mov.dataChegada,\n      situacaoChegadaFaccoes(mov) === "avisada" ? "chegada avisada aguardando baixa" : "",\n      mov.chegadaInformadaPorNome,\n      mov.chegadaInformadaData\n    ].join(" "));`;
app = replaceOnce(app, textoBusca, textoBuscaNovo, 'texto de busca da tabela de Facções');

const rowOpen = `  tbody.innerHTML = movimentos.map(mov => \`\n    <tr class="\${mov.status === "em_andamento" || !mov.status ? "mov-em-faccao" : ""}">`;
const rowOpenNovo = `  tbody.innerHTML = movimentos.map(mov => \`\n    <tr class="\${mov.status === "em_andamento" || !mov.status ? "mov-em-faccao" : ""}" \${situacaoChegadaFaccoes(mov) === "avisada" ? 'data-chegada-avisada-nativa="1"' : ""}>`;
app = replaceOnce(app, rowOpen, rowOpenNovo, 'abertura da linha de Facções');

const statusCell = `      <td>\n        <span class="badge \${classeStatusMovimento(mov.status)}">\n          \${escapeHtml(labelStatusMovimento(mov.status))}\n        </span>\n      </td>`;
const statusCellNovo = `      <td>\n        <span class="badge \${classeStatusMovimento(mov.status)}">\n          \${escapeHtml(labelStatusMovimento(mov.status))}\n        </span>\n        \${htmlChegadaAvisadaFaccoes(mov)}\n      </td>`;
app = replaceOnce(app, statusCell, statusCellNovo, 'célula Status da tabela de Facções');
write('app.js', app);

// ---------------- Lateral/Alça: também renderiza o aviso na própria linha ----------------
let lateral = read('corponu-faccoes-lateral-alca-254.js');
if (lateral.includes('function chegadaAvisadaNativa(')) {
  throw new Error('chegadaAvisadaNativa já existe em Lateral/Alça.');
}

const markerLabelStatus = `  function labelStatus(item) {`;
const lateralHelpers = `  function chegadaAvisadaNativa(item) {\n    const statusAviso = norm(item?.chegadaInformadaStatus || "");\n    return item?.chegadaInformada === true && statusAviso !== "CONFIRMADA_ADMIN" && !item?.dataChegada;\n  }\n\n  function htmlChegadaAvisadaNativa(item) {\n    if (!chegadaAvisadaNativa(item)) return "";\n    const nome = String(item?.chegadaInformadaPorNome || "usuário").trim() || "usuário";\n    const data = dataBR(item?.chegadaInformadaData || "");\n    const detalhe = [\`por \${nome}\`, data].filter(Boolean).join(" • ");\n    return \` <span class="corte-pill valor" data-chegada-avisada-nativa="1" title="\${html(detalhe)}">Chegada avisada</span>\`;\n  }\n\n`;
lateral = replaceOnce(lateral, markerLabelStatus, lateralHelpers + markerLabelStatus, 'helper de aviso nativo de Lateral/Alça');

const lateralRow = `      return \`<tr data-movimentacao-id="\${html(item.id)}">`;
const lateralRowNovo = `      return \`<tr data-movimentacao-id="\${html(item.id)}" \${chegadaAvisadaNativa(item) ? 'data-chegada-avisada-nativa="1"' : ""}>`;
lateral = replaceOnce(lateral, lateralRow, lateralRowNovo, 'linha de Lateral/Alça');

const lateralStatus = `        <td>\${labelStatus(item)}\${pagamento && (pagamento.valorPendente === true || statusNormalizado(pagamento.statusPagamento) === "SEM_VALOR") ? ' <span class="corte-pill valor">Valor a definir</span>' : ""}</td>`;
const lateralStatusNovo = `        <td>\${labelStatus(item)}\${htmlChegadaAvisadaNativa(item)}\${pagamento && (pagamento.valorPendente === true || statusNormalizado(pagamento.statusPagamento) === "SEM_VALOR") ? ' <span class="corte-pill valor">Valor a definir</span>' : ""}</td>`;
lateral = replaceOnce(lateral, lateralStatus, lateralStatusNovo, 'Status de Lateral/Alça');
write('corponu-faccoes-lateral-alca-254.js', lateral);

// ---------------- módulo legado: não duplicar o badge quando a linha já o possui nativamente ----------------
let aviso = read('corponu-aviso-chegada-admin-130.js');
aviso = replaceOnce(
  aviso,
  'const VERSION = "2026-08-06-aviso-chegada-admin-130";',
  `const VERSION = "${AVISO_VERSION}";`,
  'versão do módulo de aviso'
);
const badgeStart = `  function badge(cel, m) {\n    if (!cel || !m) return;`;
const badgeStartNovo = `  function badge(cel, m) {\n    if (!cel || !m) return;\n    const linha = cel.closest?.("tr");\n    if (linha?.querySelector?.('[data-chegada-avisada-nativa="1"]') || linha?.dataset?.chegadaAvisadaNativa === "1") return;`;
aviso = replaceOnce(aviso, badgeStart, badgeStartNovo, 'proteção contra badge duplicado');
write('corponu-aviso-chegada-admin-130.js', aviso);

// ---------------- release/cache ----------------
let index = read('index.html');
if (!index.includes(OLD_RELEASE)) throw new Error('Release 261 não encontrado no index.html');
index = index.split(OLD_RELEASE).join(NEW_RELEASE);
index = index.replace(/<meta name="app-version" content="[^"]+"\s*\/>/, `<meta name="app-version" content="${NEW_RELEASE}" />`);
write('index.html', index);

let update = read('update.js');
if (!update.includes(`const APP_VERSION = "${OLD_RELEASE}";`)) throw new Error('APP_VERSION 261 não encontrado');
update = update.replace(`const APP_VERSION = "${OLD_RELEASE}";`, `const APP_VERSION = "${NEW_RELEASE}";`);
write('update.js', update);

let updater = read('corponu-atualizador.js');
if (!updater.includes(`const LOCAL_RELEASE = "${OLD_RELEASE}";`)) throw new Error('LOCAL_RELEASE 261 não encontrado');
updater = updater.replace(`const LOCAL_RELEASE = "${OLD_RELEASE}";`, `const LOCAL_RELEASE = "${NEW_RELEASE}";`);
write('corponu-atualizador.js', updater);

const notes = 'Produção. Corrigido o aviso de chegada que aparecia e desaparecia na OP da aba Facções. O estado chegadaInformada agora é renderizado nativamente pela própria tabela oficial, junto ao Status da movimentação, incluindo quem avisou e a data quando disponíveis. A busca da tabela também reconhece chegada avisada. A área Lateral e Alça recebeu o mesmo tratamento nativo. O módulo legado de aviso foi mantido somente para compatibilidade do fluxo de usuário/admin, mas passou a não injetar badge quando a linha já contém o aviso nativo, eliminando concorrência visual e duplicidade. O filtro Chegada da versão 261 foi preservado. Nenhuma regra do Firebase foi alterada.';
write('corponu-release.json', JSON.stringify({ version: NEW_RELEASE, updatedAt: '2026-08-27T17:30:00-03:00', notes }, null, 2) + '\n');
write('version.json', JSON.stringify({ version: NEW_RELEASE, updatedAt: '2026-08-27T17:30:00-03:00', notes: 'Aviso de chegada agora é renderizado nativamente na OP e não depende de reinjeção visual posterior.' }, null, 2) + '\n');

// ---------------- pós-condições ----------------
const appFinal = read('app.js');
const lateralFinal = read('corponu-faccoes-lateral-alca-254.js');
const avisoFinal = read('corponu-aviso-chegada-admin-130.js');
for (const token of [
  'function htmlChegadaAvisadaFaccoes(',
  'data-chegada-avisada-nativa="1"',
  '${htmlChegadaAvisadaFaccoes(mov)}',
  'chegada avisada aguardando baixa'
]) if (!appFinal.includes(token)) throw new Error(`Pós-condição app.js ausente: ${token}`);
for (const token of ['function chegadaAvisadaNativa(', 'htmlChegadaAvisadaNativa(item)', 'data-chegada-avisada-nativa="1"']) {
  if (!lateralFinal.includes(token)) throw new Error(`Pós-condição Lateral/Alça ausente: ${token}`);
}
if (!avisoFinal.includes(AVISO_VERSION) || !avisoFinal.includes('linha?.querySelector?.(\'[data-chegada-avisada-nativa="1"]\')')) {
  throw new Error('Módulo legado não recebeu a proteção de duplicidade.');
}
if (!read('corponu-atualizador.js').includes(NEW_RELEASE) || !read('update.js').includes(NEW_RELEASE)) throw new Error('Release 262 não aplicado nos atualizadores');

console.log('Aviso de chegada nativo 262 aplicado com sucesso.');
