import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ler = arquivo => fs.readFileSync(arquivo, 'utf8');
const index = ler('index.html');
const atualizador = ler('corponu-atualizador.js');
const update = ler('update.js');
const recuperacao = ler('corponu-restantes-pagamento-automatico-245.js');
const release = JSON.parse(ler('corponu-release.json'));

// 1) A proteção precisa nascer antes do legado problemático.
const posAtualizador = index.indexOf('corponu-atualizador.js');
const posUpdate = index.indexOf('update.js');
const posApp = index.indexOf('app.js');
assert.ok(posAtualizador >= 0, 'corponu-atualizador.js não está no index');
assert.ok(posUpdate >= 0, 'update.js não está no index');
assert.ok(posApp >= 0, 'app.js não está no index');
assert.ok(posAtualizador < posUpdate, 'a proteção 248 precisa carregar antes de update.js');
assert.ok(posUpdate < posApp, 'o teste espera update.js antes do app.js, como em produção');

// 2) O legado realmente contém o ciclo que motivou o patch.
assert.match(update, /function\s+instalarObserverTabelaPagamentoFinal\s*\(/);
assert.match(update, /observerTabelaPagamentoFinal\.observe\(tbody,\s*\{\s*childList:\s*true,\s*subtree:\s*true\s*\}\)/);
assert.match(update, /queueMicrotask\(\(\)\s*=>\s*aprimorarTabelaEntregasPagamentoFinal\(\)\)/);
assert.match(update, /function\s+aprimorarTabelaEntregasPagamentoFinal\s*\(/);
assert.match(update, /badge\.textContent\s*=/);
assert.match(update, /innerHTML\s*=\s*"<strong>A definir<\/strong>"/);

// 3) Extrai e executa a proteção real do arquivo, não uma cópia do teste.
const inicioGuard = atualizador.indexOf('  (() => {', atualizador.indexOf('// v248'));
const fimGuard = atualizador.indexOf('\n\n  const LOCAL_RELEASE', inicioGuard);
assert.ok(inicioGuard >= 0 && fimGuard > inicioGuard, 'não foi possível extrair a proteção 248');
const fonteGuard = atualizador.slice(inicioGuard, fimGuard).trim();

class NativeMutationObserver {
  static instances = [];
  constructor(callback) {
    this.callback = callback;
    this.observeCalls = [];
    NativeMutationObserver.instances.push(this);
  }
  observe(target, options) {
    this.observeCalls.push({ target, options });
  }
  disconnect() {}
  takeRecords() { return []; }
}

const mensagens = [];
const contexto = {
  window: { MutationObserver: NativeMutationObserver },
  console: { info: (...args) => mensagens.push(args.join(' ')), warn() {}, error() {} },
  Object
};
vm.runInNewContext(fonteGuard, contexto);

const Protegido = contexto.window.MutationObserver;
assert.notEqual(Protegido, NativeMutationObserver, 'MutationObserver não foi protegido');

const observerTabela = new Protegido(() => {});
observerTabela.observe({ id: 'listaEntregasPagamento' }, { childList: true, subtree: true });
assert.equal(observerTabela.observeCalls.length, 0, 'observer legado da tabela deveria ter sido bloqueado');
assert.ok(mensagens.some(item => item.includes('Observer legado da tabela Pagamentos bloqueado')));

const observerOutraArea = new Protegido(() => {});
observerOutraArea.observe({ id: 'listaManejo' }, { childList: true, subtree: true });
assert.equal(observerOutraArea.observeCalls.length, 1, 'observer de outra área foi bloqueado indevidamente');

const observerAtributoTabela = new Protegido(() => {});
observerAtributoTabela.observe({ id: 'listaEntregasPagamento' }, { attributes: true });
assert.equal(observerAtributoTabela.observeCalls.length, 1, 'observer não-childList da tabela foi bloqueado indevidamente');

// Executar a proteção novamente deve ser idempotente.
const protegidoAntes = contexto.window.MutationObserver;
vm.runInNewContext(fonteGuard, contexto);
assert.equal(contexto.window.MutationObserver, protegidoAntes, 'proteção não é idempotente');

// 4) A recuperação da 247 não pode continuar lendo/escrevendo o banco a cada abertura.
for (const proibido of [
  'firebasejs', 'getDocs(', 'getDoc(', 'writeBatch(', 'setDoc(', 'updateDoc(',
  'runTransaction(', 'collection(', 'entregasPagamento', 'serverTimestamp('
]) {
  assert.ok(!recuperacao.includes(proibido), `recuperação 248 ainda contém acesso ao banco: ${proibido}`);
}

// 5) Versão coerente e guard específico.
assert.equal(release.version, '2026-08-25-pagamentos-eventloop-248');
assert.match(atualizador, /__CORPONU_PAGAMENTOS_TABLE_OBSERVER_GUARD_248__/);
assert.match(atualizador, /target\?\.id\s*===\s*"listaEntregasPagamento"/);
assert.match(atualizador, /options\?\.childList\s*===\s*true/);

console.log('TESTE_EVENTLOOP_248_OK — observer da tabela bloqueado; demais observers preservados; recuperação sem Firebase.');
