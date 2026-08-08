import test from "node:test";
import assert from "node:assert/strict";

import {
  componentesFaltantesOperacionais,
  componentesParaPatch,
  estadoComponentesOperacionais
} from "../core/componentes-operacionais.mjs";

test("componentes consolidados informados são reutilizados", () => {
  const estado = estadoComponentesOperacionais({
    movimentacao: {
      componentesConsolidados: {
        lateral: { informado: true, pronto: true, responsavel: "MARIA" },
        bojo: { informado: true, pronto: false }
      }
    }
  });

  assert.equal(estado.lateral.informado, true);
  assert.equal(estado.lateral.pronto, true);
  assert.equal(estado.lateral.responsavel, "MARIA");
  assert.equal(estado.bojo.informado, true);
  assert.equal(estado.bojo.pronto, false);
  assert.equal(estado.fecho.informado, false);
});

test("false só é considerado conhecido quando existe flag informado", () => {
  const semFlag = estadoComponentesOperacionais({
    ordem: { lateralPronta: false }
  });
  assert.equal(semFlag.lateral.informado, false);

  const comFlag = estadoComponentesOperacionais({
    ordem: { lateralPronta: false, lateralProntaInformada: true }
  });
  assert.equal(comFlag.lateral.informado, true);
  assert.equal(comFlag.lateral.pronto, false);
});

test("dados da movimentação têm prioridade sobre dados antigos da OP", () => {
  const estado = estadoComponentesOperacionais({
    movimentacao: {
      componentesConsolidados: {
        lateral: { informado: true, pronto: false, origem: "mov" }
      }
    },
    ordem: {
      componentesConsolidados: {
        lateral: { informado: true, pronto: true, origem: "op" }
      }
    }
  });

  assert.equal(estado.lateral.pronto, false);
  assert.equal(estado.lateral.origem, "mov");
});

test("faltantes retornam somente componentes realmente desconhecidos", () => {
  const faltantes = componentesFaltantesOperacionais({
    movimentacao: {
      referencia: "414",
      componentesConsolidados: {
        lateral: { informado: true, pronto: true },
        fecho: { informado: true, pronto: false }
      }
    }
  });

  assert.deepEqual(faltantes, ["bojo", "pontoLuz"]);
});

test("referência especial não exige perguntas operacionais adicionais", () => {
  const faltantes = componentesFaltantesOperacionais({
    movimentacao: { referencia: "912" },
    referenciaEspecial: "912"
  });
  assert.deepEqual(faltantes, []);
});

test("respostas para patch incluem somente faltantes e nunca sobrescrevem conhecidos", () => {
  const patch = componentesParaPatch({
    movimentacao: {
      referencia: "414",
      componentesConsolidados: {
        lateral: { informado: true, pronto: true }
      }
    },
    respostas: {
      lateral: false,
      bojo: true,
      bojoResponsavel: "ANA",
      fecho: false,
      pontoLuz: true
    }
  });

  assert.equal("lateral" in patch, false);
  assert.equal(patch.bojo, true);
  assert.equal(patch.bojoResponsavel, "ANA");
  assert.equal(patch.fecho, false);
  assert.equal(patch.pontoLuz, true);
});

test("resposta ausente permanece ausente, nunca vira false", () => {
  const patch = componentesParaPatch({
    movimentacao: { referencia: "414" },
    respostas: { lateral: "", bojo: null }
  });
  assert.deepEqual(patch, {});
});
