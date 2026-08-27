import fs from "node:fs";

const RELEASE = "2026-08-26-faccoes-sem-chegada-manual-260";
const UPDATED_AT = "2026-08-26T21:59:00-03:00";

function falhar(mensagem) {
  throw new Error(`[finalizar-chegada-manual-260] ${mensagem}`);
}

function substituirUma(texto, regex, novo, contexto) {
  const encontrados = texto.match(regex);
  if (!encontrados || encontrados.length !== 1) falhar(`${contexto}: esperado exatamente um ponto de atualização.`);
  return texto.replace(regex, novo);
}

const runtime = ["update.js", "app.js", "index.html", "corponu-atualizador.js"];
for (const arquivo of runtime) {
  const conteudo = fs.readFileSync(arquivo, "utf8");
  if (/ChegadaManual|chegadaManual|chegada_manual_faccao/.test(conteudo)) {
    falhar(`${arquivo}: ainda contém referência executável da Chegada manual.`);
  }
}
if (fs.existsSync("corponu-chegada-manual-faccoes-processo-119-seguro.js")) falhar("Módulo legado 119 ainda existe.");
if (fs.existsSync("README-CHEGADA-MANUAL-FACCAO.txt")) falhar("README da função removida ainda existe.");
if (!fs.existsSync("corponu-faccoes-tres-abas-saida.js")) falhar("Módulo de Saída não existe.");
if (!fs.readFileSync("corponu-atualizador.js", "utf8").includes("corponu-faccoes-tres-abas-saida.js")) falhar("Módulo de Saída não está no carregador oficial.");
if (!fs.readFileSync("app.js", "utf8").includes("function registrarChegadaMovimentacao(")) falhar("Chegada normal não foi preservada.");

let update = fs.readFileSync("update.js", "utf8");
update = substituirUma(
  update,
  /const APP_VERSION = "[^"]+";/g,
  `const APP_VERSION = "${RELEASE}";`,
  "update.js/APP_VERSION"
);
fs.writeFileSync("update.js", update);

let atualizador = fs.readFileSync("corponu-atualizador.js", "utf8");
atualizador = substituirUma(
  atualizador,
  /const LOCAL_RELEASE = "[^"]+";/g,
  `const LOCAL_RELEASE = "${RELEASE}";`,
  "corponu-atualizador.js/LOCAL_RELEASE"
);
fs.writeFileSync("corponu-atualizador.js", atualizador);

let index = fs.readFileSync("index.html", "utf8");
index = substituirUma(
  index,
  /update\.js\?v=[^"']+/g,
  `update.js?v=${RELEASE}`,
  "index.html/cache update.js"
);
index = substituirUma(
  index,
  /app\.js\?v=[^"']+/g,
  `app.js?v=${RELEASE}`,
  "index.html/cache app.js"
);
fs.writeFileSync("index.html", index);

const release = {
  version: RELEASE,
  updatedAt: UPDATED_AT,
  notes: "Produção. A Chegada manual de Facções foi removida definitivamente da raiz e do runtime. Além do botão, modal e handlers já eliminados na versão 259, foram removidos do update.js o hotfix antigo, a implementação simplificada que criava movimentação e pagamento direto pela OP, a captura de responsável manual, a trava de duplicidade manual, a integração manual com processos gerenciados e os campos/eventos manuais de componentes do Sutiã. O módulo legado corponu-chegada-manual-faccoes-processo-119-seguro.js e o README exclusivo da função também foram excluídos. Movimentações registradas e Restantes pendentes foram reancorados ao cabeçalho oficial de Facções. A Saída continua ativa por corponu-faccoes-tres-abas-saida.js e a chegada normal de uma movimentação existente continua por registrarChegadaMovimentacao. Nenhuma regra do Firebase nem dado histórico foi alterado."
};
fs.writeFileSync("corponu-release.json", JSON.stringify(release, null, 2) + "\n");

console.log(`OK: release ${RELEASE} preparado com cache busting e fluxo obrigatório preservado.`);
