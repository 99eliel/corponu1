import {
  arredondar2,
  arredondar4,
  inteiro,
  normalizar,
  normalizarCompetencia,
  normalizarReferencia,
  numero,
  processoCanonico,
  slugSeguro,
  texto
} from "./normalizacao.mjs";

export const PROCESSOS_FINANCEIROS = Object.freeze([
  "ENCAPAR BOJO",
  "ALÇA",
  "LATERAL",
  "CALCINHA MONTAGEM",
  "CALCINHA COMPLETA",
  "SUTIÃ MONTAGEM",
  "SUTIÃ COMPLETO"
]);

export const PROCESSO_SUTIA_COMPLETO = "SUTIÃ COMPLETO";

export function estadoBinario(valor) {
  if (valor === true || valor === false) return valor;
  const chave = normalizar(valor);
  if (["SIM", "S", "TRUE", "1", "FEZ", "PRONTO", "PRONTA"].includes(chave)) return true;
  if (["NAO", "NÃO", "N", "FALSE", "0", "NAO FEZ", "NÃO FEZ"].includes(chave)) return false;
  return null;
}

function numeroOPDaOrdem(op = {}) {
  return texto(op.numeroOP || op.numeroOPExterno || op.op || op.id);
}

function quantidadeDaOrdem(op = {}) {
  return inteiro(op.quantidade || op.quantidadeOP || op.qtd || 0);
}

export function validarLancamentoFinanceiro({
  op,
  processo,
  responsavel,
  competencia,
  quantidade
} = {}) {
  const erros = [];
  const numeroOP = numeroOPDaOrdem(op);
  const processoNormalizado = processoCanonico(processo);
  const competenciaNormalizada = normalizarCompetencia(competencia);
  const responsavelNormalizado = texto(responsavel);
  const quantidadeInformada = inteiro(quantidade);
  const quantidadeOP = quantidadeDaOrdem(op);

  if (!numeroOP) erros.push("OP_NAO_INFORMADA");
  if (!processoNormalizado || !PROCESSOS_FINANCEIROS.includes(processoNormalizado)) {
    erros.push("PROCESSO_INVALIDO");
  }
  if (!responsavelNormalizado) erros.push("RESPONSAVEL_NAO_INFORMADO");
  if (!competenciaNormalizada) erros.push("COMPETENCIA_INVALIDA");
  if (quantidadeInformada <= 0) erros.push("QUANTIDADE_INVALIDA");
  if (quantidadeOP > 0 && quantidadeInformada > quantidadeOP) {
    erros.push("QUANTIDADE_MAIOR_QUE_OP");
  }

  return {
    ok: erros.length === 0,
    erros,
    dados: {
      numeroOP,
      processo: processoNormalizado,
      responsavel: responsavelNormalizado,
      competencia: competenciaNormalizada,
      quantidade: quantidadeInformada,
      quantidadeOP
    }
  };
}

export function criarChaveControleProcesso({ opId, numeroOP, processo } = {}) {
  const op = texto(opId || numeroOP);
  const processoNormalizado = processoCanonico(processo);
  if (!op || !processoNormalizado) return "";
  return ["controle-fechamento-v2", slugSeguro(op), slugSeguro(processoNormalizado)].join("-");
}

export function criarChaveLancamento({ opId, numeroOP, processo, parcela } = {}) {
  const op = texto(opId || numeroOP);
  const processoNormalizado = processoCanonico(processo);
  const parcelaNormalizada = inteiro(parcela);
  if (!op || !processoNormalizado || parcelaNormalizada <= 0) return "";
  return [
    "fechamento-v2",
    slugSeguro(op),
    slugSeguro(processoNormalizado),
    `p-${String(parcelaNormalizada).padStart(4, "0")}`
  ].join("-");
}

