const fs = require('fs');

const RELEASE_ANTERIOR = '2026-08-28-chegada-usuario-somente-aviso-266';
const RELEASE_NOVA = '2026-08-31-bojo-confeccao-configuravel-267';
const DATA_RELEASE = '2026-08-31T06:20:00-03:00';

function ler(path) {
  return fs.readFileSync(path, 'utf8');
}

function gravar(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

function replaceOnce(source, oldText, newText, description) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`Trecho não encontrado: ${description}`);
  if (source.indexOf(oldText, first + oldText.length) >= 0) {
    throw new Error(`Trecho duplicado e ambíguo: ${description}`);
  }
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

function replaceAllCount(source, oldText, newText, min, description) {
  const count = source.split(oldText).length - 1;
  if (count < min) throw new Error(`Esperava ao menos ${min} ocorrência(s) em ${description}; encontrei ${count}`);
  return source.split(oldText).join(newText);
}

// -----------------------------------------------------------------------------
// 1) Fonte canônica do cálculo do Sutiã Completo
// -----------------------------------------------------------------------------
const basePath = 'corponu-sutia-completo-calculo-base-174.js';
let base = ler(basePath);

base = replaceOnce(
  base,
  `    valorBaseReferenciaEspecial: 6.5,\n    descontoFechoNaoFeito: 0.25,`,
  `    valorBaseReferenciaEspecial: 6.5,\n    descontoBojoConfeccao: 0.5,\n    descontoFechoNaoFeito: 0.25,`,
  'default do desconto padrão do bojo'
);

base = replaceOnce(
  base,
  `      valorBaseReferenciaEspecial: Math.max(0, numero(dados.valorBaseReferenciaEspecial, DEFAULTS.valorBaseReferenciaEspecial)),\n      descontoFechoNaoFeito: Math.max(0, numero(dados.descontoFechoNaoFeito, DEFAULTS.descontoFechoNaoFeito)),`,
  `      valorBaseReferenciaEspecial: Math.max(0, numero(dados.valorBaseReferenciaEspecial, DEFAULTS.valorBaseReferenciaEspecial)),\n      descontoBojoConfeccao: Math.max(0, numero(dados.descontoBojoConfeccao, DEFAULTS.descontoBojoConfeccao)),\n      descontoFechoNaoFeito: Math.max(0, numero(dados.descontoFechoNaoFeito, DEFAULTS.descontoFechoNaoFeito)),`,
  'leitura do desconto padrão do bojo'
);

base = replaceOnce(
  base,
  `      sc51ValorBase912: configAtual.valorBaseReferenciaEspecial,\n      sc51Fecho: configAtual.descontoFechoNaoFeito,`,
  `      sc51ValorBase912: configAtual.valorBaseReferenciaEspecial,\n      sc51BojoConfeccao: configAtual.descontoBojoConfeccao,\n      sc51Fecho: configAtual.descontoFechoNaoFeito,`,
  'preenchimento do campo do bojo'
);

base = replaceOnce(
  base,
  `        <label>Valor da referência especial\n          <input id="sc51ValorBase912" type="number" min="0" step="0.0001" required>\n        </label>\n        <label>Desconto do fecho não feito`,
  `        <label>Valor da referência especial\n          <input id="sc51ValorBase912" type="number" min="0" step="0.0001" required>\n        </label>\n        <label>Desconto padrão do bojo feito pela confecção\n          <input id="sc51BojoConfeccao" type="number" min="0" step="0.0001" required>\n        </label>\n        <label>Desconto do fecho não feito`,
  'campo de configuração do bojo em Processos'
);

base = replaceOnce(
  base,
  `        Lateral e Encapar Bojo continuam usando os valores ativos por referência já cadastrados nesta aba.\n        Sutiã Montagem não recebe estes descontos.`,
  `        Lateral continua usando o valor ativo por referência. Quando o bojo do Sutiã Completo for marcado como feito pela confecção, o desconto usa o valor padrão configurado acima, independentemente da referência. O processo Encapar Bojo continua com seu valor próprio por referência fora deste cálculo.\n        Sutiã Montagem não recebe estes descontos.`,
  'texto explicativo da configuração'
);

