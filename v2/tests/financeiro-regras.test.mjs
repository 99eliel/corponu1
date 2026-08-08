import test from "node:test";
import assert from "node:assert/strict";

import {
  calcularPagamentoProcesso,
  calcularSutiaCompleto,
  criarChaveLancamento,
  criarDocumentoFechamento,
  validarLancamentoFinanceiro
} from "../core/financeiro-regras.mjs";
import {
  normalizarCompetencia,
  processoCanonico
} from "../core/normalizacao.mjs";

const CONFIG_SUTIA = Object.freeze({
  referenciaEspecial: "912",
  valorBaseGeral: 5.5,
  valorBaseReferenciaEspecial: 6.5,
  descontoFechoNaoFeito: 0.25,
  descontoPontoLuzNaoFeito: 0.15
});

const OP_BASE = Object.freeze({
  id: "op-58193",
  numeroOP: "58193",
  referencia: "414",
  cor: "PRETO",
  quantidade: 500,
  tipoPeca: "sutia"
});

test("normaliza competência mensal sem depender de data de chegada", () => {
  assert.equal(normalizarCompetencia("08/2026"), "2026-08");
  assert.equal(normalizarCompetencia("2026/8"), "2026-08");
  assert.equal(normalizarCompetencia("2026-13"), "");
});

test("normaliza aliases de processo para um único nome canônico", () => {
  assert.equal(processoCanonico("sutia completo"), "SUTIÃ COMPLETO");
  assert.equal(processoCanonico("alca"), "ALÇA");
  assert.equal(processoCanonico("montagem calcinha"), "CALCINHA MONTAGEM");
});

test("valida fechamento mesmo que a OP não possua chegada registrada", () => {
  const resultado = validarLancamentoFinanceiro({
    op: OP_BASE,
    processo: "SUTIÃ MONTAGEM",
    responsavel: "LIVIA",
    competencia: "2026-08",
    quantidade: 500
  });

  assert.equal(resultado.ok, true);
  assert.deepEqual(resultado.erros, []);
});

test("permite fechamento parcial", () => {
  const resultado = validarLancamentoFinanceiro({
    op: OP_BASE,
    processo: "SUTIÃ MONTAGEM",
    responsavel: "LIVIA",
    competencia: "08/2026",
    quantidade: 180
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.dados.quantidade, 180);
  assert.equal(resultado.dados.quantidadeOP, 500);
});

test("bloqueia quantidade maior que a quantidade da OP", () => {
  const resultado = validarLancamentoFinanceiro({
    op: OP_BASE,
    processo: "SUTIÃ MONTAGEM",
    responsavel: "LIVIA",
    competencia: "2026-08",
    quantidade: 501
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("QUANTIDADE_MAIOR_QUE_OP"));
});

test("Sutiã Completo desconta Lateral e Bojo quando já foram feitos", () => {
  const resultado = calcularSutiaCompleto({
    referencia: "414",
    quantidade: 100,
    componentes: {
      lateral: true,
      bojo: true,
      fecho: true,
      pontoLuz: true
    },
    configuracao: CONFIG_SUTIA,
    valoresComponentes: {
      lateral: 0.35,
      bojo: 0.70
    }
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.descontos.lateral, 0.35);
  assert.equal(resultado.descontos.bojo, 0.70);
  assert.equal(resultado.descontos.fecho, 0);
  assert.equal(resultado.descontos.pontoLuz, 0);
  assert.equal(resultado.valorUnitario, 4.45);
  assert.equal(resultado.total, 445);
});

test("Sutiã Completo aplica descontos fixos de Fecho e Ponto de Luz quando não feitos", () => {
  const resultado = calcularSutiaCompleto({
    referencia: "414",
    quantidade: 100,
    componentes: {
      lateral: false,
      bojo: false,
      fecho: false,
      pontoLuz: false
    },
    configuracao: CONFIG_SUTIA,
    valoresComponentes: {}
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.valorUnitario, 5.10);
  assert.equal(resultado.total, 510);
});

test("Sutiã Completo não transforma componente ausente em não", () => {
  const resultado = calcularSutiaCompleto({
    referencia: "414",
    quantidade: 100,
    componentes: {
      lateral: null,
      bojo: false,
      fecho: true,
      pontoLuz: true
    },
    configuracao: CONFIG_SUTIA,
    valoresComponentes: {}
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("LATERAL_NAO_INFORMADA"));
});

test("Sutiã Completo exige valor de Lateral quando ela já foi feita e será descontada", () => {
  const resultado = calcularSutiaCompleto({
    referencia: "414",
    quantidade: 100,
    componentes: {
      lateral: true,
      bojo: false,
      fecho: true,
      pontoLuz: true
    },
    configuracao: CONFIG_SUTIA,
    valoresComponentes: {
      lateral: 0
    }
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("VALOR_LATERAL_NAO_CADASTRADO"));
});

test("referência especial usa valor integral mesmo sem componentes informados", () => {
  const resultado = calcularSutiaCompleto({
    referencia: "912",
    quantidade: 100,
    componentes: {
      lateral: null,
      bojo: null,
      fecho: null,
      pontoLuz: null
    },
    configuracao: CONFIG_SUTIA,
    valoresComponentes: {}
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.especial, true);
  assert.equal(resultado.valorUnitario, 6.5);
  assert.equal(resultado.total, 650);
  assert.deepEqual(resultado.descontos, {
    lateral: 0,
    bojo: 0,
    fecho: 0,
    pontoLuz: 0
  });
});

test("processo comum usa valor unitário da tabela", () => {
  const resultado = calcularPagamentoProcesso({
    processo: "CALCINHA COMPLETA",
    referencia: "1001",
    quantidade: 250,
    valorUnitario: 0.42
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.valorUnitario, 0.42);
  assert.equal(resultado.total, 105);
});

test("chave financeira é determinada por competência e ocorrência, não por chegada", () => {
  const base = {
    opId: "op-58193",
    numeroOP: "58193",
    processo: "SUTIÃ MONTAGEM",
    responsavel: "LIVIA",
    competencia: "2026-08"
  };

  const primeira = criarChaveLancamento({ ...base, ocorrencia: 1 });
  const repetida = criarChaveLancamento({ ...base, ocorrencia: 1 });
  const retrabalho = criarChaveLancamento({ ...base, ocorrencia: 2 });

  assert.equal(primeira, repetida);
  assert.notEqual(primeira, retrabalho);
  assert.ok(primeira.includes("2026-08"));
});

test("documento V2 não depende de dataChegada nem movimentacaoId", () => {
  const calculo = calcularPagamentoProcesso({
    processo: "SUTIÃ MONTAGEM",
    quantidade: 500,
    valorUnitario: 1.25
  });

  const resultado = criarDocumentoFechamento({
    op: {
      ...OP_BASE,
      dataChegada: "2026-08-08",
      movimentacaoId: "mov-legado-123"
    },
    processo: "SUTIÃ MONTAGEM",
    responsavel: "LIVIA",
    competencia: "2026-07",
    quantidade: 500,
    calculo
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.documento.competencia, "2026-07");
  assert.equal(resultado.documento.origem, "fechamento_financeiro_v2");
  assert.equal("dataChegada" in resultado.documento, false);
  assert.equal("movimentacaoId" in resultado.documento, false);
  assert.equal(resultado.documento.total, 625);
});
