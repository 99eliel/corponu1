import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const codigo = fs.readFileSync('corponu-manejo-calcinha-dedicado-253.js', 'utf8');
const dom = new JSDOM(`<!doctype html><html><head></head><body>
  <div id="appShell">
    <section id="manejo" class="page active">
      <button class="manejo-setor-btn active" data-setor="calcinha">Calcinha</button>
      <datalist id="manejoFasesList">
        <option value="CORTE"></option>
        <option value="COSTURA"></option>
        <option value="ACABAMENTO"></option>
      </datalist>
      <div class="table-wrap"><table class="manejo-inline-table"><tbody id="listaManejoInline"></tbody></table></div>
    </section>
  </div>
</body></html>`, { runScripts: 'outside-only', url: 'https://teste.local/' });

const { window } = dom;
window.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
window.cancelAnimationFrame = id => clearTimeout(id);
if (!window.CSS) window.CSS = {};
if (!window.CSS.escape) window.CSS.escape = value => String(value).replace(/[^a-zA-Z0-9_-]/g, ch => '\\' + ch);

const ordens = new window.Map([
  ['1', { id:'1', numeroOP:'1001', referencia:'900', cor:'PRETO', quantidade:100, tipoPeca:'calcinha', linhaCalcinha:'cotton_line', necessidade:'URGENTE', manejosSetores:{calcinha:{fase:'COSTURA', linhaCalcinha:'cotton_line', status:'organizada'}} }],
  ['2', { id:'2', numeroOP:'1002', referencia:'901', cor:'BRANCO', quantidade:200, tipoPeca:'calcinha', linhaCalcinha:'corpo_nu', necessidade:'AMANHÃ', manejosSetores:{calcinha:{fase:'ACABAMENTO', linhaCalcinha:'corpo_nu', status:'organizada'}} }],
  ['3', { id:'3', numeroOP:'1003', referencia:'902', cor:'AZUL', quantidade:300, tipoPeca:'calcinha', linhaCalcinha:'cotton_line', necessidade:'NORMAL', manejosSetores:{calcinha:{fase:'CORTE', linhaCalcinha:'cotton_line', status:'organizada'}} }]
]);

let envios = 0;
const state = {
  ready: true,
  db: {},
  auth: { currentUser: { uid: 'teste-user' } },
  firebase: {
    doc: (...args) => args.join('/'),
    updateDoc: async () => {},
    serverTimestamp: () => 'SERVER_TIMESTAMP'
  },
  maps: { ordens, movimentacoes: new window.Map(), faccoes: new window.Map() }
};
window.corponuDualMode = { state, refresh: async () => state.maps };
window.mandarParaFaccao = async id => { envios += 1; return id; };

window.eval(codigo);
await new Promise(r => setTimeout(r, 80));

const root = window.document.getElementById('corponuManejoCalcinhaDedicado252');
if (!root) throw new Error('Tela dedicada não foi criada.');
if (/Destino ainda não definido|Sem facção planejada/.test(root.textContent)) {
  throw new Error('Aviso antigo de facção ainda aparece.');
}
if (root.querySelectorAll('[data-cn252-op]').length !== 3) {
  throw new Error('Esperava 3 OPs antes dos filtros.');
}

function checkboxDaFase(nome) {
  return [...root.querySelectorAll('[data-filtro-fase]')].find(el => el.parentElement?.textContent?.trim() === nome);
}

let cb = checkboxDaFase('COSTURA');
if (!cb) throw new Error('Fase COSTURA não apareceu no filtro.');
cb.checked = true;
cb.dispatchEvent(new window.Event('change', { bubbles:true }));
await new Promise(r => setTimeout(r, 40));

cb = checkboxDaFase('ACABAMENTO');
if (!cb) throw new Error('Fase ACABAMENTO não apareceu no filtro.');
cb.checked = true;
cb.dispatchEvent(new window.Event('change', { bubbles:true }));
await new Promise(r => setTimeout(r, 40));

let cards = [...root.querySelectorAll('[data-cn252-op]')];
const opsDuasFases = cards.map(card => card.querySelector('.cn252-ident strong')?.textContent?.trim()).sort();
if (cards.length !== 2 || !opsDuasFases.includes('OP 1001') || !opsDuasFases.includes('OP 1002')) {
  throw new Error('Filtro COSTURA + ACABAMENTO incorreto: ' + JSON.stringify(opsDuasFases));
}

const linha = root.querySelector('#cn252FiltroLinha');
linha.value = 'cotton_line';
linha.dispatchEvent(new window.Event('change', { bubbles:true }));
await new Promise(r => setTimeout(r, 40));
cards = [...root.querySelectorAll('[data-cn252-op]')];
if (cards.length !== 1 || !cards[0].textContent.includes('OP 1001')) {
  throw new Error('Acúmulo Fases + Linha não funcionou como esperado.');
}

const enviar = cards[0].querySelector('[data-acao="enviar"]');
enviar.click();
await new Promise(r => setTimeout(r, 70));
if (envios !== 1) throw new Error('OP sem facção planejada foi bloqueada antes do envio.');

console.log('OK: fases COSTURA + ACABAMENTO acumuladas, Linha combinada e envio sem facção planejada liberado.');
