import {
  normalizar,
  processoCanonico,
  texto
} from "./normalizacao.mjs";

const ALIASES_NOME = Object.freeze({
  "LARA CRISTINA KAKA": "KAKA",
  "LARA CRISTINA KAKA KAKA": "KAKA",
  "KAKA LARA CRISTINA": "KAKA",
  GISLAINE: "GISLAINY"
});

function limparNomeParaAlias(valor) {
  return normalizar(valor)
    .replace(/[()\/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nomeFaccaoCanonico(valor) {
  const original = texto(valor);
  if (!original) return "";
  const chave = limparNomeParaAlias(original);
  return ALIASES_NOME[chave] || original.trim();
}

function itensDoCampo(campo) {
  if (campo == null || campo === "") return [];
  return Array.isArray(campo) ? campo : [campo];
}

function processoDoItem(item) {
  if (typeof item === "string" || typeof item === "number") {
    return processoCanonico(item);
  }
  if (!item || typeof item !== "object") return "";
  return processoCanonico(
    item.nome || item.processo || item.servicoNome || item.label || item.valor || ""
  );
}

export function processosDaFaccao(faccao = {}) {
  const campos = [
    faccao.processosPermitidos,
    faccao.processos,
    faccao.servicosPermitidos,
    faccao.servicos,
    faccao.tiposProcesso,
    faccao.processo,
    faccao.tipoProcesso
  ];

  const processos = new Set();
  campos.forEach(campo => {
    itensDoCampo(campo).forEach(item => {
      const processo = processoDoItem(item);
      if (processo) processos.add(processo);
    });
  });

  return [...processos];
}

export function faccaoAtiva(faccao = {}) {
  if (!faccao || faccao.ativo === false) return false;
  if (faccao.cadastroPendente === true) return false;
  if (faccao.duplicadaDe) return false;
  if (normalizar(faccao.statusImportacao) === "DUPLICADA_CONSOLIDADA") return false;
  return Boolean(texto(faccao.nome || faccao.razaoSocial || faccao.id));
}

function prepararFaccao(faccao) {
  const nomeOriginal = texto(faccao.nome || faccao.razaoSocial || faccao.id);
  return {
    ...faccao,
    nome: nomeFaccaoCanonico(nomeOriginal),
    nomeOriginal,
    processosCanonicos: processosDaFaccao(faccao)
  };
}

function preferirCadastro(atual, candidato) {
  if (!atual) return candidato;
  const qtdAtual = atual.processosCanonicos?.length || 0;
  const qtdNovo = candidato.processosCanonicos?.length || 0;
  if (qtdNovo > qtdAtual) return candidato;
  return atual;
}

export function deduplicarFaccoes(faccoes = []) {
  const mapa = new Map();

  for (const item of faccoes || []) {
    if (!faccaoAtiva(item)) continue;
    const preparado = prepararFaccao(item);
    const chave = normalizar(preparado.nome);
    if (!chave) continue;
    mapa.set(chave, preferirCadastro(mapa.get(chave), preparado));
  }

  return [...mapa.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })
  );
}

export function criarIndiceFaccoesPorProcesso(faccoes = []) {
  const indice = new Map();

  for (const faccao of deduplicarFaccoes(faccoes)) {
    for (const processo of faccao.processosCanonicos) {
      if (!indice.has(processo)) indice.set(processo, []);
      indice.get(processo).push(faccao);
    }
  }

  for (const lista of indice.values()) {
    lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
  }

  return indice;
}

export function listarFaccoesPorProcesso(
  faccoes = [],
  processo,
  { nomesFallback = [] } = {}
) {
  const processoAlvo = processoCanonico(processo);
  if (!processoAlvo) return [];

  const todas = deduplicarFaccoes(faccoes);
  const diretas = todas.filter(item =>
    item.processosCanonicos.includes(processoAlvo)
  );
  if (diretas.length) return diretas;

  // Compatibilidade temporária para cadastros legados ainda sem processos salvos.
  // A lista fallback é fornecida pelo chamador; a regra V2 não mantém listas de nomes
  // hardcoded dentro do domínio.
  const nomes = new Set((nomesFallback || []).map(nome => normalizar(nomeFaccaoCanonico(nome))));
  if (!nomes.size) return [];

  return todas.filter(item => nomes.has(normalizar(item.nome)));
}
