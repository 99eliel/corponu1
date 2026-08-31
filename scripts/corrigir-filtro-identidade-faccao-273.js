const fs = require('fs');

const OLD = '2026-08-31-faccoes-processos-estavel-272';
const RELEASE = '2026-08-31-faccoes-filtro-identidade-273';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function replaceOnce(text, before, after, label) {
  const first = text.indexOf(before);
  assert(first >= 0, `${label}: bloco não encontrado.`);
  assert(text.indexOf(before, first + before.length) < 0, `${label}: bloco duplicado/ambíguo.`);
  return text.slice(0, first) + after + text.slice(first + before.length);
}
function replaceFunctionRange(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  assert(start >= 0, `${label}: início não encontrado.`);
  const end = text.indexOf(endMarker, start);
  assert(end > start, `${label}: fim não encontrado.`);
  assert(text.indexOf(startMarker, start + startMarker.length) < 0, `${label}: início duplicado/ambíguo.`);
  return text.slice(0, start) + replacement + '\n\n' + text.slice(end);
}

let app = read('app.js');

// O select de Facção deixa de usar o texto cru como chave. A identidade é resolvida
// em um único lugar e continua compatível com movimentações históricas sem destinoId.
app = replaceOnce(
  app,
  `function preencherFiltrosFaccoesMovimentacoes(movimentosBase) {\n  preencherSelectProcessos("faccaoMovFiltroNome", movimentosBase.map(mov => mov.destino), "Todas");\n  preencherSelectProcessos("faccaoMovFiltroProcesso", movimentosBase.map(mov => mov.processo), "Todos");\n}`,
  `function preencherFiltrosFaccoesMovimentacoes(movimentosBase) {\n  preencherFiltroFaccaoPorIdentidade(movimentosBase);\n  preencherSelectProcessos("faccaoMovFiltroProcesso", movimentosBase.map(mov => mov.processo), "Todos");\n}`,
  'preenchimento do filtro de facção'
);

