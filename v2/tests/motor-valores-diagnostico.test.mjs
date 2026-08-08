import test from "node:test";
import assert from "node:assert/strict";

import { MotorValoresV2 } from "../core/motor-valores.mjs";

function repoFake() {
  const chamadas = [];
  return {
    chamadas,
    async buscarValorUnitario() {
      chamadas.push("valor");
      return 1;
    },
    async buscarConfiguracaoSutiaCompleto() {
      chamadas.push("config");
      return {
        referenciaEspecial: "912",
        valorBaseGeral: 5.5,
        valorBaseReferenciaEspecial: 6.5,
        descontoFechoNaoFeito: 0.25,
        descontoPontoLuzNaoFeito: 0.15
      };
    },
    async buscarValoresComponentes() {
      chamadas.push("componentes");
      return { lateral: 0.35, bojo: 0.7 };
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
    ...extra
  };
}

test("diagnóstico de Sutiã Completo pergunta somente Fecho e Ponto de Luz quando Lateral e Bojo já são conhecidos", async () => {
  const repo = repoFake();
  const motor = new MotorValoresV2({ valoresRepo: repo });
  const op = opBase({
    componentesConsolidados: {
      lateral: { informado: true, pronto: true, responsavel: "LIVIA" },
      bojo: { informado: true, pronto: false, responsavel: "" }
    }
  });

  const resultado = await motor.diagnosticarComponentes({
    op,
    processo: "SUTIÃ COMPLETO"
  });

  assert.equal(resultado.especial, false);
  assert.equal(resultado.exigeConferencia, true);
  assert.deepEqual(resultado.faltantes, ["fecho", "pontoLuz"]);
  assert.deepEqual(resultado.conhecidos, { lateral: true, bojo: false });
  assert.deepEqual(repo.chamadas, ["config"]);
});

test("diagnóstico da referência 912 não pede componentes", async () => {
  const repo = repoFake();
  const motor = new MotorValoresV2({ valoresRepo: repo });

  const resultado = await motor.diagnosticarComponentes({
    op: opBase({ referencia: "912" }),
    processo: "SUTIÃ COMPLETO"
  });

  assert.equal(resultado.especial, true);
  assert.equal(resultado.exigeConferencia, false);
  assert.deepEqual(resultado.faltantes, []);
  assert.deepEqual(repo.chamadas, ["config"]);
});

test("serviço que não é Sutiã Completo não abre conferência e não consulta configuração", async () => {
  const repo = repoFake();
  const motor = new MotorValoresV2({ valoresRepo: repo });

  const resultado = await motor.diagnosticarComponentes({
    op: opBase(),
    processo: "ALÇA"
  });

  assert.equal(resultado.exigeConferencia, false);
  assert.equal(resultado.especial, false);
  assert.deepEqual(resultado.faltantes, []);
  assert.deepEqual(repo.chamadas, []);
});
