const fs = require('fs');

const OLD = '2026-09-04-faccoes-controlador-unificado-285';
const NEW = '2026-09-09-recuperacao-pre-bloqueio-288';
const TEXTOS = ['index.html', 'corponu-atualizador.js', 'update.js'];
const JSONS = ['corponu-release.json', 'version.json'];

const ler = arquivo => fs.readFileSync(arquivo, 'utf8');
const gravar = (arquivo, conteudo) => fs.writeFileSync(arquivo, conteudo, 'utf8');

for (const arquivo of TEXTOS) {
  const original = ler(arquivo);
  if (!original.includes(OLD)) throw new Error(`${arquivo}: release 285 não encontrada`);
  if (original.includes('servicePaymentHold') || original.includes('data-service-hold="payment"')) {
    throw new Error(`${arquivo}: bloqueio financeiro presente; abortando`);
  }
  gravar(arquivo, original.split(OLD).join(NEW));
}

const notes = 'Produção recuperada a partir da árvore exata imediatamente anterior ao primeiro bloqueio financeiro de 06/09/2026. Release 288 criada apenas para garantir atualização limpa e impedir reutilização de cache das releases 285/286/287. Nenhuma regra de negócio, documento, coleção ou dado do Firebase foi alterado.';
for (const arquivo of JSONS) {
  const obj = JSON.parse(ler(arquivo));
  if (obj.version !== OLD) throw new Error(`${arquivo}: versão inesperada ${obj.version}`);
  obj.version = NEW;
  obj.updatedAt = '2026-09-09T08:10:00-03:00';
  obj.notes = notes;
  gravar(arquivo, JSON.stringify(obj, null, 2) + '\n');
}

for (const arquivo of [...TEXTOS, ...JSONS]) {
  const conteudo = ler(arquivo);
  if (!conteudo.includes(NEW)) throw new Error(`${arquivo}: release 288 ausente`);
  if (conteudo.includes(OLD)) throw new Error(`${arquivo}: release 285 ainda presente`);
}

const html = ler('index.html');
for (const esperado of [
  `style.css?v=${NEW}`,
  `update.js?v=${NEW}`,
  `app.js?v=${NEW}`,
  `corponu-atualizador.js?v=${NEW}`
]) {
  if (!html.includes(esperado)) throw new Error(`index.html sem ${esperado}`);
}

console.log('Release 288 preparada sobre a árvore exata pré-bloqueio.');
