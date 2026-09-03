const fs = require('fs');

const OLD_RELEASE = '2026-09-03-alca-cortagem-montagem-x2-281';
const NEW_RELEASE = '2026-09-03-sutia-bases-especiais-282';
const BASE = 'corponu-sutia-completo-calculo-base-174.js';
const LOADER = 'corponu-sutia-completo-calculo.js';

function read(p){ return fs.readFileSync(p,'utf8'); }
function write(p,s){ fs.writeFileSync(p,s,'utf8'); }
function once(src, from, to, label){
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`${label}: esperado 1, encontrado ${n}`);
  return src.replace(from,to);
}

let base = read(BASE);
base = once(base,
`  const DEFAULTS = Object.freeze({\n    valorBaseGeral: 5.5,\n    referenciaEspecial: "912",\n    valorBaseReferenciaEspecial: 6.5,`,
`  const REFERENCIAS_ESPECIAIS_BASE = Object.freeze({\n    "912": 6.5,\n    "414": 5.8\n  });\n  const DEFAULTS = Object.freeze({\n    valorBaseGeral: 5.5,\n    referenciasEspeciaisBase: REFERENCIAS_ESPECIAIS_BASE,\n    referenciaEspecial: "912",\n    valorBaseReferenciaEspecial: 6.5,`,
'defaults de bases especiais');

base = once(base,
`  const referenciaNormalizada = valor => texto(valor).replace(/\\s+/g, "").toUpperCase();\n  const numero =`,
`  const referenciaNormalizada = valor => texto(valor).replace(/\\s+/g, "").toUpperCase();\n\n  function normalizarBasesEspeciais(dados = {}) {\n    const mapa = { ...REFERENCIAS_ESPECIAIS_BASE };\n    const refLegada = referenciaNormalizada(dados.referenciaEspecial || DEFAULTS.referenciaEspecial);\n    const valorLegado = Math.max(0, numero(dados.valorBaseReferenciaEspecial, DEFAULTS.valorBaseReferenciaEspecial));\n    if (refLegada && valorLegado > 0) mapa[refLegada] = valorLegado;\n\n    const salvas = dados.referenciasEspeciaisBase || dados.referenciasEspeciais;\n    if (salvas && typeof salvas === "object" && !Array.isArray(salvas)) {\n      Object.entries(salvas).forEach(([ref, valor]) => {\n        const chave = referenciaNormalizada(ref);\n        const base = Math.max(0, numero(valor));\n        if (chave && base > 0) mapa[chave] = base;\n      });\n    }\n    return mapa;\n  }\n\n  const numero =`,
'helper de bases especiais');

base = once(base,
`      configAtual = {\n        valorBaseGeral: Math.max(0, numero(dados.valorBaseGeral, DEFAULTS.valorBaseGeral)),\n        referenciaEspecial: referenciaNormalizada(dados.referenciaEspecial || DEFAULTS.referenciaEspecial),\n        valorBaseReferenciaEspecial: Math.max(0, numero(dados.valorBaseReferenciaEspecial, DEFAULTS.valorBaseReferenciaEspecial)),`,
`      const referenciasEspeciaisBase = normalizarBasesEspeciais(dados);\n      const referenciaEspecialLegada = referenciaNormalizada(dados.referenciaEspecial || DEFAULTS.referenciaEspecial);\n      configAtual = {\n        valorBaseGeral: Math.max(0, numero(dados.valorBaseGeral, DEFAULTS.valorBaseGeral)),\n        referenciasEspeciaisBase,\n        referenciaEspecial: referenciaEspecialLegada,\n        valorBaseReferenciaEspecial: Math.max(0, numero(referenciasEspeciaisBase[referenciaEspecialLegada], DEFAULTS.valorBaseReferenciaEspecial)),`,
'carregamento da configuracao');

base = once(base,
`      sc51ValorBaseGeral: configAtual.valorBaseGeral,\n      sc51ValorBase912: configAtual.valorBaseReferenciaEspecial,\n      sc51BojoConfeccao:`,
`      sc51ValorBaseGeral: configAtual.valorBaseGeral,\n      sc51ValorBase912: configAtual.referenciasEspeciaisBase?.["912"] ?? configAtual.valorBaseReferenciaEspecial,\n      sc51ValorBase414: configAtual.referenciasEspeciaisBase?.["414"] ?? REFERENCIAS_ESPECIAIS_BASE["414"],\n      sc51BojoConfeccao:`,
'preenchimento dos campos');

base = once(base,
`    const ref = document.getElementById("sc51ReferenciaEspecial");\n    if (ref && document.activeElement !== ref) ref.value = configAtual.referenciaEspecial;\n`,
``,
'remocao do campo livre de referencia especial');

base = once(base,
`        <label>Referência especial\n          <input id="sc51ReferenciaEspecial" type="text" maxlength="30" required>\n        </label>\n        <label>Valor da referência especial\n          <input id="sc51ValorBase912" type="number" min="0" step="0.0001" required>\n        </label>`,
`        <label>Valor base especial • Referência 912\n          <input id="sc51ValorBase912" type="number" min="0" step="0.0001" required>\n        </label>\n        <label>Valor base especial • Referência 414\n          <input id="sc51ValorBase414" type="number" min="0" step="0.0001" required>\n        </label>`,
'interface das referencias especiais');

