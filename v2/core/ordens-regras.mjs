import {
  inteiro,
  normalizar,
  processoCanonico,
  slugSeguro,
  texto
} from "./normalizacao.mjs";

export const TIPO_SUTIA = "sutia";
export const TIPO_CALCINHA = "calcinha";

export const PROCESSOS_CALCINHA = Object.freeze([
  "CALCINHA MONTAGEM",
  "CALCINHA COMPLETA"
]);

export function tipoPecaCanonico(valor) {
  const chave = normalizar(valor);
  if (chave.includes("CALCINHA")) return TIPO_CALCINHA;
  if (chave.includes("SUTIA")) return TIPO_SUTIA;
  if (chave === TIPO_CALCINHA.toUpperCase()) return TIPO_CALCINHA;
  if (chave === TIPO_SUTIA.toUpperCase()) return TIPO_SUTIA;
  return "";
}

export function tipoPecaDoDocumento(dados = {}) {
  const explicito = tipoPecaCanonico(
    dados.tipoPeca || dados.tipoPecaPadrao || dados.tipoPecaLabel || dados.setor || dados.setorLabel
  );
  if (explicito) return explicito;

  const processo = normalizar(dados.processoPlanejado || dados.processo || dados.servicoNome);
  if (processo.includes("CALCINHA")) return TIPO_CALCINHA;

  const id = normalizar(dados.id);
  if (id.startsWith("CALCINHA-")) return TIPO_CALCINHA;

  return TIPO_SUTIA;
}

export function ordemAtiva(ordem = {}) {
  if (!ordem) return false;
  if (ordem.excluida === true || ordem.excluido === true) return false;
  const status = normalizar(ordem.status);
  return !["EXCLUIDA", "EXCLUIDO", "CANCELADA", "CANCELADO"].includes(status);
}