export function validarSaldoProcesso({ quantidadeOP, quantidadeFechada = 0, quantidadeNova = 0 } = {}) {
  const totalOP = inteiro(quantidadeOP);
  const fechada = inteiro(quantidadeFechada);
  const nova = inteiro(quantidadeNova);
  const restante = Math.max(totalOP - fechada, 0);
  const erros = [];

  if (totalOP <= 0) erros.push("QUANTIDADE_OP_INVALIDA");
  if (nova <= 0) erros.push("QUANTIDADE_INVALIDA");
  if (nova > restante) erros.push("QUANTIDADE_MAIOR_QUE_RESTANTE");

  return {
    ok: erros.length === 0,
    erros,
    quantidadeOP: totalOP,
    quantidadeFechada: fechada,
    quantidadeRestante: restante,
    quantidadeNova: nova,
    quantidadeFechadaDepois: Math.min(totalOP, fechada + nova),
    quantidadeRestanteDepois: Math.max(totalOP - fechada - nova, 0)
  };
}

function validarQuantidadeCalculo(quantidade) {
  const qtd = inteiro(quantidade);
  if (qtd <= 0) {
    return { ok: false, erro: "QUANTIDADE_INVALIDA", quantidade: 0 };
  }
  return { ok: true, quantidade: qtd };
}

function configSutia(config = {}) {
  return {
    referenciaEspecial: normalizarReferencia(config.referenciaEspecial || "912"),
    valorBaseGeral: Math.max(0, numero(config.valorBaseGeral, 0)),
    valorBaseReferenciaEspecial: Math.max(0, numero(config.valorBaseReferenciaEspecial, 0)),
    descontoFechoNaoFeito: Math.max(0, numero(config.descontoFechoNaoFeito, 0)),
    descontoPontoLuzNaoFeito: Math.max(0, numero(config.descontoPontoLuzNaoFeito, 0))
  };
}

export function calcularSutiaCompleto({
  referencia,
  quantidade,
  componentes = {},
  configuracao = {},
  valoresComponentes = {}
} = {}) {
  const validacaoQuantidade = validarQuantidadeCalculo(quantidade);
  if (!validacaoQuantidade.ok) {
    return { ok: false, erros: [validacaoQuantidade.erro], valorUnitario: 0, total: 0 };
  }

  const qtd = validacaoQuantidade.quantidade;
  const config = configSutia(configuracao);
  const referenciaNormalizada = normalizarReferencia(referencia);
  const especial = Boolean(
    referenciaNormalizada && config.referenciaEspecial && referenciaNormalizada === config.referenciaEspecial
  );

  if (especial) {
    if (config.valorBaseReferenciaEspecial <= 0) {
      return { ok: false, erros: ["VALOR_REFERENCIA_ESPECIAL_NAO_CONFIGURADO"], especial: true, valorUnitario: 0, total: 0 };
    }
    const valorUnitario = arredondar4(config.valorBaseReferenciaEspecial);
    return {
      ok: true,
      erros: [],
      especial: true,
      referencia: referenciaNormalizada,
      quantidade: qtd,
      base: valorUnitario,
      descontos: { lateral: 0, bojo: 0, fecho: 0, pontoLuz: 0 },
      valorUnitario,
      total: arredondar2(qtd * valorUnitario)
    };
  }

  if (config.valorBaseGeral <= 0) {
    return { ok: false, erros: ["VALOR_BASE_NAO_CONFIGURADO"], especial: false, valorUnitario: 0, total: 0 };
  }

  const lateral = estadoBinario(componentes.lateral);
  const bojo = estadoBinario(componentes.bojo);
  const fecho = estadoBinario(componentes.fecho);
  const pontoLuz = estadoBinario(componentes.pontoLuz);
  const erros = [];

  if (lateral === null) erros.push("LATERAL_NAO_INFORMADA");
  if (bojo === null) erros.push("BOJO_NAO_INFORMADO");
  if (fecho === null) erros.push("FECHO_NAO_INFORMADO");
  if (pontoLuz === null) erros.push("PONTO_LUZ_NAO_INFORMADO");

  const valorLateral = Math.max(0, numero(valoresComponentes.lateral, 0));
  const valorBojo = Math.max(0, numero(valoresComponentes.bojo, 0));
  if (lateral === true && valorLateral <= 0) erros.push("VALOR_LATERAL_NAO_CADASTRADO");
  if (bojo === true && valorBojo <= 0) erros.push("VALOR_BOJO_NAO_CADASTRADO");

  if (erros.length) {
    return { ok: false, erros, especial: false, referencia: referenciaNormalizada, quantidade: qtd, valorUnitario: 0, total: 0 };
  }

  const descontos = {
    lateral: lateral === true ? arredondar4(valorLateral) : 0,
    bojo: bojo === true ? arredondar4(valorBojo) : 0,
    fecho: fecho === true ? 0 : arredondar4(config.descontoFechoNaoFeito),
    pontoLuz: pontoLuz === true ? 0 : arredondar4(config.descontoPontoLuzNaoFeito)
  };

  const valorUnitario = arredondar4(Math.max(
    config.valorBaseGeral - descontos.lateral - descontos.bojo - descontos.fecho - descontos.pontoLuz,
    0
  ));

  return {
    ok: true,
    erros: [],
    especial: false,
    referencia: referenciaNormalizada,
    quantidade: qtd,
    base: arredondar4(config.valorBaseGeral),
    componentes: { lateral, bojo, fecho, pontoLuz },
    descontos,
    valorUnitario,
    total: arredondar2(qtd * valorUnitario)
  };
}

