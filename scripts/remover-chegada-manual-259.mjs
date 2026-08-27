import fs from "node:fs";

const RELEASE = "2026-08-26-faccoes-sem-chegada-manual-259";
const MODULO_SAIDA = "corponu-faccoes-tres-abas-saida.js";
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

function removerElementoComId(texto, tag, id, contexto) {
  const marcador = `id="${id}"`;
  exigirOcorrencias(texto, marcador, 1, `${contexto}/id`);
  const posId = texto.indexOf(marcador);
  const posInicio = texto.lastIndexOf(`<${tag}`, posId);
  if (posInicio < 0) falhar(`${contexto}: abertura <${tag}> não encontrada antes do id.`);
  const fimAbertura = texto.indexOf(">", posInicio);
  if (fimAbertura < posId) falhar(`${contexto}: o id não pertence à abertura <${tag}> localizada.`);
  const fechamento = `</${tag}>`;
  const posFechamento = texto.indexOf(fechamento, fimAbertura);
  if (posFechamento < 0) falhar(`${contexto}: fechamento ${fechamento} não encontrado.`);
  let fim = posFechamento + fechamento.length;
  if (texto[fim] === "\r" && texto[fim + 1] === "\n") fim += 2;
  else if (texto[fim] === "\n") fim += 1;
  return texto.slice(0, posInicio) + texto.slice(fim);
}

function removerBlocoDivEntreIds(texto, idInicio, idSeguinte, contexto) {
  const marcadorInicio = `id="${idInicio}"`;
  const marcadorSeguinte = `id="${idSeguinte}"`;
  exigirOcorrencias(texto, marcadorInicio, 1, `${contexto}/id-início`);
  exigirOcorrencias(texto, marcadorSeguinte, 1, `${contexto}/id-seguinte`);
  const posIdInicio = texto.indexOf(marcadorInicio);
  const posIdSeguinte = texto.indexOf(marcadorSeguinte, posIdInicio + marcadorInicio.length);
  if (posIdSeguinte < 0) falhar(`${contexto}: o bloco seguinte não está após o bloco manual.`);
  const posInicio = texto.lastIndexOf("<div", posIdInicio);
  const posSeguinte = texto.lastIndexOf("<div", posIdSeguinte);
  if (posInicio < 0 || posSeguinte < 0 || posSeguinte <= posInicio) falhar(`${contexto}: limites estruturais dos modais inválidos.`);
  const removido = texto.slice(posInicio, posSeguinte);
  if (!removido.includes("Chegada manual")) falhar(`${contexto}: o bloco identificado não contém o título da Chegada manual.`);
  return { texto: texto.slice(0, posInicio) + texto.slice(posSeguinte), removido };
}

function removerLinhaUnica(texto, trecho, contexto) {
  exigirOcorrencias(texto, trecho, 1, contexto);
  const linhas = texto.split(/\r?\n/);
  const filtradas = linhas.filter(linha => !linha.includes(trecho));
  if (filtradas.length !== linhas.length - 1) falhar(`${contexto}: não foi possível remover exatamente uma linha.`);
  return filtradas.join("\n");
}

// 1) Regra de negócio: elimina o atalho que criava uma movimentação já retornada e gerava pagamento.
let app = fs.readFileSync("app.js", "utf8");
const blocoManual = removerEntre(
  app,
  "function configurarChegadaManualFaccao() {",
  "function registrarChegadaMovimentacao(",
  "app.js/bloco-chegada-manual"
);
if (!blocoManual.removido.includes('origem: "chegada_manual_faccao"')) {
  falhar("app.js: o bloco localizado não contém a origem chegada_manual_faccao esperada.");
}
if (!blocoManual.removido.includes("origemManual: true")) {
  falhar("app.js: o bloco localizado não contém o marcador manual esperado.");
}
if (!blocoManual.removido.includes("async function confirmarChegadaManualFaccao")) {
  falhar("app.js: o bloco localizado não contém a confirmação manual esperada.");
}
app = blocoManual.texto;

