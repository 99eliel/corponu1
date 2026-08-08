import {
  inteiro,
  normalizar,
  processoCanonico,
  texto
} from "./normalizacao.mjs";
import {
  TIPO_CALCINHA,
  TIPO_SUTIA,
  tipoPecaDoDocumento
} from "./ordens-regras.mjs";

export const SETOR_SUTIA = TIPO_SUTIA;
export const SETOR_CALCINHA = TIPO_CALCINHA;
export const DESTINO_FACCAO = "faccao";
export const DESTINO_CELULA = "celula";
export const PROCESSO_CELULA = "CÉLULA INTERNA";

export const PROCESSOS_FACCAO_POR_SETOR = Object.freeze({
  [SETOR_SUTIA]: Object.freeze([
    "ENCAPAR BOJO",
    "SUTIÃ COMPLETO",
    "SUTIÃ MONTAGEM",
    "ALÇA"
  ]),
  [SETOR_CALCINHA]: Object.freeze([
    "CALCINHA MONTAGEM",
    "CALCINHA COMPLETA"
  ])
});

export function setorManejoCanonico(valor) {
  const chave = normalizar(valor);
  if (chave.includes("CALCINHA")) return SETOR_CALCINHA;
  if (chave.includes("SUTIA")) return SETOR_SUTIA;
  if (chave === "CALCINHA") return SETOR_CALCINHA;
  if (chave === "SUTIA") return SETOR_SUTIA;
  return "";
}

export function ordemPertenceAoManejo(ordem, setor) {
  return tipoPecaDoDocumento(ordem) === setorManejoCanonico(setor);
}

function normalizarFasesManejo(manejo = {}) {
  const faseBojo = texto(manejo.faseBojo ?? manejo.fase).toUpperCase();
  const faseLateral = texto(manejo.faseLateral).toUpperCase();
  return {
    ...manejo,
    fase: faseBojo,
    faseBojo,
    faseLateral
  };
}

export function getManejoDaOrdemV2(ordem, setor) {
  if (!ordem) return null;
  const setorCanonico = setorManejoCanonico(setor);
  if (!setorCanonico) return null;

  const atual = ordem.manejosSetores?.[setorCanonico];
  if (atual) return { ...normalizarFasesManejo(atual), setor: setorCanonico };

  // Compatibilidade temporária com documentos antigos cujo manejo principal
  // ficou salvo no campo singular. A antiga "fase" passa a representar Fase Bojo.
  if (setorCanonico === SETOR_SUTIA && ordem.manejo) {
    return {
      ...normalizarFasesManejo(ordem.manejo),
      setor: setorCanonico,
      origemLegada: true
    };
  }

  return null;
}

export function dadosObrigatoriosMovimentacao(manejo = {}) {
  const silkNome = texto(manejo.silkNome || manejo.silk).toUpperCase();
  const silkData = texto(manejo.silkData || manejo.dataSilk);
  const tecidoNome = texto(manejo.tecidoNome || manejo.tecido).toUpperCase();
  const dataTecido = texto(manejo.dataTecido);

  return {
    silkNome,
    silkData,
    tecidoNome,
    dataTecido,
    silkPreenchido: Boolean(silkNome || silkData),
    tecidoPreenchido: Boolean(dataTecido)
  };
}

export function validarManejoParaMovimentacao(manejo = {}) {
  const dados = dadosObrigatoriosMovimentacao(manejo);
  const erros = [];
  if (!dados.silkPreenchido) erros.push("SILK_NAO_INFORMADO");
  if (!dados.tecidoPreenchido) erros.push("DATA_TECIDO_NAO_INFORMADA");
  return { ok: erros.length === 0, erros, dados };
}

export function validarEntradaManejo({ ordem, setor, entrada = {} } = {}) {
  const erros = [];
  const setorCanonico = setorManejoCanonico(setor);
  if (!setorCanonico) erros.push("SETOR_INVALIDO");
  if (!ordem?.id) erros.push("OP_NAO_ENCONTRADA");
  if (ordem?.id && setorCanonico && !ordemPertenceAoManejo(ordem, setorCanonico)) {
    erros.push("OP_NAO_PERTENCE_AO_SETOR");
  }

  // Compatibilidade: a antiga entrada.fase continua aceita e passa a ser Fase Bojo.
  const faseBojo = texto(entrada.faseBojo ?? entrada.fase).toUpperCase();
  const faseLateral = texto(entrada.faseLateral).toUpperCase();
  if (!faseBojo) erros.push("FASE_NAO_INFORMADA");

  const falta = inteiro(entrada.falta);
  const quantidadeOP = inteiro(ordem?.quantidade);
  if (quantidadeOP > 0 && falta > quantidadeOP) erros.push("FALTA_MAIOR_QUE_OP");

  return {
    ok: erros.length === 0,
    erros,
    dados: {
      setor: setorCanonico,
      fase: faseBojo,
      faseBojo,
      faseLateral,
      silkNome: texto(entrada.silkNome || entrada.silk).toUpperCase(),
      silkData: texto(entrada.silkData),
      tecidoNome: texto(entrada.tecidoNome || entrada.tecido).toUpperCase(),
      dataTecido: texto(entrada.dataTecido),
      faccao: texto(entrada.faccao).toUpperCase(),
      chegada: texto(entrada.chegada),
      falta,
      celu: texto(entrada.celu).toUpperCase(),
      necessidade: texto(entrada.necessidade),
      observacoes: texto(entrada.observacoes)
    }
  };
}

