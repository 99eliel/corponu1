const fs = require('fs');

const TARGET = 'corponu-dual-mode.js';
const INTERNAL_OLD = '2026-08-31-faccoes-processos-estavel-272';
const OLD_RELEASE = '2026-09-02-lateral-alca-fechamentos-antigos-279';
const NEW_RELEASE = '2026-09-02-calcinha-necessidade-opcional-280';

function fail(message) {
  throw new Error(message);
}

function count(text, value) {
  return text.split(value).length - 1;
}

function replaceOnce(text, oldValue, newValue, label) {
  const total = count(text, oldValue);
  if (total !== 1) fail(`${label}: esperado 1 bloco, encontrado ${total}.`);
  return text.replace(oldValue, newValue);
}

function replaceInSection(text, startMarker, endMarker, oldValue, newValue, label) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end <= start) fail(`Seção não encontrada: ${label}.`);
  let section = text.slice(start, end);
  section = replaceOnce(section, oldValue, newValue, label);
  return text.slice(0, start) + section + text.slice(end);
}

let src = fs.readFileSync(TARGET, 'utf8');
if (!src.includes(INTERNAL_OLD)) fail('Versão interna esperada do dual-mode não encontrada.');
if (src.includes(NEW_RELEASE)) fail('Versão 280 já aplicada.');
src = replaceOnce(src, `const VERSION = "${INTERNAL_OLD}";`, `const VERSION = "${NEW_RELEASE}";`, 'versão interna');

const oldOrderUi = [
  '      if (description) description.textContent = type === "calcinha"',
  '        ? "Informe a necessidade. Serviço é opcional e a facção será escolhida livremente no momento do envio. Cotton Line/Corpo Nu será preenchido no Manejo."',
  '        : "Cadastre a OP de sutiã mantendo o fluxo atual.";',
  '      updateOrderProductDatalist();'
].join('\n');
const newOrderUi = [
  '      if (description) description.textContent = type === "calcinha"',
  '        ? "Informe OP, referência, cor e quantidade. Necessidade, serviço e facção são opcionais; Cotton Line/Corpo Nu será preenchido no Manejo."',
  '        : "Cadastre a OP de sutiã mantendo o fluxo atual.";',
  '      const needText = document.getElementById("ordemNecessidadeTexto");',
  '      if (needText) {',
  '        const obrigatoria = type !== "calcinha";',
  '        needText.required = obrigatoria;',
  '        needText.setAttribute("aria-required", obrigatoria ? "true" : "false");',
  '        needText.placeholder = type === "calcinha"',
  '          ? "Opcional. Ex: URGENTE ou deixe em branco"',
  '          : "Ex: URGENTE, 24/07, 24/07 a 30/07";',
  '        const help = needText.closest("label")?.querySelector(".field-help");',
  '        if (help) help.textContent = type === "calcinha"',
  '          ? "Opcional para Calcinha. Você pode preencher agora ou definir depois no Manejo."',
  '          : "Esse campo fica livre igual à planilha. Você pode trocar data por URGENTE ou outro texto sem mexer nos dados antigos.";',
  '      }',
  '      updateOrderProductDatalist();'
].join('\n');
src = replaceInSection(src, '  function updateFormTypeUI(pageId, type) {', '  function injectOrderCalcinhaFields() {', oldOrderUi, newOrderUi, 'UI canônica da OP de Calcinha');

src = replaceOnce(
  src,
  '<div class="notice small"><strong>Planejamento da calcinha:</strong> a facção não fica presa à OP. Serviço pode ser sugerido aqui e a facção será escolhida no momento do envio. A linha Cotton Line/Corpo Nu será informada no Manejo.</div>',
  '<div class="notice small"><strong>Planejamento da calcinha:</strong> necessidade, serviço e facção são opcionais. A necessidade pode ficar em branco e ser definida depois no Manejo; a linha Cotton Line/Corpo Nu também será informada no Manejo.</div>',
  'aviso de planejamento da Calcinha'
);
src = replaceOnce(src, 'Início da necessidade<input id="ordemCalcinhaNecessidadeInicio" type="date">', 'Início da necessidade (opcional)<input id="ordemCalcinhaNecessidadeInicio" type="date">', 'rótulo início da necessidade');
src = replaceOnce(src, 'Final da necessidade<input id="ordemCalcinhaNecessidadeFim" type="date">', 'Final da necessidade (opcional)<input id="ordemCalcinhaNecessidadeFim" type="date">', 'rótulo final da necessidade');

