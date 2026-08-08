import test from "node:test";
import assert from "node:assert/strict";

import {
  TIPO_CALCINHA,
  TIPO_SUTIA,
  analisarDuplicidadeOrdem,
  criarDadosOrdem,
  criarIdNovaOrdem,
  tipoPecaDoDocumento,
  validarEntradaOrdem
} from "../core/ordens-regras.mjs";

const PRODUTO_SUTIA = Object.freeze({
  id: "414",
  referencia: "414",
  nome: "Sutiã 414",
  tipoPeca: "sutia",
  possuiAlca: true,
  possuiBojo: true,
  possuiRenda: false
});

const PRODUTO_CALCINHA = Object.freeze({
  id: "calcinha-414",
  referencia: "414",
  nome: "Calcinha 414",
  tipoPeca: "calcinha"
});

function entradaBase(tipoPeca) {
  return {
    tipoPeca,
    numeroOP: "58193",
    referencia: "414",
    cor: "PRETO",
    quantidade: 500,
    necessidadeTexto: "",
    observacoes: ""
  };
}

test("Sutiã exige apenas OP, referência, cor e quantidade como campos principais", () => {
  const resultado = validarEntradaOrdem(entradaBase(TIPO_SUTIA));
  assert.equal(resultado.ok, true);
  assert.equal(resultado.dados.necessidadeTextoLivre, "");
});

