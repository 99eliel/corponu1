const fs = require('fs');

const OLD = '2026-09-09-recuperacao-pre-bloqueio-288';
const NEW = '2026-09-09-fase-bojo-oficial-289';
const UPDATE = 'update.js';

const ler = arquivo => fs.readFileSync(arquivo, 'utf8');
const gravar = (arquivo, conteudo) => fs.writeFileSync(arquivo, conteudo, 'utf8');

let source = ler(UPDATE);
if (!source.includes(OLD)) throw new Error('update.js não está na release 288 esperada.');

// 1) A lista oficial passa a ser soberana: histórico nunca repopula automaticamente.
const flagAuto = '  let restauracaoFasesAntigasAutomaticaTentada = false;\n';
if ((source.split(flagAuto).length - 1) !== 1) {
  throw new Error('Flag da restauração automática não encontrada exatamente uma vez.');
}
source = source.replace(flagAuto, '');

const blocoAuto = /  function iniciarRestauracaoFasesAntigas\(\) \{[\s\S]*?restaurarOpcoesAntigasFases\(\{ manual: false \}\);\n      \}\n    \}, delay\)\);\n  \}/g;
const blocosAuto = source.match(blocoAuto) || [];
if (blocosAuto.length !== 1) {
  throw new Error(`Inicializador automático inesperado: ${blocosAuto.length} ocorrência(s).`);
}
source = source.replace(blocoAuto, `  function iniciarRestauracaoFasesAntigas() {\n    instalarEventosRestauracaoFasesAntigas();\n    // A lista oficial é soberana. Histórico de OP nunca repopula sugestões automaticamente.\n    // Recuperação histórica permanece disponível somente por ação manual do administrador.\n    [350, 900, 1800, 3000].forEach(delay =>\n      setTimeout(garantirBotoesRestauracaoFasesAntigas, delay)\n    );\n  }`);

// 2) Migração única da configuração persistida para as duas opções oficiais já definidas.
const ancoraConstantes = `  const FASES_CONFIG_COLECAO = "configuracoes";\n  const FASES_CONFIG_DOCUMENTO = "fasesManejo";\n`;
if ((source.split(ancoraConstantes).length - 1) !== 1) {
  throw new Error('Âncora da configuração de fases não encontrada exatamente uma vez.');
}
source = source.replace(
  ancoraConstantes,
  `${ancoraConstantes}  const FASES_BOJO_OFICIAIS = Object.freeze(["BÁSICO SEM BOJO", "COM BOJO"]);\n  const MARCADOR_FASES_BOJO_OFICIAIS = "faseBojoOficial20260909V1";\n`
);

const ancoraConfigurar = `  async function configurarUsuarioGestaoFases(user) {`;
if ((source.split(ancoraConfigurar).length - 1) !== 1) {
  throw new Error('configurarUsuarioGestaoFases não encontrada exatamente uma vez.');
}

const migracao = `  async function migrarFaseBojoOficialSeNecessario() {\n    if (!usuarioEhAdminFases || !contextoFirebaseFases?.user) return false;\n\n    const { firestore, db, user } = contextoFirebaseFases;\n    const referencia = firestore.doc(db, FASES_CONFIG_COLECAO, FASES_CONFIG_DOCUMENTO);\n\n    try {\n      return await firestore.runTransaction(db, async transacao => {\n        const snapshot = await transacao.get(referencia);\n        const dados = snapshot.exists() ? snapshot.data() : {};\n        if (dados?.[MARCADOR_FASES_BOJO_OFICIAIS] === true) return false;\n\n        transacao.set(referencia, {\n          sugestoes: FASES_BOJO_OFICIAIS.map(normalizarFaseGerenciada),\n          [MARCADOR_FASES_BOJO_OFICIAIS]: true,\n          atualizadoEm: firestore.serverTimestamp(),\n          atualizadoPor: user.uid,\n          versaoGerenciamento: APP_VERSION\n        }, { merge: true });\n\n        return true;\n      });\n    } catch (error) {\n      console.error("Não foi possível migrar a Fase Bojo para as opções oficiais.", error);\n      mostrarAvisoFormulario("Não foi possível aplicar as opções oficiais da Fase Bojo.");\n      return false;\n    }\n  }\n\n`;
source = source.replace(ancoraConfigurar, migracao + ancoraConfigurar);

