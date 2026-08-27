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

function removerEntre(texto, inicio, fim, contexto) {
  exigir(texto, inicio, 1, `${contexto}/início`);
  exigir(texto, fim, 1, `${contexto}/fim`);
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fim, a + inicio.length);
  if (b <= a) falhar(`${contexto}: limites inválidos.`);
  return texto.slice(0, a) + texto.slice(b);
}

function substituirUnico(texto, antigo, novo, contexto) {
  exigir(texto, antigo, 1, contexto);
  return texto.replace(antigo, novo);
}

function removerLinhaUnica(texto, trecho, contexto) {
  exigir(texto, trecho, 1, contexto);
  const linhas = texto.split(/\r?\n/);
  const filtradas = linhas.filter(linha => !linha.includes(trecho));
  if (filtradas.length !== linhas.length - 1) falhar(`${contexto}: não foi possível remover exatamente uma linha.`);
  return filtradas.join("\n");
}

let update = fs.readFileSync(UPDATE, "utf8");

// O topo do update.js nasceu como hotfix da Chegada manual, mas hoje contém utilitários
// compartilhados por envio, gestão de processos e outros fluxos. Mantemos somente o que
// é compartilhado e removemos as funções exclusivas do atalho manual.
update = substituirUnico(
  update,
  `  // =========================================================\n  // HOTFIX: CHEGADA MANUAL DE FACÇÃO\n  // Fluxo: OP -> REF/quantidade -> processo -> facções permitidas\n  // Esta correção não altera o salvamento existente no app.js.\n  // =========================================================`,
  `  // =========================================================\n  // UTILITÁRIOS COMPARTILHADOS DE PROCESSOS E FACÇÕES\n  // Normalização, vínculos e avisos usados pelos fluxos oficiais.\n  // =========================================================`,
  "update.js/cabeçalho-utilitários"
);
update = update.replaceAll("__toastTimerChegadaManual", "__toastTimerFormulario");
update = removerEntre(
  update,
  "  function copiarAtributosBasicos(origem, destino) {",
  "  // =========================================================\n  // HOTFIX: NECESSIDADE REPROCESSADA E CONFERIDA",
  "update.js/hotfix-chegada-manual-antigo"
);

// Movimentações registradas continua existindo. Registros históricos com origemManual
// continuam reconhecidos, mas a origem específica chegada_manual_faccao deixa de fazer
// parte da lógica do runtime.
update = substituirUnico(
  update,
  `  function movimentoManualUsuario(mov) {\n    return Boolean(mov?.origemManual || mov?.origem === "chegada_manual_faccao");\n  }`,
  `  function movimentoManualUsuario(mov) {\n    return Boolean(mov?.origemManual);\n  }`,
  "update.js/histórico-manual"
);

// O botão de Movimentações registradas não pode depender do botão removido.
update = removerEntre(
  update,
  "  function criarBotaoMovUsuario() {",
  "  function criarPainelMovUsuario() {",
  "update.js/botão-movimentações"
);
update = update.replace(
  "  function criarPainelMovUsuario() {",
  `  function criarBotaoMovUsuario() {\n    if (document.getElementById("btnMovimentacoesRegistradasUsuario")) return;\n    const actions = document.querySelector("#faccoes .panel-header .actions");\n    if (!actions) {\n      setTimeout(criarBotaoMovUsuario, 400);\n      return;\n    }\n    const botao = document.createElement("button");\n    botao.id = "btnMovimentacoesRegistradasUsuario";\n    botao.type = "button";\n    botao.className = "btn btn-primary";\n    botao.textContent = "Movimentações registradas";\n    botao.addEventListener("click", alternarPainelMovUsuario);\n    const gerenciar = document.getElementById("btnToggleGerenciarFaccoes");\n    if (gerenciar?.parentElement === actions) actions.insertBefore(botao, gerenciar);\n    else actions.appendChild(botao);\n  }\n\n  function criarPainelMovUsuario() {`
);

// Remove captura específica da Chegada manual, preservando a marcação de responsável
// da chegada normal de uma movimentação existente.
update = removerEntre(
  update,
  "  async function marcarChegadaManualAposSalvar(dadosEsperados, tentativa = 0) {",
  "  function instalarCapturaResponsavelChegada() {",
  "update.js/marcação-responsável-manual"
);
update = removerEntre(
  update,
  "  function instalarCapturaResponsavelChegada() {",
  "  async function configurarUsuarioMovUsuario(user) {",
  "update.js/captura-responsável"
);
update = update.replace(
  "  async function configurarUsuarioMovUsuario(user) {",
  `  function instalarCapturaResponsavelChegada() {\n    const formNormal = document.getElementById("formChegadaMovimentacao");\n    if (!formNormal || formNormal.dataset.capturaResponsavelChegada) return;\n    formNormal.dataset.capturaResponsavelChegada = APP_VERSION;\n    formNormal.addEventListener("submit", () => {\n      const id = document.getElementById("chegadaMovimentacaoId")?.value || "";\n      const data = document.getElementById("chegadaData")?.value || "";\n      setTimeout(() => marcarChegadaNormalAposSalvar(id, data), 700);\n    }, true);\n  }\n\n  async function configurarUsuarioMovUsuario(user) {`
);

