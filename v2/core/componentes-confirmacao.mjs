import { texto } from "./normalizacao.mjs";

function booleanoExplicito(valor) {
  if (valor === true) return true;
  if (valor === false) return false;
  const chave = String(valor ?? "").trim().toLowerCase();
  if (["sim", "true", "1"].includes(chave)) return true;
  if (["nao", "não", "false", "0"].includes(chave)) return false;
  return null;
}

export function validarRespostasComponentes({ faltantes = [], respostas = {} } = {}) {
  const erros = [];
  const dados = {};

  for (const nome of faltantes || []) {
    const valor = booleanoExplicito(respostas[nome]);
    if (valor === null) {
      erros.push(`${nome.toUpperCase()}_NAO_INFORMADO`);
      continue;
    }

    dados[nome] = valor;

    if (["lateral", "bojo"].includes(nome) && valor === true) {
      const responsavel = texto(respostas[`${nome}Responsavel`]);
      if (!responsavel) {
        erros.push(`${nome.toUpperCase()}_SEM_RESPONSAVEL`);
      } else {
        dados[`${nome}Responsavel`] = responsavel;
      }
    }
  }

  return {
    ok: erros.length === 0,
    erros,
    dados
  };
}
