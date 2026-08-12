from pathlib import Path
import json

APP = Path('app.js')
s = APP.read_text(encoding='utf-8')

old_fill = '''function preencherProcessosValores() {
  const select = document.getElementById("valorProcessoAtivo");
  if (!select) return;

  const processos = getProcessosValores();
  const atual = processoValorAtivo || select.value;

  select.innerHTML = `<option value="">Todos os processos</option>` + processos.map(item => {
    return `<option value="${escapeHtml(item.chave)}">${escapeHtml(item.processo)} | ${escapeHtml(item.setorLabel)} (${item.total})</option>`;
  }).join("");

  if (atual && processos.some(item => item.chave === atual)) {
    select.value = atual;
    processoValorAtivo = atual;
  } else if (!processoValorAtivo && processos.length) {
    select.value = processos[0].chave;
    processoValorAtivo = processos[0].chave;
  } else {
    select.value = processoValorAtivo || "";
  }

  aplicarProcessoValorSelecionado(select.value);
}'''

new_fill = '''function preencherProcessosValores() {
  const select = document.getElementById("valorProcessoAtivo");
  if (!select) return;

  const processos = getProcessosValores();
  // Nunca troca sozinho para o primeiro processo. A escolha do usuário é a
  // fonte da verdade enquanto o painel estiver aberto.
  const atual = processoValorAtivo || select.dataset.chaveSelecionada || select.value || "";

  select.innerHTML = `<option value="">Selecione um processo</option>` + processos.map(item => {
    return `<option value="${escapeHtml(item.chave)}">${escapeHtml(item.processo)} | ${escapeHtml(item.setorLabel)} (${item.total})</option>`;
  }).join("");

  let chaveFinal = atual;
  if (chaveFinal && !processos.some(item => item.chave === chaveFinal)) {
    // Durante um snapshot o processo pode sumir por um instante. Mantemos uma
    // opção temporária em vez de zerar a seleção e cair em ENCAPAR BOJO.
    const { processo, setor } = getProcessoValorDeChave(chaveFinal);
    if (processo && setor) {
      const option = document.createElement("option");
      option.value = chaveFinal;
      option.textContent = `${processo} | ${getLabelSetorPagamento(setor)}`;
      select.appendChild(option);
    } else {
      chaveFinal = "";
    }
  }

  processoValorAtivo = chaveFinal;
  select.dataset.chaveSelecionada = chaveFinal;
  select.value = chaveFinal;
  aplicarProcessoValorSelecionado(chaveFinal);
}'''

if old_fill not in s:
    raise SystemExit('preencherProcessosValores atual nao encontrado')
s = s.replace(old_fill, new_fill, 1)

old_apply = '''function aplicarProcessoValorSelecionado(chave) {
  processoValorAtivo = chave || "";
  const { processo, setor } = getProcessoValorDeChave(processoValorAtivo);

  const processoInput = document.getElementById("precoReferenciaProcesso");
  const setorInput = document.getElementById("precoReferenciaSetor");

  if (processoInput && processo) processoInput.value = processo;
  if (setorInput && setor) setorInput.value = setor || "bojo";

  const renomearInput = document.getElementById("valorRenomearProcesso");
  if (renomearInput) renomearInput.value = processo || "";
}'''

new_apply = '''function aplicarProcessoValorSelecionado(chave) {
  processoValorAtivo = chave || "";
  const select = document.getElementById("valorProcessoAtivo");
  if (select) select.dataset.chaveSelecionada = processoValorAtivo;

  const { processo, setor } = getProcessoValorDeChave(processoValorAtivo);

  const processoInput = document.getElementById("precoReferenciaProcesso");
  const setorInput = document.getElementById("precoReferenciaSetor");

  if (processoInput) processoInput.value = processo || "";
  if (setorInput) setorInput.value = setor || "";

  const renomearInput = document.getElementById("valorRenomearProcesso");
  if (renomearInput) renomearInput.value = processo || "";
}'''

if old_apply not in s:
    raise SystemExit('aplicarProcessoValorSelecionado atual nao encontrado')
s = s.replace(old_apply, new_apply, 1)

old_select = '''function selecionarProcessoValor(chave) {
  const select = document.getElementById("valorProcessoAtivo");
  processoValorAtivo = chave || "";

  if (select) select.value = processoValorAtivo;

  aplicarProcessoValorSelecionado(processoValorAtivo);
  renderProcessosValores();
  renderPrecosReferencia();
}'''

new_select = '''function selecionarProcessoValor(chave) {
  const select = document.getElementById("valorProcessoAtivo");
  processoValorAtivo = chave || "";

  if (select) {
    select.dataset.chaveSelecionada = processoValorAtivo;
    select.value = processoValorAtivo;
  }

  aplicarProcessoValorSelecionado(processoValorAtivo);
  renderProcessosValores();
  renderPrecosReferencia();
}'''

if old_select not in s:
    raise SystemExit('selecionarProcessoValor atual nao encontrado')
s = s.replace(old_select, new_select, 1)

# renderizar a tabela nao deve reconstruir o seletor de processos.
old_render_start = '''function renderPrecosReferencia() {
  const tbody = document.getElementById("listaPrecosReferencia");
  if (!tbody) return;

  preencherProcessosValores();

  const busca = normalizarTexto(document.getElementById("buscaPrecosReferencia")?.value || "");'''
new_render_start = '''function renderPrecosReferencia() {
  const tbody = document.getElementById("listaPrecosReferencia");
  if (!tbody) return;

  const busca = normalizarTexto(document.getElementById("buscaPrecosReferencia")?.value || "");'''
