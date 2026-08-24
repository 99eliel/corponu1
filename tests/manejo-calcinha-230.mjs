import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => console.log(`[browser:${msg.type()}] ${msg.text()}`));
page.on('pageerror', error => console.error('[pageerror]', error));

await page.route('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: `
      export function getApps(){ return [{}]; }
      export function getApp(){ return {}; }
    `
  });
});

await page.route('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: `
      export function getAuth(){ return { currentUser: { uid: 'teste-e2e' } }; }
    `
  });
});

await page.route('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: `
      export function getFirestore(){ return {}; }
      export function doc(...args){ return args.join('/'); }
      export function serverTimestamp(){ return 'timestamp-mock'; }
      export async function updateDoc(ref, data){
        globalThis.__mockUpdateDocCalls = (globalThis.__mockUpdateDocCalls || 0) + 1;
        globalThis.__lastMockUpdate = { ref, data };
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    `
  });
});

await page.goto('http://127.0.0.1:4173/tests/manejo-calcinha-230.html', { waitUntil: 'load' });

// Deixa todos os timers de instalação (205, 194 e 223) concluírem.
await page.waitForTimeout(5200);

const marcas = await page.evaluate(() => ({
  fase223: window.salvarManejoLinha?.__corponuFaseCalcinhaSemPiscar223 === true,
  fluido205: window.salvarManejoLinha?.__corponuCalcinhaFluido205 === true,
  validacao230: window.salvarManejoLinha?.__corponuFaseCalcinhaValidacaoCoordenada230 === true
}));
assert.deepEqual(marcas, { fase223: true, fluido205: true, validacao230: true }, 'As marcas dos wrappers precisam sobreviver na função externa.');

const select = page.locator('.corponu-fase-calcinha-select-223');
await select.waitFor({ state: 'visible' });
assert.equal(await select.inputValue(), 'FASE A');

// 1º salvamento: deve passar pelo fluxo real uma única vez e confirmar a fase uma única vez.
await select.selectOption('FASE B');
await page.locator('.btn-save-manejo').click();
await page.waitForFunction(() => window.__originalCalls === 1 && window.__mockUpdateDocCalls === 1);
await page.waitForTimeout(450);

let estado = await page.evaluate(() => ({
  original: window.__originalCalls,
  updates: window.__mockUpdateDocCalls,
  botaoDesabilitado: document.querySelector('.btn-save-manejo')?.disabled,
  faseInput: document.querySelector('input[id$="-fase"]')?.value,
  faseSelect: document.querySelector('.corponu-fase-calcinha-select-223')?.value,
  linhaSalva: document.querySelector('#listaManejoInline tr')?.classList.contains('manejo-row-saved')
}));
assert.equal(estado.original, 1, 'Um clique deve chamar salvarManejoLinha original uma vez.');
assert.equal(estado.updates, 1, 'Um clique deve gerar apenas uma confirmação updateDoc da Fase.');
assert.equal(estado.botaoDesabilitado, false, 'O botão precisa voltar a ficar clicável.');
assert.equal(estado.faseInput, 'FASE B');
assert.equal(estado.faseSelect, 'FASE B');
assert.equal(estado.linhaSalva, true, 'A linha deve terminar marcada como salva.');

// Espera mais um ciclo dos timers para garantir que os wrappers não se empilham depois do primeiro clique.
await page.waitForTimeout(3500);
await select.selectOption('FASE A');
await page.locator('.btn-save-manejo').click();
await page.waitForFunction(() => window.__originalCalls === 2 && window.__mockUpdateDocCalls === 2);
await page.waitForTimeout(450);

estado = await page.evaluate(() => ({
  original: window.__originalCalls,
  updates: window.__mockUpdateDocCalls,
  fase: document.querySelector('.corponu-fase-calcinha-select-223')?.value
}));
assert.equal(estado.original, 2, 'Segundo clique também deve chamar o fluxo original apenas uma vez.');
assert.equal(estado.updates, 2, 'Segundo clique deve acrescentar somente um updateDoc.');
assert.equal(estado.fase, 'FASE A');

// Sutiã não pode entrar na lógica da Calcinha.
await page.evaluate(() => {
  const botaoSetor = document.querySelector('.manejo-setor-btn.active');
  botaoSetor.dataset.setor = 'sutia';
});
await page.evaluate(() => window.salvarManejoLinha('op1'));
await page.waitForFunction(() => window.__originalCalls === 3);
await page.waitForTimeout(150);

estado = await page.evaluate(() => ({
  original: window.__originalCalls,
  updates: window.__mockUpdateDocCalls
}));
assert.equal(estado.original, 3, 'Sutiã deve continuar passando pelo salvamento original.');
assert.equal(estado.updates, 2, 'Sutiã não pode disparar persistência específica da Calcinha.');

console.log('OK: clique, wrappers, persistência única, botão e isolamento do Sutiã validados.');
await browser.close();