const inicializacaoAdmin = `      contextoFirebaseFases = { ...contextoFirebaseFases, user, perfil };\n      iniciarSnapshotConfiguracaoFases();\n      criarPainelAdminFases();`;
if ((source.split(inicializacaoAdmin).length - 1) !== 1) {
  throw new Error('Inicialização administrativa de fases não encontrada exatamente uma vez.');
}
source = source.replace(
  inicializacaoAdmin,
  `      contextoFirebaseFases = { ...contextoFirebaseFases, user, perfil };\n      await migrarFaseBojoOficialSeNecessario();\n      iniciarSnapshotConfiguracaoFases();\n      criarPainelAdminFases();`
);

// 3) Nova release para forçar carregamento limpo.
source = source.split(OLD).join(NEW);
gravar(UPDATE, source);

for (const arquivo of ['index.html', 'corponu-atualizador.js']) {
  const original = ler(arquivo);
  if (!original.includes(OLD)) throw new Error(`${arquivo}: release 288 não encontrada.`);
  gravar(arquivo, original.split(OLD).join(NEW));
}

const notes = 'Produção. Fase Bojo do Sutiã consolidada estruturalmente com somente duas opções oficiais: BÁSICO SEM BOJO e COM BOJO. A configuração persistida é migrada uma única vez, sem alterar OPs históricas. A restauração automática de sugestões a partir do histórico foi removida; a recuperação antiga permanece somente como ação manual do administrador. Nenhuma outra regra de negócio ou dado do Firebase foi alterado.';
for (const arquivo of ['corponu-release.json', 'version.json']) {
  const obj = JSON.parse(ler(arquivo));
  if (obj.version !== OLD) throw new Error(`${arquivo}: versão inesperada ${obj.version}.`);
  obj.version = NEW;
  obj.updatedAt = '2026-09-09T08:25:00-03:00';
  obj.notes = notes;
  gravar(arquivo, JSON.stringify(obj, null, 2) + '\n');
}

// Invariantes finais.
const final = ler(UPDATE);
for (const esperado of [
  NEW,
  'Object.freeze(["BÁSICO SEM BOJO", "COM BOJO"])',
  'faseBojoOficial20260909V1',
  'async function migrarFaseBojoOficialSeNecessario()',
  'sugestoes: FASES_BOJO_OFICIAIS.map(normalizarFaseGerenciada)',
  'await migrarFaseBojoOficialSeNecessario();',
  'restaurarOpcoesAntigasFases({ manual: true })',
  'A lista oficial é soberana'
]) {
  if (!final.includes(esperado)) throw new Error(`Invariante ausente em update.js: ${esperado}`);
}
for (const proibido of [
  'restauracaoFasesAntigasAutomaticaTentada',
  'restaurarOpcoesAntigasFases({ manual: false })'
]) {
  if (final.includes(proibido)) throw new Error(`Restauração automática ainda presente: ${proibido}`);
}

const html = ler('index.html');
for (const esperado of [
  `style.css?v=${NEW}`,
  `update.js?v=${NEW}`,
  `app.js?v=${NEW}`,
  `corponu-atualizador.js?v=${NEW}`
]) {
  if (!html.includes(esperado)) throw new Error(`Cache-bust ausente no index: ${esperado}`);
}
if (html.includes('servicePaymentHold') || html.includes('data-service-hold="payment"')) {
  throw new Error('Bloqueio financeiro reapareceu; abortando.');
}

console.log('Release 289 preparada: fonte oficial soberana e migração única da Fase Bojo.');