const oldPdfVisibility = [
  '  function updatePdfFieldsVisibility() {',
  '    const isCalcinha = document.getElementById("pdfTipoPeca")?.value === "calcinha";',
  '    document.querySelectorAll(".corponu-pdf-calcinha-field").forEach(element => element.classList.toggle("corponu-dual-hidden", !isCalcinha));',
  '  }'
].join('\n');
const newPdfVisibility = [
  '  function updatePdfFieldsVisibility() {',
  '    const isCalcinha = document.getElementById("pdfTipoPeca")?.value === "calcinha";',
  '    document.querySelectorAll(".corponu-pdf-calcinha-field").forEach(element => element.classList.toggle("corponu-dual-hidden", !isCalcinha));',
  '    ["pdfNecessidadeInicio", "pdfNecessidadeFim"].forEach((id, index) => {',
  '      const field = document.getElementById(id);',
  '      if (!field) return;',
  '      field.required = !isCalcinha;',
  '      field.setAttribute("aria-required", isCalcinha ? "false" : "true");',
  '      const label = field.closest("label")?.querySelector("span");',
  '      if (label) label.textContent = `${index === 0 ? "Início" : "Final"} da necessidade${isCalcinha ? " (opcional)" : ""}`;',
  '    });',
  '  }'
].join('\n');
src = replaceOnce(src, oldPdfVisibility, newPdfVisibility, 'visibilidade/required da necessidade no PDF');

const oldNeedHelper = [
  '  function parseNeedFromDates(start, end) {',
  '    if (!start || !end) return "";',
  '    return `${formatDateBR(start)} a ${formatDateBR(end)}`;',
  '  }',
  '',
  '  async function handleOrderSubmit(event) {'
].join('\n');
const newNeedHelper = [
  '  function parseNeedFromDates(start, end) {',
  '    if (!start || !end) return "";',
  '    return `${formatDateBR(start)} a ${formatDateBR(end)}`;',
  '  }',
  '',
  '  function intervaloNecessidadeOpcionalValido(start, end) {',
  '    if (!start && !end) return true;',
  '    return Boolean(start && end && start <= end);',
  '  }',
  '',
  '  async function handleOrderSubmit(event) {'
].join('\n');
src = replaceOnce(src, oldNeedHelper, newNeedHelper, 'helper de necessidade opcional');

const oldNeedInputs = [
  '    const quantity = Number(document.getElementById("ordemQuantidade")?.value || 0);',
  '    const needStart = document.getElementById("ordemCalcinhaNecessidadeInicio")?.value || "";'
].join('\n');
const newNeedInputs = [
  '    const quantity = Number(document.getElementById("ordemQuantidade")?.value || 0);',
  '    const needFreeText = normalize(document.getElementById("ordemNecessidadeTexto")?.value || "");',
  '    const needStart = document.getElementById("ordemCalcinhaNecessidadeInicio")?.value || "";'
].join('\n');
src = replaceInSection(src, '  async function handleOrderSubmit(event) {', '  function wrapEditFunctions() {', oldNeedInputs, newNeedInputs, 'texto livre da necessidade');

const oldRequiredValidation = [
  '    if (!needStart || !needEnd || needStart > needEnd) {',
  '      toast("Informe um intervalo de necessidade válido.", "error");',
  '      return;',
  '    }'
].join('\n');
const newOptionalValidation = [
  '    if (!intervaloNecessidadeOpcionalValido(needStart, needEnd)) {',
  '      toast("Preencha as duas datas da necessidade corretamente ou deixe ambas em branco.", "error");',
  '      return;',
  '    }'
].join('\n');
const requiredCount = count(src, oldRequiredValidation);
if (requiredCount !== 2) fail(`Validação antiga de necessidade: esperado 2 ocorrências (manual e PDF), encontrado ${requiredCount}.`);
src = src.split(oldRequiredValidation).join(newOptionalValidation);

