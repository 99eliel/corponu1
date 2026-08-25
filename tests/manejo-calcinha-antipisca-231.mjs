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
      globalThis.__freezeSeenUpdate = Boolean(document.querySelector('[data-corponu-antipisca-calcinha231="1"]'));
      await new Promise(resolve => setTimeout(resolve, 15));
      globalThis.__simularSnapshotRerender?.();
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  ` });
});

await page.goto('http://127.0.0.1:4173/tests/manejo-calcinha-antipisca-231.html', { waitUntil: 'load' });
await page.waitForTimeout(5200);

const select = page.locator('.corponu-fase-calcinha-select-223');
await select.waitFor({ state: 'visible' });
await select.selectOption('FASE B');

await page.locator('.btn-save-manejo').click();
await page.waitForTimeout(10);
assert.equal(await page.locator('[data-corponu-antipisca-calcinha231="1"]').count(), 1, 'O snapshot visual precisa existir durante o salvamento.');

await page.waitForFunction(() => window.__originalCalls === 1 && window.__mockUpdateDocCalls === 1);
await page.waitForTimeout(300);

let estado = await page.evaluate(() => ({
  original: window.__originalCalls,
  updates: window.__mockUpdateDocCalls,
  rerenders: window.__rerenders,
  freezeOriginal: window.__freezeSeenOriginal,
  freezeUpdate: window.__freezeSeenUpdate,
  clones: document.querySelectorAll('[data-corponu-antipisca-calcinha231="1"]').length,
  visibilidadeTabela: document.getElementById('listaManejoInline')?.closest('table')?.style.visibility || '',
  fase: document.querySelector('.corponu-fase-calcinha-select-223')?.value || document.querySelector('#listaManejoInline input[id$="-fase"]')?.value,
  botaoDesabilitado: document.querySelector('#listaManejoInline .btn-save-manejo')?.disabled
}));

console.log('estado final calcinha:', JSON.stringify(estado));
assert.equal(estado.original, 1, 'Um clique continua chamando o salvamento original apenas uma vez.');
assert.equal(estado.updates, 1, 'A confirmação Firestore da 223 continua acontecendo uma vez.');
assert.ok(estado.rerenders >= 2, 'O teste precisa simular reconstruções da tabela durante o salvamento.');
assert.equal(estado.freezeOriginal, true, 'A tabela deve estar congelada durante o salvamento original.');
assert.equal(estado.freezeUpdate, true, 'A tabela deve continuar congelada durante a confirmação Firestore.');
assert.equal(estado.clones, 0, 'O snapshot visual deve ser removido ao finalizar.');
assert.equal(estado.visibilidadeTabela, '', 'A tabela real deve voltar visível ao finalizar.');
assert.equal(estado.fase, 'FASE B', 'A fase escolhida precisa permanecer após as reconstruções simuladas.');
assert.equal(estado.botaoDesabilitado, false, 'O botão precisa ficar utilizável depois de salvar.');

// Setor Sutiã não pode usar o congelamento específico da Calcinha.
await page.evaluate(() => {
  const setor = document.querySelector('.manejo-setor-btn.active');
  setor.dataset.setor = 'sutia';
  window.__freezeSeenOriginal = false;
});
await page.evaluate(() => window.salvarManejoLinha('op1'));
await page.waitForTimeout(200);
estado = await page.evaluate(() => ({
  original: window.__originalCalls,
  updates: window.__mockUpdateDocCalls,
  clones: document.querySelectorAll('[data-corponu-antipisca-calcinha231="1"]').length
}));
assert.equal(estado.original, 2, 'Sutiã continua passando pelo salvamento original.');
assert.equal(estado.updates, 1, 'Sutiã não dispara a confirmação específica da Calcinha.');
assert.equal(estado.clones, 0, 'Sutiã não deixa congelamento visual da Calcinha.');

console.log('OK: salvamento, persistência, snapshots simulados, antipisca e isolamento do Sutiã validados.');
await browser.close();