// Proteção de duplicidade permanece para envio, chegada normal e pagamentos. A trava do
// caminho manual é removida porque esse formulário não existe mais.
update = removerEntre(
  update,
  "  function dadosChegadaManualParaTrava() {",
  "  function extrairNumeroOPPagamentoDuplicidade(valor) {",
  "update.js/trava-chegada-manual"
);
for (const trecho of [
`    instalarTravaEmFormulario(\n      document.getElementById("formChegadaManualFaccao"),\n      dadosChegadaManualParaTrava\n    );\n`,
`      instalarTravaEmFormulario(document.getElementById("formChegadaManualFaccao"), dadosChegadaManualParaTrava);\n`
]) {
  update = substituirUnico(update, trecho, "", "update.js/instalação-trava-manual");
}

// Gestão de processos atualiza somente o modal oficial de envio.
update = removerEntre(
  update,
  "  function atualizarSelectChegadaManualComProcessosGerenciados() {",
  "  function setorAtualMovimentacaoProcessosFaccoes() {",
  "update.js/select-processos-manual"
);
update = removerLinhaUnica(
  update,
  "atualizarSelectChegadaManualComProcessosGerenciados();",
  "update.js/snapshot-processos-manual"
);

// Remove por inteiro a implementação autônoma que criava movimentação + pagamento a
// partir apenas da OP. Esse é o bypass principal que contrariava o fluxo completo.
update = removerEntre(
  update,
  "  // =========================================================\n  // CHEGADA MANUAL SIMPLIFICADA PELA OP",
  "  // =========================================================\n  // SEGURANÇA: RECONFIRMAR PROCESSO E FACÇÃO NA CHEGADA NORMAL",
  "update.js/chegada-manual-simplificada"
);

// Componentes do Sutiã permanecem no envio e na chegada normal; retiramos somente os
// campos e eventos exclusivos do formulário manual.
update = removerEntre(
  update,
  "  // ---------- CHEGADA MANUAL ----------\n  function garantirCamposComponentesSutiaChegadaManual() {",
  "  function textoComponentesSutiaPagamento(item) {",
  "update.js/componentes-sutia-manual"
);
for (const trecho of [
  "    garantirCamposComponentesSutiaChegadaManual();\n",
  "    atualizarCamposComponentesSutiaChegadaManual();\n",
`    const processoManual = document.getElementById('chegadaManualProcesso');\n    if (processoManual && processoManual.dataset.componentesSutiaChange !== APP_VERSION) {\n      processoManual.dataset.componentesSutiaChange = APP_VERSION;\n      processoManual.addEventListener('change', atualizarCamposComponentesSutiaChegadaManual);\n    }\n\n`
]) {
  update = substituirUnico(update, trecho, "", "update.js/componentes-manual-inicialização");
}

// Restantes pendentes também deixa de depender do antigo botão manual.
update = substituirUnico(
  update,
  `    const referencia = document.getElementById('btnMovimentacoesRegistradasUsuario') || document.getElementById('btnAbrirChegadaManualFaccao');\n    const actions = referencia?.parentElement;`,
  `    const referencia = document.getElementById('btnMovimentacoesRegistradasUsuario') || document.getElementById('btnToggleGerenciarFaccoes');\n    const actions = referencia?.parentElement || document.querySelector('#faccoes .panel-header .actions');`,
  "update.js/âncora-restantes"
);

// Inicialização da versão não chama mais nenhum recurso da Chegada manual.
for (const chamada of [
  "iniciarHotfixChegadaManual();",
  "iniciarChegadaManualSimplificadaPelaOP();"
]) {
  update = removerLinhaUnica(update, chamada, `update.js/inicialização-${chamada}`);
}

const proibidosUpdate = [
  "ChegadaManual",
  "chegadaManual",
  "chegada_manual_faccao",
  "HOTFIX: CHEGADA MANUAL DE FACÇÃO",
  "CHEGADA MANUAL SIMPLIFICADA PELA OP"
];
for (const termo of proibidosUpdate) {
  if (update.includes(termo)) falhar(`update.js: referência residual executável da Chegada manual: ${termo}`);
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

console.log("OK: Chegada manual removida do update.js sem remover recursos compartilhados.");
console.log("OK: Movimentações registradas e Restantes pendentes foram reancorados no cabeçalho oficial de Facções.");
console.log("OK: Saída e chegada normal permanecem ativas.");
console.log(`Próximo release: ${RELEASE}`);
