import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ler = arquivo => fs.readFileSync(arquivo, 'utf8');
const index = ler('index.html');
const atualizador = ler('corponu-atualizador.js');
const update = ler('update.js');
const recuperacao = ler('corponu-restantes-pagamento-automatico-245.js');
const release = JSON.parse(ler('corponu-release.json'));

function extrairFuncao(texto, assinatura) {
  const inicio = texto.indexOf(assinatura);
  assert.ok(inicio >= 0, `função não encontrada: ${assinatura}`);
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
    else if (c === '}') {
      nivel--;
      if (nivel === 0) return texto.slice(inicio, i + 1);
    }
  }
  throw new Error(`fechamento não encontrado: ${assinatura}`);
}

// 1) Confirma a ordem real de produção que invalidou a primeira tentativa.
const posUpdate = index.indexOf('update.js');
const posApp = index.indexOf('app.js');
assert.ok(posUpdate >= 0, 'update.js não está no index');
assert.ok(posApp >= 0, 'app.js não está no index');
assert.ok(posUpdate < posApp, 'update.js deveria carregar antes do app.js no HTML atual');

// 2) O patch precisa estar na origem, dentro do próprio update.js.
const funcaoObserver = extrairFuncao(update, 'function instalarObserverTabelaPagamentoFinal()');
assert.match(funcaoObserver, /v248:\s*desativado/);
assert.match(funcaoObserver, /observerTabelaPagamentoFinal\)\s*observerTabelaPagamentoFinal\.disconnect\(\)/);
assert.match(funcaoObserver, /observerTabelaPagamentoFinal\s*=\s*null/);
assert.ok(!funcaoObserver.includes('new MutationObserver'), 'a função ainda cria MutationObserver');
assert.ok(!funcaoObserver.includes('queueMicrotask'), 'a função ainda agenda o callback autoalimentado');
assert.ok(!funcaoObserver.includes('.observe('), 'a função ainda observa a tabela');

// 3) Mantemos a função visual; removemos apenas o observer que a chamava em ciclo.
const funcaoAprimorar = extrairFuncao(update, 'function aprimorarTabelaEntregasPagamentoFinal()');
assert.ok(funcaoAprimorar.length > 100, 'função visual foi removida por engano');
assert.ok(funcaoAprimorar.includes('badge.textContent') || funcaoAprimorar.includes('innerHTML'), 'função visual não parece intacta');
assert.ok(!update.includes('observerTabelaPagamentoFinal.observe(tbody, { childList: true, subtree: true });'), 'observer legado ainda existe no arquivo');

// 4) A proteção tardia do atualizador fica apenas como segunda barreira e deve ser seletiva.
const inicioGuard = atualizador.indexOf('  (() => {', atualizador.indexOf('// v248'));
const fimGuard = atualizador.indexOf('\n\n  const LOCAL_RELEASE', inicioGuard);
assert.ok(inicioGuard >= 0 && fimGuard > inicioGuard, 'não foi possível extrair a defesa secundária 248');
const fonteGuard = atualizador.slice(inicioGuard, fimGuard).trim();

class NativeMutationObserver {
  constructor(callback) { this.callback = callback; this.observeCalls = []; }
  observe(target, options) { this.observeCalls.push({ target, options }); }
  disconnect() {}
}
const contexto = {
  window: { MutationObserver: NativeMutationObserver },
  console: { info() {}, warn() {}, error() {} },
  Object
};
vm.runInNewContext(fonteGuard, contexto);
const Protegido = contexto.window.MutationObserver;
const tabela = new Protegido(() => {});
tabela.observe({ id: 'listaEntregasPagamento' }, { childList: true, subtree: true });
assert.equal(tabela.observeCalls.length, 0, 'defesa secundária não bloqueou a tabela de Pagamentos');
const manejo = new Protegido(() => {});
manejo.observe({ id: 'listaManejo' }, { childList: true, subtree: true });
assert.equal(manejo.observeCalls.length, 1, 'defesa secundária bloqueou observer de outra área');

// 5) A recuperação estrutural da 247 precisa estar encerrada: zero acesso ao Firebase.
for (const proibido of [
  'firebasejs', 'getDocs(', 'getDoc(', 'writeBatch(', 'setDoc(', 'updateDoc(',
  'runTransaction(', 'collection(', 'entregasPagamento', 'serverTimestamp('
]) {
  assert.ok(!recuperacao.includes(proibido), `recuperação 248 ainda contém acesso ao banco: ${proibido}`);
}

// 6) Versão coerente.
assert.equal(release.version, '2026-08-25-pagamentos-eventloop-248');
assert.match(atualizador, /__CORPONU_PAGAMENTOS_TABLE_OBSERVER_GUARD_248__/);

console.log('TESTE_EVENTLOOP_248_OK — observer autoalimentado removido na origem; demais observers preservados; recuperação sem Firebase.');
