import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => console.log(`[browser:${msg.type()}] ${msg.text()}`));
page.on('pageerror', error => console.error('[pageerror]', error));

await page.route('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js', async route => {
  await route.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `
    export function getApps(){ return [{}]; }
    export function getApp(){ return {}; }
  ` });
});

await page.route('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js', async route => {
  await route.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `
    export function getAuth(){ return { currentUser: { uid: 'teste-e2e' } }; }
  ` });
});

await page.route('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js', async route => {
  await route.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `
    export function getFirestore(){ return {}; }
    export function doc(...args){ return args.join('/'); }
    export function serverTimestamp(){ return 'timestamp-mock'; }
    export async function updateDoc(ref, data){
      globalThis.__mockUpdateDocCalls = (globalThis.__mockUpdateDocCalls || 0) + 1;
      globalThis.__lastMockUpdate = { ref, data };
      await new Promise(resolve => setTimeout(resolve, 20));
      globalThis.renderPaginaAtiva?.();
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  ` });
});

await page.goto('http://127.0.0.1:4173/tests/manejo-calcinha-interface-estavel-232.html', { waitUntil: 'load' });
await page.waitForTimeout(5200);

const select = page.locator('.corponu-fase-calcinha-select-223');
await select.waitFor({ state: 'visible' });
await select.selectOption('FASE B');

await page.evaluate(() => {
  const wrap = document.getElementById('manejoWrap');
  wrap.scrollLeft = 240;
  document.getElementById('buscaManejoLinha').value = '12345';
});

const antes = await page.evaluate(() => ({
  rowEhOriginal: document.querySelector('#listaManejoInline tr') === window.__rowOriginal,
  identidade: document.querySelector('#listaManejoInline tr')?.dataset.identidade,
  filtro: document.getElementById('buscaManejoLinha')?.value,
  scrollLeft: document.getElementById('manejoWrap')?.scrollLeft,
  html: document.getElementById('listaManejoInline')?.innerHTML
}));
assert.equal(antes.rowEhOriginal, true);
assert.equal(antes.identidade, 'original');
assert.equal(antes.filtro, '12345');
assert.ok(antes.scrollLeft > 0);

await page.locator('.btn-save-manejo').click();
await page.waitForFunction(() => window.__originalCalls === 1 && window.__mockUpdateDocCalls === 1);
await page.waitForTimeout(450);

let estado = await page.evaluate(() => ({
  original: window.__originalCalls,
  updates: window.__mockUpdateDocCalls,
  tentativasRender: window.__renderTentativas,
  rendersExecutados: window.__rendersExecutados,
  rendersSuprimidos: window.__rendersSuprimidos,
  rowEhOriginal: document.querySelector('#listaManejoInline tr') === window.__rowOriginal,
  identidade: document.querySelector('#listaManejoInline tr')?.dataset.identidade,
  filtro: document.getElementById('buscaManejoLinha')?.value,
  scrollLeft: document.getElementById('manejoWrap')?.scrollLeft,
  fase: document.querySelector('.corponu-fase-calcinha-select-223')?.value || document.querySelector('#listaManejoInline input[id$="-fase"]')?.value,
  botaoDesabilitado: document.querySelector('#listaManejoInline .btn-save-manejo')?.disabled,
  travaAtiva: window.__CORPONU_MANEJO_CALCINHA_RENDER_LOCK_232__?.ativo === true,
  clonesAntigos: document.querySelectorAll('[data-corponu-antipisca-calcinha231="1"]').length
}));

console.log('estado final calcinha:', JSON.stringify(estado));
assert.equal(estado.original, 1, 'Um clique deve chamar o salvamento original uma vez.');
assert.equal(estado.updates, 1, 'A confirmação autoritativa da Fase deve ocorrer uma vez.');
assert.ok(estado.tentativasRender >= 2, 'O teste deve simular pelo menos dois retornos que tentariam reconstruir a interface.');
assert.equal(estado.rendersExecutados, 0, 'Nenhuma reconstrução total da interface deve ocorrer durante o save da Calcinha.');
assert.ok(estado.rendersSuprimidos >= 2, 'As tentativas de rerender devem ser absorvidas pela trava localizada.');
assert.equal(estado.rowEhOriginal, true, 'A mesma linha DOM deve permanecer antes e depois do salvamento.');
assert.equal(estado.identidade, 'original', 'A linha não pode ser substituída por uma reconstruída.');
assert.equal(estado.filtro, '12345', 'O filtro digitado deve permanecer intacto.');
assert.ok(estado.scrollLeft > 0, 'A posição horizontal da tabela deve permanecer intacta.');
assert.equal(estado.fase, 'FASE B', 'A fase escolhida deve permanecer selecionada.');
assert.equal(estado.botaoDesabilitado, false, 'O botão deve voltar a ficar utilizável.');
assert.equal(estado.travaAtiva, false, 'A trava precisa ser liberada depois do salvamento.');
assert.equal(estado.clonesAntigos, 0, 'A solução 232 não deve criar clone/snapshot visual da tabela.');

// Sutiã não pode ser afetado: tentativa de render deve executar normalmente.
await page.evaluate(() => {
  const setor = document.querySelector('.manejo-setor-btn.active');
  setor.dataset.setor = 'sutia';
  window.__rendersExecutados = 0;
  window.__rendersSuprimidos = 0;
});
await page.evaluate(() => window.salvarManejoLinha('op1'));
await page.waitForTimeout(250);
estado = await page.evaluate(() => ({
  original: window.__originalCalls,
  updates: window.__mockUpdateDocCalls,
  executados: window.__rendersExecutados,
  suprimidos: window.__rendersSuprimidos
}));
assert.equal(estado.original, 2, 'Sutiã continua passando pelo salvamento normal.');
assert.equal(estado.updates, 1, 'Sutiã não dispara a confirmação específica da Calcinha.');
assert.ok(estado.executados >= 1, 'Sutiã não pode ter sua renderização bloqueada pela trava da Calcinha.');
assert.equal(estado.suprimidos, 0, 'Sutiã não usa a trava de render da Calcinha.');

console.log('OK: save, persistência, identidade DOM, filtro, scroll, fase e isolamento do Sutiã validados.');
await browser.close();
