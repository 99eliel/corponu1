import test from "node:test";
import assert from "node:assert/strict";

import {
  calcularPagamentoProcesso,
  calcularSutiaCompleto
} from "../core/financeiro-regras.mjs";

const OP_SEM_FLAGS = Object.freeze({
  id: "op-58193",
  numeroOP: "58193",
  referencia: "414",
  quantidade: 500,
  tipoPeca: "sutia"
});

test("ALÇA continua sendo processo financeiro mesmo sem possuiAlca na OP", () => {
  assert.equal("possuiAlca" in OP_SEM_FLAGS, false);
  const resultado = calcularPagamentoProcesso({
    processo: "ALÇA",
    referencia: OP_SEM_FLAGS.referencia,
    quantidade: 500,
    valorUnitario: 0.18
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.valorUnitario, 0.18);
  assert.equal(resultado.total, 90);
});

test("ENCAPAR BOJO continua sendo processo financeiro mesmo sem possuiBojo na OP", () => {
  assert.equal("possuiBojo" in OP_SEM_FLAGS, false);
  const resultado = calcularPagamentoProcesso({
    processo: "ENCAPAR BOJO",
    referencia: OP_SEM_FLAGS.referencia,
    quantidade: 500,
    valorUnitario: 0.7
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.total, 350);
});

test("Sutiã Completo usa estado operacional de componentes e não flags da OP", () => {
  const resultado = calcularSutiaCompleto({
    referencia: OP_SEM_FLAGS.referencia,
    quantidade: OP_SEM_FLAGS.quantidade,
    componentes: {
      lateral: true,
      bojo: true,
      fecho: true,
      pontoLuz: true
    },
    configuracao: {
      referenciaEspecial: "912",
      valorBaseGeral: 5.5,
      valorBaseReferenciaEspecial: 6.5,
      descontoFechoNaoFeito: 0.25,
      descontoPontoLuzNaoFeito: 0.15
    },
    valoresComponentes: {
      lateral: 0.35,
      bojo: 0.7
    }
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.valorUnitario, 4.45);
});
