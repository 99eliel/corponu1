from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: esperado 1, encontrado {count}')
    return text.replace(old, new, 1)


def all_exact(text, old, new, label, minimo=1):
    count = text.count(old)
    if count < minimo:
        raise RuntimeError(f'{label}: esperado pelo menos {minimo}, encontrado {count}')
    return text.replace(old, new)

# Resumo da tela geral deve usar o mesmo conjunto segregado da tabela.
dual = read('corponu-dual-mode.js')
dual = once(
    dual,
    '''    const counts = movementCounts(activeType);
    const total = document.getElementById("faccoesOpsEmAndamento");''',
    '''    const listaAtiva = gerais.filter(item => typeOfData(item) === activeType);
    const counts = {
      inProgress: listaAtiva.filter(item => !item.dataChegada && !["finalizado", "retornou", "encaminhado"].includes(item.status)).length,
      sent: listaAtiva.reduce((sum, item) => sum + Number(item.quantidadeEnviada || 0), 0),
      received: listaAtiva.reduce((sum, item) => sum + Number(item.quantidadeRecebida || 0), 0)
    };
    const total = document.getElementById("faccoesOpsEmAndamento");''',
    'resumo da tela geral'
)
write('corponu-dual-mode.js', dual)

# O módulo abaixo agora é exclusivamente Sutiã/Calcinha.
saida = read('corponu-faccoes-tres-abas-saida.js')
saida = once(
    saida,
    '    document.getElementById("s3titulo").textContent = `Registrar saída • ${a === "sutia" ? "Sutiã" : a === "calcinha" ? "Calcinha" : "Lateral e Alça"}`;',
    '    document.getElementById("s3titulo").textContent = `Registrar saída • ${a === "sutia" ? "Sutiã" : "Calcinha"}`;',
    'título do modal'
)
saida = once(
    saida,
    '    if (preferencia !== "corte" && tipo(escolhida) !== preferencia) return null;',
    '    if (tipo(escolhida) !== preferencia) return null;',
    'busca local'
)
saida = all_exact(
    saida,
    '    if (escolhida && (preferencia === "corte" || tipo(escolhida) === preferencia)) {',
    '    if (escolhida && tipo(escolhida) === preferencia) {',
    'buscas de OP remanescentes',
    minimo=3
)
saida = once(
    saida,
    '      if (aba !== "corte" && tp !== aba) return toast(`Esta OP é de ${tp === "calcinha" ? "Calcinha" : "Sutiã"}. Abra a aba correta.`);',
    '      if (tp !== aba) return toast(`Esta OP é de ${tp === "calcinha" ? "Calcinha" : "Sutiã"}. Abra a aba correta.`);',
    'validação da aba'
)
saida = once(
    saida,
    '    if (aba === "corte") return toast("Use o fluxo próprio de Lateral e Alça.");\n',
    '',
    'guarda morta'
)
saida = once(
    saida,
    '      return !m.dataChegada && !m.cancelado && !m.excluido && norm(m.status) !== "CANCELADO" && norm(m.processo) === processo && (aba !== "corte" || m.area === "corte" || m.movimentacaoCorte === true);',
    '      return !m.dataChegada && !m.cancelado && !m.excluido && norm(m.status) !== "CANCELADO" && norm(m.processo) === processo;',
    'duplicidade'
)
saida = once(
    saida,
    '    if (!confirm(`Confirmar saída?\\nAba: ${aba === "sutia" ? "Sutiã" : aba === "calcinha" ? "Calcinha" : "Lateral e Alça"}\\nOP ${nop}\\nProcesso: ${processo}\\nFacção: ${faccao}\\nQuantidade: ${total.toLocaleString("pt-BR")}`)) return;',
    '    if (!confirm(`Confirmar saída?\\nAba: ${aba === "sutia" ? "Sutiã" : "Calcinha"}\\nOP ${nop}\\nProcesso: ${processo}\\nFacção: ${faccao}\\nQuantidade: ${total.toLocaleString("pt-BR")}`)) return;',
    'confirmação da saída'
)
saida = once(saida, '      const corte = false;\n', '', 'constante morta')
saida = once(saida, '        origem: corte ? "corte" : "faccoes_registro_saida",', '        origem: "faccoes_registro_saida",', 'origem')
saida = once(saida, '        areaLabel: aba === "sutia" ? "Sutiã" : aba === "calcinha" ? "Calcinha" : "Corte",', '        areaLabel: aba === "sutia" ? "Sutiã" : "Calcinha",', 'área')
saida = once(saida, '        movimentacaoCorte: corte,', '        movimentacaoCorte: false,', 'flag corte')
saida = once(saida, '        tipoDestino: corte ? "faccao_corte" : "faccao",', '        tipoDestino: "faccao",', 'tipo destino')
saida = once(saida, '        tipoDestinoLabel: corte ? "Facção • Corte" : "Facção",', '        tipoDestinoLabel: "Facção",', 'label destino')

# Nenhuma decisão de navegação/saída deste módulo pode conhecer Corte/Lateral.
for token in [
    'preferencia === "corte"',
    'preferencia !== "corte"',
    'aba === "corte"',
    'aba !== "corte"',
    'm.area === "corte"',
    'const corte =',
    'corte ? "corte"',
    'corte ? "faccao_corte"',
]:
    if token in saida:
        raise RuntimeError(f'Código morto de Corte ainda presente: {token}')
write('corponu-faccoes-tres-abas-saida.js', saida)

# Pós-condições gerais.
final_dual = read('corponu-dual-mode.js')
final_saida = read('corponu-faccoes-tres-abas-saida.js')
if 'const listaAtiva = gerais.filter(item => typeOfData(item) === activeType);' not in final_dual:
    raise RuntimeError('Resumo segregado ausente')
if 'movementCounts(activeType)' in final_dual:
    raise RuntimeError('Resumo antigo ainda em uso na tela Facções')
for token in ['stopImmediatePropagation()', 'CLASSE_TIPO_INCOMPATIVEL', 'abaFaccaoCorte']:
    if token in final_saida:
        raise RuntimeError(f'Disputa antiga ainda presente: {token}')
print('Facções 285 finalizada sem ramos mortos e com resumo segregado.')
