const fs = require('fs');

const OLD = '2026-08-31-faccoes-lateral-alca-nativa-271';
const RELEASE = '2026-08-31-faccoes-processos-estavel-272';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function replaceOnce(text, before, after, label) {
  const first = text.indexOf(before);
  assert(first >= 0, `${label}: bloco não encontrado.`);
  assert(text.indexOf(before, first + before.length) < 0, `${label}: bloco duplicado/ambíguo.`);
  return text.slice(0, first) + after + text.slice(first + before.length);
}

// 1) index.html volta a ser shell neutro. Os donos dos componentes passam a ser os módulos.
{
  let html = read('index.html');
  const ocorrenciasRelease = html.split(OLD).length - 1;
  assert(ocorrenciasRelease >= 3, `index.html: release antiga apareceu apenas ${ocorrenciasRelease} vez(es).`);
  html = html.split(OLD).join(RELEASE);
  html = replaceOnce(
    html,
    'style.css?v=2026-08-12-layout-calcinha-184',
    `style.css?v=${RELEASE}`,
    'index.html cache-busting do CSS'
  );

  const processoStart = html.indexOf('        <div id="processosValoresLateralAlca"');
  const processoEnd = html.indexOf('\n      </section>\n\n\n      <section id="faccoes" class="page">', processoStart);
  assert(processoStart >= 0 && processoEnd > processoStart, 'index.html: painel estático de valores não localizado com segurança.');
  html = html.slice(0, processoStart) + html.slice(processoEnd);

  const faccoesStart = html.indexOf('      <section id="faccoes" class="page">');
  const tabsStart = html.indexOf('        <div class="corponu-dual-tabs" data-page="faccoes"', faccoesStart);
  const painelGeralStart = html.indexOf('        <div class="panel faccoes-operacional-panel">', tabsStart);
  assert(faccoesStart >= 0 && tabsStart > faccoesStart && painelGeralStart > tabsStart, 'index.html: barra estática de Facções não localizada com segurança.');
  html = html.slice(0, tabsStart) + html.slice(painelGeralStart);

  const painelCorte = '        <div id="painelFaccoesCorte" class="panel hidden" aria-label="Lateral e Alça"></div>\n';
  html = replaceOnce(html, painelCorte, '', 'index.html painel operacional estático');

  assert(!html.includes('id="abaFaccaoCorte"'), 'index.html ainda contém aba Lateral/Alça estática.');
  assert(!html.includes('id="processosValoresLateralAlca"'), 'index.html ainda contém valores Lateral/Alça estáticos.');
  assert(!html.includes('id="painelFaccoesCorte"'), 'index.html ainda contém painel Lateral/Alça estático.');
  write('index.html', html);
}

// 2) style.css deixa de ser dono das abas/painel 271. Cada módulo injeta o estilo que possui.
{
  let css = read('style.css');
  const start = css.indexOf('\n/* Facções nativas 271 */');
  const endMarker = '@media(max-width:720px){.corponu-dual-tabs{position:sticky;top:0;z-index:15}.corponu-dual-tab{flex:1}}';
  const end = css.indexOf(endMarker, start);
  assert(start >= 0 && end > start, 'style.css: bloco 271 não localizado com segurança.');
  css = css.slice(0, start) + css.slice(end + endMarker.length);
  assert(!css.includes('/* Facções nativas 271 */'), 'style.css ainda contém bloco 271.');
  write('style.css', css.trimEnd() + '\n');
}

