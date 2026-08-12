from pathlib import Path
import json

# app.js: processo disponível nos dois setores e fallback padrão.
p = Path('app.js')
s = p.read_text(encoding='utf-8')
replacements = [
    (
        '  "ALÇA",\n  "CALCINHA MONTAGEM",',
        '  "ALÇA",\n  "INTERLOCK",\n  "CALCINHA MONTAGEM",',
        'lista padrão de processos'
    ),
    (
        '  sutia: ["ENCAPAR BOJO", "SUTIÃ COMPLETO", "SUTIÃ MONTAGEM", "ALÇA"],\n  calcinha: ["CALCINHA MONTAGEM", "CALCINHA COMPLETA"]',
        '  sutia: ["ENCAPAR BOJO", "SUTIÃ COMPLETO", "SUTIÃ MONTAGEM", "ALÇA", "INTERLOCK"],\n  calcinha: ["CALCINHA MONTAGEM", "CALCINHA COMPLETA", "INTERLOCK"]',
        'processos por setor'
    ),
    (
        '  "ALÇA": ["JANAINA", "IVONE", "LUANA", "KARYTA", "SIMEI", "SIMONE"],\n  "CALCINHA MONTAGEM":',
        '  "ALÇA": ["JANAINA", "IVONE", "LUANA", "KARYTA", "SIMEI", "SIMONE"],\n  "INTERLOCK": [],\n  "CALCINHA MONTAGEM":',
        'facções padrão'
    ),
]
for old, new, label in replacements:
    if old not in s:
        raise SystemExit(f'app.js: trecho não encontrado: {label}')
    s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# update.js: processo gerenciado + valor global fixo em todos os fluxos de pagamento.
p = Path('update.js')
s = p.read_text(encoding='utf-8')

old = 'const APP_VERSION = "2026-07-30-modo-web-sem-pwa-15";'
if old not in s:
    raise SystemExit('update.js: APP_VERSION não encontrado')
s = s.replace(old, 'const APP_VERSION = "2026-08-12-interlock-global-181";', 1)

old = '''    "ALÇA": [
      "JANAINA", "IVONE", "LUANA", "KARYTA", "SIMEI", "SIMONE"
    ],
    "CALCINHA MONTAGEM":'''
new = '''    "ALÇA": [
      "JANAINA", "IVONE", "LUANA", "KARYTA", "SIMEI", "SIMONE"
    ],
    "INTERLOCK": [],
    "CALCINHA MONTAGEM":'''
if old not in s:
    raise SystemExit('update.js: fallback FACCOES_POR_PROCESSO não encontrado')
s = s.replace(old, new, 1)

old = '''    "ENCAPAR BOJO",
    "ALÇA",
    "CALCINHA MONTAGEM",'''
new = '''    "ENCAPAR BOJO",
    "ALÇA",
    "INTERLOCK",
    "CALCINHA MONTAGEM",'''
if old not in s:
    raise SystemExit('update.js: ordem de processos não encontrada')
s = s.replace(old, new, 1)

old = '''  function getProcessosFaccoesAtivos() {
    const origem = configuracaoProcessosFaccoesExiste
      ? processosFaccoesConfigurados
      : construirConfiguracaoInferidaProcessosFaccoes();
    return origem.filter(item => item?.ativo !== false && item?.nome);
  }'''
new = '''  function getProcessosFaccoesAtivos() {
    const origem = configuracaoProcessosFaccoesExiste
      ? processosFaccoesConfigurados
      : construirConfiguracaoInferidaProcessosFaccoes();
    const ativos = origem.filter(item => item?.ativo !== false && item?.nome);
    const temInterlock = ativos.some(item => normalizarComparacao(item.nome) === "INTERLOCK");
    if (!temInterlock) {
      ativos.push({ nome: "INTERLOCK", setor: "ambos", faccoes: [], ativo: true });
    }
    return ativos;
  }'''
if old not in s:
    raise SystemExit('update.js: getProcessosFaccoesAtivos não encontrado')
s = s.replace(old, new, 1)

