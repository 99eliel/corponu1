const fs = require('fs');

const OLD = '2026-08-27-faccoes-aviso-chegada-sutia-estavel-263';
const NEW = '2026-08-27-pagamentos-carregamento-estavel-264';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function replaceOnce(text, search, replacement, label) {
  const i = text.indexOf(search);
  if (i < 0) throw new Error(`Bloco não encontrado: ${label}`);
  if (text.indexOf(search, i + search.length) >= 0) throw new Error(`Bloco duplicado: ${label}`);
  return text.slice(0, i) + replacement + text.slice(i + search.length);
}

// 1) Carregador: a navegação/pintura da página deve acontecer antes dos módulos secundários.
let atualizador = read('corponu-atualizador.js');
atualizador = replaceOnce(atualizador, `const LOCAL_RELEASE = "${OLD}";`, `const LOCAL_RELEASE = "${NEW}";`, 'release do atualizador');

const oldLoad = `  function carregarModulosDaPagina(pagina) {\n    const chave = String(pagina || "").trim();\n    const modulos = MODULOS_POR_PAGINA[chave];\n    if (!modulos?.length) return;\n    carregarGrupo(modulos);\n  }`;
const newLoad = `  function carregarModulosDaPagina(pagina) {\n    const chave = String(pagina || "").trim();\n    const modulos = MODULOS_POR_PAGINA[chave];\n    if (!modulos?.length) return;\n    carregarGrupo(modulos);\n  }\n\n  // A navegação é prioritária. Módulos complementares entram somente depois\n  // de pelo menos um ciclo de pintura, evitando a tela ativa ficar visualmente\n  // vazia enquanto vários scripts de uma página são inicializados.\n  function carregarModulosDepoisDaNavegacao(pagina) {\n    const chave = String(pagina || "").trim();\n    if (!chave) return;\n\n    const executar = () => {\n      const paginaAtiva = document.querySelector(".nav-btn.active[data-page]")?.dataset?.page || "";\n      if (paginaAtiva === chave) carregarModulosDaPagina(chave);\n    };\n\n    if (typeof window.requestAnimationFrame === "function") {\n      window.requestAnimationFrame(() => window.requestAnimationFrame(executar));\n    } else {\n      window.setTimeout(executar, 0);\n    }\n  }`;
atualizador = replaceOnce(atualizador, oldLoad, newLoad, 'prioridade da navegação');

const oldClick = `      const botaoPagina = alvo?.closest?.(".nav-btn[data-page]");\n      if (botaoPagina) carregarModulosDaPagina(botaoPagina.dataset.page);`;
const newClick = `      const botaoPagina = alvo?.closest?.(".nav-btn[data-page]");\n      if (botaoPagina) carregarModulosDepoisDaNavegacao(botaoPagina.dataset.page);`;
atualizador = replaceOnce(atualizador, oldClick, newClick, 'clique lazy das páginas');
write('corponu-atualizador.js', atualizador);

// 2) Página: estado canônico de carregamento, sem duplicar a interface financeira.
let index = read('index.html');
if (!index.includes(OLD)) throw new Error('Release 263 não encontrado no index.html');
index = index.split(OLD).join(NEW);
index = replaceOnce(
  index,
  `<section id="pagamentos" class="page">\n        <div class="panel pagamentos-relatorio-panel">`,
  `<section id="pagamentos" class="page">\n        <div id="pagamentosEstadoCarregamento" class="notice small hidden" role="status" aria-live="polite">Carregando pagamentos...</div>\n        <div class="panel pagamentos-relatorio-panel">`,
  'estado de carregamento no Pagamentos'
);
// O atualizador era referenciado por uma query antiga; alinhar para o navegador buscar a arquitetura nova.
index = index.replace(
  /<script src="\.\/corponu-atualizador\.js\?v=[^"]+"><\/script>/,
  `<script src="./corponu-atualizador.js?v=${NEW}"></script>`
);
write('index.html', index);

// 3) app.js: o indicador segue o mesmo estado já usado pelo listener oficial de entregas.
let app = read('app.js');
if (app.includes('function atualizarEstadoCarregamentoPagamentos(')) throw new Error('Indicador de Pagamentos já existe no app.js');
const marker = 'function carregarEntregasPagamentoSeNecessario() {';
const helper = `function atualizarEstadoCarregamentoPagamentos(estado = "automatico") {\n  const aviso = document.getElementById("pagamentosEstadoCarregamento");\n  if (!aviso) return;\n\n  if (estado === "erro") {\n    aviso.textContent = "Não foi possível carregar os pagamentos. Use Atualizar para tentar novamente.";\n    aviso.classList.remove("hidden");\n    aviso.classList.add("danger-notice");\n    return;\n  }\n\n  aviso.classList.remove("danger-notice");\n  const carregado = state.dadosCarregados.entregasPagamento === true;\n  aviso.textContent = carregado ? "" : "Carregando pagamentos...";\n  aviso.classList.toggle("hidden", carregado);\n}\n\n`;
app = replaceOnce(app, marker, helper + marker, 'helper de carregamento de Pagamentos');

