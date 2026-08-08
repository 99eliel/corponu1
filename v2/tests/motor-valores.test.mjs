import test from "node:test";
import assert from "node:assert/strict";

import { MotorValoresV2, componentesFinanceirosDaOP } from "../core/motor-valores.mjs";

function criarRepo({
  valores = {},
  configuracao = {
    referenciaEspecial: "912",
    valorBaseGeral: 5.5,
    valorBaseReferenciaEspecial: 6.5,
    descontoFechoNaoFeito: 0.25,
    descontoPontoLuzNaoFeito: 0.15
  },
  componentes = { lateral: 0.35, bojo: 0.7 }
} = {}) {
  const chamadas = [];
  return {
    chamadas,
    async buscarValorUnitario(referencia, processo) {
      chamadas.push(["valor", referencia, processo]);
      return valores[`${referencia}|${processo}`] ?? 0;
    },
    async buscarConfiguracaoSutiaCompleto() {
      chamadas.push(["config"]);
      return { ...configuracao };
    },
    async buscarValoresComponentes(referencia) {
      chamadas.push(["componentes", referencia]);
      return { ...componentes };
    }
  };
}

function opBase(extra = {}) {
  return {
    id: "op-58193",
    numeroOP: "58193",
    referencia: "414",
    cor: "PRETO",
    quantidade: 500,
    tipoPeca: "sutia",
    status: "aberta",
    ...extra
  };
}

test("ALÇA usa somente preço do processo e não depende de possuiAlca na OP", async () => {
  const repo = criarRepo({ valores: { "414|ALÇA": 0.42 } });
  const motor = new MotorValoresV2({ valoresRepo: repo });

  const resultado = await motor.calcular({
    op: opBase(),
    processo: "ALÇA",
    quantidade: 500
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.valorUnitario, 0.42);
  assert.equal(resultado.total, 210);
  assert.deepEqual(repo.chamadas, [["valor", "414", "ALÇA"]]);
});

test("ENCAPAR BOJO continua sendo processo próprio sem possuiBojo na OP", async () => {
  const repo = criarRepo({ valores: { "414|ENCAPAR BOJO": 0.7 } });
  const motor = new MotorValoresV2({ valoresRepo: repo });

  const resultado = await motor.calcular({
    op: opBase(),
    processo: "ENCAPAR BOJO",
    quantidade: 300
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.valorUnitario, 0.7);
  assert.equal(resultado.total, 210);
});

test("Sutiã Completo usa componentes consolidados da própria OP quando não há resposta nova", async () => {
  const repo = criarRepo();
  const motor = new MotorValoresV2({ valoresRepo: repo });
  const op = opBase({
    componentesConsolidados: {
      lateral: { informado: true, pronto: true, responsavel: "LIVIA" },
      bojo: { informado: true, pronto: false }
    },
    fechoPronto: true,
    fechoInformado: true,
    pontoLuzPronto: true,
    pontoLuzInformado: true
  });

  const resultado = await motor.calcular({
    op,
    processo: "SUTIÃ COMPLETO",
    quantidade: 500
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.descontos.lateral, 0.35);
  assert.equal(resultado.descontos.bojo, 0);
  assert.equal(resultado.valorUnitario, 5.15);
  assert.equal(resultado.total, 2575);
  assert.equal(repo.chamadas.filter(item => item[0] === "componentes").length, 1);
});

test("resposta explícita do fechamento só sobrescreve o componente informado naquele momento", () => {
  const resolvidos = componentesFinanceirosDaOP({
    componentes: {
      lateral: { informado: true, pronto: true },
      bojo: { informado: true, pronto: false },
      fecho: { informado: false, pronto: null },
      pontoLuz: { informado: true, pronto: true }
    }
  }, {
    fecho: false
  });

  assert.deepEqual(resolvidos, {
    lateral: true,
    bojo: false,
    fecho: false,
    pontoLuz: true
  });
});

test("referência especial 912 usa valor especial e não consulta preços de Lateral/Bojo", async () => {
  const repo = criarRepo();
  const motor = new MotorValoresV2({ valoresRepo: repo });

  const resultado = await motor.calcular({
    op: opBase({ numeroOP: "57399", referencia: "912", quantidade: 252 }),
    processo: "SUTIÃ COMPLETO",
    quantidade: 252
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.especial, true);
  assert.equal(resultado.valorUnitario, 6.5);
  assert.equal(resultado.total, 1638);
  assert.deepEqual(resultado.descontos, {
    lateral: 0,
    bojo: 0,
    fecho: 0,
    pontoLuz: 0
  });
  assert.equal(repo.chamadas.filter(item => item[0] === "componentes").length, 0);
});

test("sem valor-base configurado o motor falha sem consultar preços de componentes", async () => {
  const repo = criarRepo({
    configuracao: {
      referenciaEspecial: "912",
      valorBaseGeral: 0,
      valorBaseReferenciaEspecial: 0,
      descontoFechoNaoFeito: 0,
      descontoPontoLuzNaoFeito: 0
    }
  });
  const motor = new MotorValoresV2({ valoresRepo: repo });

  const resultado = await motor.calcular({
    op: opBase(),
    processo: "SUTIÃ COMPLETO",
    quantidade: 500,
    componentes: { lateral: false, bojo: false, fecho: true, pontoLuz: true }
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("VALOR_BASE_NAO_CONFIGURADO"));
  assert.equal(repo.chamadas.filter(item => item[0] === "componentes").length, 0);
});
