from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def repl(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: esperado 1, encontrado {count}')
    return text.replace(old, new, 1)

# Corrige os cartões da aba Sutiã/Calcinha para usar exatamente o mesmo
# conjunto já separado da Lateral/Alça.
dual = read('corponu-dual-mode.js')
dual = repl(
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
    'resumo Facções sem Lateral/Alça'
)
write('corponu-dual-mode.js', dual)

# Remove os últimos ramos mortos de Corte do fluxo que agora é exclusivamente
# Sutiã/Calcinha. Lateral/Alça possui seu módulo próprio.
saida = read('corponu-faccoes-tres-abas-saida.js')
replacements = [
    ('    document.getElementById("s3titulo").textContent = `Registrar saída • ${a === "sutia" ? "Sutiã" : a === "calcinha" ? "Calcinha" : "Lateral e Alça"}`;',
     '    document.getElementById("s3titulo").textContent = `Registrar saída • ${a === "sutia" ? "Sutiã" : "Calcinha"}`;',
     'título modal sem ramo Lateral'),
    ('    if (preferencia !== "corte" && tipo(escolhida) !== preferencia) return null;',
     '    if (tipo(escolhida) !== preferencia) return null;',
     'busca local sem ramo Corte'),
    ('    if (escolhida && (preferencia === "corte" || tipo(escolhida) === preferencia)) {',
     '    if (escolhida && tipo(escolhida) === preferencia) {',
     'busca cache sem ramo Corte'),
    ('      if (aba !== "corte" && tp !== aba) return toast(`Esta OP é de ${tp === "calcinha" ? "Calcinha" : "Sutiã"}. Abra a aba correta.`);',
     '      if (tp !== aba) return toast(`Esta OP é de ${tp === "calcinha" ? "Calcinha" : "Sutiã"}. Abra a aba correta.`);',
     'validação tipo sem ramo Corte'),
    ('    if (aba === "corte") return toast("Use o fluxo próprio de Lateral e Alça.");\n',
     '',
     'guarda morta Corte'),
    ('      return !m.dataChegada && !m.cancelado && !m.excluido && norm(m.status) !== "CANCELADO" && norm(m.processo) === processo && (aba !== "corte" || m.area === "corte" || m.movimentacaoCorte === true);',
     '      return !m.dataChegada && !m.cancelado && !m.excluido && norm(m.status) !== "CANCELADO" && norm(m.processo) === processo;',
     'duplicidade sem ramo Corte'),
    ('    if (!confirm(`Confirmar saída?\\nAba: ${aba === "sutia" ? "Sutiã" : aba === "calcinha" ? "Calcinha" : "Lateral e Alça"}\\nOP ${nop}\\nProcesso: ${processo}\\nFacção: ${faccao}\\nQuantidade: ${total.toLocaleString("pt-BR")}`)) return;',
     '    if (!confirm(`Confirmar saída?\\nAba: ${aba === "sutia" ? "Sutiã" : "Calcinha"}\\nOP ${nop}\\nProcesso: ${processo}\\nFacção: ${faccao}\\nQuantidade: ${total.toLocaleString("pt-BR")}`)) return;',
     'confirmação sem ramo Lateral'),
    ('      const corte = false;\n', '', 'constante morta corte'),
    ('        origem: corte ? "corte" : "faccoes_registro_saida",', '        origem: "faccoes_registro_saida",', 'origem saída'),
    ('        areaLabel: aba === "sutia" ? "Sutiã" : aba === "calcinha" ? "Calcinha" : "Corte",', '        areaLabel: aba === "sutia" ? "Sutiã" : "Calcinha",', 'area label saída'),
    ('        movimentacaoCorte: corte,', '        movimentacaoCorte: false,', 'movimentação corte explícita falsa'),
    ('        tipoDestino: corte ? "faccao_corte" : "faccao",', '        tipoDestino: "faccao",', 'tipo destino saída'),
    ('        tipoDestinoLabel: corte ? "Facção • Corte" : "Facção",', '        tipoDestinoLabel: "Facção",', 'label destino saída'),
]
for old, new, label in replacements:
    saida = repl(saida, old, new, label)

if 'preferencia === "corte"' in saida or 'aba === "corte"' in saida or 'aba !== "corte"' in saida:
    raise RuntimeError('Ainda existem ramos mortos de Corte no módulo Sutiã/Calcinha')
write('corponu-faccoes-tres-abas-saida.js', saida)

# Pós-condições.
final_dual = read('corponu-dual-mode.js')
final_saida = read('corponu-faccoes-tres-abas-saida.js')
if 'const listaAtiva = gerais.filter' not in final_dual:
    raise RuntimeError('Resumo segregado não aplicado')
if 'movementCounts(activeType)' in final_dual:
    raise RuntimeError('Resumo antigo de Facções ainda está em uso')
for token in ['stopImmediatePropagation()', 'CLASSE_TIPO_INCOMPATIVEL', 'preferencia === "corte"', 'aba === "corte"', 'aba !== "corte"']:
    if token in final_saida:
        raise RuntimeError(f'Código concorrente/morto ainda presente: {token}')
print('Finalização 285 concluída: resumo segregado e fluxo de saída sem ramos mortos.')
