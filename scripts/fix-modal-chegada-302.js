const fs = require('fs');

const OLD_RELEASE = '2026-09-09-sutia-completo-chegada-controlador-301';
const NEW_RELEASE = '2026-09-09-modal-chegada-rodape-fixo-302';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function replaceOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`${label}: trecho esperado não encontrado`);
  if (source.indexOf(oldText, first + oldText.length) >= 0) throw new Error(`${label}: trecho ambíguo`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

// 1) Estrutura oficial do modal: um único corpo rolável e o rodapé existente fora da rolagem.
let html = read('index.html');
const oldForm = `      <form id="formChegadaMovimentacao" class="form movimentacao-form">\n        <input type="hidden" id="chegadaMovimentacaoId" />\n\n        <div class="movimentacao-op-info" id="chegadaMovimentacaoInfo">\n          Movimentação selecionada\n        </div>\n\n        <label>\n          Data de chegada/retorno\n          <input id="chegadaData" type="date" required />\n        </label>\n\n        <label>\n          Falta / quantidade que não voltou\n          <input id="chegadaFalta" type="number" min="0" step="1" value="0" required />\n        </label>\n\n        <label id="grupoChegadaDefeito">\n          Desconto por defeito (R$)\n          <input id="chegadaDefeito" type="number" min="0" step="0.01" value="0" placeholder="Ex: 10.00" />\n        </label>\n\n        <div class="actions">\n          <button class="btn btn-primary" type="submit">Confirmar chegada</button>\n          <button class="btn" id="btnCancelarModalChegada" type="button">Cancelar</button>\n        </div>\n      </form>`;
const newForm = `      <form id="formChegadaMovimentacao" class="form movimentacao-form chegada-modal-form">\n        <input type="hidden" id="chegadaMovimentacaoId" />\n\n        <div id="chegadaModalBody" class="chegada-modal-body">\n          <div class="movimentacao-op-info" id="chegadaMovimentacaoInfo">\n            Movimentação selecionada\n          </div>\n\n          <label>\n            Data de chegada/retorno\n            <input id="chegadaData" type="date" required />\n          </label>\n\n          <label>\n            Falta / quantidade que não voltou\n            <input id="chegadaFalta" type="number" min="0" step="1" value="0" required />\n          </label>\n\n          <label id="grupoChegadaDefeito">\n            Desconto por defeito (R$)\n            <input id="chegadaDefeito" type="number" min="0" step="0.01" value="0" placeholder="Ex: 10.00" />\n          </label>\n        </div>\n\n        <div class="actions chegada-modal-actions">\n          <button class="btn btn-primary" type="submit">Confirmar chegada</button>\n          <button class="btn" id="btnCancelarModalChegada" type="button">Cancelar</button>\n        </div>\n      </form>`;
html = replaceOnce(html, oldForm, newForm, 'estrutura do formulário de chegada');
html = html.split(OLD_RELEASE).join(NEW_RELEASE);
write('index.html', html);

// 2) CSS: somente o modal de chegada ganha layout em três regiões. Nenhum botão novo é criado.
let css = read('style.css');
const oldCss = `/* Modal de chegada/retorno corrigido */\n.chegada-modal-card {\n  width: min(560px, 100%);\n}\n`;
const newCss = `/* Modal de chegada/retorno: cabeçalho e ações fixos, conteúdo rolável */\n.chegada-modal-card {\n  width: min(620px, 100%);\n  max-height: 92vh;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n}\n\n#modalChegadaMovimentacao .modal-header {\n  flex: 0 0 auto;\n}\n\n#formChegadaMovimentacao.chegada-modal-form {\n  flex: 1 1 auto;\n  min-height: 0;\n  padding: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n}\n\n#formChegadaMovimentacao .chegada-modal-body {\n  flex: 1 1 auto;\n  min-height: 0;\n  overflow-y: auto;\n  overscroll-behavior: contain;\n  padding: 18px 20px;\n  display: grid;\n  gap: 12px;\n}\n\n#formChegadaMovimentacao .chegada-modal-actions {\n  flex: 0 0 auto;\n  margin: 0;\n  padding: 14px 20px 18px;\n  border-top: 1px solid #e2e8f0;\n  background: #ffffff;\n  box-shadow: 0 -8px 20px rgba(15, 23, 42, 0.06);\n}\n\n@media (max-width: 640px) {\n  .chegada-modal-card {\n    width: 100%;\n    max-height: calc(100vh - 20px);\n  }\n\n  #formChegadaMovimentacao .chegada-modal-body {\n    padding: 14px;\n  }\n\n  #formChegadaMovimentacao .chegada-modal-actions {\n    padding: 12px 14px 14px;\n  }\n}\n`;
css = replaceOnce(css, oldCss, newCss, 'layout do modal de chegada');
write('style.css', css);

// 3) O Sutiã Completo injeta a conferência somente no corpo oficial do modal.
let sutia = read('corponu-sutia-completo-calculo-base-174.js');
sutia = replaceOnce(
  sutia,
  'const VERSION = "2026-08-11-componentes-opcionais-calculo-170";',
  `const VERSION = "${NEW_RELEASE}";`,
  'versão interna do módulo de Sutiã Completo'
);
const oldInsert = `      const grupoDefeito = document.getElementById("grupoChegadaDefeito");\n      const container = document.createElement("div");\n      container.innerHTML = criarPainelChegada("sc51", contexto);\n      const painel = container.firstElementChild;\n\n      if (grupoDefeito?.parentElement) grupoDefeito.insertAdjacentElement("afterend", painel);\n      else document.getElementById("formChegadaMovimentacao")?.querySelector(".actions")?.insertAdjacentElement("beforebegin", painel);`;
const newInsert = `      const grupoDefeito = document.getElementById("grupoChegadaDefeito");\n      const corpoChegada = document.getElementById("chegadaModalBody");\n      const container = document.createElement("div");\n      container.innerHTML = criarPainelChegada("sc51", contexto);\n      const painel = container.firstElementChild;\n\n      if (!(corpoChegada instanceof HTMLElement) || !(painel instanceof HTMLElement)) {\n        throw new Error("Estrutura do modal de chegada não encontrada.");\n      }\n      if (grupoDefeito?.parentElement === corpoChegada) grupoDefeito.insertAdjacentElement("afterend", painel);\n      else corpoChegada.appendChild(painel);`;
sutia = replaceOnce(sutia, oldInsert, newInsert, 'ponto de inserção da conferência do Sutiã Completo');
write('corponu-sutia-completo-calculo-base-174.js', sutia);

// 4) Release crescente e cache-bust.
for (const path of ['corponu-atualizador.js', 'update.js']) {
  let source = read(path);
  source = replaceOnce(source, OLD_RELEASE, NEW_RELEASE, `release em ${path}`);
  write(path, source);
}

const notes = 'Produção. Organiza estruturalmente o modal de Confirmar chegada: o formulário passa a ter corpo rolável próprio e mantém o rodapé oficial com Confirmar chegada e Cancelar sempre visível. A conferência do Sutiã Completo é inserida explicitamente dentro do corpo do modal. Nenhum botão, listener ou fluxo paralelo foi criado; regras de negócio, Firebase e demais processos permanecem inalterados.';
for (const path of ['corponu-release.json', 'version.json']) {
  const data = JSON.parse(read(path));
  if (data.version !== OLD_RELEASE) throw new Error(`${path}: versão inesperada ${data.version}`);
  data.version = NEW_RELEASE;
  data.updatedAt = new Date().toISOString();
  data.notes = notes;
  write(path, JSON.stringify(data, null, 2) + '\n');
}

// 5) Consistência final.
if (!read('index.html').includes('id="chegadaModalBody" class="chegada-modal-body"')) throw new Error('corpo rolável não criado');
if (!read('index.html').includes('class="actions chegada-modal-actions"')) throw new Error('rodapé oficial não preservado');
if ((read('index.html').match(/>Confirmar chegada<\/button>/g) || []).length !== 1) throw new Error('deve existir exatamente um botão Confirmar chegada no modal oficial');
if (!read('style.css').includes('#formChegadaMovimentacao .chegada-modal-actions')) throw new Error('CSS do rodapé ausente');
if (!read('corponu-sutia-completo-calculo-base-174.js').includes('const corpoChegada = document.getElementById("chegadaModalBody");')) throw new Error('módulo do Sutiã não aponta para o corpo oficial');

for (const path of ['index.html', 'corponu-atualizador.js', 'update.js', 'corponu-release.json', 'version.json']) {
  const source = read(path);
  if (!source.includes(NEW_RELEASE)) throw new Error(`${path}: release 302 ausente`);
  if (source.includes(OLD_RELEASE)) throw new Error(`${path}: release 301 ainda presente`);
}

console.log(`Modal organizado: ${NEW_RELEASE}`);