base = once(base,
`    const nova = {\n      valorBaseGeral: Math.max(0, numero(document.getElementById("sc51ValorBaseGeral")?.value)),\n      referenciaEspecial: referenciaNormalizada(document.getElementById("sc51ReferenciaEspecial")?.value),\n      valorBaseReferenciaEspecial: Math.max(0, numero(document.getElementById("sc51ValorBase912")?.value)),`,
`    const valorBase912 = Math.max(0, numero(document.getElementById("sc51ValorBase912")?.value));\n    const valorBase414 = Math.max(0, numero(document.getElementById("sc51ValorBase414")?.value));\n    const nova = {\n      valorBaseGeral: Math.max(0, numero(document.getElementById("sc51ValorBaseGeral")?.value)),\n      referenciasEspeciaisBase: { "912": valorBase912, "414": valorBase414 },\n      referenciaEspecial: "912",\n      valorBaseReferenciaEspecial: valorBase912,`,
'salvamento das bases especiais');

base = once(base,
`    if (!nova.valorBaseGeral || !nova.referenciaEspecial || !nova.valorBaseReferenciaEspecial) {\n      avisar("Preencha os valores-base e a referência especial.", "erro");`,
`    if (!nova.valorBaseGeral || !valorBase912 || !valorBase414) {\n      avisar("Preencha o valor geral e as bases especiais das referências 912 e 414.", "erro");`,
'validacao das bases especiais');

base = once(base,
`      \`Referência \${nova.referenciaEspecial}: \${moeda4(nova.valorBaseReferenciaEspecial)}\`,`,
`      \`Referência 912: \${moeda4(valorBase912)}\`,\n      \`Referência 414: \${moeda4(valorBase414)}\`,`,
'confirmacao das bases especiais');

base = once(base,
`  function valorBaseParaReferencia(referencia) {\n    return referenciaNormalizada(referencia) === referenciaNormalizada(configAtual.referenciaEspecial)\n      ? configAtual.valorBaseReferenciaEspecial\n      : configAtual.valorBaseGeral;\n  }`,
`  function valorBaseParaReferencia(referencia) {\n    const chave = referenciaNormalizada(referencia);\n    const valorEspecial = Math.max(0, numero(configAtual.referenciasEspeciaisBase?.[chave]));\n    return valorEspecial > 0 ? valorEspecial : configAtual.valorBaseGeral;\n  }`,
'calculo canonico por referencia');

base = once(base,
`        Lateral continua usando o valor ativo por referência. Quando o bojo do Sutiã Completo for marcado como feito pela confecção, o desconto usa o valor padrão configurado acima, independentemente da referência. O processo Encapar Bojo continua com seu valor próprio por referência fora deste cálculo.\n        Sutiã Montagem não recebe estes descontos.`,
`        As referências 912 e 414 possuem bases próprias. A referência 414 usa a base configurada acima e segue normalmente os descontos de Lateral, Bojo, Fecho e Ponto de luz. A referência 912 mantém sua regra especial integral já existente. Lateral continua usando o valor ativo por referência e o processo Encapar Bojo mantém seu valor próprio fora deste cálculo. Sutiã Montagem não recebe estes descontos.`,
'ajuda da configuracao');

write(BASE, base);

let loader = read(LOADER);
loader = once(loader,
`const LOADER_VERSION = "2026-08-31-bojo-confeccao-configuravel-267";`,
`const LOADER_VERSION = "${NEW_RELEASE}";`,
'versao do loader');
loader = once(loader,
`'const VERSION = "2026-08-11-componentes-opcionais-calculo-170";',\n      'const VERSION = "2026-08-31-bojo-confeccao-configuravel-267";',`,
`'const VERSION = "2026-08-11-componentes-opcionais-calculo-170";',\n      'const VERSION = "${NEW_RELEASE}";',`,
'versao interna executada');
write(LOADER, loader);

const notes = 'Produção. O Sutiã Completo passa a suportar múltiplas bases especiais de referência no cálculo canônico. A referência 912 mantém o valor/configuração e a regra integral já existentes. Foi adicionada a referência 414 com valor-base padrão de R$ 5,8000. A 414 usa essa base e continua seguindo normalmente os descontos de Lateral, Bojo, Fecho e Ponto de luz. A configuração em Processos agora exibe campos separados para as bases das referências 912 e 414. Os novos valores são persistidos no mapa referenciasEspeciaisBase, mantendo referenciaEspecial e valorBaseReferenciaEspecial da 912 para compatibilidade com o histórico e os módulos existentes. Não há migração nem alteração automática de pagamentos pagos. O recálculo de pendentes continua disponível pela opção já existente na configuração do Sutiã Completo. Nenhuma regra do Firebase foi modificada.';
for (const p of ['corponu-release.json','version.json']) {
  const obj = JSON.parse(read(p));
  obj.version = NEW_RELEASE;
  obj.updatedAt = '2026-09-03T14:27:00-03:00';
  obj.notes = notes;
  write(p, JSON.stringify(obj,null,2)+'\n');
}

for (const p of ['corponu-atualizador.js','update.js','index.html']) {
  let s = read(p);
  if (s.includes(OLD_RELEASE)) s = s.split(OLD_RELEASE).join(NEW_RELEASE);
  write(p,s);
}

const finalBase = read(BASE);
for (const token of ['"414": 5.8','sc51ValorBase414','referenciasEspeciaisBase','Valor base especial • Referência 414']) {
  if (!finalBase.includes(token)) throw new Error(`pos-condicao ausente: ${token}`);
}
if (finalBase.includes('id="sc51ReferenciaEspecial"')) throw new Error('campo livre antigo de referencia ainda presente');
console.log('Sutia Completo 282 aplicado com bases especiais 912 e 414.');
