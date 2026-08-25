import fs from 'node:fs';
import path from 'node:path';

const raiz = process.cwd();
const ler = arquivo => fs.existsSync(path.join(raiz, arquivo)) ? fs.readFileSync(path.join(raiz, arquivo), 'utf8') : '';

const seeds = new Set(['index.html', 'app.js', 'corponu-atualizador.js']);
const fila = [...seeds];
const vistos = new Set();

function referenciasJs(texto) {
  const refs = new Set();
  for (const m of texto.matchAll(/["'`](?:\.\/)?([A-Za-z0-9_.-]+\.js)(?:\?[^"'`]*)?["'`]/g)) refs.add(m[1]);
  return [...refs];
}

while (fila.length) {
  const arquivo = fila.shift();
  if (vistos.has(arquivo)) continue;
  vistos.add(arquivo);
  const texto = ler(arquivo);
  if (!texto) continue;
  for (const ref of referenciasJs(texto)) {
    if (!vistos.has(ref) && fs.existsSync(path.join(raiz, ref))) fila.push(ref);
  }
}

const padroes = {
  entregas: /entregasPagamento/g,
  onSnapshot: /\bonSnapshot\s*\(/g,
  mutationObserver: /new\s+MutationObserver\s*\(/g,
  setInterval: /\bsetInterval\s*\(/g,
  setTimeout: /\bsetTimeout\s*\(/g,
  renderPagamentos: /\brenderPagamentos\s*\(/g,
  dispatchEvent: /\.dispatchEvent\s*\(/g,
  clickProgramatico: /\.click\s*\(/g,
  requestAnimationFrame: /\brequestAnimationFrame\s*\(/g,
  addEventListener: /\.addEventListener\s*\(/g,
  getDocs: /\bgetDocs\s*\(/g,
  updateDoc: /\bupdateDoc\s*\(/g,
  setDoc: /\bsetDoc\s*\(/g
};

const contar = (texto, regex) => [...texto.matchAll(regex)].length;
const linhas = texto => texto ? texto.split(/\r?\n/).length : 0;
const resultado = [];

for (const arquivo of [...vistos].sort()) {
  if (!arquivo.endsWith('.js')) continue;
  const texto = ler(arquivo);
  if (!texto) continue;
  const contagens = Object.fromEntries(Object.entries(padroes).map(([nome, re]) => [nome, contar(texto, re)]));
  const risco = contagens.entregas * 4 + contagens.onSnapshot * 8 + contagens.mutationObserver * 8 + contagens.setInterval * 5 + contagens.renderPagamentos * 4 + contagens.dispatchEvent * 3 + contagens.clickProgramatico * 3 + contagens.getDocs * 2;
  if (risco > 0) resultado.push({ arquivo, linhas: linhas(texto), risco, ...contagens });
}

resultado.sort((a,b) => b.risco - a.risco || b.linhas - a.linhas);
console.log('=== AUDITORIA EVENT LOOP PAGAMENTOS 248 ===');
console.log(`Arquivos alcançáveis: ${vistos.size}`);
for (const r of resultado.slice(0, 20)) console.log(JSON.stringify(r));

console.log('\n=== ARQUIVOS COM ENTREGASPAGAMENTO ===');
for (const r of resultado.filter(r => r.entregas)) console.log(`${r.arquivo}: entregas=${r.entregas} onSnapshot=${r.onSnapshot} getDocs=${r.getDocs} observer=${r.mutationObserver} interval=${r.setInterval} render=${r.renderPagamentos}`);

function extrairFuncao(texto, nome) {
  const inicio = texto.indexOf(`function ${nome}`);
  if (inicio < 0) return null;
  const abre = texto.indexOf('{', inicio);
  let nivel = 0;
  let quote = null;
  let escape = false;
  for (let i = abre; i < texto.length; i++) {
    const c = texto[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') nivel++;
    if (c === '}') { nivel--; if (nivel === 0) return texto.slice(inicio, i + 1); }
  }
  return null;
}

const update = ler('update.js');
for (const nome of ['aprimorarTabelaEntregasPagamentoFinal', 'instalarObserverTabelaPagamentoFinal']) {
  const fonte = extrairFuncao(update, nome);
  const pos = update.indexOf(`function ${nome}`);
  console.log(`\n=== ${nome} linha ${pos >= 0 ? update.slice(0,pos).split(/\r?\n/).length : '-'} ===`);
  console.log(fonte || 'NAO_ENCONTRADA');
}
