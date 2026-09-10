const fs = require('fs');

const OLD_RELEASE = '2026-09-09-calcinha-faccoes-id-oficial-304';
const NEW_RELEASE = '2026-09-10-rastreamento-acoes-canonicas-305';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function replaceOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`${label}: trecho esperado não encontrado`);
  if (source.indexOf(oldText, first + oldText.length) >= 0) throw new Error(`${label}: trecho ambíguo`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

let app = read('app.js');

const oldConfig = `function configurarRastreamento() {\n  const busca = document.getElementById("buscaRastreamento");\n  if (busca) {\n    // Busca global sem datalist e com pequeno atraso para não travar ao digitar OP.\n    busca.removeAttribute("list");\n    busca.setAttribute("autocomplete", "off");\n    busca.addEventListener("input", () => {\n      if (timerBuscaRastreamento) clearTimeout(timerBuscaRastreamento);\n      timerBuscaRastreamento = setTimeout(renderRastreamento, 160);\n    });\n  }\n}`;

const newConfig = `function configurarRastreamento() {\n  const busca = document.getElementById("buscaRastreamento");\n  if (busca) {\n    // Busca global sem datalist e com pequeno atraso para não travar ao digitar OP.\n    busca.removeAttribute("list");\n    busca.setAttribute("autocomplete", "off");\n    busca.addEventListener("input", () => {\n      if (timerBuscaRastreamento) clearTimeout(timerBuscaRastreamento);\n      timerBuscaRastreamento = setTimeout(renderRastreamento, 160);\n    });\n  }\n\n  // Controlador único das ações da tabela. Como o tbody é refeito por renderRastreamento(),\n  // delegar o clique aqui mantém as ações estáveis sem reinjetar listeners a cada renderização.\n  const tbody = document.getElementById("listaRastreamento");\n  if (tbody && !tbody.dataset.acoesCanonicas) {\n    tbody.dataset.acoesCanonicas = "1";\n    tbody.addEventListener("click", event => {\n      const botao = event.target.closest?.("[data-rastreamento-acao]");\n      if (!botao || !tbody.contains(botao)) return;\n\n      const acao = botao.dataset.rastreamentoAcao || "";\n      if (acao === "editar-local") {\n        const ordemId = botao.dataset.ordemId || "";\n        if (!ordemId) {\n          toast("Não foi possível identificar a OP para editar o local.");\n          return;\n        }\n        abrirModalAjusteMigracao(ordemId);\n        return;\n      }\n\n      const movimentacaoId = botao.dataset.movimentacaoId || "";\n      if (!movimentacaoId) {\n        toast("Não foi possível identificar a movimentação desta OP.");\n        return;\n      }\n      if (acao === "bipar") biparMovimentacao(movimentacaoId);\n      if (acao === "chegada") registrarChegadaMovimentacao(movimentacaoId);\n      if (acao === "excluir") excluirMovimentacao(movimentacaoId);\n    });\n  }\n}`;

app = replaceOnce(app, oldConfig, newConfig, 'controlador do Rastreamento');

const oldGlobal = `function renderLinhaRastreamentoGlobalOP(op) {\n  const local = getLocalizacaoAtualOrdem(op);\n  const quantidade = Number(op?.quantidade || 0);\n  const acoes = ehAdmin()\n    ? \`<button class="btn btn-sm btn-primary" onclick="abrirModalAjusteMigracao('\${op.id}')">Editar local</button>\n       <button class="btn btn-sm" onclick="filtrarManejosPorOP('\${escapeHtml(op.numeroOP || op.id)}')">Abrir manejo</button>\`\n    : \`<button class="btn btn-sm" onclick="filtrarManejosPorOP('\${escapeHtml(op.numeroOP || op.id)}')">Abrir manejo</button>\`;\n  return \`\n    <tr class="rastreamento-global-row">`;

const newGlobal = `function renderLinhaRastreamentoGlobalOP(op) {\n  const local = getLocalizacaoAtualOrdem(op);\n  const quantidade = Number(op?.quantidade || 0);\n  const movimentacaoAtual = getUltimaMovimentacaoOrdem(op);\n  const movimentacaoId = String(movimentacaoAtual?.id || "");\n  const podeBipar = Boolean(\n    movimentacaoAtual &&\n    movimentacaoAtual.dataChegada &&\n    movimentacaoAtual.status !== "finalizado" &&\n    movimentacaoAtual.status !== "encaminhado"\n  );\n  const editarLocal = ehAdmin()\n    ? \`<button type="button" class="btn btn-sm btn-primary" data-rastreamento-acao="editar-local" data-ordem-id="\${escapeHtml(op.id)}">Editar local</button>\`\n    : "";\n  const bipar = podeBipar\n    ? \`<button type="button" class="btn btn-sm btn-bipado" data-rastreamento-acao="bipar" data-movimentacao-id="\${escapeHtml(movimentacaoId)}">Bipar</button>\`\n    : movimentacaoAtual?.status === "finalizado"\n      ? '<span class="badge ok">Bipado ✓</span>'\n      : "";\n  const acoes = \`\${editarLocal}\n    \${bipar}\n    <button class="btn btn-sm" onclick="filtrarManejosPorOP('\${escapeHtml(op.numeroOP || op.id)}')">Abrir manejo</button>\`;\n  return \`\n    <tr class="rastreamento-global-row" data-ordem-id="\${escapeHtml(op.id)}" data-movimentacao-id="\${escapeHtml(movimentacaoId)}">`;

app = replaceOnce(app, oldGlobal, newGlobal, 'linha global do Rastreamento');

const oldHistoryButton = `${'${'}ehAdmin() ? \`<button class="btn btn-sm btn-primary" onclick="abrirModalAjusteMigracao('${'${'}op.id}')">Mover / corrigir local</button>\` : ""}`;
const newHistoryButton = `${'${'}ehAdmin() ? \`<button type="button" class="btn btn-sm btn-primary" data-rastreamento-acao="editar-local" data-ordem-id="${'${'}escapeHtml(op.id)}">Mover / corrigir local</button>\` : ""}`;
app = replaceOnce(app, oldHistoryButton, newHistoryButton, 'botão de edição no histórico');

const oldMovementActions = `          \${editarLocal}\n          \${mov.status === "encaminhado" ? \`<span class="badge info">Encaminhado</span>\` : ""}\n          \${mov.status !== "finalizado" && mov.status !== "encaminhado" ? \`<button class="btn btn-sm btn-success" onclick="registrarChegadaMovimentacao('\${mov.id}')">Chegada</button>\` : ""}\n          \${mov.status === "finalizado" ? \`<span class="badge ok">Bipado ✓</span>\` : mov.status === "encaminhado" ? "" : \`<button class="btn btn-sm btn-bipado" onclick="biparMovimentacao('\${mov.id}')">Bipar</button>\`}\n          \${ehAdmin() ? \`<button class="btn btn-sm btn-danger" onclick="excluirMovimentacao('\${mov.id}')">Excluir</button>\` : ""}`;
const newMovementActions = `          \${editarLocal}\n          \${mov.status === "encaminhado" ? \`<span class="badge info">Encaminhado</span>\` : ""}\n          \${mov.status !== "finalizado" && mov.status !== "encaminhado" ? \`<button type="button" class="btn btn-sm btn-success" data-rastreamento-acao="chegada" data-movimentacao-id="\${escapeHtml(mov.id)}">Chegada</button>\` : ""}\n          \${mov.status === "finalizado" ? \`<span class="badge ok">Bipado ✓</span>\` : mov.status === "encaminhado" ? "" : \`<button type="button" class="btn btn-sm btn-bipado" data-rastreamento-acao="bipar" data-movimentacao-id="\${escapeHtml(mov.id)}">Bipar</button>\`}\n          \${ehAdmin() ? \`<button type="button" class="btn btn-sm btn-danger" data-rastreamento-acao="excluir" data-movimentacao-id="\${escapeHtml(mov.id)}">Excluir</button>\` : ""}`;
app = replaceOnce(app, oldMovementActions, newMovementActions, 'ações da listagem normal do Rastreamento');

const oldEditarMov = `    const editarLocal = ordem && ehAdmin()\n      ? \`<button class="btn btn-sm btn-primary" onclick="abrirModalAjusteMigracao('\${ordem.id}')">Editar local</button>\`\n      : "";`;
const newEditarMov = `    const editarLocal = ordem && ehAdmin()\n      ? \`<button type="button" class="btn btn-sm btn-primary" data-rastreamento-acao="editar-local" data-ordem-id="\${escapeHtml(ordem.id)}">Editar local</button>\`\n      : "";`;
app = replaceOnce(app, oldEditarMov, newEditarMov, 'edição local da listagem normal');

if (!app.includes('data-rastreamento-acao="bipar"')) throw new Error('ação canônica Bipar não foi criada');
if (!app.includes('tbody.dataset.acoesCanonicas = "1"')) throw new Error('delegação única de ações não foi criada');
if (!app.includes('data-movimentacao-id="${escapeHtml(movimentacaoId)}"')) throw new Error('linha global não recebeu movimentacaoId');
write('app.js', app);

const notes = 'Produção. Corrige as ações do Rastreamento na busca por OP. A linha-resumo passa a carregar a última movimentação real, habilita Bipar quando já houve chegada e usa um único controlador delegado no tbody para Editar local, Bipar, Chegada e Excluir. Sem listeners por linha, sem observers extras e sem alterar dados existentes do Firebase.';

for (const path of ['index.html', 'corponu-atualizador.js', 'update.js']) {
  let source = read(path);
  if (!source.includes(OLD_RELEASE)) throw new Error(`${path}: release 304 não encontrada`);
  source = source.split(OLD_RELEASE).join(NEW_RELEASE);
  write(path, source);
}

for (const path of ['corponu-release.json', 'version.json']) {
  const data = JSON.parse(read(path));
  if (data.version !== OLD_RELEASE) throw new Error(`${path}: versão inesperada ${data.version}`);
  data.version = NEW_RELEASE;
  data.updatedAt = new Date().toISOString();
  data.notes = notes;
  write(path, JSON.stringify(data, null, 2) + '\n');
}

for (const path of ['index.html', 'corponu-atualizador.js', 'update.js', 'corponu-release.json', 'version.json']) {
  const source = read(path);
  if (!source.includes(NEW_RELEASE)) throw new Error(`${path}: release 305 ausente`);
  if (source.includes(OLD_RELEASE)) throw new Error(`${path}: release 304 ainda presente`);
}

console.log(`Rastreamento corrigido: ${NEW_RELEASE}`);