function dataBR(iso) {
  const match = texto(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function normalizarProcessoCalcinha(valor) {
  if (!texto(valor)) return "";
  return processoCanonico(valor);
}

export function validarEntradaOrdem(entrada = {}) {
  const erros = [];
  const tipo = tipoPecaCanonico(entrada.tipoPeca);
  const numeroOP = normalizar(entrada.numeroOP);
  const referencia = normalizar(entrada.referencia);
  const cor = normalizar(entrada.cor);
  const quantidade = inteiro(entrada.quantidade);
  const necessidadeInicio = texto(entrada.necessidadeInicio);
  const necessidadeFim = texto(entrada.necessidadeFim);
  const processoPlanejado = normalizarProcessoCalcinha(entrada.processoPlanejado);
  const faccaoPlanejada = texto(entrada.faccaoPlanejada);

  if (![TIPO_SUTIA, TIPO_CALCINHA].includes(tipo)) erros.push("TIPO_PECA_INVALIDO");
  if (!numeroOP) erros.push("OP_NAO_INFORMADA");
  if (!referencia) erros.push("REFERENCIA_NAO_INFORMADA");
  if (!cor) erros.push("COR_NAO_INFORMADA");
  if (quantidade <= 0) erros.push("QUANTIDADE_INVALIDA");

  if (necessidadeInicio && necessidadeFim && necessidadeInicio > necessidadeFim) {
    erros.push("NECESSIDADE_DATAS_INVALIDAS");
  }

  if (tipo === TIPO_CALCINHA) {
    if (processoPlanejado && !PROCESSOS_CALCINHA.includes(processoPlanejado)) {
      erros.push("PROCESSO_CALCINHA_INVALIDO");
    }
    if (!processoPlanejado && faccaoPlanejada) {
      erros.push("FACCAO_SEM_PROCESSO");
    }
  }

  return {
    ok: erros.length === 0,
    erros,
    dados: {
      tipoPeca: tipo,
      numeroOP,
      referencia,
      cor,
      quantidade,
      necessidadeTextoLivre: texto(entrada.necessidadeTexto),
      necessidadeInicio,
      necessidadeFim,
      processoPlanejado: tipo === TIPO_CALCINHA ? processoPlanejado : "",
      faccaoPlanejada: tipo === TIPO_CALCINHA && processoPlanejado ? faccaoPlanejada : "",
      observacoes: texto(entrada.observacoes)
    }
  };
}

export function criarIdNovaOrdem(numeroOP, tipoPeca) {
  const slug = slugSeguro(numeroOP);
  return tipoPecaCanonico(tipoPeca) === TIPO_CALCINHA
    ? `calcinha-${slug}`
    : `op-${slug}`;
}

function necessidadeDaEntrada(dados) {
  const necessidadeDatas = dados.necessidadeInicio && dados.necessidadeFim
    ? `${dataBR(dados.necessidadeInicio)} a ${dataBR(dados.necessidadeFim)}`
    : dataBR(dados.necessidadeInicio || dados.necessidadeFim);

  return dados.necessidadeTextoLivre || necessidadeDatas || "";
}

export function criarDadosOrdem({ entrada, produto, anterior = {}, anoAtual = new Date().getFullYear() }) {
  const validacao = validarEntradaOrdem(entrada);
  if (!validacao.ok) return { ok: false, erros: validacao.erros, dados: null };
  if (!produto) return { ok: false, erros: ["PRODUTO_NAO_ENCONTRADO"], dados: null };

  const dados = validacao.dados;
  const necessidadeTexto = necessidadeDaEntrada(dados);
  const calcinha = dados.tipoPeca === TIPO_CALCINHA;
  const planejamentoCompleto = calcinha &&
    PROCESSOS_CALCINHA.includes(dados.processoPlanejado) &&
    Boolean(dados.faccaoPlanejada);

  const documento = {
    numeroOP: dados.numeroOP,
    referencia: dados.referencia,
    cor: dados.cor,
    produtoNome: texto(produto.nome) || (calcinha
      ? `Calcinha Ref. ${dados.referencia}`
      : `Referência ${dados.referencia}`),
    quantidade: dados.quantidade,
    ano: Number((dados.necessidadeInicio || dados.necessidadeFim).slice(0, 4)) || Number(anterior.ano) || anoAtual,
    necessidadeInicio: dados.necessidadeInicio,
    necessidadeFim: dados.necessidadeFim,
    necessidade: necessidadeTexto,
    necessidadeTexto,
    necessidadeManual: Boolean(necessidadeTexto),
    observacoes: dados.observacoes,
    tipoPeca: dados.tipoPeca,
    tipoPecaPadrao: dados.tipoPeca,
    tipoPecaLabel: calcinha ? "Calcinha" : "Sutiã",
    setor: dados.tipoPeca,
    status: anterior.status || "aberta"
  };

  // A OP não armazena mais Alça, Bojo ou Renda.
  // Componentes/processos são resolvidos em seus próprios fluxos operacionais/financeiros.
  if (calcinha) {
    Object.assign(documento, {
      linhaCalcinha: anterior.linhaCalcinha || "",
      processoPlanejado: dados.processoPlanejado,
      faccaoPlanejada: dados.faccaoPlanejada,
      planejamentoCalcinhaPendente: !planejamentoCompleto,
      identidadeCalcinhaConfirmada: true,
      identidadeCalcinhaVersao: "v2"
    });
  } else {
    Object.assign(documento, {
      semana: anterior.semana || "",
      mes: anterior.mes || "",
      processoPlanejado: "",
      faccaoPlanejada: "",
      planejamentoCalcinhaPendente: false
    });
  }

  return { ok: true, erros: [], dados: documento };
}

export function analisarDuplicidadeOrdem({
  tipoPeca,
  currentId = "",
  encontradas = []
} = {}) {
  const tipo = tipoPecaCanonico(tipoPeca);
  const atuais = (encontradas || []).filter(ordem =>
    ordemAtiva(ordem) && String(ordem.id) !== String(currentId || "")
  );

  if (!atuais.length) {
    return { ok: true, acao: "CRIAR_OU_EDITAR", conflito: null, erros: [] };
  }

  const mesmoTipo = atuais.filter(ordem => tipoPecaDoDocumento(ordem) === tipo);
  const outroTipo = atuais.filter(ordem => tipoPecaDoDocumento(ordem) !== tipo);

  if (mesmoTipo.length) {
    return {
      ok: false,
      acao: "DUPLICADA_MESMO_TIPO",
      conflito: mesmoTipo[0],
      erros: ["OP_DUPLICADA"]
    };
  }

  if (tipo === TIPO_CALCINHA && outroTipo.length === 1 && atuais.length === 1) {
    return {
      ok: false,
      acao: "PODE_CORRIGIR_TIPO",
      conflito: outroTipo[0],
      erros: ["OP_CONFLITO_TIPO"]
    };
  }

  return {
    ok: false,
    acao: "CONFLITO_MULTIPLO",
    conflito: outroTipo[0] || atuais[0],
    erros: ["OP_CONFLITO_MULTIPLO"]
  };
}