base = replaceOnce(
  base,
  `      valorBaseReferenciaEspecial: Math.max(0, numero(document.getElementById("sc51ValorBase912")?.value)),\n      descontoFechoNaoFeito: Math.max(0, numero(document.getElementById("sc51Fecho")?.value)),`,
  `      valorBaseReferenciaEspecial: Math.max(0, numero(document.getElementById("sc51ValorBase912")?.value)),\n      descontoBojoConfeccao: Math.max(0, numero(document.getElementById("sc51BojoConfeccao")?.value)),\n      descontoFechoNaoFeito: Math.max(0, numero(document.getElementById("sc51Fecho")?.value)),`,
  'salvamento do desconto padrão do bojo'
);

base = replaceOnce(
  base,
  `      \`Referência \${nova.referenciaEspecial}: \${moeda4(nova.valorBaseReferenciaEspecial)}\`,\n      \`Fecho não feito: \${moeda4(nova.descontoFechoNaoFeito)}\`,`,
  `      \`Referência \${nova.referenciaEspecial}: \${moeda4(nova.valorBaseReferenciaEspecial)}\`,\n      \`Bojo feito pela confecção: \${moeda4(nova.descontoBojoConfeccao)}\`,\n      \`Fecho não feito: \${moeda4(nova.descontoFechoNaoFeito)}\`,`,
  'confirmação do valor padrão do bojo'
);

const calculoAntigo = `  async function calcularMemoria(referencia, contexto, dados) {\n    const base = valorBaseParaReferencia(referencia);\n    const precoLateral = dados.lateral.descontar ? await buscarPreco(PROCESSO_LATERAL, referencia) : null;\n    const precoBojo = dados.bojo.descontar ? await buscarPreco(PROCESSO_BOJO, referencia) : null;\n    const faltantes = [];\n\n    if (dados.lateral.indefinido) faltantes.push("definição da LATERAL");\n    else if (dados.lateral.descontar && !precoLateral) faltantes.push(\`\${PROCESSO_LATERAL} da referência \${referencia}\`);\n    if (dados.bojo.indefinido) faltantes.push("definição do BOJO");\n    else if (dados.bojo.descontar && !precoBojo) faltantes.push(\`\${PROCESSO_BOJO} da referência \${referencia}\`);\n\n    const descontos = {\n      lateral: dados.lateral.descontar && precoLateral ? arred4(precoLateral.valor) : 0,\n      bojo: dados.bojo.descontar && precoBojo ? arred4(precoBojo.valor) : 0,\n      fecho: dados.fechoPronto ? 0 : arred4(configAtual.descontoFechoNaoFeito),\n      pontoLuz: dados.pontoLuzPronto ? 0 : arred4(configAtual.descontoPontoLuzNaoFeito)\n    };\n\n    const valorUnitario = arred4(Math.max(base - descontos.lateral - descontos.bojo - descontos.fecho - descontos.pontoLuz, 0));\n    return { base, descontos, valorUnitario, faltantes, precoLateral, precoBojo };\n  }`;

const calculoNovo = `  async function calcularMemoria(referencia, contexto, dados) {\n    const base = valorBaseParaReferencia(referencia);\n    const precoLateral = dados.lateral.descontar ? await buscarPreco(PROCESSO_LATERAL, referencia) : null;\n    const faltantes = [];\n\n    if (dados.lateral.indefinido) faltantes.push("definição da LATERAL");\n    else if (dados.lateral.descontar && !precoLateral) faltantes.push(\`\${PROCESSO_LATERAL} da referência \${referencia}\`);\n    if (dados.bojo.indefinido) faltantes.push("definição do BOJO");\n\n    const descontos = {\n      lateral: dados.lateral.descontar && precoLateral ? arred4(precoLateral.valor) : 0,\n      bojo: dados.bojo.descontar ? arred4(configAtual.descontoBojoConfeccao) : 0,\n      fecho: dados.fechoPronto ? 0 : arred4(configAtual.descontoFechoNaoFeito),\n      pontoLuz: dados.pontoLuzPronto ? 0 : arred4(configAtual.descontoPontoLuzNaoFeito)\n    };\n\n    const valorUnitario = arred4(Math.max(base - descontos.lateral - descontos.bojo - descontos.fecho - descontos.pontoLuz, 0));\n    return {\n      base,\n      descontos,\n      valorUnitario,\n      faltantes,\n      precoLateral,\n      precoBojo: null,\n      regraDescontoBojo: dados.bojo.descontar ? "PADRAO_CONFECCAO" : "SEM_DESCONTO",\n      descontoBojoConfigurado: arred4(configAtual.descontoBojoConfeccao)\n    };\n  }`;
base = replaceOnce(base, calculoAntigo, calculoNovo, 'função canônica de cálculo do Sutiã Completo');

