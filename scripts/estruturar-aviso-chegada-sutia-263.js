const fs = require('fs');

const OLD_RELEASE = '2026-08-27-faccoes-aviso-chegada-sutia-262';
const NEW_RELEASE = '2026-08-27-faccoes-aviso-chegada-sutia-estavel-263';
const OLD_ABAS_VERSION = '2026-08-27-faccoes-abas-aviso-sutia-262';
const NEW_ABAS_VERSION = '2026-08-27-faccoes-abas-aviso-sutia-estavel-263';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function replaceOnce(text, search, replacement, label) {
  const first = text.indexOf(search);
  if (first < 0) throw new Error(`Bloco não encontrado: ${label}`);
  if (text.indexOf(search, first + search.length) >= 0) throw new Error(`Bloco duplicado inesperadamente: ${label}`);
  return text.slice(0, first) + replacement + text.slice(first + search.length);
}

// 1) app.js: o aviso faz parte da própria célula Status e mostra explicitamente quem avisou.
let app = read('app.js');
const oldHelper = `function htmlChegadaAvisadaSutiaFaccoes(mov) {
  if (!ehMovimentacaoSutiaFaccoes(mov) || situacaoChegadaFaccoes(mov) !== "avisada") return "";

  const nome = String(mov?.chegadaInformadaPorNome || "usuário").trim() || "usuário";
  const data = dataISOParaBR(mov?.chegadaInformadaData) || mov?.chegadaInformadaData || "";
  const detalhe = [\`por \${nome}\`, data].filter(Boolean).join(" • ");

  return \`
    <span class="badge pending chegada-avisada-sutia" data-chegada-avisada-nativa="1" title="Chegada avisada\${detalhe ? \` • \${escapeHtml(detalhe)}\` : ""}">Chegada avisada</span>
    \${detalhe ? \`<small class="muted chegada-avisada-sutia" style="display:block;margin-top:4px">\${escapeHtml(detalhe)}</small>\` : ""}
  \`;
}`;
const newHelper = `function htmlChegadaAvisadaSutiaFaccoes(mov) {
  if (!ehMovimentacaoSutiaFaccoes(mov) || situacaoChegadaFaccoes(mov) !== "avisada") return "";

  const nome = String(mov?.chegadaInformadaPorNome || "Usuário").trim() || "Usuário";
  const data = dataISOParaBR(mov?.chegadaInformadaData) || mov?.chegadaInformadaData || "";
  const mensagem = \`Chegada avisada por \${nome}\`;
  const titulo = [mensagem, data].filter(Boolean).join(" • ");

  return \`
    <span class="badge pending chegada-avisada-sutia" data-chegada-avisada-nativa="1" title="\${escapeHtml(titulo)}">\${escapeHtml(mensagem)}</span>
    \${data ? \`<small class="muted chegada-avisada-sutia" style="display:block;margin-top:4px">\${escapeHtml(data)}</small>\` : ""}
  \`;
}`;
app = replaceOnce(app, oldHelper, newHelper, 'helper nativo do aviso de chegada de Sutiã');
write('app.js', app);

// 2) Facções: centraliza a aba ativa para eliminar dependência da ordem dos eventos/lazy loading.
let abas = read('corponu-faccoes-tres-abas-saida.js');
abas = replaceOnce(abas, `const V = "${OLD_ABAS_VERSION}";`, `const V = "${NEW_ABAS_VERSION}";`, 'versão do módulo de abas');

const afterMarcar = `  function marcar(a) {
    const x = abas();
    const c = document.getElementById("abaFaccaoCorte");
    if (!x) return;
    x.p.dataset.faccaoAbaAtiva = a;
    x.s.classList.toggle("active", a === "sutia");
    x.c.classList.toggle("active", a === "calcinha");
    c?.classList.toggle("active", a === "corte");
  }

  function indiceProcessoDaTabela(tabela) {`;
const afterMarcarNew = `  function marcar(a) {
    const x = abas();
    const c = document.getElementById("abaFaccaoCorte");
    if (!x) return;
    x.p.dataset.faccaoAbaAtiva = a;
    x.s.classList.toggle("active", a === "sutia");
    x.c.classList.toggle("active", a === "calcinha");
    c?.classList.toggle("active", a === "corte");
  }

  function aplicarAbaAtiva(a = aba) {
    aba = a;
    marcar(aba);
    if (aba === "corte") mostrarCorte();
    else mostrarGeral();
    corrigirClassificacaoVisualMovimentacoes();
  }

  function indiceProcessoDaTabela(tabela) {`;
abas = replaceOnce(abas, afterMarcar, afterMarcarNew, 'centralização do estado da aba');

const prepararFim = `    corrigirClassificacaoVisualMovimentacoes();
  }

  function abrir(a) {`;
const prepararFimNew = `    aplicarAbaAtiva(aba);
  }

  function abrir(a) {`;
