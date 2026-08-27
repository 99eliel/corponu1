import fs from "node:fs";

const RELEASE = "2026-08-26-faccoes-sem-chegada-manual-259";
const ARQUIVOS_MANUAIS = [
  "corponu-chegada-manual-visual.js",
  "corponu-chegada-manual-sutia-pagamento-automatico.js",
  "corponu-chegada-manual-trava-movimentacao.js",
  "corponu-sutia-completo-reconciliacao-manual.js",
  "corponu-sutia-912-chegada-manual-sem-verificacoes.js",
  "corponu-chegada-manual-sem-componentes-duplicados.js"
];

function falhar(mensagem) {
  throw new Error(`[remover-chegada-manual-259] ${mensagem}`);
}

function contar(texto, trecho) {
  return texto.split(trecho).length - 1;
}

function exigirOcorrencias(texto, trecho, quantidade, contexto) {
  const atual = contar(texto, trecho);
  if (atual !== quantidade) falhar(`${contexto}: esperado ${quantidade} ocorrência(s) de ${JSON.stringify(trecho)}, encontrado ${atual}.`);
}

function removerEntre(texto, inicio, fim, contexto) {
  exigirOcorrencias(texto, inicio, 1, `${contexto}/início`);
  const posInicio = texto.indexOf(inicio);
  const posFim = texto.indexOf(fim, posInicio + inicio.length);
  if (posFim < 0) falhar(`${contexto}: limite final não encontrado.`);
  return {
    texto: texto.slice(0, posInicio) + texto.slice(posFim),
    removido: texto.slice(posInicio, posFim)
  };
}

function removerElementoPorId(texto, tag, id, contexto) {
  const inicio = `<${tag} id="${id}"`;
  exigirOcorrencias(texto, inicio, 1, `${contexto}/início`);
  const posInicio = texto.indexOf(inicio);
  const posFimTag = texto.indexOf(`</${tag}>`, posInicio);
  if (posFimTag < 0) falhar(`${contexto}: fechamento </${tag}> não encontrado.`);
  let fim = posFimTag + `</${tag}>`.length;
  if (texto[fim] === "\r" && texto[fim + 1] === "\n") fim += 2;
  else if (texto[fim] === "\n") fim += 1;
  return texto.slice(0, posInicio) + texto.slice(fim);
}

// 1) Remove a regra de negócio que criava uma movimentação já retornada e gerava pagamento sem o fluxo completo.
let app = fs.readFileSync("app.js", "utf8");
const blocoManual = removerEntre(
  app,
  "function abrirModalChegadaManualFaccao() {",
  "async function registrarChegadaMovimentacao(",
  "app.js/bloco-chegada-manual"
);
if (!blocoManual.removido.includes("origemManual: true")) {
  falhar("app.js: o bloco localizado não contém a criação origemManual: true esperada; abortando para não remover código errado.");
}
if (!blocoManual.removido.includes("configurarChegadaManualFaccao")) {
  falhar("app.js: o bloco localizado não contém a configuração da chegada manual esperada.");
}
app = blocoManual.texto;

const regexChamadaConfig = /(^|\n)[\t ]*configurarChegadaManualFaccao\(\);[\t ]*(?=\r?\n|$)/g;
const chamadas = [...app.matchAll(regexChamadaConfig)];
if (chamadas.length !== 1) falhar(`app.js: esperado 1 acionamento de configurarChegadaManualFaccao(); fora do bloco, encontrado ${chamadas.length}.`);
app = app.replace(regexChamadaConfig, "$1");

const proibidosApp = [
  "abrirModalChegadaManualFaccao",
  "fecharModalChegadaManualFaccao",
  "configurarChegadaManualFaccao",
  "btnAbrirChegadaManualFaccao",
  "btnFecharChegadaManualFaccao",
  "btnCancelarChegadaManualFaccao",
  "formChegadaManualFaccao",
  "chegadaManualNumeroOP",
  "chegadaManualProcesso",
  "chegadaManualFaccao",
  "chegadaManualDataSaida",
  "chegadaManualDataChegada",
  "origemManual: true"
];
for (const termo of proibidosApp) {
  if (app.includes(termo)) falhar(`app.js: referência residual da chegada manual: ${termo}`);
}
if (!app.includes("async function registrarChegadaMovimentacao(")) falhar("app.js: a chegada normal registrarChegadaMovimentacao foi removida indevidamente.");
fs.writeFileSync("app.js", app);

