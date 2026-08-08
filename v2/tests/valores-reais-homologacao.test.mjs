import test from "node:test";
import assert from "node:assert/strict";

import { criarStoreCorpoNu } from "../core/store.mjs";
import { MotorValoresV2 } from "../core/motor-valores.mjs";
import {
  criarRepositoriosLocais,
  dadosIniciaisHomologacao,
  hidratarStoreLocal
} from "../homologacao/local-db.mjs";
import {
  CONFIG_SUTIA_COMPLETO_REAL_HOMOLOGACAO,
  TOTAL_VALORES_REAIS_HOMOLOGACAO,
  VALORES_REAIS_HOMOLOGACAO
} from "../homologacao/valores-reais.mjs";

function achar(processo, referencia) {
  return VALORES_REAIS_HOMOLOGACAO.find(item =>
    item.processo === processo && item.referencia === referencia
  );
}

test("homologação contém os 209 valores do PDF mais ALÇA universal", () => {
  assert.equal(TOTAL_VALORES_REAIS_HOMOLOGACAO, 210);

  const contagem = VALORES_REAIS_HOMOLOGACAO.reduce((mapa, item) => {
    mapa[item.processo] = (mapa[item.processo] || 0) + 1;
    return mapa;
  }, {});

  assert.deepEqual(contagem, {
    "CALCINHA MONTAGEM": 91,
    "CALCINHA COMPLETA": 11,
    "ENCAPAR BOJO": 83,
    "LATERAL": 13,
    "SUTIÃ MONTAGEM": 11,
    "ALÇA": 1
  });
});

test("valores reais críticos são preservados exatamente", () => {
  assert.equal(achar("ALÇA", "TODAS")?.valor, 0.05);
  assert.equal(achar("ENCAPAR BOJO", "414")?.valor, 0.2943);
  assert.equal(achar("ENCAPAR BOJO", "912")?.valor, 0.5);
  assert.equal(achar("LATERAL", "411")?.valor, 0.4);
  assert.equal(achar("SUTIÃ MONTAGEM", "411")?.valor, 0.4);
  assert.equal(achar("CALCINHA COMPLETA", "610")?.valor, 2);
  assert.equal(achar("CALCINHA MONTAGEM", "2060RENDA")?.valor, 0.39);
});

test("configuração real do Sutiã Completo usa os valores atuais informados", () => {
  assert.deepEqual(CONFIG_SUTIA_COMPLETO_REAL_HOMOLOGACAO, {
    referenciaEspecial: "912",
    valorBaseGeral: 5.5,
    valorBaseReferenciaEspecial: 6.5,
    descontoFechoNaoFeito: 0.25,
    descontoPontoLuzNaoFeito: 0.15
  });
});

test("repositório local usa valor universal de ALÇA para qualquer referência", async () => {
  const store = hidratarStoreLocal(criarStoreCorpoNu(), dadosIniciaisHomologacao());
  const { valoresRepo } = criarRepositoriosLocais(store);

  assert.equal(await valoresRepo.buscarValorUnitario("411", "ALÇA"), 0.05);
  assert.equal(await valoresRepo.buscarValorUnitario("912", "ALÇA"), 0.05);
  assert.equal(await valoresRepo.buscarValorUnitario("610", "ALÇA"), 0.05);
});

test("Lateral e Encapar Bojo continuam estritamente por referência", async () => {
  const store = hidratarStoreLocal(criarStoreCorpoNu(), dadosIniciaisHomologacao());
  const { valoresRepo } = criarRepositoriosLocais(store);

  assert.deepEqual(await valoresRepo.buscarValoresComponentes("411"), {
    lateral: 0.4,
    bojo: 0.2943
  });
  assert.deepEqual(await valoresRepo.buscarValoresComponentes("414"), {
    lateral: 0,
    bojo: 0.2943
  });
});

test("Motor de Valores calcula ALÇA universal e Sutiã Completo 912 com valores reais", async () => {
  const store = hidratarStoreLocal(criarStoreCorpoNu(), dadosIniciaisHomologacao());
  const { valoresRepo } = criarRepositoriosLocais(store);
  const motor = new MotorValoresV2({ valoresRepo });

  const alca = await motor.calcular({
    op: { id: "op-1", numeroOP: "1", referencia: "411", quantidade: 200, tipoPeca: "sutia" },
    processo: "ALÇA",
    quantidade: 200
  });
  assert.equal(alca.ok, true);
  assert.equal(alca.valorUnitario, 0.05);
  assert.equal(alca.total, 10);

  const especial = await motor.calcular({
    op: { id: "op-2", numeroOP: "2", referencia: "912", quantidade: 100, tipoPeca: "sutia" },
    processo: "SUTIÃ COMPLETO",
    quantidade: 100
  });
  assert.equal(especial.ok, true);
  assert.equal(especial.valorUnitario, 6.5);
  assert.equal(especial.total, 650);
});

test("Sutiã Completo 411 reproduz os descontos reais atuais", async () => {
  const store = hidratarStoreLocal(criarStoreCorpoNu(), dadosIniciaisHomologacao());
  const { valoresRepo } = criarRepositoriosLocais(store);
  const motor = new MotorValoresV2({ valoresRepo });
  const op = { id: "op-411", numeroOP: "41100", referencia: "411", quantidade: 100, tipoPeca: "sutia" };

  const componentesFeitos = await motor.calcular({
    op, processo: "SUTIÃ COMPLETO", quantidade: 100,
    componentes: { lateral: true, bojo: true, fecho: true, pontoLuz: true }
  });
  assert.equal(componentesFeitos.ok, true);
  assert.equal(componentesFeitos.valorUnitario, 4.8057);
  assert.equal(componentesFeitos.total, 480.57);

  const tudoDescontado = await motor.calcular({
    op, processo: "SUTIÃ COMPLETO", quantidade: 100,
    componentes: { lateral: true, bojo: true, fecho: false, pontoLuz: false }
  });
  assert.equal(tudoDescontado.ok, true);
  assert.equal(tudoDescontado.valorUnitario, 4.4057);
  assert.equal(tudoDescontado.total, 440.57);

  const semBojoLateralFeitos = await motor.calcular({
    op, processo: "SUTIÃ COMPLETO", quantidade: 100,
    componentes: { lateral: false, bojo: false, fecho: true, pontoLuz: true }
  });
  assert.equal(semBojoLateralFeitos.ok, true);
  assert.equal(semBojoLateralFeitos.valorUnitario, 5.5);
  assert.equal(semBojoLateralFeitos.total, 550);
});