app = replaceOnce(
  app,
  `  state.carregandoDados.entregasPagamento = true;\n\n  const entregasPagamentoQuery = query(collection(db, "entregasPagamento"), orderBy("dataEntrega", "desc"));`,
  `  state.carregandoDados.entregasPagamento = true;\n  atualizarEstadoCarregamentoPagamentos();\n\n  const entregasPagamentoQuery = query(collection(db, "entregasPagamento"), orderBy("dataEntrega", "desc"));`,
  'início do carregamento financeiro'
);
app = replaceOnce(
  app,
  `    marcarCarregado("entregasPagamento");\n    renderPagamentos();`,
  `    marcarCarregado("entregasPagamento");\n    atualizarEstadoCarregamentoPagamentos();\n    renderPagamentos();`,
  'fim do carregamento financeiro'
);
app = replaceOnce(
  app,
  `    state.carregandoDados.entregasPagamento = false;\n    console.error(error);\n    toast("Erro ao carregar entregas de pagamento. Verifique as permissões.");`,
  `    state.carregandoDados.entregasPagamento = false;\n    atualizarEstadoCarregamentoPagamentos("erro");\n    console.error(error);\n    toast("Erro ao carregar entregas de pagamento. Verifique as permissões.");`,
  'erro do carregamento financeiro'
);
app = replaceOnce(
  app,
  `  if (page === "pagamentos") {\n    carregarEntregasPagamentoSeNecessario();`,
  `  if (page === "pagamentos") {\n    atualizarEstadoCarregamentoPagamentos();\n    carregarEntregasPagamentoSeNecessario();`,
  'abertura da página Pagamentos'
);
write('app.js', app);

// 4) Release/cache.
let update = read('update.js');
update = replaceOnce(update, `const APP_VERSION = "${OLD}";`, `const APP_VERSION = "${NEW}";`, 'APP_VERSION');
write('update.js', update);

const notes = 'Produção. Estabilizado o primeiro carregamento da aba Pagamentos. O HTML financeiro continua sendo a única interface canônica; não foi criada tela paralela. O carregador sob demanda deixou de injetar os módulos complementares antes da navegação: a página agora é ativada e tem um ciclo de pintura antes de os scripts secundários entrarem, eliminando o intervalo em que apenas o título aparecia. Enquanto o listener oficial de entregas ainda aguarda o primeiro snapshot, a própria página mostra Carregando pagamentos; ao concluir, o aviso some pelo mesmo estado dadosCarregados.entregasPagamento. Em erro, o aviso informa a falha. Nenhuma consulta nova ao Firestore, observer novo ou regra Firebase foi criada.';
write('corponu-release.json', JSON.stringify({ version: NEW, updatedAt: '2026-08-27T21:48:00-03:00', notes }, null, 2) + '\n');
write('version.json', JSON.stringify({ version: NEW, updatedAt: '2026-08-27T21:48:00-03:00', notes: 'Pagamentos abre e pinta antes dos módulos complementares e informa o carregamento dos dados.' }, null, 2) + '\n');

// Pós-condições.
const a = read('app.js');
const i = read('index.html');
const c = read('corponu-atualizador.js');
for (const token of ['function atualizarEstadoCarregamentoPagamentos(', 'atualizarEstadoCarregamentoPagamentos("erro")', 'pagamentosEstadoCarregamento']) {
  if (!a.includes(token) && !i.includes(token)) throw new Error(`Pós-condição ausente: ${token}`);
}
for (const token of ['function carregarModulosDepoisDaNavegacao(', 'requestAnimationFrame(() => window.requestAnimationFrame(executar))', 'carregarModulosDepoisDaNavegacao(botaoPagina.dataset.page)']) {
  if (!c.includes(token)) throw new Error(`Pós-condição do loader ausente: ${token}`);
}
for (const path of ['index.html', 'update.js', 'corponu-atualizador.js', 'corponu-release.json', 'version.json']) {
  if (!read(path).includes(NEW)) throw new Error(`Release 264 ausente em ${path}`);
}
console.log('Carregamento estrutural de Pagamentos 264 aplicado com sucesso.');
