from pathlib import Path

base = Path('.github/scripts/aplicar-calcinha-253.py').read_text(encoding='utf-8')

antigo = '''calc_trocar(
    '        necessidade: dados.necessidade,\\n        necessidadeTexto: dados.necessidade,',
    '        fase: dados.fase,\\n        necessidade: dados.necessidade,\\n        necessidadeTexto: dados.necessidade,',
    'fase raiz Firestore',
)
calc_trocar(
    '        linhaCalcinhaLabel: linhaLabel,\\n        necessidade: dados.necessidade,',
    '        linhaCalcinhaLabel: linhaLabel,\\n        fase: dados.fase,\\n        necessidade: dados.necessidade,',
    'fase raiz mapa local',
)
'''

novo = '''calc_trocar(
    '        necessidade: dados.necessidade,\\n        necessidadeTexto: dados.necessidade,',
    '        fase: dados.fase,\\n        necessidade: dados.necessidade,\\n        necessidadeTexto: dados.necessidade,',
    'fase raiz Firestore e mapa local',
    quantidade=2,
)
'''

qtd = base.count(antigo)
if qtd != 1:
    raise SystemExit(f'Gerador base inesperado: bloco de fase encontrado {qtd} vez(es).')

corrigido = base.replace(antigo, novo, 1)
exec(compile(corrigido, 'aplicar-calcinha-253-v2', 'exec'), {'__name__': '__main__'})