export function calcularPagamentoProcesso({
  processo,
  referencia,
  quantidade,
  valorUnitario,
  componentes,
  configuracaoSutiaCompleto,
  valoresComponentes
} = {}) {
  const processoNormalizado = processoCanonico(processo);
  if (processoNormalizado === PROCESSO_SUTIA_COMPLETO) {
    return calcularSutiaCompleto({ referencia, quantidade, componentes, configuracao: configuracaoSutiaCompleto, valoresComponentes });
  }

  const validacaoQuantidade = validarQuantidadeCalculo(quantidade);
  if (!validacaoQuantidade.ok) {
    return { ok: false, erros: [validacaoQuantidade.erro], valorUnitario: 0, total: 0 };
  }

  const unitario = Math.max(0, numero(valorUnitario, 0));
  if (unitario <= 0) {
    return { ok: false, erros: ["VALOR_UNITARIO_NAO_CADASTRADO"], valorUnitario: 0, total: 0 };
  }

  return {
    ok: true,
    erros: [],
    processo: processoNormalizado,
    quantidade: validacaoQuantidade.quantidade,
    valorUnitario: arredondar4(unitario),
    total: arredondar2(validacaoQuantidade.quantidade * unitario)
  };
}

export function criarDocumentoFechamento({
  op,
  processo,
  responsavel,
  competencia,
  quantidade,
  calculo,
  observacoes = ""
} = {}) {
  const validacao = validarLancamentoFinanceiro({ op, processo, responsavel, competencia, quantidade });
  const erros = [...validacao.erros];
  if (!calculo?.ok) erros.push(...(calculo?.erros || ["CALCULO_INVALIDO"]));
  if (erros.length) return { ok: false, erros: [...new Set(erros)], documento: null };

  const dados = validacao.dados;
  const chaveControle = criarChaveControleProcesso({
    opId: op?.id,
    numeroOP: dados.numeroOP,
    processo: dados.processo
  });
  if (!chaveControle) return { ok: false, erros: ["CHAVE_FECHAMENTO_INVALIDA"], documento: null };

  const documento = {
    schemaVersion: 2,
    tipoDocumento: "lancamento_financeiro_v2",
    origem: "fechamento_financeiro_v2",
    chaveControle,
    opId: texto(op?.id),
    numeroOP: dados.numeroOP,
    referencia: texto(op?.referencia),
    cor: texto(op?.cor),
    tipoPeca: texto(op?.tipoPeca || op?.tipoPecaPadrao || op?.setor),
    competencia: dados.competencia,
    processo: dados.processo,
    responsavel: dados.responsavel,
    faccao: dados.responsavel,
    quantidade: dados.quantidade,
    quantidadeOP: dados.quantidadeOP,
    valorUnitario: arredondar4(calculo.valorUnitario),
    total: arredondar2(calculo.total),
    statusPagamento: "pendente",
    observacoes: texto(observacoes),
    calculo: {
      especial: calculo.especial === true,
      base: arredondar4(calculo.base || calculo.valorUnitario),
      descontos: calculo.descontos || null,
      componentes: calculo.componentes || null
    }
  };

  return { ok: true, erros: [], documento };
}
