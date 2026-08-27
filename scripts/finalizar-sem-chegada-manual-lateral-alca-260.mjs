import fs from "node:fs";

const RELEASE = "2026-08-26-faccoes-sem-chegada-manual-260";
const MODULO = "corponu-faccoes-lateral-alca-254.js";
const ATUALIZADOR = "corponu-atualizador.js";
const INDEX = "index.html";
const RELEASE_FILE = "corponu-release.json";
const SCRIPT = "scripts/finalizar-sem-chegada-manual-lateral-alca-260.mjs";
const WORKFLOW = ".github/workflows/finalizar-sem-chegada-manual-lateral-alca-260.yml";

function falhar(mensagem) {
  throw new Error(`[finalizar-sem-chegada-manual-lateral-alca-260] ${mensagem}`);
}

function contar(texto, trecho) {
  return texto.split(trecho).length - 1;
}

function exigirUma(texto, trecho, contexto) {
  const qtd = contar(texto, trecho);
  if (qtd !== 1) falhar(`${contexto}: esperado 1 ocorrência de ${JSON.stringify(trecho)}, encontrado ${qtd}.`);
}

function substituirUma(texto, antigo, novo, contexto) {
  exigirUma(texto, antigo, contexto);
  return texto.replace(antigo, novo);
}

let modulo = fs.readFileSync(MODULO, "utf8");

modulo = substituirUma(
  modulo,
  '  const VERSION = "2026-08-26-faccoes-lateral-alca-nativo-254";',
  `  const VERSION = "${RELEASE}-lateral-alca";`,
  "versão do módulo"
);

modulo = substituirUma(
  modulo,
  '          <button class="btn btn-success" id="btnChegadaManualLateralAlca" type="button">Chegada manual</button>\n',
  "",
  "botão Chegada manual de Lateral e Alça"
);

const inicioFuncaoManual = '  function garantirProcessosChegadaManual() {';
const fimFuncaoManual = '  function injetarUI() {';
exigirUma(modulo, inicioFuncaoManual, "função auxiliar da Chegada manual");
exigirUma(modulo, fimFuncaoManual, "limite após função auxiliar da Chegada manual");
const inicio = modulo.indexOf(inicioFuncaoManual);
const fim = modulo.indexOf(fimFuncaoManual, inicio + inicioFuncaoManual.length);
if (inicio < 0 || fim <= inicio) falhar("limites inválidos ao remover garantirProcessosChegadaManual().");
modulo = modulo.slice(0, inicio) + modulo.slice(fim);

modulo = substituirUma(
  modulo,
  '    montarModais();\n    garantirProcessosChegadaManual();\n',
  '    montarModais();\n',
  "inicialização da Chegada manual"
);

modulo = substituirUma(
  modulo,
  '      if (target.closest("#btnChegadaManualLateralAlca")) {\n        garantirProcessosChegadaManual();\n        document.getElementById("btnAbrirChegadaManualFaccao")?.click();\n        return;\n      }\n',
  "",
  "handler do botão Chegada manual"
);

modulo = substituirUma(
  modulo,
  '      if (["formChegadaMovimentacao", "formChegadaManualFaccao", "formEntregaPagamento"].includes(form.id)) {',
  '      if (["formChegadaMovimentacao", "formEntregaPagamento"].includes(form.id)) {',
  "listener compartilhado com formulário manual"
);

modulo = substituirUma(
  modulo,
  '          const opNumber = document.getElementById(form.id === "formEntregaPagamento" ? "entregaOP" : "chegadaManualOP")?.value || "";',
  '          const opNumber = document.getElementById("entregaOP")?.value || "";',
  "leitura da OP do formulário manual"
);

for (const proibido of [
  "btnChegadaManualLateralAlca",
  "garantirProcessosChegadaManual",
  "chegadaManualProcessoList",
  "btnAbrirChegadaManualFaccao",
  "formChegadaManualFaccao",
  "chegadaManualOP"
]) {
  if (modulo.includes(proibido)) falhar(`${MODULO}: resíduo da Chegada manual permaneceu: ${proibido}`);
}

for (const obrigatorio of [
  'id="btnCorteRegistrarSaida"',
  'id="formChegadaCorte"',
  "function abrirChegada(",
  "function salvarChegada(",
  "data-chegada-corte"
]) {
  if (!modulo.includes(obrigatorio)) falhar(`${MODULO}: fluxo normal obrigatório foi removido: ${obrigatorio}`);
}

fs.writeFileSync(MODULO, modulo);

let atualizador = fs.readFileSync(ATUALIZADOR, "utf8");
const regexRelease = /  const LOCAL_RELEASE = "[^"]+";/;
if (!regexRelease.test(atualizador)) falhar("LOCAL_RELEASE não encontrado no atualizador.");
atualizador = atualizador.replace(regexRelease, `  const LOCAL_RELEASE = "${RELEASE}";`);
if (!atualizador.includes('corponu-faccoes-lateral-alca-254.js')) falhar("Módulo Lateral e Alça deixou de ser carregado pelo atualizador.");
fs.writeFileSync(ATUALIZADOR, atualizador);

let index = fs.readFileSync(INDEX, "utf8");
const updateRegex = /<script src="update\.js\?v=[^"]+"><\/script>/;
const appRegex = /<script type="module" src="app\.js\?v=[^"]+"><\/script>/;
if (!updateRegex.test(index)) falhar("Referência versionada de update.js não encontrada em index.html.");
if (!appRegex.test(index)) falhar("Referência versionada de app.js não encontrada em index.html.");
index = index.replace(updateRegex, `<script src="update.js?v=${RELEASE}"></script>`);
index = index.replace(appRegex, `<script type="module" src="app.js?v=${RELEASE}"></script>`);
fs.writeFileSync(INDEX, index);

const releaseData = JSON.parse(fs.readFileSync(RELEASE_FILE, "utf8"));
releaseData.version = RELEASE;
releaseData.updatedAt = "2026-08-26T22:08:00-03:00";
releaseData.notes = "Produção. A Chegada manual de Facções foi removida definitivamente da raiz e também da área Lateral e Alça. O módulo nativo de Lateral e Alça não possui mais botão, handler, datalist, listener nem dependência do formulário global antigo de Chegada manual. Permanece somente o Registro de saída como entrada operacional independente; a chegada continua possível exclusivamente sobre uma movimentação que já foi enviada, preservando o fluxo completo saída → retorno → pagamento. A limpeza anterior do app.js e update.js foi mantida, assim como Movimentações registradas, Restantes pendentes, componentes do Sutiã, proteção contra duplicidade e compatibilidade com dados históricos. Nenhuma regra do Firebase foi alterada.";
fs.writeFileSync(RELEASE_FILE, `${JSON.stringify(releaseData, null, 2)}\n`);

// Ferramentas temporárias desta migração não ficam na raiz após a execução.
for (const arquivo of [SCRIPT, WORKFLOW]) {
  if (fs.existsSync(arquivo)) fs.rmSync(arquivo);
}

console.log("OK: Chegada manual removida também de Lateral e Alça.");
console.log("OK: saída independente preservada e chegada normal exige movimentação existente.");
console.log(`Release: ${RELEASE}`);