base = replaceOnce(
  base,
  `        dados.bojo.indefinido ? "Bojo aguardando informação" : dados.bojo.descontar ? \`Bojo − \${memoria.precoBojo ? moeda4(memoria.descontos.bojo) : "valor não cadastrado"}\` : "Bojo sem desconto",`,
  `        dados.bojo.indefinido ? "Bojo aguardando informação" : dados.bojo.descontar ? \`Bojo − \${moeda4(memoria.descontos.bojo)} (padrão confecção)\` : "Bojo sem desconto",`,
  'resumo visual do desconto do bojo'
);

base = replaceOnce(
  base,
  `        \`Bojo: \${dados.bojo.indefinido ? "não informado — pagamento aguardará definição" : dados.bojo.descontar ? (memoria.precoBojo ? \`feito pela confecção — desconto \${moeda4(memoria.descontos.bojo)}\` : "feito pela confecção, mas sem valor cadastrado") : "feito pela facção — sem desconto"}\`,`,
  `        \`Bojo: \${dados.bojo.indefinido ? "não informado — pagamento aguardará definição" : dados.bojo.descontar ? \`feito pela confecção — desconto padrão \${moeda4(memoria.descontos.bojo)}\` : "feito pela facção — sem desconto"}\`,`,
  'confirmação da chegada com desconto padrão do bojo'
);

base = replaceOnce(
  base,
  `        descontoBojo: memoria.descontos.bojo,\n        descontoFecho: memoria.descontos.fecho,`,
  `        descontoBojo: memoria.descontos.bojo,\n        regraDescontoBojo: memoria.regraDescontoBojo,\n        descontoBojoConfigurado: memoria.descontoBojoConfigurado,\n        descontoFecho: memoria.descontos.fecho,`,
  'auditoria da regra do bojo na movimentação'
);

base = replaceOnce(
  base,
  `      precoBojoReferenciaId: memoria.precoBojo?.id || "",\n      lateralPronta: dados.lateral.pronto,`,
  `      precoBojoReferenciaId: "",\n      regraDescontoSutiaCompletoBojo: memoria.regraDescontoBojo,\n      descontoBojoConfiguradoSutiaCompleto: memoria.descontoBojoConfigurado,\n      lateralPronta: dados.lateral.pronto,`,
  'auditoria da regra do bojo no pagamento'
);

base = replaceOnce(
  base,
  `        bojoPronto: dados.bojo.pronto,\n        descontoBojo: arred4(memoria.descontos.bojo),\n        fechoPronto: dados.fechoPronto,`,
  `        bojoPronto: dados.bojo.pronto,\n        descontoBojo: arred4(memoria.descontos.bojo),\n        regraDescontoBojo: memoria.regraDescontoBojo,\n        descontoBojoConfigurado: memoria.descontoBojoConfigurado,\n        fechoPronto: dados.fechoPronto,`,
  'memória histórica da regra do bojo'
);

gravar(basePath, base);

