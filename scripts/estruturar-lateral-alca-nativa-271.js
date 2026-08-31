const fs = require('fs');

const RELEASE_OLD = '2026-08-31-lateral-alca-v2-270';
const RELEASE = '2026-08-31-faccoes-lateral-alca-nativa-271';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function count(text, fragment) { return text.split(fragment).length - 1; }
function replaceOnce(text, from, to, label) {
  assert(count(text, from) === 1, `${label}: esperado 1 bloco, encontrado ${count(text, from)}`);
  return text.replace(from, to);
}
function section(text, id, nextId) {
  const start = text.indexOf(`<section id="${id}"`);
  const end = nextId ? text.indexOf(`<section id="${nextId}"`, start) : -1;
  assert(start >= 0 && end > start, `Seção ${id} não localizada.`);
  return { start, end, text: text.slice(start, end) };
}

// 1) index.html: abas de Facções e containers passam a existir na estrutura inicial.
{
  let html = read('index.html');
  assert(!html.includes('id="abaFaccaoCorte"'), 'index.html já possui abaFaccaoCorte antes da migração.');
  assert(!html.includes('id="painelFaccoesCorte"'), 'index.html já possui painelFaccoesCorte antes da migração.');
  assert(!html.includes('id="processosValoresLateralAlca"'), 'index.html já possui painel de valores Lateral/Alça antes da migração.');

  const faccoesOpen = '      <section id="faccoes" class="page">\n';
  const tabs = `      <section id="faccoes" class="page">\n        <div class="corponu-dual-tabs" data-page="faccoes" role="tablist" aria-label="Áreas de facções">\n          <button type="button" class="corponu-dual-tab active" data-type="sutia" role="tab" aria-selected="true">Sutiã <span class="count" data-count-type="sutia">0</span></button>\n          <button type="button" class="corponu-dual-tab" data-type="calcinha" role="tab" aria-selected="false">Calcinha <span class="count" data-count-type="calcinha">0</span></button>\n          <button type="button" class="corponu-dual-tab" id="abaFaccaoCorte" role="tab" aria-selected="false">Lateral e Alça <span class="count" id="contCorte">0</span></button>\n        </div>\n`;
  html = replaceOnce(html, faccoesOpen, tabs, 'Inserção das três abas nativas de Facções');

  let fac = section(html, 'faccoes', 'celulas');
  const facClose = fac.text.lastIndexOf('      </section>');
  assert(facClose >= 0, 'Fechamento da seção Facções não encontrado.');
  const facPanel = `\n        <div id="painelFaccoesCorte" class="panel hidden" aria-label="Lateral e Alça"></div>\n`;
  fac.text = fac.text.slice(0, facClose) + facPanel + fac.text.slice(facClose);
  html = html.slice(0, fac.start) + fac.text + html.slice(fac.end);

  let proc = section(html, 'processos', 'faccoes');
  const procClose = proc.text.lastIndexOf('      </section>');
  assert(procClose >= 0, 'Fechamento da seção Processos não encontrado.');
  const valores = `\n        <div id="processosValoresLateralAlca" class="panel processos-valores-lateral-alca hidden" aria-labelledby="processosValoresLateralAlcaTitulo">\n          <div class="panel-header">\n            <div>\n              <h3 id="processosValoresLateralAlcaTitulo">Valores de Lateral e Alça</h3>\n              <p>Configuração financeira dos processos de Lateral e Alça. Os valores ficam em Processos; Facções cuida somente da movimentação.</p>\n            </div>\n          </div>\n          <div class="processos-la-valores-grid">\n            <form id="formProcessosValorLateral" class="processos-la-valor-card">\n              <h4>Lateral por referência</h4>\n              <label>Referência<input id="processosValorLateralRef" required /></label>\n              <label>Valor por peça<input id="processosValorLateralValor" type="number" min="0.0001" step="0.0001" required /></label>\n              <button class="btn btn-primary" type="submit">Salvar valor</button>\n            </form>\n            <form id="formProcessosValorAlca" class="processos-la-valor-card">\n              <h4>Alça — valor global</h4>\n              <p>O valor cadastrado é por alça; o pagamento mantém a regra atual de 2 alças por peça.</p>\n              <label>Valor por alça<input id="processosValorAlcaValor" type="number" min="0.0001" step="0.0001" required /></label>\n              <button class="btn btn-primary" type="submit">Salvar valor</button>\n            </form>\n            <div class="processos-la-valor-card">\n              <h4>Alça • Cortagem e montagem</h4>\n              <p>Valor único e fixo por peça.</p>\n              <strong class="processos-la-valor-fixo">R$ 0,0540</strong>\n            </div>\n          </div>\n        </div>\n`;
  proc.text = proc.text.slice(0, procClose) + valores + proc.text.slice(procClose);
  html = html.slice(0, proc.start) + proc.text + html.slice(proc.end);

  html = html.split(RELEASE_OLD).join(RELEASE);
  write('index.html', html);
}

