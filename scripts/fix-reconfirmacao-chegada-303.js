const fs = require('fs');

const OLD_RELEASE = '2026-09-09-modal-chegada-rodape-fixo-302';
const NEW_RELEASE = '2026-09-09-reconfirmacao-chegada-integrada-303';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function replaceOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`${label}: trecho esperado não encontrado`);
  if (source.indexOf(oldText, first + oldText.length) >= 0) {
    throw new Error(`${label}: trecho apareceu mais de uma vez; abortando`);
  }
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

let update = read('update.js');

// A confirmação obrigatória passa a pertencer ao corpo rolável oficial do modal 302.
const oldMount = `      const dataLabel = document.getElementById('chegadaData')?.closest('label');\n      if (dataLabel) form.insertBefore(bloco, dataLabel);\n      else form.prepend(bloco);`;
const newMount = `      const corpoChegada = document.getElementById('chegadaModalBody');\n      const dataLabel = document.getElementById('chegadaData')?.closest('label');\n      if (!(corpoChegada instanceof HTMLElement)) {\n        throw new Error('Corpo oficial do modal de chegada não encontrado.');\n      }\n      if (dataLabel?.parentElement === corpoChegada) corpoChegada.insertBefore(bloco, dataLabel);\n      else corpoChegada.prepend(bloco);`;
update = replaceOnce(update, oldMount, newMount, 'montagem da reconfirmação no modal');

// O mesmo controlador oficial de Facções que abre a chegada também dispara a preparação da reconfirmação.
const oldTrigger = `    document.addEventListener('click', event => {\n      const botao = event.target?.closest?.('button[onclick*="registrarChegadaMovimentacao"]');\n      if (!botao) return;\n      setTimeout(prepararConfirmacaoChegadaFaccao, 30);\n    });`;
const newTrigger = `    document.addEventListener('click', event => {\n      const botao = event.target?.closest?.('[data-faccoes-acao="chegada"][data-movimentacao-id], button[onclick*="registrarChegadaMovimentacao"]');\n      if (!botao) return;\n      setTimeout(prepararConfirmacaoChegadaFaccao, 30);\n    }, true);`;
update = replaceOnce(update, oldTrigger, newTrigger, 'gatilho oficial da reconfirmação');

// A release nova precisa aparecer no próprio update.js.
update = replaceOnce(update, OLD_RELEASE, NEW_RELEASE, 'versão do update.js');

// Validações estruturais: uma única confirmação e nenhum caminho paralelo novo.
if (!update.includes("const corpoChegada = document.getElementById('chegadaModalBody');")) {
  throw new Error('reconfirmação não foi integrada ao corpo oficial');
}
if (!update.includes('[data-faccoes-acao="chegada"][data-movimentacao-id]')) {
  throw new Error('reconfirmação não reconhece o controlador oficial de Facções');
}
if (update.includes("form.insertBefore(bloco, dataLabel)")) {
  throw new Error('montagem legada fora do corpo oficial ainda presente');
}
const blocos = (update.match(/bloco\.id = 'grupoConfirmacaoChegadaFaccao'/g) || []).length;
if (blocos !== 1) throw new Error(`esperado 1 bloco de reconfirmação; encontrado ${blocos}`);
write('update.js', update);

// Cache-bust crescente. Nenhuma regra de negócio adicional é alterada.
for (const path of ['index.html', 'corponu-atualizador.js']) {
  let source = read(path);
  const count = source.split(OLD_RELEASE).length - 1;
  if (count < 1) throw new Error(`${path}: release 302 não encontrada`);
  source = source.split(OLD_RELEASE).join(NEW_RELEASE);
  write(path, source);
}

const notes = 'Produção. Integra a reconfirmação obrigatória de processo e facção ao modal de chegada reorganizado na 302. O bloco de segurança passa a ser montado dentro de chegadaModalBody e o disparo acompanha o controlador delegado oficial data-faccoes-acao="chegada", mantendo compatibilidade com o gatilho legado. Não cria segunda validação, listener de polling ou fluxo paralelo; Firebase, pagamentos existentes e demais processos permanecem intactos.';
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
  if (!source.includes(NEW_RELEASE)) throw new Error(`${path}: release 303 ausente`);
  if (source.includes(OLD_RELEASE)) throw new Error(`${path}: release 302 ainda presente`);
}

console.log(`Reconfirmação integrada: ${NEW_RELEASE}`);
