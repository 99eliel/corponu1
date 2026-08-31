const fs = require('fs');

const RELEASE_ANTERIOR = '2026-08-31-bojo-confeccao-configuravel-267';
const RELEASE_NOVA = '2026-08-31-processos-sutia-singleflight-268';
const DATA_RELEASE = '2026-08-31T06:45:00-03:00';

function ler(path) { return fs.readFileSync(path, 'utf8'); }
function gravar(path, content) { fs.writeFileSync(path, content, 'utf8'); }

function replaceOnce(source, oldText, newText, description) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`Trecho não encontrado: ${description}`);
  if (source.indexOf(oldText, first + oldText.length) >= 0) throw new Error(`Trecho duplicado/ambíguo: ${description}`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

function replaceRegexOnce(source, regex, replacement, description) {
  const matches = [...source.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'))];
  if (matches.length !== 1) throw new Error(`${description}: esperado 1 trecho, encontrados ${matches.length}`);
  return source.replace(regex, replacement);
}

const basePath = 'corponu-sutia-completo-calculo-base-174.js';
let base = ler(basePath);

base = replaceOnce(
  base,
  '  let firebasePromise = null;\n  let perfilAtual = null;',
  '  let firebasePromise = null;\n  let perfilPromise = null;\n  let configPromise = null;\n  let configProcessosPromise = null;\n  let perfilAtual = null;',
  'estado de inicialização única'
);

base = replaceRegexOnce(
  base,
  /  async function obterPerfil\(\) \{[\s\S]*?\n  \}\n\n  function ehAdmin/,
  `  async function obterPerfil() {
    const ctx = await firebase();
    const usuarioAtual = ctx.auth.currentUser;
    if (usuarioAtual && perfilAtual?.uid === usuarioAtual.uid) return perfilAtual;
    if (perfilPromise) return perfilPromise;

    perfilPromise = (async () => {
      if (!ctx.auth.currentUser && typeof ctx.auth.authStateReady === "function") {
        await ctx.auth.authStateReady();
      }

      const usuario = ctx.auth.currentUser;
      if (!usuario) return null;
      if (perfilAtual?.uid === usuario.uid) return perfilAtual;

      const snap = await ctx.fs.getDoc(ctx.fs.doc(ctx.db, "usuarios", usuario.uid));
      perfilAtual = {
        uid: usuario.uid,
        ...(snap.exists() ? snap.data() : {})
      };
      return perfilAtual;
    })();

    try {
      return await perfilPromise;
    } finally {
      perfilPromise = null;
    }
  }

  function ehAdmin`,
  'perfil single-flight'
);

base = replaceRegexOnce(
  base,
  /  async function carregarConfig\(\) \{[\s\S]*?\n  \}\n\n  function injetarEstilos/,
  `  async function carregarConfig() {
    if (configPromise) return configPromise;

    configPromise = (async () => {
      const ctx = await firebase();
      const snap = await ctx.fs.getDoc(ctx.fs.doc(ctx.db, "configuracoes", CONFIG_DOC));
      const dados = snap.exists() ? snap.data() : {};

      configAtual = {
        valorBaseGeral: Math.max(0, numero(dados.valorBaseGeral, DEFAULTS.valorBaseGeral)),
        referenciaEspecial: referenciaNormalizada(dados.referenciaEspecial || DEFAULTS.referenciaEspecial),
        valorBaseReferenciaEspecial: Math.max(0, numero(dados.valorBaseReferenciaEspecial, DEFAULTS.valorBaseReferenciaEspecial)),
        descontoBojoConfeccao: Math.max(0, numero(dados.descontoBojoConfeccao, DEFAULTS.descontoBojoConfeccao)),
        descontoFechoNaoFeito: Math.max(0, numero(dados.descontoFechoNaoFeito, DEFAULTS.descontoFechoNaoFeito)),
        descontoPontoLuzNaoFeito: Math.max(0, numero(dados.descontoPontoLuzNaoFeito, DEFAULTS.descontoPontoLuzNaoFeito))
      };

      preencherFormularioConfig();
      return configAtual;
    })();

    try {
      return await configPromise;
    } finally {
      configPromise = null;
    }
  }

  function injetarEstilos`,
  'configuração single-flight'
);

base = replaceOnce(
  base,
  '  async function injetarConfigProcessos() {',
  '  async function montarConfigProcessos() {',
  'renomear montagem de Processos'
);

base = replaceOnce(
  base,
  '    const perfil = await obterPerfil().catch(() => null);\n    if (!ehAdmin(perfil)) return;\n\n    const form = document.createElement("form");',
  '    const perfil = await obterPerfil().catch(() => null);\n    if (!ehAdmin(perfil)) return;\n\n    // A autenticação é assíncrona. Outra chamada pode ter concluído a montagem\n    // enquanto esta aguardava o perfil; revalidar aqui garante unicidade real.\n    if (document.getElementById("configSutiaCompleto51")) return;\n\n    const form = document.createElement("form");',
  'revalidação após autenticação'
);

base = replaceOnce(
  base,
  '    form.addEventListener("submit", salvarConfiguracao);\n    await carregarConfig().catch(error => console.warn("Configuração do Sutiã Completo não carregada.", error));\n  }\n\n  async function salvarConfiguracao(event) {',
  `    form.addEventListener("submit", salvarConfiguracao);
    await carregarConfig().catch(error => console.warn("Configuração do Sutiã Completo não carregada.", error));
  }

  async function injetarConfigProcessos() {
    if (document.getElementById("configSutiaCompleto51")) return;
    if (configProcessosPromise) return configProcessosPromise;

    configProcessosPromise = montarConfigProcessos();
    try {
      return await configProcessosPromise;
    } finally {
      configProcessosPromise = null;
    }
  }

  async function salvarConfiguracao(event) {`,
  'wrapper single-flight do painel'
);

base = replaceOnce(
  base,
  `      if (alvo.closest('[data-page="processos"]')) {
        [0, 250, 800].forEach(ms => window.setTimeout(() => {
          injetarConfigProcessos().catch(() => {});
        }, ms));
      }`,
  `      if (alvo.closest('[data-page="processos"]')) {
        injetarConfigProcessos().catch(error => {
          console.warn("Configuração do Sutiã Completo não montada em Processos.", error);
        });
      }`,
  'remover três tentativas no clique'
);

base = replaceOnce(
  base,
  `    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      instalarEventosFormularios();
      esconderConfigAntigaRevisao();
      injetarConfigProcessos().catch(() => {});
      if (tentativas >= 30) window.clearInterval(intervalo);
    }, 500);`,
  `    if (document.getElementById("processos")?.classList.contains("active")) {
      injetarConfigProcessos().catch(error => {
        console.warn("Configuração do Sutiã Completo não montada na inicialização de Processos.", error);
      });
    }`,
  'remover polling de 30 tentativas'
);

gravar(basePath, base);

for (const path of ['update.js', 'corponu-atualizador.js', 'index.html']) {
  let content = ler(path);
  if (!content.includes(RELEASE_ANTERIOR)) throw new Error(`${path}: release anterior não encontrado`);
  content = content.split(RELEASE_ANTERIOR).join(RELEASE_NOVA);
  gravar(path, content);
}

const version = {
  version: RELEASE_NOVA,
  updatedAt: DATA_RELEASE,
  notes: 'Processos: montagem da configuração do Sutiã Completo passou a ser single-flight. Removidos os timers/polling que podiam iniciar a mesma UI dezenas de vezes. Perfil e configuração agora deduplicam leituras concorrentes, há revalidação após autenticação e apenas uma instância do formulário pode ser criada. Nenhuma regra financeira ou do Firebase foi alterada.'
};
gravar('version.json', JSON.stringify(version, null, 2) + '\n');

const releasePath = 'corponu-release.json';
let release = {};
try { release = JSON.parse(ler(releasePath)); } catch (_) {}
release.version = RELEASE_NOVA;
release.updatedAt = DATA_RELEASE;
release.notes = 'Produção. Corrigida estruturalmente a duplicação e lentidão da configuração do Sutiã Completo em Processos. A montagem agora é uma operação única (single-flight), com uma segunda checagem de existência após a autenticação assíncrona. Leituras concorrentes de perfil e configuração são deduplicadas. Foram removidas as três tentativas temporizadas no clique e o polling de 30 tentativas a cada 500 ms. A página deixa de criar formulários duplicados e de repetir trabalho/Firebase durante a abertura. Cálculos, valores, regra do bojo configurável e demais regras financeiras permanecem iguais. Nenhuma regra do Firebase foi alterada.';
gravar(releasePath, JSON.stringify(release, null, 2) + '\n');

// Pós-condições estruturais.
const final = ler(basePath);
const obrigatorios = [
  'let configProcessosPromise = null;',
  'async function montarConfigProcessos()',
  'async function injetarConfigProcessos()',
  'if (configProcessosPromise) return configProcessosPromise;',
  'if (document.getElementById("configSutiaCompleto51")) return;',
  'if (configPromise) return configPromise;',
  'if (perfilPromise) return perfilPromise;'
];
for (const trecho of obrigatorios) {
  if (!final.includes(trecho)) throw new Error(`Pós-condição ausente: ${trecho}`);
}
if (final.includes('tentativas >= 30')) throw new Error('Polling antigo de 30 tentativas ainda existe.');
if (final.includes('[0, 250, 800].forEach')) throw new Error('Tentativas temporizadas de Processos ainda existem.');

console.log('Migração 268 aplicada com sucesso.');