export function criarDadosManejo({ ordem, setor, entrada = {}, anterior = {} } = {}) {
  const validacao = validarEntradaManejo({ ordem, setor, entrada });
  if (!validacao.ok) return { ok: false, erros: validacao.erros, dados: null };

  const d = validacao.dados;
  return {
    ok: true,
    erros: [],
    dados: {
      ...anterior,
      silk: d.silkNome,
      silkNome: d.silkNome,
      silkData: d.silkData,
      tecido: d.tecidoNome,
      tecidoNome: d.tecidoNome,
      dataTecido: d.dataTecido,
      setor: d.setor,
      setorLabel: d.setor === SETOR_CALCINHA ? "Calcinha" : "Sutiã",
      // Mantemos "fase" como alias de compatibilidade. O dado canônico novo é faseBojo.
      fase: d.faseBojo,
      faseBojo: d.faseBojo,
      faseLateral: d.faseLateral,
      faccao: d.faccao,
      chegada: d.chegada,
      falta: d.falta,
      celu: d.celu,
      necessidade: d.necessidade,
      necessidadeTexto: d.necessidade,
      observacoes: d.observacoes,
      coluna: "",
      status: anterior.status === "bipado" ? "bipado" : "organizada"
    }
  };
}

export function processoPermitidoNoManejo(processo, setor, tipoDestino) {
  if (tipoDestino === DESTINO_CELULA) {
    return processoCanonico(processo || PROCESSO_CELULA) === PROCESSO_CELULA;
  }
  if (tipoDestino !== DESTINO_FACCAO) return false;
  const setorCanonico = setorManejoCanonico(setor);
  return (PROCESSOS_FACCAO_POR_SETOR[setorCanonico] || [])
    .includes(processoCanonico(processo));
}

export function validarMovimentacaoManejo({
  ordem,
  setor,
  manejo,
  tipoDestino,
  destino,
  processo,
  quantidade,
  quantidadeMaxima = 0,
  dataEnvio
} = {}) {
  const erros = [];
  const setorCanonico = setorManejoCanonico(setor);
  const tipo = normalizar(tipoDestino).toLowerCase();
  const processoFinal = tipo === DESTINO_CELULA
    ? PROCESSO_CELULA
    : processoCanonico(processo);
  const qtd = inteiro(quantidade);
  const maximo = inteiro(quantidadeMaxima || ordem?.quantidade);

  if (!ordem?.id) erros.push("OP_NAO_ENCONTRADA");
  if (!setorCanonico || !ordemPertenceAoManejo(ordem, setorCanonico)) {
    erros.push("OP_NAO_PERTENCE_AO_SETOR");
  }
  if (![DESTINO_FACCAO, DESTINO_CELULA].includes(tipo)) erros.push("TIPO_DESTINO_INVALIDO");
  if (!texto(destino)) erros.push("DESTINO_NAO_INFORMADO");
  if (!processoPermitidoNoManejo(processoFinal, setorCanonico, tipo)) erros.push("PROCESSO_NAO_PERMITIDO");
  if (qtd <= 0) erros.push("QUANTIDADE_INVALIDA");
  if (maximo > 0 && qtd > maximo) erros.push("QUANTIDADE_MAIOR_QUE_DISPONIVEL");
  if (!texto(dataEnvio)) erros.push("DATA_ENVIO_NAO_INFORMADA");

  const operacional = validarManejoParaMovimentacao(manejo);
  erros.push(...operacional.erros);

  // Regra explícita: Lateral e Bojo NÃO fazem parte da validação de saída.
  // Sutiã Completo pode sair com esses componentes ainda não informados.
  return {
    ok: erros.length === 0,
    erros: [...new Set(erros)],
    dados: {
      setor: setorCanonico,
      tipoDestino: tipo,
      destino: texto(destino).toUpperCase(),
      processo: processoFinal,
      quantidade: qtd,
      quantidadeMaxima: maximo,
      dataEnvio: texto(dataEnvio),
      ...operacional.dados
    }
  };
}

export function criarDadosMovimentacao({
  ordem,
  validacao,
  origem = "manejo",
  movimentacaoOrigemId = "",
  destinoId = ""
} = {}) {
  if (!validacao?.ok) return { ok: false, erros: validacao?.erros || ["MOVIMENTACAO_INVALIDA"], dados: null };
  const d = validacao.dados;

  return {
    ok: true,
    erros: [],
    dados: {
      origem: texto(origem) || "manejo",
      movimentacaoOrigemId: texto(movimentacaoOrigemId),
      opId: ordem.id,
      numeroOP: texto(ordem.numeroOP || ordem.numeroOPExterno || ordem.op),
      referencia: texto(ordem.referencia),
      cor: texto(ordem.cor),
      produtoNome: texto(ordem.produtoNome),
      tipoDestino: d.tipoDestino,
      tipoDestinoLabel: d.tipoDestino === DESTINO_FACCAO ? "Facção" : "Célula",
      destino: d.destino,
      destinoId: texto(destinoId),
      processo: d.processo,
      setor: d.setor,
      setorLabel: d.setor === SETOR_CALCINHA ? "Calcinha" : "Sutiã",
      quantidadeEnviada: d.quantidade,
      dataEnvio: d.dataEnvio,
      dataChegada: "",
      falta: 0,
      quantidadeRecebida: 0,
      status: "em_andamento",
      reenvio: Boolean(texto(movimentacaoOrigemId))
    }
  };
}