// 3) dual-mode volta a ser o único dono da barra de abas e cria as 3 juntas em Facções.
{
  let js = read('corponu-dual-mode.js');
  js = replaceOnce(js, `const VERSION = "${OLD}";`, `const VERSION = "${RELEASE}";`, 'dual-mode versão');

  const styleAnchor = '    style.textContent = `\n      .corponu-dual-hint{font-size:12px;color:#52677e;margin:-5px 0 14px}';
  const styleReplacement = '    style.textContent = `\n      .corponu-dual-tabs{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 14px;padding:7px;background:#eef4fb;border:1px solid #cbd9e8;border-radius:14px}\n      .corponu-dual-tab{appearance:none;border:1px solid #b9c9da;background:#fff;color:#20344b;border-radius:10px;padding:9px 16px;font-weight:900;cursor:pointer;transition:.16s ease}\n      .corponu-dual-tab:hover{transform:translateY(-1px);border-color:#6c8caf}\n      .corponu-dual-tab.active{background:#173c69;color:#fff;border-color:#173c69;box-shadow:0 6px 14px rgba(23,60,105,.18)}\n      .corponu-dual-tab .count{display:inline-flex;min-width:22px;height:22px;align-items:center;justify-content:center;border-radius:999px;margin-left:7px;padding:0 6px;background:rgba(255,255,255,.18);font-size:11px}\n      .corponu-dual-hint{font-size:12px;color:#52677e;margin:-5px 0 14px}';
  js = replaceOnce(js, styleAnchor, styleReplacement, 'dual-mode estilos das abas');

  const makeStart = js.indexOf('  function makeTabs(pageId) {');
  const makeEnd = js.indexOf('  function setActiveType(pageId, type, options = {}) {', makeStart);
  assert(makeStart >= 0 && makeEnd > makeStart, 'dual-mode: função makeTabs não localizada.');
  const novaMakeTabs = `  function makeTabs(pageId) {\n    const page = document.getElementById(pageId);\n    if (!page) return;\n\n    let tabs = page.querySelector(\`.corponu-dual-tabs[data-page="\${pageId}"]\`);\n    if (!tabs) {\n      const anchor = page.querySelector(":scope > .panel, :scope > .grid-2") || page.firstElementChild;\n      tabs = document.createElement("div");\n      tabs.className = "corponu-dual-tabs";\n      tabs.dataset.page = pageId;\n      if (anchor) page.insertBefore(tabs, anchor);\n      else page.prepend(tabs);\n    }\n\n    const precisaFaccoesCompleta = pageId === "faccoes" && !tabs.querySelector("#abaFaccaoCorte");\n    const precisaPadrao = pageId !== "faccoes" && (!tabs.querySelector('[data-type="sutia"]') || !tabs.querySelector('[data-type="calcinha"]'));\n\n    if (precisaFaccoesCompleta) {\n      tabs.innerHTML = \`\n        <button type="button" class="corponu-dual-tab active" data-type="sutia">Sutiã <span class="count" data-count-type="sutia">0</span></button>\n        <button type="button" class="corponu-dual-tab" data-type="calcinha">Calcinha <span class="count" data-count-type="calcinha">0</span></button>\n        <button type="button" class="corponu-dual-tab" id="abaFaccaoCorte">Lateral e Alça <span class="count" id="contCorte">0</span></button>\n      \`;\n      delete tabs.dataset.corponuDualBound;\n    } else if (precisaPadrao) {\n      tabs.innerHTML = \`\n        <button type="button" class="corponu-dual-tab active" data-type="sutia">Sutiã <span class="count" data-count-type="sutia">0</span></button>\n        <button type="button" class="corponu-dual-tab" data-type="calcinha">Calcinha <span class="count" data-count-type="calcinha">0</span></button>\n      \`;\n      delete tabs.dataset.corponuDualBound;\n    }\n\n    bindTabs(pageId, tabs);\n  }\n\n`;
  js = js.slice(0, makeStart) + novaMakeTabs + js.slice(makeEnd);

  assert(js.includes('id="abaFaccaoCorte"'), 'dual-mode não passou a possuir a terceira aba.');
  assert(js.includes('.corponu-dual-tabs{display:flex'), 'dual-mode não recuperou o estilo das abas.');
  write('corponu-dual-mode.js', js);
}

// 4) V2 operacional passa a possuir a raiz do próprio painel.
{
  let js = read('corponu-faccoes-lateral-alca-v2-270.js');
  js = replaceOnce(js, `const VERSION = "${OLD}";`, `const VERSION = "${RELEASE}";`, 'V2 versão');

  const start = js.indexOf('  function injetarUI() {');
  const end = js.indexOf('  function abrirModal(id) {', start);
  assert(start >= 0 && end > start, 'V2: injetarUI não localizada.');
  const novo = `  function injetarUI() {\n    injetarEstilo();\n    montarModais();\n    const pagina = document.getElementById("faccoes");\n    const geral = pagina?.querySelector(":scope > .faccoes-operacional-panel");\n    if (!pagina || !geral) return false;\n\n    let painel = document.getElementById("painelFaccoesCorte");\n    if (!painel) {\n      painel = document.createElement("div");\n      painel.id = "painelFaccoesCorte";\n      painel.className = "panel hidden";\n      painel.setAttribute("aria-label", "Lateral e Alça");\n      geral.insertAdjacentElement("afterend", painel);\n    }\n\n    if (painel.dataset.la2Montado !== VERSION) {\n      painel.innerHTML = montarPainel();\n      painel.dataset.la2Montado = VERSION;\n    }\n    renderProcessosSaida();\n    ligarEventosLocais();\n    return true;\n  }\n\n`;
  js = js.slice(0, start) + novo + js.slice(end);
  assert(js.includes('painel = document.createElement("div")'), 'V2 não passou a possuir o painel raiz.');
  write('corponu-faccoes-lateral-alca-v2-270.js', js);
}