const regexChamadaConfig = /(^|\n)[\t ]*configurarChegadaManualFaccao\(\);[\t ]*(?=\r?\n|$)/g;
const chamadas = [...app.matchAll(regexChamadaConfig)];
if (chamadas.length !== 1) falhar(`app.js: esperado 1 acionamento de configurarChegadaManualFaccao(); fora do bloco, encontrado ${chamadas.length}.`);
app = app.replace(regexChamadaConfig, "$1");
app = removerLinhaUnica(app, "window.abrirModalChegadaManualFaccao = abrirModalChegadaManualFaccao;", "app.js/export-chegada-manual");

if (app.includes("ChegadaManualFaccao") || app.includes("chegadaManual") || app.includes('origem: "chegada_manual_faccao"')) {
  falhar("app.js: ainda existe referência executável da Chegada manual.");
}
if (!app.includes("function registrarChegadaMovimentacao(")) falhar("app.js: a chegada normal registrarChegadaMovimentacao foi removida indevidamente.");
if (!app.includes("window.registrarChegadaMovimentacao = registrarChegadaMovimentacao;")) falhar("app.js: export da chegada normal não foi preservado.");
fs.writeFileSync("app.js", app);

// 2) HTML: elimina botão e modal por identidade, sem depender da ordem class/id/type dos atributos.
let html = fs.readFileSync("index.html", "utf8");
html = removerElementoComId(html, "button", "btnAbrirChegadaManualFaccao", "index.html/botão-chegada-manual");
const modalManual = removerBlocoDivEntreIds(
  html,
  "modalChegadaManualFaccao",
  "modalChegadaMovimentacao",
  "index.html/modal-chegada-manual"
);
html = modalManual.texto;

if (html.includes("ChegadaManualFaccao") || html.includes("chegadaManual")) falhar("index.html: ainda existe entrada/campo/modal da Chegada manual.");
if (!html.includes('id="modalChegadaMovimentacao"')) falhar("index.html: o modal da chegada normal não foi preservado.");
fs.writeFileSync("index.html", html);

// 3) Carregador: remove somente módulos exclusivos da Chegada manual e preserva o módulo real de Saída.
let atualizador = fs.readFileSync("corponu-atualizador.js", "utf8");
for (const arquivo of ARQUIVOS_MANUAIS) {
  atualizador = removerLinhaUnica(atualizador, arquivo, `corponu-atualizador.js/${arquivo}`);
}
if (!atualizador.includes(MODULO_SAIDA)) falhar(`corponu-atualizador.js: módulo de Saída ${MODULO_SAIDA} não está carregado.`);

const regexRelease = /const LOCAL_RELEASE = "[^"]+";/;
if (!regexRelease.test(atualizador)) falhar("corponu-atualizador.js: LOCAL_RELEASE não encontrado.");
atualizador = atualizador.replace(regexRelease, `const LOCAL_RELEASE = "${RELEASE}";`);
for (const arquivo of ARQUIVOS_MANUAIS) {
  if (atualizador.includes(arquivo)) falhar(`corponu-atualizador.js: loader residual para ${arquivo}.`);
}
fs.writeFileSync("corponu-atualizador.js", atualizador);

// 4) Arquivos: exclui os módulos cuja única responsabilidade era sustentar a Chegada manual.
for (const arquivo of ARQUIVOS_MANUAIS) {
  if (!fs.existsSync(arquivo)) falhar(`Arquivo manual esperado não existe antes da remoção: ${arquivo}`);
  fs.rmSync(arquivo);
}
if (!fs.existsSync(MODULO_SAIDA)) falhar(`Módulo de Saída foi removido indevidamente: ${MODULO_SAIDA}`);

// 5) Pós-condições do runtime.
for (const nome of ["app.js", "index.html", "corponu-atualizador.js"]) {
  const conteudo = fs.readFileSync(nome, "utf8");
  if (conteudo.includes("ChegadaManualFaccao") || conteudo.includes("chegadaManual") || conteudo.includes("chegada_manual_faccao")) {
    falhar(`${nome}: ainda contém referência executável da Chegada manual.`);
  }
}
for (const arquivo of ARQUIVOS_MANUAIS) {
  if (fs.existsSync(arquivo)) falhar(`Arquivo exclusivo da chegada manual ainda existe: ${arquivo}`);
}

console.log("OK: Chegada manual removida da raiz; Saída e chegada normal preservadas.");
console.log(`Release preparado: ${RELEASE}`);