// 2) Remove a entrada e o modal do HTML, mas preserva Saída e a chegada normal de uma movimentação existente.
let html = fs.readFileSync("index.html", "utf8");
html = removerElementoPorId(html, "button", "btnAbrirChegadaManualFaccao", "index.html/botão-chegada-manual");
const modalManual = removerEntre(
  html,
  '<div id="modalChegadaManualFaccao"',
  '<div id="modalRegistrarChegada"',
  "index.html/modal-chegada-manual"
);
html = modalManual.texto;

const proibidosHtml = [
  "btnAbrirChegadaManualFaccao",
  "modalChegadaManualFaccao",
  "formChegadaManualFaccao",
  "chegadaManualNumeroOP",
  "chegadaManualProcesso",
  "chegadaManualFaccao",
  "chegadaManualDataSaida",
  "chegadaManualDataChegada"
];
for (const termo of proibidosHtml) {
  if (html.includes(termo)) falhar(`index.html: referência residual da chegada manual: ${termo}`);
}
if (!html.includes('id="btnAbrirSaidaManualFaccao"')) falhar("index.html: o botão Saída não foi preservado.");
if (!html.includes('id="modalRegistrarChegada"')) falhar("index.html: o modal da chegada normal não foi preservado.");
fs.writeFileSync("index.html", html);

// 3) Remove os módulos exclusivos do bypass e suas entradas do carregador oficial.
let atualizador = fs.readFileSync("corponu-atualizador.js", "utf8");
for (const arquivo of ARQUIVOS_MANUAIS) {
  exigirOcorrencias(atualizador, arquivo, 1, `corponu-atualizador.js/${arquivo}`);
  const linhas = atualizador.split(/\r?\n/);
  const filtradas = linhas.filter(linha => !linha.includes(arquivo));
  if (filtradas.length !== linhas.length - 1) falhar(`corponu-atualizador.js: não foi possível remover exatamente uma linha de ${arquivo}.`);
  atualizador = filtradas.join("\n");
}

const regexRelease = /const LOCAL_RELEASE = "[^"]+";/;
if (!regexRelease.test(atualizador)) falhar("corponu-atualizador.js: LOCAL_RELEASE não encontrado.");
atualizador = atualizador.replace(regexRelease, `const LOCAL_RELEASE = "${RELEASE}";`);
for (const arquivo of ARQUIVOS_MANUAIS) {
  if (atualizador.includes(arquivo)) falhar(`corponu-atualizador.js: loader residual para ${arquivo}.`);
}
fs.writeFileSync("corponu-atualizador.js", atualizador);

for (const arquivo of ARQUIVOS_MANUAIS) {
  if (!fs.existsSync(arquivo)) falhar(`Arquivo manual esperado não existe antes da remoção: ${arquivo}`);
  fs.rmSync(arquivo);
}

// 4) Pós-condições de raiz: nenhum caminho da chegada manual pode continuar executável.
const arquivosRaiz = fs.readdirSync(".").filter(nome => /\.(?:js|html)$/i.test(nome));
const referenciasProibidasRaiz = [
  "btnAbrirChegadaManualFaccao",
  "modalChegadaManualFaccao",
  "formChegadaManualFaccao",
  "configurarChegadaManualFaccao",
  "abrirModalChegadaManualFaccao",
  "chegadaManualNumeroOP"
];
for (const nome of arquivosRaiz) {
  const conteudo = fs.readFileSync(nome, "utf8");
  for (const termo of referenciasProibidasRaiz) {
    if (conteudo.includes(termo)) falhar(`${nome}: ainda contém referência executável da chegada manual (${termo}).`);
  }
}

for (const arquivo of ARQUIVOS_MANUAIS) {
  if (fs.existsSync(arquivo)) falhar(`Arquivo exclusivo da chegada manual ainda existe: ${arquivo}`);
}

console.log("OK: Chegada manual removida da raiz; Saída e chegada normal preservadas.");
console.log(`Release preparado: ${RELEASE}`);
