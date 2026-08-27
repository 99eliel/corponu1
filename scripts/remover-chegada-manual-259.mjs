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

function removerLinhaUnica(texto, trecho, contexto) {
  exigirOcorrencias(texto, trecho, 1, contexto);
  const linhas = texto.split(/\r?\n/);
  const filtradas = linhas.filter(linha => !linha.includes(trecho));
  if (filtradas.length !== linhas.length - 1) falhar(`${contexto}: não foi possível remover exatamente uma linha.`);
  return filtradas.join("\n");
}

// 1) Remove toda a regra de negócio do atalho: configuração, preenchimento por OP,
// criação direta da movimentação como retornada e geração de pagamento.
let app = fs.readFileSync("app.js", "utf8");
const blocoManual = removerEntre(
  app,
  "function configurarChegadaManualFaccao() {",
  "function registrarChegadaMovimentacao(",
  "app.js/bloco-chegada-manual"
);
if (!blocoManual.removido.includes("origemManual: true")) {
  falhar("app.js: o bloco localizado não contém a criação origemManual: true esperada; abortando para não remover código errado.");
}
if (!blocoManual.removido.includes('origem: "chegada_manual_faccao"')) {
  falhar("app.js: o bloco localizado não contém a origem chegada_manual_faccao esperada.");
}
if (!blocoManual.removido.includes("async function confirmarChegadaManualFaccao")) {
  falhar("app.js: o bloco localizado não contém a confirmação da chegada manual esperada.");
}
app = blocoManual.texto;

const regexChamadaConfig = /(^|\n)[\t ]*configurarChegadaManualFaccao\(\);[\t ]*(?=\r?\n|$)/g;
const chamadas = [...app.matchAll(regexChamadaConfig)];
if (chamadas.length !== 1) falhar(`app.js: esperado 1 acionamento de configurarChegadaManualFaccao(); fora do bloco, encontrado ${chamadas.length}.`);
app = app.replace(regexChamadaConfig, "$1");

app = removerLinhaUnica(
  app,
  "window.abrirModalChegadaManualFaccao = abrirModalChegadaManualFaccao;",
  "app.js/export-chegada-manual"
);

if (app.includes("ChegadaManualFaccao") || app.includes("chegadaManual")) {
  falhar("app.js: ainda existe referência da Chegada manual após remover o bloco, acionamento e export.");
}
if (app.includes('origem: "chegada_manual_faccao"')) falhar("app.js: ainda existe a origem específica do bypass chegada_manual_faccao.");
if (!app.includes("function registrarChegadaMovimentacao(")) falhar("app.js: a chegada normal registrarChegadaMovimentacao foi removida indevidamente.");
if (!app.includes("window.registrarChegadaMovimentacao = registrarChegadaMovimentacao;")) falhar("app.js: export da chegada normal não foi preservado.");
fs.writeFileSync("app.js", app);

// 2) Remove a entrada e o modal do HTML, preservando Saída e o modal usado pela chegada normal.
let html = fs.readFileSync("index.html", "utf8");
html = removerElementoPorId(html, "button", "btnAbrirChegadaManualFaccao", "index.html/botão-chegada-manual");
const modalManual = removerEntre(
  html,
  '<div id="modalChegadaManualFaccao"',
  '<div id="modalRegistrarChegada"',
  "index.html/modal-chegada-manual"
);
html = modalManual.texto;

if (html.includes("ChegadaManualFaccao") || html.includes("chegadaManual")) {
  falhar("index.html: ainda existe entrada/campo/modal da Chegada manual.");
}
if (!html.includes('id="btnAbrirSaidaManualFaccao"')) falhar("index.html: o botão Saída não foi preservado.");
if (!html.includes('id="modalRegistrarChegada"')) falhar("index.html: o modal da chegada normal não foi preservado.");
fs.writeFileSync("index.html", html);

// 3) Remove do carregador oficial todos os módulos que existiam exclusivamente para sustentar o bypass.
let atualizador = fs.readFileSync("corponu-atualizador.js", "utf8");
for (const arquivo of ARQUIVOS_MANUAIS) {
  atualizador = removerLinhaUnica(atualizador, arquivo, `corponu-atualizador.js/${arquivo}`);
}

const regexRelease = /const LOCAL_RELEASE = "[^"]+";/;
if (!regexRelease.test(atualizador)) falhar("corponu-atualizador.js: LOCAL_RELEASE não encontrado.");
atualizador = atualizador.replace(regexRelease, `const LOCAL_RELEASE = "${RELEASE}";`);
for (const arquivo of ARQUIVOS_MANUAIS) {
  if (atualizador.includes(arquivo)) falhar(`corponu-atualizador.js: loader residual para ${arquivo}.`);
}
fs.writeFileSync("corponu-atualizador.js", atualizador);

// 4) Exclui os arquivos cuja única responsabilidade era a Chegada manual.
for (const arquivo of ARQUIVOS_MANUAIS) {
  if (!fs.existsSync(arquivo)) falhar(`Arquivo manual esperado não existe antes da remoção: ${arquivo}`);
  fs.rmSync(arquivo);
}

// 5) Pós-condições de raiz. Não varremos testes/scripts auxiliares: o que importa aqui é não haver caminho executável no app.
const arquivosRuntime = ["app.js", "index.html", "corponu-atualizador.js"];
for (const nome of arquivosRuntime) {
  const conteudo = fs.readFileSync(nome, "utf8");
  if (conteudo.includes("ChegadaManualFaccao") || conteudo.includes("chegadaManual")) {
    falhar(`${nome}: ainda contém referência executável da Chegada manual.`);
  }
}
for (const arquivo of ARQUIVOS_MANUAIS) {
  if (fs.existsSync(arquivo)) falhar(`Arquivo exclusivo da chegada manual ainda existe: ${arquivo}`);
}

console.log("OK: Chegada manual removida da raiz; Saída e chegada normal preservadas.");
console.log(`Release preparado: ${RELEASE}`);