src = replaceInSection(
  src,
  '  async function handleOrderSubmit(event) {',
  '  function wrapEditFunctions() {',
  '    const needText = parseNeedFromDates(needStart, needEnd);',
  '    const needText = needFreeText || parseNeedFromDates(needStart, needEnd);',
  'prioridade do texto livre da necessidade'
);

const manualTrueCount = count(src, '      necessidadeManual: true,');
if (manualTrueCount !== 1) fail(`necessidadeManual manual: esperado 1, encontrado ${manualTrueCount}.`);
src = src.replace('      necessidadeManual: true,', '      necessidadeManual: Boolean(needText),');
const pdfTrueCount = count(src, '          necessidadeManual: true,');
if (pdfTrueCount !== 1) fail(`necessidadeManual PDF: esperado 1, encontrado ${pdfTrueCount}.`);
src = src.replace('          necessidadeManual: true,', '          necessidadeManual: Boolean(needText),');

src = replaceOnce(
  src,
  '"Mostrando OPs de calcinha. Informe Linha, Fase e Necessidade; Silk e Tecido não são utilizados para calcinha."',
  '"Mostrando OPs de calcinha. Informe Linha e Fase; Necessidade é opcional e pode ser preenchida quando existir. Silk e Tecido não são utilizados para calcinha."',
  'texto do Manejo Calcinha'
);
src = replaceOnce(
  src,
  '"<strong>Funcionamento da calcinha:</strong> OP, referência, quantidade, cor e necessidade vêm da importação. No Manejo ficam Linha, Fase, localização e encaminhamento. Registros históricos perguntam serviço e facção no momento do envio; novas OPs usam o planejamento já definido."',
  '"<strong>Funcionamento da calcinha:</strong> OP, referência, quantidade e cor vêm da importação. Necessidade pode ficar em branco e ser definida depois no Manejo. No Manejo também ficam Linha, Fase, localização e encaminhamento. Registros históricos perguntam serviço e facção no momento do envio; novas OPs usam o planejamento já definido."',
  'aviso do Manejo Calcinha'
);

if (src.includes('Informe um intervalo de necessidade válido.')) fail('Validação obrigatória antiga ainda existe.');
if (!src.includes('needText.required = obrigatoria;')) fail('Alternância do required não foi aplicada.');
if (!src.includes('const needText = needFreeText || parseNeedFromDates')) fail('Texto livre não foi integrado ao modelo.');
if (count(src, 'necessidadeManual: Boolean(needText),') !== 2) fail('Regra de necessidadeManual não ficou unificada nos dois cadastros de Calcinha.');
fs.writeFileSync(TARGET, src);

const notes = 'Produção. O cadastro de OP de Calcinha passa a tratar Necessidade como opcional na regra canônica do corponu-dual-mode. Ao selecionar Calcinha, o campo compartilhado deixa de ser required; ao voltar para Sutiã, a obrigatoriedade original é restaurada. Texto livre como URGENTE continua sendo preservado. As datas de necessidade podem ficar ambas vazias; se uma delas for informada, o intervalo precisa estar completo e válido. Quando nenhuma necessidade é informada, necessidade e necessidadeTexto ficam vazios e necessidadeManual=false, permitindo definição posterior no Manejo. A mesma regra foi aplicada à importação de OPs de Calcinha para manter o modelo consistente. Nenhum registro existente e nenhuma regra do Firebase foram alterados.';
for (const file of ['corponu-release.json', 'version.json']) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (data.version !== OLD_RELEASE) fail(`Versão anterior inesperada em ${file}: ${data.version}`);
  data.version = NEW_RELEASE;
  data.updatedAt = '2026-09-02T08:48:00-03:00';
  data.notes = notes;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

for (const file of ['update.js', 'corponu-atualizador.js', 'index.html']) {
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes(OLD_RELEASE)) fail(`Release anterior não encontrado em ${file}.`);
  text = text.replaceAll(OLD_RELEASE, NEW_RELEASE);
  fs.writeFileSync(file, text);
}

console.log('Calcinha 280 aplicada: necessidade opcional no cadastro manual e importação, sem alterar histórico.');
