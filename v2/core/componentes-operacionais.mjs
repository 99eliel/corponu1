import { normalizarReferencia, texto } from "./normalizacao.mjs";

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

function itemConsolidado(fonte, nome) {
  const item = fonte?.componentesConsolidados?.[nome];
  if (!item || item.informado !== true) return null;
  const pronto = booleanoExplicito(item.pronto);
  if (pronto === null) return null;
  return {
    informado: true,
    pronto,
    responsavel: texto(item.responsavel),
    origem: texto(item.origem) || "componentesConsolidados"
  };
}

function itemRevisao(fonte, nome) {
  const item = fonte?.revisaoComponentesConfeccao?.[nome];
  if (!item || item.informado !== true) return null;
  const pronto = booleanoExplicito(item.pronto ?? item.feito ?? item.valor);
  if (pronto === null) return null;
  return {
    informado: true,
    pronto,
    responsavel: texto(item.responsavel || item.faccao || item.quemFez),
    origem: texto(item.origem) || "revisaoComponentesConfeccao"
  };
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

    return {
      informado: true,
      pronto: valor,
      responsavel: texto(
        fonte?.[`${prefixo}Responsavel`] ||
        fonte?.[`${prefixo}Faccao`] ||
        fonte?.[`${prefixo}QuemFez`]
      ),
      origem: `campo:${campo}`
    };
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
    return [nome, item || { informado: false, pronto: null, responsavel: "", origem: "" }];
  }));
}

export function componentesFaltantesOperacionais({
  movimentacao = null,
  ordem = null,
  referenciaEspecial = "912"
} = {}) {
  const referencia = normalizarReferencia(
    movimentacao?.referencia || ordem?.referencia
  );
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
  const faltantes = componentesFaltantesOperacionais({
    movimentacao,
    ordem,
    referenciaEspecial
  });
  const resultado = {};

  for (const nome of COMPONENTES_SUTIA_COMPLETO) {
    if (estado[nome].informado === true) continue;
    if (!faltantes.includes(nome)) continue;
    const valor = booleanoExplicito(respostas[nome]);
    if (valor === null) continue;
    resultado[nome] = valor;
    const responsavel = texto(respostas[`${nome}Responsavel`]);
    if (responsavel) resultado[`${nome}Responsavel`] = responsavel;
  }

  return resultado;
}
