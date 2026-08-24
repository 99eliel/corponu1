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
await page.waitForTimeout(5200);

const resumo = async rotulo => {
  const estado = await page.evaluate(() => ({
    original: window.__originalCalls || 0,
    updates: window.__mockUpdateDocCalls || 0,
    fase223: window.salvarManejoLinha?.__corponuFaseCalcinhaSemPiscar223 === true,
    fluido205: window.salvarManejoLinha?.__corponuCalcinhaFluido205 === true,
    validacao230: window.salvarManejoLinha?.__corponuFaseCalcinhaValidacaoCoordenada230 === true,
    botaoDesabilitado: document.querySelector('.btn-save-manejo')?.disabled,
    faseInput: document.querySelector('input[id$="-fase"]')?.value,
    faseSelect: document.querySelector('.corponu-fase-calcinha-select-223')?.value,
    linhaSalva: document.querySelector('#listaManejoInline tr')?.classList.contains('manejo-row-saved'),
    toast: document.querySelector('#toast')?.textContent || ''
  }));
  console.log(`${rotulo}: ${JSON.stringify(estado)}`);
  return estado;
};

let estado = await resumo('após instalação');
assert.equal(estado.fase223, true, 'A proteção 223 deve continuar identificável na função externa.');
assert.equal(estado.fluido205, true, 'A proteção visual 205 deve continuar identificável na função externa.');
assert.equal(estado.validacao230, true, 'A validação coordenada 230 deve estar instalada.');

const select = page.locator('.corponu-fase-calcinha-select-223');
await select.waitFor({ state: 'visible' });
assert.equal(await select.inputValue(), 'FASE A');

await select.selectOption('FASE B');
await resumo('após selecionar FASE B');
await page.locator('.btn-save-manejo').click();
await page.waitForTimeout(1200);
estado = await resumo('após primeiro clique');

assert.equal(estado.original, 1, `Um clique deve chamar o salvamento original uma vez; recebido ${estado.original}.`);
assert.equal(estado.updates, 1, `Um clique deve gerar uma confirmação Firestore da Fase; recebido ${estado.updates}.`);
assert.equal(estado.botaoDesabilitado, false, 'O botão precisa voltar a ficar clicável.');
assert.equal(estado.faseInput, 'FASE B');
assert.equal(estado.faseSelect, 'FASE B');
assert.equal(estado.linhaSalva, true, 'A linha deve terminar marcada como salva.');

await page.waitForTimeout(3500);
await resumo('após timers adicionais');
await select.selectOption('FASE A');
await page.locator('.btn-save-manejo').click();
await page.waitForTimeout(1200);
estado = await resumo('após segundo clique');

assert.equal(estado.original, 2, `Dois cliques devem totalizar duas chamadas originais; recebido ${estado.original}.`);
assert.equal(estado.updates, 2, `Dois cliques devem totalizar duas confirmações Firestore; recebido ${estado.updates}.`);
assert.equal(estado.faseSelect, 'FASE A');

await page.evaluate(() => {
  const botaoSetor = document.querySelector('.manejo-setor-btn.active');
  botaoSetor.dataset.setor = 'sutia';
  return window.salvarManejoLinha('op1');
});
await page.waitForTimeout(500);
estado = await resumo('após salvar em Sutiã');
assert.equal(estado.original, 3, 'Sutiã deve continuar passando pelo salvamento original.');
assert.equal(estado.updates, 2, 'Sutiã não pode disparar persistência específica da Calcinha.');

console.log('OK: clique, wrappers, persistência única, botão e isolamento do Sutiã validados.');
await browser.close();