// 2) Estilos estruturais das abas saem do JS e passam ao CSS principal.
{
  let css = read('style.css');
  assert(!css.includes('/* Facções nativas 271 */'), 'CSS 271 já aplicado.');
  css += `\n\n/* Facções nativas 271 */\n.corponu-dual-tabs{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 14px;padding:7px;background:#eef4fb;border:1px solid #cbd9e8;border-radius:14px}\n.corponu-dual-tab{appearance:none;border:1px solid #b9c9da;background:#fff;color:#20344b;border-radius:10px;padding:9px 16px;font-weight:900;cursor:pointer;transition:.16s ease}\n.corponu-dual-tab:hover{transform:translateY(-1px);border-color:#6c8caf}\n.corponu-dual-tab.active{background:#173c69;color:#fff;border-color:#173c69;box-shadow:0 6px 14px rgba(23,60,105,.18)}\n.corponu-dual-tab .count{display:inline-flex;min-width:22px;height:22px;align-items:center;justify-content:center;border-radius:999px;margin-left:7px;padding:0 6px;background:rgba(255,255,255,.18);font-size:11px}\n.processos-valores-lateral-alca{display:grid;gap:14px}\n.processos-la-valores-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}\n.processos-la-valor-card{display:grid;gap:9px;padding:14px;border:1px solid #e2e8f0;border-radius:14px;background:#fff}\n.processos-la-valor-card h4{margin:0}\n.processos-la-valor-card p{margin:0;color:#64748b;font-size:12px;line-height:1.45}\n.processos-la-valor-card label{display:grid;gap:6px;font-weight:800}\n.processos-la-valor-card input{width:100%}\n.processos-la-valor-fixo{font-size:22px;color:#166534}\n@media(max-width:1100px){.processos-la-valores-grid{grid-template-columns:1fr}}\n@media(max-width:720px){.corponu-dual-tabs{position:sticky;top:0;z-index:15}.corponu-dual-tab{flex:1}}\n`;
  write('style.css', css);
}

