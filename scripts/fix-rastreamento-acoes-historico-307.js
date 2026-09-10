const fs = require('fs');

const OLD_RELEASE = '2026-09-10-rastreamento-controlador-unico-306';
const NEW_RELEASE = '2026-09-10-rastreamento-acoes-historico-307';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function replaceExact(source, oldText, newText, expected, label) {
  const count = source.split(oldText).length - 1;
  if (count !== expected) throw new Error(`${label}: esperado ${expected}, encontrado ${count}`);
  return source.split(oldText).join(newText);
}

let app = read('app.js');

const oldHead = `function renderLinhaHistoricoRastreamentoOP(op) {\n  const eventos = getLinhaTempoRastreamentoOP(op);\n  const faccaoInicial = limparTexto(op?.faccaoOriginalLigia || "").toUpperCase();\n  const processoInicial = faccaoInicial ? inferirProcessoHistoricoLigia(op, faccaoInicial) : "";\n  const quemEncapou = processoInicial === "ENCAPAR BOJO" && faccaoInicial ? faccaoInicial : "Não identificado";`;

const newHead = `function renderLinhaHistoricoRastreamentoOP(op) {\n  const eventos = getLinhaTempoRastreamentoOP(op);\n  const faccaoInicial = limparTexto(op?.faccaoOriginalLigia || "").toUpperCase();\n  const processoInicial = faccaoInicial ? inferirProcessoHistoricoLigia(op, faccaoInicial) : "";\n  const quemEncapou = processoInicial === "ENCAPAR BOJO" && faccaoInicial ? faccaoInicial : "Não identificado";\n  const localAtualHistorico = getLocalizacaoAtualOrdem(op);\n  const jaBipadoHistorico = /finalizado|bipado/i.test(\`${'${localAtualHistorico.local || ""} ${localAtualHistorico.status || ""}'}\`);\n  const botaoBiparHistorico = jaBipadoHistorico\n    ? \`<span class="badge ok">Bipado ✓</span>\`\n    : \`<button class="btn btn-sm btn-bipado" type="button" data-bipar-op-direto="${'${escapeHtml(op.id)}'}" onclick="biparOrdemDireto('${'${op.id}'}')">Bipar</button>\`;\n  const botaoManejoHistorico = \`<button class="btn btn-sm" type="button" data-enviar-manejo-direto="${'${escapeHtml(op.id)}'}" onclick="enviarOrdemParaManejoDireto('${'${op.id}'}')">Enviar para manejo</button>\`;`;
app = replaceExact(app, oldHead, newHead, 1, 'cabeçalho histórico');

const oldButton = `${'${ehAdmin() ? `<button class="btn btn-sm btn-primary" type="button" data-rastreamento-ajuste-id="${escapeHtml(op.id)}">Mover / corrigir local</button>` : ""}'}`;
const newButtons = `<div class="actions">\n              ${'${botaoBiparHistorico}'}\n              ${'${botaoManejoHistorico}'}\n              ${'${ehAdmin() ? `<button class="btn btn-sm btn-primary" type="button" data-rastreamento-ajuste-id="${escapeHtml(op.id)}">Mover / corrigir local</button>` : ""}'}\n              <button class="btn btn-sm" type="button" onclick="filtrarManejosPorOP('${'${escapeHtml(op.numeroOP || op.id)}'}')">Abrir manejo</button>\n            </div>`;
app = replaceExact(app, oldButton, newButtons, 1, 'ações do cartão de histórico');

if (!app.includes('const botaoBiparHistorico =')) throw new Error('Botão Bipar do histórico não foi criado');
if (!app.includes('botaoManejoHistorico')) throw new Error('Botão Enviar para manejo do histórico não foi criado');
if ((app.match(/data-rastreamento-ajuste-id=/g) || []).length !== 3) throw new Error('Controlador de ajuste foi alterado indevidamente');
write('app.js', app);

for (const path of ['index.html', 'corponu-atualizador.js', 'update.js']) {
  let source = read(path);
  if (!source.includes(OLD_RELEASE)) throw new Error(`${path}: release antiga não encontrada`);
  source = source.split(OLD_RELEASE).join(NEW_RELEASE);
  write(path, source);
}

const notes = 'Produção. Restaura no cartão de histórico do Rastreamento as ações operacionais visíveis na busca exata: Bipar, Enviar para manejo, Mover/corrigir local e Abrir manejo. Mantém o controlador único da release 306 e não reativa módulos legados. Nenhum dado do Firebase é alterado.';
for (const path of ['corponu-release.json', 'version.json']) {
  const data = JSON.parse(read(path));
  if (data.version !== OLD_RELEASE) throw new Error(`${path}: versão inesperada ${data.version}`);
  data.version = NEW_RELEASE;
  data.updatedAt = new Date().toISOString();
  data.notes = notes;
  write(path, JSON.stringify(data, null, 2) + '\n');
}

console.log(`Ações do histórico restauradas: ${NEW_RELEASE}`);