test("Calcinha aceita necessidade, serviço e facção vazios", () => {
  const resultado = validarEntradaOrdem({
    ...entradaBase(TIPO_CALCINHA),
    processoPlanejado: "",
    faccaoPlanejada: ""
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.dados.processoPlanejado, "");
  assert.equal(resultado.dados.faccaoPlanejada, "");
});

test("Calcinha aceita serviço sem facção para planejamento ainda pendente", () => {
  const resultado = validarEntradaOrdem({
    ...entradaBase(TIPO_CALCINHA),
    processoPlanejado: "CALCINHA COMPLETA",
    faccaoPlanejada: ""
  });

  assert.equal(resultado.ok, true);
});

test("Calcinha não aceita facção sem serviço", () => {
  const resultado = validarEntradaOrdem({
    ...entradaBase(TIPO_CALCINHA),
    processoPlanejado: "",
    faccaoPlanejada: "LORENA"
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("FACCAO_SEM_PROCESSO"));
});

test("Calcinha rejeita processo de Sutiã", () => {
  const resultado = validarEntradaOrdem({
    ...entradaBase(TIPO_CALCINHA),
    processoPlanejado: "SUTIÃ COMPLETO",
    faccaoPlanejada: "DANUBIA"
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("PROCESSO_CALCINHA_INVALIDO"));
});

test("datas de necessidade são opcionais mas respeitam ordem cronológica", () => {
  const vazio = validarEntradaOrdem(entradaBase(TIPO_CALCINHA));
  assert.equal(vazio.ok, true);

  const invalido = validarEntradaOrdem({
    ...entradaBase(TIPO_CALCINHA),
    necessidadeInicio: "2026-08-20",
    necessidadeFim: "2026-08-10"
  });
  assert.equal(invalido.ok, false);
  assert.ok(invalido.erros.includes("NECESSIDADE_DATAS_INVALIDAS"));
});

test("Sutiã copia Alça, Bojo e Renda do Produto e quantidade continua na OP", () => {
  const resultado = criarDadosOrdem({
    entrada: entradaBase(TIPO_SUTIA),
    produto: PRODUTO_SUTIA,
    anoAtual: 2026
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.dados.quantidade, 500);
  assert.equal(resultado.dados.possuiAlca, true);
  assert.equal(resultado.dados.possuiBojo, true);
  assert.equal(resultado.dados.possuiRenda, false);
  assert.equal("quantidade" in PRODUTO_SUTIA, false);
});

test("Calcinha não herda componentes e marca planejamento pendente quando vazio", () => {
  const resultado = criarDadosOrdem({
    entrada: entradaBase(TIPO_CALCINHA),
    produto: PRODUTO_CALCINHA,
    anoAtual: 2026
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.dados.tipoPeca, "calcinha");
  assert.equal(resultado.dados.possuiAlca, false);
  assert.equal(resultado.dados.possuiBojo, false);
  assert.equal(resultado.dados.possuiRenda, false);
  assert.equal(resultado.dados.planejamentoCalcinhaPendente, true);
});

test("Calcinha com serviço e facção fica com planejamento completo", () => {
  const resultado = criarDadosOrdem({
    entrada: {
      ...entradaBase(TIPO_CALCINHA),
      processoPlanejado: "CALCINHA COMPLETA",
      faccaoPlanejada: "LORENA"
    },
    produto: PRODUTO_CALCINHA
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.dados.planejamentoCalcinhaPendente, false);
  assert.equal(resultado.dados.processoPlanejado, "CALCINHA COMPLETA");
  assert.equal(resultado.dados.faccaoPlanejada, "LORENA");
});

test("necessidade livre tem prioridade sobre datas e pode ficar vazia", () => {
  const livre = criarDadosOrdem({
    entrada: {
      ...entradaBase(TIPO_CALCINHA),
      necessidadeTexto: "URGENTE",
      necessidadeInicio: "2026-08-10",
      necessidadeFim: "2026-08-20"
    },
    produto: PRODUTO_CALCINHA
  });
  assert.equal(livre.dados.necessidade, "URGENTE");

  const vazio = criarDadosOrdem({
    entrada: entradaBase(TIPO_SUTIA),
    produto: PRODUTO_SUTIA
  });
  assert.equal(vazio.dados.necessidade, "");
  assert.equal(vazio.dados.necessidadeManual, false);
});

test("IDs novos são determinísticos e separam legado de Calcinha", () => {
  assert.equal(criarIdNovaOrdem("58193", TIPO_SUTIA), "op-58193");
  assert.equal(criarIdNovaOrdem("58193", TIPO_CALCINHA), "calcinha-58193");
});

test("tipo explícito elimina inferência ambígua nas novas OPs", () => {
  assert.equal(tipoPecaDoDocumento({ id: "x", tipoPeca: "calcinha" }), TIPO_CALCINHA);
  assert.equal(tipoPecaDoDocumento({ id: "x", tipoPeca: "sutia" }), TIPO_SUTIA);
  assert.equal(tipoPecaDoDocumento({ id: "calcinha-1" }), TIPO_CALCINHA);
});

test("duplicidade do mesmo tipo é bloqueada", () => {
  const resultado = analisarDuplicidadeOrdem({
    tipoPeca: TIPO_CALCINHA,
    encontradas: [{ id: "calcinha-58193", numeroOP: "58193", tipoPeca: "calcinha" }]
  });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.acao, "DUPLICADA_MESMO_TIPO");
  assert.ok(resultado.erros.includes("OP_DUPLICADA"));
});

test("uma única OP legada como Sutiã pode ser corrigida para Calcinha", () => {
  const resultado = analisarDuplicidadeOrdem({
    tipoPeca: TIPO_CALCINHA,
    encontradas: [{ id: "58193", numeroOP: "58193", tipoPeca: "sutia" }]
  });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.acao, "PODE_CORRIGIR_TIPO");
  assert.equal(resultado.conflito.id, "58193");
});

test("múltiplos conflitos nunca são corrigidos automaticamente", () => {
  const resultado = analisarDuplicidadeOrdem({
    tipoPeca: TIPO_CALCINHA,
    encontradas: [
      { id: "a", numeroOP: "58193", tipoPeca: "sutia" },
      { id: "b", numeroOP: "58193", tipoPeca: "sutia" }
    ]
  });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.acao, "CONFLITO_MULTIPLO");
});