// 3) Dual mode usa abas existentes quando são declaradas no HTML; não recria a barra.
{
  let js = read('corponu-dual-mode.js');
  js = replaceOnce(js, 'const VERSION = "2026-08-25-calcinha-faccao-livre-253";', `const VERSION = "${RELEASE}";`, 'Versão dual-mode');

  [
    '      .corponu-dual-tabs{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 14px;padding:7px;background:#eef4fb;border:1px solid #cbd9e8;border-radius:14px}\\n',
    '      .corponu-dual-tab{appearance:none;border:1px solid #b9c9da;background:#fff;color:#20344b;border-radius:10px;padding:9px 16px;font-weight:900;cursor:pointer;transition:.16s ease}\\n',
    '      .corponu-dual-tab:hover{transform:translateY(-1px);border-color:#6c8caf}\\n',
    '      .corponu-dual-tab.active{background:#173c69;color:#fff;border-color:#173c69;box-shadow:0 6px 14px rgba(23,60,105,.18)}\\n',
    '      .corponu-dual-tab .count{display:inline-flex;min-width:22px;height:22px;align-items:center;justify-content:center;border-radius:999px;margin-left:7px;padding:0 6px;background:rgba(255,255,255,.18);font-size:11px}\\n'
  ].forEach(fragment => {
    const real = fragment.replace(/\\n/g, '\n');
    assert(js.includes(real), `Estilo dual não encontrado para migração: ${real.slice(0, 40)}`);
    js = js.replace(real, '');
  });
  js = js.replace(
    '@media(max-width:720px){.corponu-dual-grid,.corponu-history-summary{grid-template-columns:1fr}.corponu-dual-tabs{position:sticky;top:0;z-index:15}.corponu-dual-tab{flex:1}.corponu-history-send-actions{flex-direction:column-reverse}.corponu-history-send-actions .btn{width:100%}}',
    '@media(max-width:720px){.corponu-dual-grid,.corponu-history-summary{grid-template-columns:1fr}.corponu-history-send-actions{flex-direction:column-reverse}.corponu-history-send-actions .btn{width:100%}}'
  );

  const start = js.indexOf('  function makeTabs(pageId) {');
  const end = js.indexOf('  function setActiveType(pageId, type, options = {}) {', start);
  assert(start >= 0 && end > start, 'Bloco makeTabs não encontrado.');
  const novo = `  function bindTabs(pageId, tabs) {\n    if (!tabs || tabs.dataset.corponuDualBound === "1") return;\n    tabs.dataset.corponuDualBound = "1";\n    tabs.addEventListener("click", event => {\n      const button = event.target.closest(".corponu-dual-tab");\n      const type = button?.dataset?.type || "";\n      if (!type) return;\n      setActiveType(pageId, type);\n    });\n  }\n\n  function makeTabs(pageId) {\n    const page = document.getElementById(pageId);\n    if (!page) return;\n    let tabs = page.querySelector(\`.corponu-dual-tabs[data-page="\${pageId}"]\`);\n    if (!tabs) {\n      const anchor = page.querySelector(":scope > .panel, :scope > .grid-2") || page.firstElementChild;\n      tabs = document.createElement("div");\n      tabs.className = "corponu-dual-tabs";\n      tabs.dataset.page = pageId;\n      tabs.innerHTML = \`\n        <button type="button" class="corponu-dual-tab active" data-type="sutia">Sutiã <span class="count" data-count-type="sutia">0</span></button>\n        <button type="button" class="corponu-dual-tab" data-type="calcinha">Calcinha <span class="count" data-count-type="calcinha">0</span></button>\n      \`;\n      if (anchor) page.insertBefore(tabs, anchor);\n      else page.prepend(tabs);\n    }\n    bindTabs(pageId, tabs);\n  }\n\n`;
  js = js.slice(0, start) + novo + js.slice(end);
  write('corponu-dual-mode.js', js);
}

// 4) O controlador das três abas deixa de clonar/inserir a terceira aba.
{
  let js = read('corponu-faccoes-tres-abas-saida.js');
  js = replaceOnce(js, 'const V = "2026-08-27-faccoes-abas-aviso-sutia-estavel-263";', `const V = "${RELEASE}";`, 'Versão três abas');
  const start = js.indexOf('    const x = abas();\n    if (x && !document.getElementById("abaFaccaoCorte")) {');
  const end = js.indexOf('\n\n    const ag =', start);
  assert(start >= 0 && end > start, 'Criação tardia da aba Lateral e Alça não localizada.');
  js = js.slice(0, start) + '    const x = abas();\n    if (!x || !document.getElementById("abaFaccaoCorte")) return;' + js.slice(end);
  js = replaceOnce(js, '      setTimeout(() => preparar(), 0);', '      preparar();', 'Navegação síncrona de Facções');
  js = replaceOnce(js, '      setTimeout(() => aplicarAbaAtiva(selecionada), 0);', '      aplicarAbaAtiva(selecionada);', 'Troca síncrona Sutiã/Calcinha');
  write('corponu-faccoes-tres-abas-saida.js', js);
}

