import { texto } from "./normalizacao.mjs";
import { tipoPecaDoDocumento, TIPO_CALCINHA, TIPO_SUTIA } from "./ordens-regras.mjs";
import { getManejoDaOrdemV2 } from "./manejo-regras.mjs";
import { estadoComponentesOperacionais } from "./componentes-operacionais.mjs";
import { criarContratoOPV2, VERSAO_CONTRATO_OP_V2 } from "./op-contrato.mjs";

function numeroOPLegado(ordem = {}) {
  return texto(ordem.numeroOP || ordem.numeroOPExterno || ordem.op || ordem.codigoOP);
}

function necessidadeLegada(ordem = {}) {
  return {
    texto: texto(ordem.necessidadeTexto || ordem.necessidade || ordem.necessidadeOriginal),
    inicio: texto(ordem.necessidadeInicio),
    fim: texto(ordem.necessidadeFim)
  };
}

function manejoContrato(ordem, tipoPeca) {
  const manejo = getManejoDaOrdemV2(ordem, tipoPeca);
  if (!manejo) return null;

  return {
    setor: tipoPeca,
    silk: texto(manejo.silkNome || manejo.silk).toUpperCase(),
    dataSilk: texto(manejo.silkData || manejo.dataSilk),
    tecido: texto(manejo.tecidoNome || manejo.tecido).toUpperCase(),
    dataTecido: texto(manejo.dataTecido),
    faseBojo: texto(manejo.faseBojo ?? manejo.fase).toUpperCase(),
    faseLateral: texto(manejo.faseLateral).toUpperCase(),
    necessidadeTexto: texto(manejo.necessidadeTexto || manejo.necessidade),
    status: texto(manejo.status)
  };
}

function planejamentoCalcinhaContrato(ordem = {}, tipoPeca = "") {
  if (tipoPeca !== TIPO_CALCINHA) return null;
  return {
    linha: texto(ordem.linhaCalcinha),
    processo: texto(ordem.processoPlanejado),
    faccao: texto(ordem.faccaoPlanejada),
    pendente: ordem.planejamentoCalcinhaPendente === true
  };
}

export function normalizarOPLegada(ordem = {}) {
  if (ordem?.versaoContrato === VERSAO_CONTRATO_OP_V2) {
    return criarContratoOPV2(ordem);
  }

  const tipoPeca = tipoPecaDoDocumento(ordem);
  const numeroOP = numeroOPLegado(ordem);
  const componentes = tipoPeca === TIPO_SUTIA
    ? estadoComponentesOperacionais({ ordem })
    : undefined;

  return criarContratoOPV2({
    id: texto(ordem.id || ordem.docId || numeroOP),
    numeroOP,
    referencia: texto(ordem.referencia || ordem.referenciaBusca),
    cor: texto(ordem.cor || ordem.corBusca),
    quantidade: ordem.quantidade,
    tipoPeca,
    status: texto(ordem.status) || "aberta",
    produtoNome: texto(ordem.produtoNome || ordem.nome),
    ano: ordem.ano,
    necessidade: necessidadeLegada(ordem),
    observacoes: texto(ordem.observacoes || ordem.observacao),
    manejo: manejoContrato(ordem, tipoPeca),
    componentes,
    planejamentoCalcinha: planejamentoCalcinhaContrato(ordem, tipoPeca)
  });
}

export function normalizarListaOPsLegadas(ordens = []) {
  return (ordens || []).map(normalizarOPLegada);
}
