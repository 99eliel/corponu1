const fs = require('fs');

const RELEASE_ANTERIOR = '2026-08-31-processos-sutia-singleflight-268';
const RELEASE_NOVA = '2026-08-31-faccoes-filtro-exato-nome-269';
const DATA_RELEASE = '2026-08-31T09:25:00-03:00';

function ler(path) { return fs.readFileSync(path, 'utf8'); }
function gravar(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function replaceOnce(source, oldText, newText, description) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`Trecho não encontrado: ${description}`);
  if (source.indexOf(oldText, first + oldText.length) >= 0) throw new Error(`Trecho duplicado/ambíguo: ${description}`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

const appPath = 'app.js';
let app = ler(appPath);

const marcador = `function filtrarMovimentacoesFaccoes(movimentosBase, filtros, opcoes = {}) {\n  let movimentos = (movimentosBase || []).filter(mov => {`;
const novoInicio = `function chaveExataFaccoes(valor) {\n  return normalizarTexto(String(valor ?? "").trim());\n}\n\nfunction resolverFaccaoExataNaBusca(movimentosBase, busca) {\n  const chaveBusca = chaveExataFaccoes(busca);\n  if (!chaveBusca) return "";\n\n  const nomes = new Set(\n    (movimentosBase || [])\n      .map(mov => chaveExataFaccoes(mov?.destino))\n      .filter(Boolean)\n  );\n\n  return nomes.has(chaveBusca) ? chaveBusca : "";\n}\n\nfunction filtrarMovimentacoesFaccoes(movimentosBase, filtros, opcoes = {}) {\n  const faccaoFiltroExata = chaveExataFaccoes(filtros.faccao);\n  const faccaoBuscaExata = resolverFaccaoExataNaBusca(movimentosBase, filtros.busca);\n\n  let movimentos = (movimentosBase || []).filter(mov => {`;
app = replaceOnce(app, marcador, novoInicio, 'início do filtro canônico de Facções');

const filtrosAntigos = `    if (filtros.busca && !texto.includes(filtros.busca)) return false;\n    if (filtros.faccao && String(mov.destino || "") !== filtros.faccao) return false;\n    if (filtros.processo && String(mov.processo || "") !== filtros.processo) return false;`;
const filtrosNovos = `    if (filtros.busca) {\n      if (faccaoBuscaExata) {\n        if (chaveExataFaccoes(mov.destino) !== faccaoBuscaExata) return false;\n      } else if (!texto.includes(filtros.busca)) {\n        return false;\n      }\n    }\n    if (faccaoFiltroExata && chaveExataFaccoes(mov.destino) !== faccaoFiltroExata) return false;\n    if (filtros.processo && String(mov.processo || "").trim() !== String(filtros.processo || "").trim()) return false;`;
app = replaceOnce(app, filtrosAntigos, filtrosNovos, 'comparações de busca/facção/processo');

gravar(appPath, app);

for (const path of ['update.js', 'corponu-atualizador.js', 'index.html']) {
  let src = ler(path);
  if (!src.includes(RELEASE_ANTERIOR)) throw new Error(`${path}: release anterior não encontrado`);
  src = src.split(RELEASE_ANTERIOR).join(RELEASE_NOVA);
  gravar(path, src);
}

gravar('version.json', JSON.stringify({
  version: RELEASE_NOVA,
  updatedAt: DATA_RELEASE,
  notes: 'Facções: a busca pelo nome de uma facção agora resolve nomes completos de forma exata. Se existir CAMILA e CAMILA FIRMINO, buscar CAMILA retorna somente CAMILA; buscas parciais continuam amplas. O filtro dedicado de Facção também usa chave normalizada exata. Tela e relatório compartilham a mesma regra canônica, sem consultas adicionais ao Firebase.'
}, null, 2) + '\n');

gravar('corponu-release.json', JSON.stringify({
  version: RELEASE_NOVA,
  updatedAt: DATA_RELEASE,
  notes: 'Produção. Corrigida colisão de nomes no filtro/relatório de Facções. A busca geral detecta quando o termo corresponde exatamente ao nome completo de uma facção e, nesse caso, restringe a movimentação àquela facção; por exemplo, CAMILA não inclui mais CAMILA FIRMINO. Termos parciais continuam funcionando como busca ampla. O seletor dedicado de Facção também compara por chave normalizada exata. A tela e a impressão usam a mesma função de filtragem e nenhum caminho paralelo ou leitura extra do Firebase foi criado. Nenhuma regra do Firebase foi alterada.'
}, null, 2) + '\n');

// Invariantes estruturais
const finalApp = ler(appPath);
if (!finalApp.includes('function resolverFaccaoExataNaBusca')) throw new Error('helper de facção exata ausente');
if (!finalApp.includes('const faccaoBuscaExata = resolverFaccaoExataNaBusca(movimentosBase, filtros.busca);')) throw new Error('resolução exata não ligada ao filtro');
if (!finalApp.includes('if (chaveExataFaccoes(mov.destino) !== faccaoBuscaExata) return false;')) throw new Error('comparação exata da busca ausente');
if (!finalApp.includes('if (faccaoFiltroExata && chaveExataFaccoes(mov.destino) !== faccaoFiltroExata) return false;')) throw new Error('comparação exata do dropdown ausente');
if (finalApp.includes('if (filtros.faccao && String(mov.destino || "") !== filtros.faccao) return false;')) throw new Error('comparador antigo ainda presente');

console.log('Filtro exato de facção 269 preparado com sucesso.');
