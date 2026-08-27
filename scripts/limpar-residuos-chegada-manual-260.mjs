import fs from "node:fs";

const RELEASE = "2026-08-26-faccoes-sem-chegada-manual-260";
const UPDATE = "update.js";
const LEGADO = "corponu-chegada-manual-faccoes-processo-119-seguro.js";
const DOC = "README-CHEGADA-MANUAL-FACCAO.txt";

function falhar(mensagem) {
  throw new Error(`[limpar-residuos-chegada-manual-260] ${mensagem}`);
}

function contar(texto, trecho) {
  return texto.split(trecho).length - 1;
}

function exigir(texto, trecho, qtd, contexto) {
  const atual = contar(texto, trecho);
  if (atual !== qtd) falhar(`${contexto}: esperado ${qtd} ocorrência(s) de ${JSON.stringify(trecho)}, encontrado ${atual}.`);
}

let update = fs.readFileSync(UPDATE, "utf8");
const inicio = `  // =========================================================\n  // HOTFIX: CHEGADA MANUAL DE FACÇÃO`;
const fim = `  // =========================================================\n  // HOTFIX: NECESSIDADE REPROCESSADA E CONFERIDA`;

exigir(update, inicio, 1, "update.js/início bloco manual");
exigir(update, fim, 1, "update.js/fim bloco manual");
exigir(update, "    iniciarHotfixChegadaManual();", 1, "update.js/chamada manual");

const posInicio = update.indexOf(inicio);
const posFim = update.indexOf(fim, posInicio + inicio.length);
if (posFim <= posInicio) falhar("update.js: limites do bloco manual inválidos.");
const removido = update.slice(posInicio, posFim);

for (const identidade of [
  "formChegadaManualFaccao",
  "chegadaManualProcesso",
  "chegadaManualFaccao",
  "btnAbrirChegadaManualFaccao",
  "iniciarHotfixChegadaManual"
]) {
  if (!removido.includes(identidade)) falhar(`update.js: bloco localizado não contém a identidade esperada ${identidade}.`);
}

update = update.slice(0, posInicio) + update.slice(posFim);
update = update.replace(/^\s*iniciarHotfixChegadaManual\(\);\s*\r?\n/m, "");

const proibidosUpdate = [
  "HOTFIX: CHEGADA MANUAL DE FACÇÃO",
  "formChegadaManualFaccao",
  "modalChegadaManualFaccao",
  "chegadaManualProcesso",
  "chegadaManualFaccao",
  "btnAbrirChegadaManualFaccao",
  "iniciarHotfixChegadaManual",
  "__toastTimerChegadaManual"
];
for (const termo of proibidosUpdate) {
  if (update.includes(termo)) falhar(`update.js: referência residual da Chegada manual: ${termo}`);
}

fs.writeFileSync(UPDATE, update);

for (const arquivo of [LEGADO, DOC]) {
  if (!fs.existsSync(arquivo)) falhar(`Arquivo legado esperado não encontrado: ${arquivo}`);
  fs.rmSync(arquivo);
}

if (!fs.existsSync("corponu-faccoes-tres-abas-saida.js")) falhar("Módulo de Saída não existe após a limpeza.");
const atualizador = fs.readFileSync("corponu-atualizador.js", "utf8");
if (!atualizador.includes("corponu-faccoes-tres-abas-saida.js")) falhar("Saída não está carregada no atualizador oficial.");
if (!fs.readFileSync("app.js", "utf8").includes("function registrarChegadaMovimentacao(")) falhar("Chegada normal foi removida indevidamente.");

console.log("OK: resíduos executáveis/documentais exclusivos da Chegada manual removidos.");
console.log(`Próximo release: ${RELEASE}`);
