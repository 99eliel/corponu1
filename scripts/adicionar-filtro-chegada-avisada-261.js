const fs = require('fs');

const VERSION = '2026-08-27-faccoes-filtro-chegada-avisada-261';
const OLD_VERSION = '2026-08-26-faccoes-sem-chegada-manual-260';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

function replaceOnce(text, search, replacement, label) {
  const first = text.indexOf(search);
  if (first < 0) throw new Error(`Bloco não encontrado: ${label}`);
  if (text.indexOf(search, first + search.length) >= 0) {
    throw new Error(`Bloco duplicado inesperadamente: ${label}`);
  }
  return text.slice(0, first) + replacement + text.slice(first + search.length);
}

function replaceRegexOnce(text, regex, replacement, label) {
  const matches = [...text.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'))];
  if (matches.length !== 1) throw new Error(`${label}: esperado 1 bloco, encontrado ${matches.length}`);
  return text.replace(regex, replacement);
}

let index = read('index.html');
if (index.includes('id="faccaoMovFiltroChegada"')) {
  throw new Error('O filtro de chegada já existe no index.html; abortando para evitar aplicação duplicada.');
}

const statusBlock = `            <label>\n              Status\n              <select id="faccaoMovFiltroStatus">\n                <option value="">Todos</option>\n                <option value="em_andamento">Em facção</option>\n                <option value="retornou">Retornou</option>\n                <option value="encaminhado">Saiu da facção</option>\n                <option value="finalizado">Bipado</option>\n              </select>\n            </label>\n`;

const chegadaBlock = `${statusBlock}\n            <label>\n              Chegada\n              <select id="faccaoMovFiltroChegada">\n                <option value="">Todas</option>\n                <option value="nao_avisada">Não avisada</option>\n                <option value="avisada">Avisada • aguardando baixa</option>\n                <option value="confirmada">Baixa confirmada</option>\n              </select>\n            </label>\n`;

index = replaceOnce(index, statusBlock, chegadaBlock, 'filtro Status de Facções');
index = index.replace(/<meta name="app-version" content="[^"]+"\s*\/>/, `<meta name="app-version" content="${VERSION}" />`);
index = index.split(OLD_VERSION).join(VERSION);
write('index.html', index);

let app = read('app.js');
if (app.includes('function situacaoChegadaFaccoes(') || app.includes('faccaoMovFiltroChegada')) {
  throw new Error('A lógica do filtro de chegada já existe no app.js; abortando para evitar sobreposição.');
}

app = replaceRegexOnce(
  app,
  /(\s*"faccaoMovFiltroStatus",\s*\n)(\s*)"faccaoMovFiltroDataTipo"/,
  `$1$2"faccaoMovFiltroChegada",\n$2"faccaoMovFiltroDataTipo"`,
  'listener dos filtros de Facções'
);

const markerGetFiltros = 'function getFiltrosFaccoesMovimentacoes() {';
const helper = `function situacaoChegadaFaccoes(mov) {\n  const statusAviso = String(mov?.chegadaInformadaStatus || "").trim().toLowerCase();\n  const avisadaAguardandoBaixa = mov?.chegadaInformada === true &&\n    statusAviso !== "confirmada_admin" &&\n    !mov?.dataChegada;\n\n  if (avisadaAguardandoBaixa) return "avisada";\n\n  const baixaConfirmada = Boolean(mov?.dataChegada) ||\n    mov?.confirmacaoChegadaFinanceira === true ||\n    statusAviso === "confirmada_admin";\n\n  if (baixaConfirmada) return "confirmada";\n  return "nao_avisada";\n}\n\n`;
app = replaceOnce(app, markerGetFiltros, helper + markerGetFiltros, 'início de getFiltrosFaccoesMovimentacoes');

app = replaceRegexOnce(
  app,
  /(status:\s*document\.getElementById\("faccaoMovFiltroStatus"\)\?\.value\s*\|\|\s*"",\s*\n)(\s*)tipoData:/,
  `$1$2chegada: document.getElementById("faccaoMovFiltroChegada")?.value || "",\n$2tipoData:`,
  'leitura do filtro Status de Facções'
);

app = replaceRegexOnce(
  app,
  /(\s*"faccaoMovFiltroStatus",\s*\n)(\s*)"faccaoMovFiltroDataInicio"/,
  `$1$2"faccaoMovFiltroChegada",\n$2"faccaoMovFiltroDataInicio"`,
  'limpeza dos filtros de Facções'
);

const filtroFaccoesBlock = `    if (filtros.processo && String(mov.processo || "") !== filtros.processo) return false;\n    if (filtros.status && status !== filtros.status) return false;\n    if (filtros.dataInicio && (!dataFiltro || dataFiltro < filtros.dataInicio)) return false;`;
const filtroFaccoesComChegada = `    if (filtros.processo && String(mov.processo || "") !== filtros.processo) return false;\n    if (filtros.status && status !== filtros.status) return false;\n    if (filtros.chegada && situacaoChegadaFaccoes(mov) !== filtros.chegada) return false;\n    if (filtros.dataInicio && (!dataFiltro || dataFiltro < filtros.dataInicio)) return false;`;
app = replaceOnce(app, filtroFaccoesBlock, filtroFaccoesComChegada, 'bloco exclusivo de filtros em renderFaccoesMovimentacoes');

const retornaramLine = '  const retornaram = movimentos.filter(mov => mov.status === "retornou" || mov.status === "encaminhado" || mov.status === "finalizado").length;';
app = replaceOnce(
  app,
  retornaramLine,
  `${retornaramLine}\n  const avisadasAguardandoBaixa = movimentos.filter(mov => situacaoChegadaFaccoes(mov) === "avisada").length;`,
  'resumo de Facções - retornaram'
);

const resumoLinha = '    ${totalOps.toLocaleString("pt-BR")} OPs | ${totalPecas.toLocaleString("pt-BR")} peças ${nomeData} | ${totalRecebidas.toLocaleString("pt-BR")} recebidas | ${emAberto.toLocaleString("pt-BR")} em aberto | ${retornaram.toLocaleString("pt-BR")} retornadas/encaminhadas<br>';
app = replaceOnce(
  app,
  resumoLinha,
  '    ${totalOps.toLocaleString("pt-BR")} OPs | ${totalPecas.toLocaleString("pt-BR")} peças ${nomeData} | ${totalRecebidas.toLocaleString("pt-BR")} recebidas | ${emAberto.toLocaleString("pt-BR")} em aberto | ${retornaram.toLocaleString("pt-BR")} retornadas/encaminhadas | ${avisadasAguardandoBaixa.toLocaleString("pt-BR")} avisadas aguardando baixa<br>',
  'texto do resumo de Facções'
);

write('app.js', app);

let update = read('update.js');
if (!update.includes(`const APP_VERSION = "${OLD_VERSION}";`)) {
  throw new Error('APP_VERSION esperado não encontrado no update.js');
}
update = update.replace(`const APP_VERSION = "${OLD_VERSION}";`, `const APP_VERSION = "${VERSION}";`);
write('update.js', update);

let updater = read('corponu-atualizador.js');
if (!updater.includes(`const LOCAL_RELEASE = "${OLD_VERSION}";`)) {
  throw new Error('LOCAL_RELEASE esperado não encontrado no corponu-atualizador.js');
}
updater = updater.replace(`const LOCAL_RELEASE = "${OLD_VERSION}";`, `const LOCAL_RELEASE = "${VERSION}";`);
write('corponu-atualizador.js', updater);

const notes = 'Produção. A aba Facções ganhou um filtro próprio de Chegada, separado do Status da movimentação. O filtro permite ver Todas, Não avisada, Avisada • aguardando baixa e Baixa confirmada. A classificação usa os campos reais já gravados pelo fluxo de aviso de chegada (chegadaInformada, chegadaInformadaStatus, confirmacaoChegadaFinanceira e dataChegada) e trabalha somente sobre state.movimentacoesProducao já carregado, sem criar consultas adicionais ao Firestore, observers ou caminhos paralelos. O resumo do filtro também mostra quantas movimentações estão avisadas aguardando baixa do administrador. O fluxo usuário comum avisa → administrador confirma continua inalterado. version.json foi realinhado ao release atual para evitar divergência de cache/versão. Nenhuma regra do Firebase foi alterada.';

write('corponu-release.json', JSON.stringify({
  version: VERSION,
  updatedAt: '2026-08-27T17:08:00-03:00',
  notes
}, null, 2) + '\n');

write('version.json', JSON.stringify({
  version: VERSION,
  updatedAt: '2026-08-27T17:08:00-03:00',
  notes: 'Versão alinhada ao release principal. Inclui filtro de Chegada em Facções para distinguir aviso aguardando baixa de baixa confirmada.'
}, null, 2) + '\n');

const indexFinal = read('index.html');
const appFinal = read('app.js');
const obrigatoriosIndex = [
  'id="faccaoMovFiltroChegada"',
  'value="avisada">Avisada • aguardando baixa',
  'value="confirmada">Baixa confirmada'
];
const obrigatoriosApp = [
  'function situacaoChegadaFaccoes(',
  'faccaoMovFiltroChegada',
  'filtros.chegada && situacaoChegadaFaccoes(mov) !== filtros.chegada',
  'avisadasAguardandoBaixa'
];
for (const token of obrigatoriosIndex) if (!indexFinal.includes(token)) throw new Error(`Pós-condição ausente no index: ${token}`);
for (const token of obrigatoriosApp) if (!appFinal.includes(token)) throw new Error(`Pós-condição ausente no app: ${token}`);
if (!read('update.js').includes(VERSION)) throw new Error('update.js não recebeu a nova versão');
if (!read('corponu-atualizador.js').includes(VERSION)) throw new Error('corponu-atualizador.js não recebeu a nova versão');

console.log('Filtro de chegada avisada 261 aplicado e validado estruturalmente.');
