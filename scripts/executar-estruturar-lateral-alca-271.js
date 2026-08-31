const fs = require('fs');

const origem = 'scripts/estruturar-lateral-alca-nativa-271.js';
const temporario = 'scripts/.estruturar-lateral-alca-nativa-271.tmp.js';
let codigo = fs.readFileSync(origem, 'utf8');
const linhas = codigo.split(/\r?\n/);
const encontrados = [];
for (let i = 0; i < linhas.length; i += 1) {
  if (linhas[i].includes('const valoresStart = js.indexOf')) encontrados.push(i);
}
if (encontrados.length !== 1) {
  throw new Error(`Assinatura valoresStart ambígua: ${encontrados.length}`);
}
linhas[encontrados[0]] = `  const valoresStart = js.indexOf('      <div id="la2ValoresAdmin" class="la2-admin la2-admin-box hidden">');`;
fs.writeFileSync(temporario, linhas.join('\n'), 'utf8');
try {
  require('../' + temporario);
} finally {
  if (fs.existsSync(temporario)) fs.unlinkSync(temporario);
}