const novoBlocoIdentidade = `function chaveExataFaccoes(valor) {
  return normalizarTexto(String(valor ?? "").trim()).replace(/\\s+/g, " ").trim();
}

function getFaccaoCadastroPorIdFiltro(id) {
  const chave = String(id ?? "").trim();
  if (!chave) return null;

  const encontrada = (state.faccoes || []).find(faccao => String(faccao?.id || "").trim() === chave) || null;
  if (!encontrada?.duplicadaDe) return encontrada;

  return (state.faccoes || []).find(faccao => String(faccao?.id || "").trim() === String(encontrada.duplicadaDe)) || encontrada;
}

function getFaccaoCadastroPorNomeExatoFiltro(nome) {
  const chave = chaveExataFaccoes(nome);
  if (!chave) return null;

  const candidatos = (state.faccoes || [])
    .filter(faccao => chaveExataFaccoes(faccao?.nome) === chave)
    .map(faccao => faccao?.duplicadaDe ? (getFaccaoCadastroPorIdFiltro(faccao.duplicadaDe) || faccao) : faccao)
    .filter(Boolean);

  if (!candidatos.length) return null;

  const unicos = new Map();
  candidatos.forEach(faccao => {
    const id = String(faccao?.id || "").trim();
    if (id && !unicos.has(id)) unicos.set(id, faccao);
  });

  const lista = [...unicos.values()];
  const ativos = lista.filter(faccao => faccao?.ativo !== false && faccao?.statusImportacao !== "duplicada_consolidada");
  return ativos[0] || lista[0] || null;
}

function identidadeFaccaoMovimentacao(mov) {
  const destinoId = String(mov?.destinoId || "").trim();
  const cadastroPorId = destinoId ? getFaccaoCadastroPorIdFiltro(destinoId) : null;

  if (cadastroPorId?.id) {
    return {
      chave: ` + "`id:${String(cadastroPorId.id).trim()}`" + `,
      nome: String(cadastroPorId.nome || mov?.destino || "").trim(),
      id: String(cadastroPorId.id).trim()
    };
  }

  const cadastroPorNome = getFaccaoCadastroPorNomeExatoFiltro(mov?.destino);
  if (cadastroPorNome?.id) {
    return {
      chave: ` + "`id:${String(cadastroPorNome.id).trim()}`" + `,
      nome: String(cadastroPorNome.nome || mov?.destino || "").trim(),
      id: String(cadastroPorNome.id).trim()
    };
  }

  const nome = String(mov?.destino || "").trim();
  const chaveNome = chaveExataFaccoes(nome);
  return {
    chave: chaveNome ? ` + "`nome:${chaveNome}`" + ` : "",
    nome,
    id: ""
  };
}

function nomeFaccaoResolvidoMovimentacao(mov) {
  return identidadeFaccaoMovimentacao(mov).nome || String(mov?.destino || "").trim() || "-";
}

function valorFiltroFaccaoParaIdentidade(valor) {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";
  if (/^(?:id|nome):/i.test(texto)) return texto;

  const cadastro = getFaccaoCadastroPorNomeExatoFiltro(texto);
  if (cadastro?.id) return ` + "`id:${String(cadastro.id).trim()}`" + `;

  const chave = chaveExataFaccoes(texto);
  return chave ? ` + "`nome:${chave}`" + ` : "";
}

function preencherFiltroFaccaoPorIdentidade(movimentosBase) {
  const select = document.getElementById("faccaoMovFiltroNome");
  if (!(select instanceof HTMLSelectElement)) return;

  const valorAtual = select.value;
  const textoAtual = String(select.options?.[select.selectedIndex]?.textContent || "").trim();
  const mapa = new Map();

  (movimentosBase || []).forEach(mov => {
    const identidade = identidadeFaccaoMovimentacao(mov);
    if (!identidade.chave || !identidade.nome) return;
    if (!mapa.has(identidade.chave)) mapa.set(identidade.chave, identidade.nome);
  });

  const itens = [...mapa.entries()]
    .map(([chave, nome]) => ({ chave, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));

  select.innerHTML = '<option value="">Todas</option>' + itens.map(item => (
    ` + "`<option value=\"${escapeHtml(item.chave)}\">${escapeHtml(item.nome)}</option>`" + `
  )).join("");

  if (itens.some(item => item.chave === valorAtual)) {
    select.value = valorAtual;
    return;
  }

  const chaveTextoAtual = chaveExataFaccoes(textoAtual);
  if (!chaveTextoAtual || chaveTextoAtual === "todas") return;

  const candidatos = itens.filter(item => chaveExataFaccoes(item.nome) === chaveTextoAtual);
  if (candidatos.length === 1) select.value = candidatos[0].chave;
}

function resolverFaccaoExataNaBusca(movimentosBase, busca) {
  const chaveBusca = chaveExataFaccoes(busca);
  if (!chaveBusca) return "";

  const identidades = new Set();
  (movimentosBase || []).forEach(mov => {
    const identidade = identidadeFaccaoMovimentacao(mov);
    if (identidade.chave && chaveExataFaccoes(identidade.nome) === chaveBusca) {
      identidades.add(identidade.chave);
    }
  });

  return identidades.size === 1 ? [...identidades][0] : "";
}

function filtrarMovimentacoesFaccoes(movimentosBase, filtros, opcoes = {}) {
  const faccaoFiltroIdentidade = valorFiltroFaccaoParaIdentidade(filtros.faccao);
  const faccaoBuscaIdentidade = resolverFaccaoExataNaBusca(movimentosBase, filtros.busca);

  let movimentos = (movimentosBase || []).filter(mov => {
    const status = mov.status || "em_andamento";
    const dataFiltro = getDataMovimentacaoFaccoes(mov, filtros.tipoData);
    const identidadeFaccao = identidadeFaccaoMovimentacao(mov);
    const nomeFaccao = identidadeFaccao.nome || mov.destino || "";

    const texto = normalizarTexto([
      mov.numeroOP,
      mov.referencia,
      mov.cor,
      nomeFaccao,
      mov.destino,
      mov.processo,
      status,
      labelStatusMovimento(status),
      mov.dataEnvio,
      mov.dataChegada,
      ehMovimentacaoSutiaFaccoes(mov) && situacaoChegadaFaccoes(mov) === "avisada" ? "chegada avisada aguardando baixa" : "",
      mov.chegadaInformadaPorNome,
      mov.chegadaInformadaData
    ].join(" "));

    if (filtros.busca) {
      if (faccaoBuscaIdentidade) {
        if (identidadeFaccao.chave !== faccaoBuscaIdentidade) return false;
      } else if (!texto.includes(filtros.busca)) {
        return false;
      }
    }
    if (faccaoFiltroIdentidade && identidadeFaccao.chave !== faccaoFiltroIdentidade) return false;
    if (filtros.processo && String(mov.processo || "").trim() !== String(filtros.processo || "").trim()) return false;
    if (filtros.status && status !== filtros.status) return false;
    if (filtros.chegada && situacaoChegadaFaccoes(mov) !== filtros.chegada) return false;
    if (filtros.dataInicio && (!dataFiltro || dataFiltro < filtros.dataInicio)) return false;
    if (filtros.dataFim && (!dataFiltro || dataFiltro > filtros.dataFim)) return false;

    return true;
  });

  if (opcoes.respeitarAbaAtiva === true) {
    const aba = getAbaAtivaFaccoesRelatorio();
    if (aba === "sutia") movimentos = movimentos.filter(ehMovimentacaoSutiaFaccoes);
    if (aba === "calcinha") movimentos = movimentos.filter(ehMovimentacaoCalcinhaFaccoes);
  }

  return movimentos;
}`;