anchor = '''  function processoPagamentoAlca(valor) {
    return normalizarComparacao(valor) === 'ALCA';
  }
'''
helper = '''  function processoPagamentoAlca(valor) {
    return normalizarComparacao(valor) === 'ALCA';
  }

  const VALOR_PADRAO_INTERLOCK = 0.18;
  const ID_PRECO_PADRAO_INTERLOCK = 'valor-padrao-interlock';

  function processoPagamentoInterlock(valor) {
    return normalizarComparacao(valor) === 'INTERLOCK';
  }

  function precoPadraoInterlock() {
    return {
      id: ID_PRECO_PADRAO_INTERLOCK,
      referencia: '*',
      processo: 'INTERLOCK',
      servicoNome: 'INTERLOCK',
      setor: 'ambos',
      setorLabel: 'Todos',
      valor: VALOR_PADRAO_INTERLOCK,
      ativo: true,
      tipoValor: 'padrao_global_interlock',
      valorPadraoGlobalInterlock: true
    };
  }
'''
if anchor not in s:
    raise SystemExit('update.js: processoPagamentoAlca não encontrado')
s = s.replace(anchor, helper, 1)

patches = [
    (
        '''  async function buscarPrecoMovUsuario(referencia, processo) {
    const { firestore, db } = contextoMovUsuario;
    if (processoPagamentoAlca(processo)) {
      return buscarPrecoPadraoAlca(firestore, db);
    }
''',
        '''  async function buscarPrecoMovUsuario(referencia, processo) {
    const { firestore, db } = contextoMovUsuario;
    if (processoPagamentoInterlock(processo)) return precoPadraoInterlock();
    if (processoPagamentoAlca(processo)) {
      return buscarPrecoPadraoAlca(firestore, db);
    }
''',
        'buscarPrecoMovUsuario'
    ),
    (
        '''  async function buscarPrecoChegadaManualSimplificada(firestore, db, referencia, processo) {
    if (processoPagamentoAlca(processo)) {
      return buscarPrecoPadraoAlca(firestore, db);
    }
''',
        '''  async function buscarPrecoChegadaManualSimplificada(firestore, db, referencia, processo) {
    if (processoPagamentoInterlock(processo)) return precoPadraoInterlock();
    if (processoPagamentoAlca(processo)) {
      return buscarPrecoPadraoAlca(firestore, db);
    }
''',
        'buscarPrecoChegadaManualSimplificada'
    ),
    (
        '''  async function buscarPrecoConfirmacaoChegada(firestore, db, referencia, processo) {
    if (processoPagamentoAlca(processo)) {
      return buscarPrecoPadraoAlca(firestore, db);
    }
''',
        '''  async function buscarPrecoConfirmacaoChegada(firestore, db, referencia, processo) {
    if (processoPagamentoInterlock(processo)) return precoPadraoInterlock();
    if (processoPagamentoAlca(processo)) {
      return buscarPrecoPadraoAlca(firestore, db);
    }
''',
        'buscarPrecoConfirmacaoChegada'
    )
]
for old, new, label in patches:
    if old not in s:
        raise SystemExit(f'update.js: trecho não encontrado: {label}')
    s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')

# Cache busting.
p = Path('index.html')
s = p.read_text(encoding='utf-8')
old_update = 'update.js?v=2026-08-11-chegada-sutia-rapida-180'
old_app = 'app.js?v=2026-08-11-cadastro-valores-estavel-172b'
if old_update not in s or old_app not in s:
    raise SystemExit('index.html: versões esperadas não encontradas')
s = s.replace(old_update, 'update.js?v=2026-08-12-interlock-global-181', 1)
s = s.replace(old_app, 'app.js?v=2026-08-12-interlock-global-181', 1)
p.write_text(s, encoding='utf-8')

Path('corponu-release.json').write_text(json.dumps({
    'version': '2026-08-12-interlock-global-181',
    'updatedAt': '2026-08-12T10:11:00-03:00',
    'notes': 'Adiciona o processo INTERLOCK para Sutiã e Calcinha. O valor é global e fixo em R$ 0,1800 por peça para qualquer referência, sem leitura de preço por referência. O processo aparece em Gerenciar facções inicialmente sem facções vinculadas; o administrador pode definir quem realiza o serviço.'
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
