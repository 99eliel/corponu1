const fs = require('fs');

const OLD = '2026-09-09-faccoes-acoes-desempenho-300';
const NEW = '2026-09-09-sutia-completo-chegada-controlador-301';
const BASE = 'corponu-sutia-completo-calculo-base-174.js';
const VERSION_FILES = ['corponu-atualizador.js', 'corponu-release.json', 'index.html', 'update.js', 'version.json'];

const read = path => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content, 'utf8');

// Integra o Sutiã Completo ao controlador delegado oficial de Facções (release 300),
// preservando também compatibilidade com pontos antigos que ainda usam onclick.
{
  const original = read(BASE);
  const antigo = `      if (alvo.closest('[onclick*="registrarChegadaMovimentacao"]')) {`;
  const novo = `      const gatilhoChegada = alvo.closest('[data-faccoes-acao="chegada"][data-movimentacao-id], [onclick*="registrarChegadaMovimentacao"]');\n\n      if (gatilhoChegada) {`;
  const ocorrencias = original.split(antigo).length - 1;
  if (ocorrencias !== 1) throw new Error(`${BASE}: esperado 1 gatilho legado, encontrados ${ocorrencias}`);
  const atualizado = original.replace(antigo, novo);
  if (!atualizado.includes('[data-faccoes-acao="chegada"][data-movimentacao-id]')) {
    throw new Error(`${BASE}: gatilho delegado da release 300 não foi integrado`);
  }
  if (!atualizado.includes('[onclick*="registrarChegadaMovimentacao"]')) {
    throw new Error(`${BASE}: compatibilidade legada foi perdida`);
  }
  write(BASE, atualizado);
}

for (const path of VERSION_FILES) {
  const original = read(path);
  const ocorrencias = original.split(OLD).length - 1;
  if (ocorrencias < 1) throw new Error(`${path}: versão 300 não encontrada`);
  write(path, original.split(OLD).join(NEW));
}

const notes = 'Produção. Corrige a chegada do Sutiã Completo após a reorganização de ações de Facções da release 300. O preparador do Sutiã Completo passa a reconhecer o controlador delegado oficial data-faccoes-acao="chegada", mantendo compatibilidade com gatilhos antigos. Não reverte a otimização de Facções, não cria listener paralelo e não altera Firebase, pagamentos já gravados ou demais processos.';
for (const path of ['corponu-release.json', 'version.json']) {
  const obj = JSON.parse(read(path));
  if (obj.version !== NEW) throw new Error(`${path}: versão nova não aplicada`);
  obj.updatedAt = new Date().toISOString();
  obj.notes = notes;
  write(path, JSON.stringify(obj, null, 2) + '\n');
}

for (const path of VERSION_FILES) {
  const source = read(path);
  if (!source.includes(NEW)) throw new Error(`${path}: release 301 ausente`);
  if (source.includes(OLD)) throw new Error(`${path}: release 300 ainda presente no versionamento principal`);
}

const html = read('index.html');
for (const token of [
  `style.css?v=${NEW}`,
  `update.js?v=${NEW}`,
  `app.js?v=${NEW}`,
  `corponu-atualizador.js?v=${NEW}`
]) {
  if (!html.includes(token)) throw new Error(`index.html sem cache-bust 301: ${token}`);
}

console.log(`Release pronta: ${NEW}`);