app = replaceFunctionRange(
  app,
  'function chaveExataFaccoes(valor) {',
  'function labelSituacaoChegadaFaccoes(valor) {',
  novoBlocoIdentidade,
  'identidade e filtro de facções'
);

// O resumo mostra o rótulo humano do select, nunca a chave técnica id:/nome:.
app = replaceOnce(
  app,
  '${filtros.faccao ? ` | Facção: ${escapeHtml(filtros.faccao)}` : ""}',
  '${filtros.faccao ? ` | Facção: ${escapeHtml(textoSelectFaccoesRelatorio("faccaoMovFiltroNome", filtros.faccao))}` : ""}',
  'resumo visual do filtro'
);

// Tela e impressão exibem o nome resolvido pela mesma identidade usada no filtro.
{
  const inicio = app.indexOf('function imprimirRelatorioFaccoesFiltrado() {');
  const fim = app.indexOf('function limparFiltrosFaccoesMovimentacoes() {', inicio);
  assert(inicio >= 0 && fim > inicio, 'relatório de Facções não localizado.');
  let bloco = app.slice(inicio, fim);
  bloco = replaceOnce(
    bloco,
    '<td>${escapeHtml(mov.destino || "-")}</td>',
    '<td>${escapeHtml(nomeFaccaoResolvidoMovimentacao(mov))}</td>',
    'nome da facção no relatório'
  );
  app = app.slice(0, inicio) + bloco + app.slice(fim);
}

{
  const inicio = app.indexOf('function renderFaccoesMovimentacoes() {');
  const fim = app.indexOf('function editarFaccao(id) {', inicio);
  assert(inicio >= 0 && fim > inicio, 'tabela de movimentações de Facções não localizada.');
  let bloco = app.slice(inicio, fim);
  bloco = replaceOnce(
    bloco,
    '<td><strong>${escapeHtml(mov.destino || "-")}</strong></td>',
    '<td><strong>${escapeHtml(nomeFaccaoResolvidoMovimentacao(mov))}</strong></td>',
    'nome da facção na tabela'
  );
  app = app.slice(0, inicio) + bloco + app.slice(fim);
}

assert(app.includes('function identidadeFaccaoMovimentacao(mov) {'), 'helper de identidade não foi criado.');
assert(app.includes('preencherFiltroFaccaoPorIdentidade(movimentosBase);'), 'select não usa identidade.');
assert(app.includes('identidadeFaccao.chave !== faccaoFiltroIdentidade'), 'filtro não compara identidade.');
write('app.js', app);

// Cache-busting e release. Não altera layout nem módulos da 272.
{
  let html = read('index.html');
  const ocorrencias = html.split(OLD).length - 1;
  assert(ocorrencias >= 3, `index.html: release 272 apareceu apenas ${ocorrencias} vez(es).`);
  html = html.split(OLD).join(RELEASE);
  assert(html.includes(`app.js?v=${RELEASE}`), 'app.js não recebeu cache-busting 273.');
  write('index.html', html);
}

{
  let js = read('update.js');
  js = replaceOnce(js, `const APP_VERSION = "${OLD}";`, `const APP_VERSION = "${RELEASE}";`, 'update.js release');
  write('update.js', js);
}

{
  let js = read('corponu-atualizador.js');
  js = replaceOnce(js, `const LOCAL_RELEASE = "${OLD}";`, `const LOCAL_RELEASE = "${RELEASE}";`, 'atualizador release');
  write('corponu-atualizador.js', js);
}

const notes = 'Produção. Corrige exclusivamente o filtro e o relatório de Facções para identificar a facção pelo cadastro real da movimentação. Quando destinoId existe, ele passa a ser a chave principal; movimentações históricas sem destinoId usam correspondência exata de nome como compatibilidade. Isso impede Camila de absorver Camila Furtado ou outras facções com nome iniciado igual. O select, a tabela, a busca por nome exato e o relatório usam a mesma identidade canônica em memória, sem leituras extras e sem alterar documentos do Firebase. Nenhuma outra área do sistema foi modificada e nenhuma regra do Firebase mudou.';
for (const path of ['corponu-release.json', 'version.json']) {
  const json = JSON.parse(read(path));
  json.version = RELEASE;
  json.updatedAt = '2026-08-31T14:44:00-03:00';
  json.notes = notes;
  write(path, JSON.stringify(json, null, 2) + '\n');
}

console.log(`Filtro de identidade de facção preparado: ${RELEASE}`);
