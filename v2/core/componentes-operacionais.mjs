import { inteiro, normalizarReferencia, texto } from "./normalizacao.mjs";

export const COMPONENTES_SUTIA_COMPLETO = Object.freeze([
  "lateral",
  "bojo",
  "fecho",
  "pontoLuz"
]);

function booleanoExplicito(valor) {
  if (valor === true) return true;
  if (valor === false) return false;
  const chave = String(valor ?? "").trim().toLowerCase();
  if (["sim", "true", "1"].includes(chave)) return true;
  if (["nao", "não", "false", "0"].includes(chave)) return false;
  return null;
}

function estadoBase({ pronto, responsavel = "", origem = "", origemLabel = "", quantidadePronta = 0, quantidadeTotal = 0, status = "" } = {}) {
  return {
    informado: true,
    pronto,
    responsavel: texto(responsavel),
    origem: texto(origem),
    origemLabel: texto(origemLabel || origem),
    quantidadePronta: inteiro(quantidadePronta),
    quantidadeTotal: inteiro(quantidadeTotal),
    status: texto(status) || (pronto ? "pronto" : "nao_pronto")
  };
}

function itemConsolidado(fonte, nome) {
  const item = fonte?.componentesConsolidados?.[nome];
  if (!item || item.informado !== true) return null;
  const pronto = booleanoExplicito(item.pronto);
  if (pronto === null) return null;
  return estadoBase({
    pronto,
    responsavel: item.responsavel,
    origem: item.origem || "componentesConsolidados",
    origemLabel: item.origemLabel,
    quantidadePronta: item.quantidadePronta,
    quantidadeTotal: item.quantidadeTotal,
    status: item.status
  });
}

function itemRevisaoAninhada(fonte, nome) {
  const item = fonte?.revisaoComponentesConfeccao?.[nome];
  if (!item || item.informado !== true) return null;
  const pronto = booleanoExplicito(item.pronto ?? item.feito ?? item.valor);
  if (pronto === null) return null;
  return estadoBase({
    pronto,
    responsavel: item.responsavel || item.faccao || item.quemFez,
    origem: item.origem || "revisaoComponentesConfeccao",
    origemLabel: item.origemLabel,
    quantidadePronta: item.quantidadePronta,
    quantidadeTotal: item.quantidadeTotal,
    status: item.status
  });
}

function itemRevisaoLegada(fonte, nome) {
  const revisao = fonte?.revisaoComponentesConfeccao;
  if (!revisao || revisao.ativa !== true) return null;
  if (!["lateral", "bojo"].includes(nome)) return null;

  const prefixo = nome === "lateral" ? "lateral" : "bojo";
  const pronto = booleanoExplicito(revisao[`${prefixo}Feita`] ?? revisao[`${prefixo}Feito`]);
  if (pronto === null) return null;

  return estadoBase({
    pronto,
    responsavel: revisao[`${prefixo}Responsavel`] || revisao[`${prefixo}FeitaPorNome`] || revisao[`${prefixo}FeitoPorNome`],
    origem: "Revisão manual",
    origemLabel: "Revisão manual",
    quantidadePronta: pronto ? fonte?.quantidade : 0,
    quantidadeTotal: fonte?.quantidade,
    status: pronto ? "pronto" : "nao_pronto"
  });
}

function itemRevisao(fonte, nome) {
  return itemRevisaoAninhada(fonte, nome) || itemRevisaoLegada(fonte, nome);
}

const CAMPOS_DIRETOS = Object.freeze({
  lateral: ["lateralPronta", "lateralProntaReenvio"],
  bojo: ["bojoPronto", "bojoProntoReenvio"],
  fecho: ["fechoPronto"],
  pontoLuz: ["pontoLuzPronto"]
});

function itemDireto(fonte, nome) {
  for (const campo of CAMPOS_DIRETOS[nome] || []) {
    const valor = booleanoExplicito(fonte?.[campo]);
    if (valor === null) continue;

    const prefixo = campo.replace(/ProntaReenvio|ProntoReenvio|Pronta|Pronto$/, "");
    const flags = [
      `${campo}Informado`,
      `${prefixo}Informado`,
      `${prefixo}ProntaInformada`,
      `${prefixo}ProntoInformado`,
      `${prefixo}ProntaReenvioInformada`,
      `${prefixo}ProntoReenvioInformado`
    ];
    if (!flags.some(flag => fonte?.[flag] === true)) continue;

    return estadoBase({
      pronto: valor,
      responsavel: fonte?.[`${prefixo}Responsavel`] || fonte?.[`${prefixo}Faccao`] || fonte?.[`${prefixo}QuemFez`],
      origem: `campo:${campo}`,
      quantidadePronta: valor ? fonte?.quantidade : 0,
      quantidadeTotal: fonte?.quantidade
    });
  }
  return null;
}

function encontrarEmFonte(fonte, nome) {
  if (!fonte) return null;
  return itemConsolidado(fonte, nome) || itemRevisao(fonte, nome) || itemDireto(fonte, nome);
}

export function estadoComponentesOperacionais({ movimentacao = null, ordem = null } = {}) {
  return Object.fromEntries(COMPONENTES_SUTIA_COMPLETO.map(nome => {
    const item = encontrarEmFonte(movimentacao, nome) || encontrarEmFonte(ordem, nome);
    return [nome, item || {
      informado: false,
      pronto: null,
      responsavel: "",
      origem: "",
      origemLabel: "",
      quantidadePronta: 0,
      quantidadeTotal: 0,
      status: "nao_informado"
    }];
  }));
}

export function componentesFaltantesOperacionais({
  movimentacao = null,
  ordem = null,
  referenciaEspecial = "912"
} = {}) {
  const referencia = normalizarReferencia(movimentacao?.referencia || ordem?.referencia);
  if (referencia && referencia === normalizarReferencia(referenciaEspecial)) return [];

  const estado = estadoComponentesOperacionais({ movimentacao, ordem });
  return COMPONENTES_SUTIA_COMPLETO.filter(nome => estado[nome].informado !== true);
}

export function componentesParaPatch({
  movimentacao = null,
  ordem = null,
  respostas = {},
  referenciaEspecial = "912"
} = {}) {
  const estado = estadoComponentesOperacionais({ movimentacao, ordem });
  const faltantes = componentesFaltantesOperacionais({ movimentacao, ordem, referenciaEspecial });
  const resultado = {};

  for (const nome of COMPONENTES_SUTIA_COMPLETO) {
    if (estado[nome].informado === true || !faltantes.includes(nome)) continue;
    const valor = booleanoExplicito(respostas[nome]);
    if (valor === null) continue;
    resultado[nome] = valor;
    const responsavel = texto(respostas[`${nome}Responsavel`]);
    if (responsavel) resultado[`${nome}Responsavel`] = responsavel;
  }

  return resultado;
}