// 5) V2 operacional usa shell nativo e deixa de possuir configuração financeira.
{
  let js = read('corponu-faccoes-lateral-alca-v2-270.js');
  js = replaceOnce(js, 'const VERSION = "2026-08-31-lateral-alca-v2-270";', `const VERSION = "${RELEASE}";`, 'Versão V2 operacional');
  js = js.replace('    atualizarVisibilidadeAdmin();\n', '');
  js = js.replace('      if (ehAdmin()) carregarValorGlobalAlca().catch(() => {});\n', '');
  js = js.replace('    atualizarVisibilidadeAdmin();\n', '');

  const valoresStart = js.indexOf('      <div id=\\"la2ValoresAdmin\\" class=\\"la2-admin la2-admin-box hidden\\">');
  const valoresEnd = js.indexOf('\n      </div>\n    `;', valoresStart);
  assert(valoresStart >= 0 && valoresEnd > valoresStart, 'Bloco visual de valores não localizado na V2.');
  js = js.slice(0, valoresStart) + js.slice(valoresEnd + '\n      </div>'.length);

  js = js.replace('#painelFaccoesCorte.hidden,.la2-modal.hidden,.la2-admin.hidden,#btnLA2MostrarMais.hidden', '#painelFaccoesCorte.hidden,.la2-modal.hidden,#btnLA2MostrarMais.hidden');
  [
    '      .la2-admin-box{border:1px solid #e2e8f0;border-radius:14px;padding:15px;background:#f8fafc}.la2-admin-box h4{margin:0 0 10px}.la2-valores-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.la2-valor-card{padding:13px;border:1px solid #e2e8f0;border-radius:12px;background:#fff}.la2-valor-card h5{margin:0 0 8px}.la2-valor-card p{margin:4px 0;color:#64748b;font-size:12px}.la2-fixed{font-size:20px;font-weight:900;color:#166534}\n',
    '      @media(max-width:1100px){.la2-filtros{grid-template-columns:repeat(3,minmax(0,1fr))}.la2-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.la2-valores-grid{grid-template-columns:1fr}}\n'
  ].forEach(fragment => {
    assert(js.includes(fragment), 'CSS antigo de valores não encontrado na V2.');
    js = js.replace(fragment, fragment.includes('@media')
      ? '      @media(max-width:1100px){.la2-filtros{grid-template-columns:repeat(3,minmax(0,1fr))}.la2-cards{grid-template-columns:repeat(2,minmax(0,1fr))}\n'
      : '');
  });

  const uiStart = js.indexOf('  function injetarUI() {');
  const uiEnd = js.indexOf('  function abrirModal(id) {', uiStart);
  assert(uiStart >= 0 && uiEnd > uiStart, 'Bloco injetarUI/visibilidade não encontrado.');
  const uiNovo = `  function injetarUI() {\n    injetarEstilo();\n    montarModais();\n    const pagina = document.getElementById("faccoes");\n    const geral = pagina?.querySelector(":scope > .faccoes-operacional-panel");\n    const painel = document.getElementById("painelFaccoesCorte");\n    if (!pagina || !geral || !painel) return false;\n    if (painel.dataset.la2Montado !== VERSION) {\n      painel.innerHTML = montarPainel();\n      painel.dataset.la2Montado = VERSION;\n    }\n    renderProcessosSaida();\n    ligarEventosLocais();\n    return true;\n  }\n\n`;
  js = js.slice(0, uiStart) + uiNovo + js.slice(uiEnd);

  const fnStart = js.indexOf('  async function carregarValorGlobalAlca() {');
  const fnEnd = js.indexOf('  function limparFiltros() {', fnStart);
  assert(fnStart >= 0 && fnEnd > fnStart, 'Funções financeiras antigas não localizadas na V2.');
  js = js.slice(0, fnStart) + js.slice(fnEnd);
  js = js.replace('    document.getElementById("formLA2ValorAlca")?.addEventListener("submit", salvarValorAlca);\n    document.getElementById("formLA2ValorLateral")?.addEventListener("submit", salvarValorLateral);\n\n', '');

  write('corponu-faccoes-lateral-alca-v2-270.js', js);
}

// 6) Processos reconhece o painel como parte oficial da gestão de valores.
{
  let js = read('corponu-processos-somente-valores.js');
  js = replaceOnce(js, 'const VERSION = "2026-08-14-op-salvamento-rapido-199";', `const VERSION = "${RELEASE}";`, 'Versão Processos');
  js = replaceOnce(
    js,
    '        document.getElementById("configSutiaCompleto51"),\n',
    '        document.getElementById("configSutiaCompleto51"),\n        document.getElementById("processosValoresLateralAlca"),\n',
    'Whitelist do painel de valores Lateral/Alça'
  );
  write('corponu-processos-somente-valores.js', js);
}

// 7) Loader sob demanda: configuração financeira pertence a Processos.
{
  let js = read('corponu-atualizador.js');
  js = replaceOnce(js, `const LOCAL_RELEASE = "${RELEASE_OLD}";`, `const LOCAL_RELEASE = "${RELEASE}";`, 'Release do atualizador');
  js = replaceOnce(
    js,
    '    processos: [\n      ["corponu-processos-somente-valores.js", "processos-somente-valores", "Não foi possível simplificar Processos para gestão de valores."],\n',
    '    processos: [\n      ["corponu-processos-somente-valores.js", "processos-somente-valores", "Não foi possível simplificar Processos para gestão de valores."],\n      ["corponu-processos-valores-lateral-alca-271.js", "processos-valores-lateral-alca-271", "Não foi possível carregar os valores de Lateral e Alça em Processos."],\n',
    'Loader dos valores de Lateral/Alça'
  );
  write('corponu-atualizador.js', js);
}