// -----------------------------------------------------------------------------
// 2) Loader oficial: apenas nova identidade de versão; a regra fica na fonte base
// -----------------------------------------------------------------------------
const loaderPath = 'corponu-sutia-completo-calculo.js';
let loader = ler(loaderPath);
loader = replaceOnce(
  loader,
  `  const LOADER_VERSION = "2026-08-11-admin-edita-componentes-chegada-175b";`,
  `  const LOADER_VERSION = "${RELEASE_NOVA}";`,
  'versão do loader do Sutiã Completo'
);
loader = replaceOnce(
  loader,
  `      'const VERSION = "2026-08-11-componentes-opcionais-calculo-170";',\n      'const VERSION = "2026-08-11-admin-edita-componentes-chegada-175b";',`,
  `      'const VERSION = "2026-08-11-componentes-opcionais-calculo-170";',\n      'const VERSION = "${RELEASE_NOVA}";',`,
  'versão interna aplicada pelo loader'
);
gravar(loaderPath, loader);

// -----------------------------------------------------------------------------
// 3) Release/cache
// -----------------------------------------------------------------------------
['update.js', 'corponu-atualizador.js', 'index.html'].forEach(path => {
  const atual = ler(path);
  gravar(path, replaceAllCount(atual, RELEASE_ANTERIOR, RELEASE_NOVA, 1, path));
});

const releasePath = 'corponu-release.json';
const release = JSON.parse(ler(releasePath));
release.version = RELEASE_NOVA;
release.updatedAt = DATA_RELEASE;
release.notes = 'Produção. A configuração do Sutiã Completo em Processos ganhou um campo oficial para o desconto padrão do bojo feito pela confecção. O valor padrão inicial é R$ 0,50 e fica salvo no mesmo documento configuracoes/sutia-completo-pagamento. Na chegada de SUTIÃ COMPLETO, quando o bojo entra como item descontado/feito pela confecção, o cálculo usa esse valor configurado independentemente da referência; não busca mais o preço de ENCAPAR BOJO por referência para esse desconto. Lateral, fecho, ponto de luz, valores-base e o processo ENCAPAR BOJO fora do cálculo de Sutiã Completo permanecem com as regras atuais. A memória do pagamento passa a registrar a regra e o valor configurado usados no bojo. Nenhuma regra do Firebase foi alterada.';
gravar(releasePath, JSON.stringify(release, null, 2) + '\n');

const versionPath = 'version.json';
const version = JSON.parse(ler(versionPath));
version.version = RELEASE_NOVA;
version.updatedAt = DATA_RELEASE;
version.notes = 'Processos agora possui valor configurável para o desconto padrão do bojo feito pela confecção no Sutiã Completo; padrão inicial R$ 0,50.';
gravar(versionPath, JSON.stringify(version, null, 2) + '\n');

// -----------------------------------------------------------------------------
// Pós-condições estruturais
// -----------------------------------------------------------------------------
const baseFinal = ler(basePath);
const loaderFinal = ler(loaderPath);
const checks = [
  ['campo em Processos', baseFinal.includes('id="sc51BojoConfeccao"')],
  ['default 0,50', baseFinal.includes('descontoBojoConfeccao: 0.5')],
  ['config carregada', baseFinal.includes('dados.descontoBojoConfeccao')],
  ['config salva', baseFinal.includes('document.getElementById("sc51BojoConfeccao")')],
  ['bojo não usa preço por referência no cálculo', !baseFinal.includes('const precoBojo = dados.bojo.descontar ? await buscarPreco(PROCESSO_BOJO, referencia) : null;')],
  ['desconto padrão aplicado', baseFinal.includes('bojo: dados.bojo.descontar ? arred4(configAtual.descontoBojoConfeccao) : 0')],
  ['memória da regra', baseFinal.includes('regraDescontoBojo: memoria.regraDescontoBojo')],
  ['loader na versão nova', loaderFinal.includes(`const LOADER_VERSION = "${RELEASE_NOVA}"`)],
  ['release atualizada', JSON.parse(ler(releasePath)).version === RELEASE_NOVA],
  ['version atualizada', JSON.parse(ler(versionPath)).version === RELEASE_NOVA]
];
const falhas = checks.filter(([, ok]) => !ok).map(([nome]) => nome);
if (falhas.length) throw new Error(`Pós-condições falharam: ${falhas.join(', ')}`);

console.log(`Regra configurável do bojo aplicada: ${RELEASE_NOVA}`);