// 5) Demais módulos entram na mesma release e Processos usa o módulo autônomo 272.
{
  let js = read('corponu-faccoes-tres-abas-saida.js');
  js = replaceOnce(js, `const V = "${OLD}";`, `const V = "${RELEASE}";`, 'três abas versão');
  assert(!js.includes('cloneNode'), 'três abas voltou a conter cloneNode.');
  write('corponu-faccoes-tres-abas-saida.js', js);
}

{
  let js = read('corponu-processos-somente-valores.js');
  js = replaceOnce(js, `const VERSION = "${OLD}";`, `const VERSION = "${RELEASE}";`, 'Processos somente valores versão');
  assert(js.includes('document.getElementById("processosValoresLateralAlca")'), 'Processos deixou de permitir o painel Lateral/Alça.');
  write('corponu-processos-somente-valores.js', js);
}

{
  let js = read('corponu-atualizador.js');
  js = replaceOnce(js, `const LOCAL_RELEASE = "${OLD}";`, `const LOCAL_RELEASE = "${RELEASE}";`, 'Atualizador release');
  js = replaceOnce(
    js,
    '["corponu-processos-valores-lateral-alca-271.js", "processos-valores-lateral-alca-271", "Não foi possível carregar os valores de Lateral e Alça em Processos."]',
    '["corponu-processos-valores-lateral-alca-272.js", "processos-valores-lateral-alca-272", "Não foi possível carregar os valores de Lateral e Alça em Processos."]',
    'Atualizador módulo Processos 272'
  );
  write('corponu-atualizador.js', js);
}

{
  let js = read('update.js');
  js = replaceOnce(js, `const APP_VERSION = "${OLD}";`, `const APP_VERSION = "${RELEASE}";`, 'update.js release');
  write('update.js', js);
}

// 6) Metadados de release.
const notes = 'Produção. Corrige estruturalmente a regressão visual da 271 sem adicionar hotfix visual. O dual-mode volta a ser o único dono da barra de abas e cria Sutiã, Calcinha e Lateral e Alça no mesmo momento, com o próprio CSS, evitando combinações de HTML/JS/CSS de versões diferentes. A V2 de Lateral e Alça passa a possuir a raiz do próprio painel operacional. O index.html volta a ser um shell neutro e não duplica abas nem painéis de recursos. Em Processos, o módulo 272 passa a possuir integralmente a estrutura, estilo, autenticação e persistência de Valores de Lateral e Alça: LATERAL continua por referência, ALÇA continua no documento valor-padrao-alca com duas alças por peça e CORTAGEM E MONTAGEM permanece fixo em R$ 0,0540 por peça. Nenhum dado histórico foi alterado e nenhuma regra do Firebase mudou.';
for (const path of ['corponu-release.json', 'version.json']) {
  const json = JSON.parse(read(path));
  json.version = RELEASE;
  json.updatedAt = '2026-08-31T12:20:00-03:00';
  json.notes = notes;
  write(path, JSON.stringify(json, null, 2) + '\n');
}

// Pós-condições locais.
const indexFinal = read('index.html');
const dualFinal = read('corponu-dual-mode.js');
const v2Final = read('corponu-faccoes-lateral-alca-v2-270.js');
const updaterFinal = read('corponu-atualizador.js');
assert(indexFinal.includes(`style.css?v=${RELEASE}`), 'CSS não recebeu cache-busting 272.');
assert(!indexFinal.includes('id="abaFaccaoCorte"'), 'A aba continua duplicada no HTML.');
assert(!indexFinal.includes('id="processosValoresLateralAlca"'), 'O painel de valores continua duplicado no HTML.');
assert(dualFinal.includes('Lateral e Alça <span class="count" id="contCorte">0</span>'), 'Barra unificada não contém Lateral e Alça.');
assert(v2Final.includes('painel.id = "painelFaccoesCorte"'), 'V2 não possui o painel operacional.');
assert(updaterFinal.includes('corponu-processos-valores-lateral-alca-272.js'), 'Atualizador não aponta para módulo 272.');
console.log(`Estrutura ${RELEASE} preparada com sucesso.`);