// 8) Release e arquivos de versão.
{
  let update = read('update.js');
  update = replaceOnce(update, `const APP_VERSION = "${RELEASE_OLD}";`, `const APP_VERSION = "${RELEASE}";`, 'Versão update.js');
  write('update.js', update);

  const release = {
    version: RELEASE,
    updatedAt: '2026-08-31T11:30:00-03:00',
    notes: 'Produção. Facções passa a declarar Sutiã, Calcinha e Lateral e Alça na estrutura inicial da página; a terceira aba não é mais clonada/inserida depois do carregamento. O painel operacional de Lateral e Alça usa um shell nativo de Facções e o módulo V2 apenas monta o conteúdo e executa o fluxo. A configuração Valores de Lateral e Alça foi removida da área operacional de Facções e passou a pertencer à tela Processos, em módulo próprio. LATERAL continua salvando valor por referência nos mesmos documentos precosReferencia/corte-<referencia>-lateral; ALÇA continua usando precosReferencia/valor-padrao-alca e a regra de 2 alças por peça; CORTAGEM E MONTAGEM permanece fixo em R$ 0,0540 por peça. Nenhum histórico foi migrado ou apagado e nenhuma regra do Firebase foi alterada.'
  };
  write('corponu-release.json', JSON.stringify(release, null, 2) + '\n');
  write('version.json', JSON.stringify(release, null, 2) + '\n');
}

// Pós-condições.
{
  const html = read('index.html');
  const abas = read('corponu-faccoes-tres-abas-saida.js');
  const v2 = read('corponu-faccoes-lateral-alca-v2-270.js');
  const dual = read('corponu-dual-mode.js');
  const processos = read('corponu-processos-somente-valores.js');
  const loader = read('corponu-atualizador.js');
  const cfg = read('corponu-processos-valores-lateral-alca-271.js');

  assert(count(html, 'id="abaFaccaoCorte"') === 1, 'A aba nativa Lateral e Alça deve existir exatamente uma vez no HTML.');
  assert(count(html, 'id="painelFaccoesCorte"') === 1, 'O shell nativo de Lateral e Alça deve existir exatamente uma vez.');
  assert(count(html, 'id="processosValoresLateralAlca"') === 1, 'O painel de valores deve existir exatamente uma vez em Processos.');
  assert(!abas.includes('cloneNode'), 'O controlador de Facções ainda clona uma aba.');
  assert(!v2.includes('Valores de Lateral e Alça'), 'A V2 operacional ainda contém a configuração financeira.');
  assert(!v2.includes('formLA2ValorLateral') && !v2.includes('formLA2ValorAlca'), 'A V2 operacional ainda possui formulários financeiros.');
  assert(v2.includes('CORTAGEM E MONTAGEM') && v2.includes('VALOR_FIXO_CORTAGEM_MONTAGEM = 0.0540'), 'Processos operacionais da V2 foram perdidos.');
  assert(v2.includes('chegadaInformadaStatus: "aguardando_confirmacao_admin"') && v2.includes('writeBatch'), 'Fluxo de chegada/pagamento da V2 foi perdido.');
  assert(cfg.includes('"valor-padrao-alca"') && cfg.includes('`corte-${slug(referencia)}-lateral`'), 'Configuração nova não preservou os documentos existentes.');
  assert(!cfg.includes('MutationObserver') && !cfg.includes('setInterval'), 'Módulo de valores contém mecanismo tardio proibido.');
  assert(dual.includes('function bindTabs(pageId, tabs)') && dual.includes('let tabs = page.querySelector'), 'Dual mode não reutiliza abas estáticas.');
  assert(processos.includes('document.getElementById("processosValoresLateralAlca")'), 'Processos não reconhece o novo painel.');
  assert(loader.includes('corponu-processos-valores-lateral-alca-271.js'), 'Loader de Processos não carrega a configuração nova.');
  assert(!html.includes(RELEASE_OLD), 'index.html ainda referencia release 270.');
}

console.log(`Migração estrutural concluída: ${RELEASE}`);