if old_render_start not in s:
    raise SystemExit('inicio renderPrecosReferencia nao encontrado')
s = s.replace(old_render_start, new_render_start, 1)

# Na troca manual do select, memoriza imediatamente a escolha.
old_change = '''  if (processoAtivo) {
    processoAtivo.addEventListener("change", () => {
      aplicarProcessoValorSelecionado(processoAtivo.value);
      renderPrecosReferencia();
    });
  }'''
new_change = '''  if (processoAtivo) {
    processoAtivo.addEventListener("change", () => {
      processoAtivo.dataset.chaveSelecionada = processoAtivo.value || "";
      aplicarProcessoValorSelecionado(processoAtivo.value);
      renderProcessosValores();
      renderPrecosReferencia();
    });
  }'''
if old_change not in s:
    raise SystemExit('listener valorProcessoAtivo nao encontrado')
s = s.replace(old_change, new_change, 1)

# Ao criar/usar novo processo, memoriza a chave no select.
old_new_proc = '''  if (select) select.value = chave;

  document.getElementById("precoReferenciaProcesso").value = processo;'''
new_new_proc = '''  if (select) {
    select.dataset.chaveSelecionada = chave;
    select.value = chave;
  }

  document.getElementById("precoReferenciaProcesso").value = processo;'''
if old_new_proc not in s:
    raise SystemExit('trecho usarNovoProcessoValor nao encontrado')
s = s.replace(old_new_proc, new_new_proc, 1)

# O log nao pode segurar a interface nem impedir a restauracao da aba selecionada.
old_save_mid = '''    await registrarLog(
      idAtual ? "preco_referencia_atualizado" : "preco_referencia_criado",
      "precoReferencia",
      docId,
      `Ref. ${confirmado.referencia || referencia} | ${confirmado.processo || processo} | ${formatarMoedaBR(Number(confirmado.valor ?? valor))}`
    );

    processoValorAtivo = chaveProcessoValor(
      confirmado.processo || processo,
      normalizarSetorPrecoPorProcesso(confirmado.processo || processo, confirmado.setor || setor)
    );

    const idInput = document.getElementById("precoReferenciaId");'''
new_save_mid = '''    processoValorAtivo = chaveProcessoValor(
      confirmado.processo || processo,
      normalizarSetorPrecoPorProcesso(confirmado.processo || processo, confirmado.setor || setor)
    );
    const selectAtivo = document.getElementById("valorProcessoAtivo");
    if (selectAtivo) selectAtivo.dataset.chaveSelecionada = processoValorAtivo;

    const idInput = document.getElementById("precoReferenciaId");'''
if old_save_mid not in s:
    raise SystemExit('bloco de log antes da selecao nao encontrado')
s = s.replace(old_save_mid, new_save_mid, 1)

old_save_end = '''    aplicarProcessoValorSelecionado(processoValorAtivo);
    preencherProcessosValores();
    renderProcessosValores();
    renderPrecosReferencia();
    refInput?.focus();

    toast(`Valor salvo e confirmado: Ref. ${confirmado.referencia || referencia}.`);'''
new_save_end = '''    aplicarProcessoValorSelecionado(processoValorAtivo);
    preencherProcessosValores();
    renderProcessosValores();
    renderPrecosReferencia();
    refInput?.focus();

    toast(`Valor salvo e confirmado: Ref. ${confirmado.referencia || referencia}.`);

    // Auditoria continua sendo gravada, mas nao bloqueia a tela nem troca o
    // processo selecionado caso a escrita do log demore.
    registrarLog(
      idAtual ? "preco_referencia_atualizado" : "preco_referencia_criado",
      "precoReferencia",
      docId,
      `Ref. ${confirmado.referencia || referencia} | ${confirmado.processo || processo} | ${formatarMoedaBR(Number(confirmado.valor ?? valor))}`
    ).catch(errorLog => console.warn("Nao foi possivel registrar o log do preco.", errorLog));'''
if old_save_end not in s:
    raise SystemExit('fim do salvamento de preco nao encontrado')
s = s.replace(old_save_end, new_save_end, 1)

APP.write_text(s, encoding='utf-8')

# Sincroniza o versionamento para impedir update.js antigo de disputar estado/cache.
up = Path('update.js')
u = up.read_text(encoding='utf-8')
u = u.replace('const APP_VERSION = "2026-08-12-interlock-global-181";', 'const APP_VERSION = "2026-08-12-precos-selecao-estavel-187";', 1)
up.write_text(u, encoding='utf-8')

idx = Path('index.html')
h = idx.read_text(encoding='utf-8')
h = h.replace('update.js?v=2026-08-12-interlock-global-181', 'update.js?v=2026-08-12-precos-selecao-estavel-187', 1)
h = h.replace('app.js?v=2026-08-12-precos-confirmados-186', 'app.js?v=2026-08-12-precos-selecao-estavel-187', 1)
idx.write_text(h, encoding='utf-8')

version = {
    'version': '2026-08-12-precos-selecao-estavel-187',
    'updatedAt': '2026-08-12T16:21:00-03:00',
    'notes': 'Mantem o processo selecionado no gerenciamento de valores, remove a selecao automatica de ENCAPAR BOJO, evita reconstruir o seletor ao renderizar a tabela e libera a interface antes do log de auditoria.'
}
Path('version.json').write_text(json.dumps(version, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
Path('corponu-release.json').write_text(json.dumps(version, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