abas = replaceOnce(abas, prepararFim, prepararFimNew, 'inicialização estrutural da aba ativa');

const clickNav = `    if (t.closest('.nav-btn[data-page="faccoes"]')) {
      setTimeout(() => {
        preparar();
        marcar(aba);
        corrigirClassificacaoVisualMovimentacoes();
      }, 0);
    }`;
const clickNavNew = `    if (t.closest('.nav-btn[data-page="faccoes"]')) {
      setTimeout(() => preparar(), 0);
    }`;
abas = replaceOnce(abas, clickNav, clickNavNew, 'evento de entrada em Facções');

const clickCorte = `    if (t.closest("#abaFaccaoCorte")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      aba = "corte";
      marcar(aba);
      corrigirClassificacaoVisualMovimentacoes();
      mostrarCorte();
      return;
    }`;
const clickCorteNew = `    if (t.closest("#abaFaccaoCorte")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      aplicarAbaAtiva("corte");
      return;
    }`;
abas = replaceOnce(abas, clickCorte, clickCorteNew, 'evento da aba Lateral e Alça');

const clickSutiaCalcinha = `    if (x && (t.closest("button") === x.s || t.closest("button") === x.c)) {
      aba = t.closest("button") === x.c ? "calcinha" : "sutia";
      mostrarGeral();
      setTimeout(() => {
        marcar(aba);
        corrigirClassificacaoVisualMovimentacoes();
      }, 0);
    }`;
const clickSutiaCalcinhaNew = `    if (x && (t.closest("button") === x.s || t.closest("button") === x.c)) {
      const selecionada = t.closest("button") === x.c ? "calcinha" : "sutia";
      setTimeout(() => aplicarAbaAtiva(selecionada), 0);
    }`;
abas = replaceOnce(abas, clickSutiaCalcinha, clickSutiaCalcinhaNew, 'eventos Sutiã/Calcinha');
write('corponu-faccoes-tres-abas-saida.js', abas);

// 3) Release/cache.
for (const path of ['index.html', 'update.js', 'corponu-atualizador.js']) {
  let text = read(path);
  if (!text.includes(OLD_RELEASE)) throw new Error(`${OLD_RELEASE} não encontrado em ${path}`);
  text = text.split(OLD_RELEASE).join(NEW_RELEASE);
  write(path, text);
}

const notes = 'Produção. Corrigida estruturalmente a exibição do aviso de chegada na aba Sutiã de Facções. A aba ativa agora possui um único ponto de controle (aplicarAbaAtiva), usado tanto na inicialização quanto nas trocas entre Sutiã, Calcinha e Lateral/Alça, eliminando a condição em que o lazy loading carregava o módulo depois do clique e deixava o estado da aba indefinido. O aviso continua sendo renderizado nativamente pela própria linha da movimentação e agora exibe explicitamente “Chegada avisada por <nome>”, com a data abaixo quando disponível. O aviso visual permanece exclusivo de Sutiã. Não foram adicionados observers, timers, consultas Firestore, módulos paralelos nem regras novas. Nenhuma regra do Firebase foi alterada.';
write('corponu-release.json', JSON.stringify({ version: NEW_RELEASE, updatedAt: '2026-08-27T17:55:00-03:00', notes }, null, 2) + '\n');
write('version.json', JSON.stringify({ version: NEW_RELEASE, updatedAt: '2026-08-27T17:55:00-03:00', notes: 'Facções passou a ter estado de aba centralizado; aviso de Sutiã mostra Chegada avisada por <nome> de forma estável.' }, null, 2) + '\n');

// Pós-condições para evitar remendo ou regressão silenciosa.
const appFinal = read('app.js');
const abasFinal = read('corponu-faccoes-tres-abas-saida.js');
for (const token of [
  'const mensagem = `Chegada avisada por ${nome}`;',
  'data-chegada-avisada-nativa="1"',
  '${htmlChegadaAvisadaSutiaFaccoes(mov)}'
]) if (!appFinal.includes(token)) throw new Error(`Pós-condição app.js ausente: ${token}`);
for (const token of [
  'function aplicarAbaAtiva(a = aba)',
  'aplicarAbaAtiva(aba);',
  'aplicarAbaAtiva("corte")',
  'aplicarAbaAtiva(selecionada)',
  'x.p.dataset.faccaoAbaAtiva = a;'
]) if (!abasFinal.includes(token)) throw new Error(`Pós-condição abas ausente: ${token}`);
if (abasFinal.includes('preparar();\n        marcar(aba);')) throw new Error('Permaneceu inicialização duplicada da aba.');
if (!read('corponu-release.json').includes(NEW_RELEASE) || !read('version.json').includes(NEW_RELEASE)) throw new Error('Release 263 incompleto.');

console.log('Estrutura do aviso de chegada Sutiã 263 aplicada com sucesso.');
