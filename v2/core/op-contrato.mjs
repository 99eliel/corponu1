import { inteiro, texto } from "./normalizacao.mjs";
import { tipoPecaCanonico } from "./ordens-regras.mjs";

export const VERSAO_CONTRATO_OP_V2 = "2026-08-op-v2";
export const CAMPOS_COMPONENTE_OP_V2 = Object.freeze(["lateral", "bojo", "fecho", "pontoLuz"]);

function componenteVazio() {
  return {
    informado: false,
    pronto: null,
    responsavel: "",
    origem: "",
    origemLabel: "",
    quantidadePronta: 0,
    quantidadeTotal: 0,
    status: "nao_informado"
  };
}

export function criarComponentesVaziosOPV2() {
  return Object.fromEntries(CAMPOS_COMPONENTE_OP_V2.map(nome => [nome, componenteVazio()]));
}

export function criarContratoOPV2(dados = {}) {
  const componentesBase = criarComponentesVaziosOPV2();
  const manejo = dados.manejo || null;
  const necessidade = dados.necessidade || {};
  const planejamento = dados.planejamentoCalcinha || null;

  return {
    versaoContrato: VERSAO_CONTRATO_OP_V2,
    id: texto(dados.id),
    numeroOP: texto(dados.numeroOP),
    referencia: texto(dados.referencia).toUpperCase(),
    cor: texto(dados.cor).toUpperCase(),
    quantidade: inteiro(dados.quantidade),
    tipoPeca: tipoPecaCanonico(dados.tipoPeca),
    status: texto(dados.status) || "aberta",
    produtoNome: texto(dados.produtoNome),
    ano: inteiro(dados.ano),
    necessidade: {
      texto: texto(necessidade.texto),
      inicio: texto(necessidade.inicio),
      fim: texto(necessidade.fim)
    },
    observacoes: texto(dados.observacoes),
    manejo: manejo ? {
      setor: texto(manejo.setor),
      silk: texto(manejo.silk),
      dataSilk: texto(manejo.dataSilk),
      tecido: texto(manejo.tecido),
      dataTecido: texto(manejo.dataTecido),
      faseBojo: texto(manejo.faseBojo).toUpperCase(),
      faseLateral: texto(manejo.faseLateral).toUpperCase(),
      necessidadeTexto: texto(manejo.necessidadeTexto),
      status: texto(manejo.status)
    } : null,
    componentes: Object.fromEntries(CAMPOS_COMPONENTE_OP_V2.map(nome => [
      nome,
      { ...componentesBase[nome], ...(dados.componentes?.[nome] || {}) }
    ])),
    planejamentoCalcinha: planejamento ? {
      linha: texto(planejamento.linha),
      processo: texto(planejamento.processo),
      faccao: texto(planejamento.faccao),
      pendente: planejamento.pendente === true
    } : null
  };
}

export function contratoOPV2Valido(op = {}) {
  const erros = [];
  if (op.versaoContrato !== VERSAO_CONTRATO_OP_V2) erros.push("VERSAO_CONTRATO_INVALIDA");
  if (!texto(op.id)) erros.push("ID_NAO_INFORMADO");
  if (!texto(op.numeroOP)) erros.push("OP_NAO_INFORMADA");
  if (!texto(op.referencia)) erros.push("REFERENCIA_NAO_INFORMADA");
  if (!texto(op.cor)) erros.push("COR_NAO_INFORMADA");
  if (inteiro(op.quantidade) <= 0) erros.push("QUANTIDADE_INVALIDA");
  if (!tipoPecaCanonico(op.tipoPeca)) erros.push("TIPO_PECA_INVALIDO");
  return { ok: erros.length === 0, erros };
}
