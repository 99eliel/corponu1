import test from "node:test";
import assert from "node:assert/strict";

import {
  criarIndiceFaccoesPorProcesso,
  deduplicarFaccoes,
  listarFaccoesPorProcesso,
  nomeFaccaoCanonico,
  processosDaFaccao
} from "../core/faccoes-regras.mjs";

test("normaliza aliases conhecidos de nome de facção", () => {
  assert.equal(nomeFaccaoCanonico("Lara Cristina (Kaka)"), "KAKA");
  assert.equal(nomeFaccaoCanonico("Lara Cristina/Kaka"), "KAKA");
  assert.equal(nomeFaccaoCanonico("Gislaine"), "GISLAINY");
});

test("extrai processos de formatos legados diferentes", () => {
  const processos = processosDaFaccao({
    processosPermitidos: ["sutia completo", { nome: "alca" }],
    servicos: { processo: "encapar bojos" }
  });

  assert.deepEqual(
    new Set(processos),
    new Set(["SUTIÃ COMPLETO", "ALÇA", "ENCAPAR BOJO"])
  );
});

test("deduplica facções e prefere cadastro com mais processos", () => {
  const lista = deduplicarFaccoes([
    { id: "1", nome: "Lara Cristina (Kaka)", processos: ["SUTIÃ COMPLETO"] },
    { id: "2", nome: "KAKA", processos: ["SUTIÃ COMPLETO", "SUTIÃ MONTAGEM"] },
    { id: "3", nome: "INATIVA", ativo: false, processos: ["SUTIÃ COMPLETO"] }
  ]);

  assert.equal(lista.length, 1);
  assert.equal(lista[0].id, "2");
  assert.equal(lista[0].nome, "KAKA");
  assert.deepEqual(
    new Set(lista[0].processosCanonicos),
    new Set(["SUTIÃ COMPLETO", "SUTIÃ MONTAGEM"])
  );
});

test("lista somente facções habilitadas para o processo", () => {
  const faccoes = [
    { id: "1", nome: "DANUBIA", processosPermitidos: ["SUTIÃ COMPLETO"] },
    { id: "2", nome: "LIVIA", processosPermitidos: ["SUTIÃ MONTAGEM"] },
    { id: "3", nome: "LORENA", processosPermitidos: ["CALCINHA COMPLETA"] }
  ];

  const completas = listarFaccoesPorProcesso(faccoes, "sutia completo");
  assert.deepEqual(completas.map(item => item.nome), ["DANUBIA"]);

  const calcinhas = listarFaccoesPorProcesso(faccoes, "calcinha");
  assert.deepEqual(calcinhas.map(item => item.nome), ["LORENA"]);
});

test("fallback legado só entra quando nenhum cadastro possui o processo salvo", () => {
  const faccoes = [
    { id: "1", nome: "DANUBIA" },
    { id: "2", nome: "KAKA" },
    { id: "3", nome: "LIVIA", processosPermitidos: ["SUTIÃ MONTAGEM"] }
  ];

  const completas = listarFaccoesPorProcesso(
    faccoes,
    "SUTIÃ COMPLETO",
    { nomesFallback: ["DANUBIA", "Lara Cristina (Kaka)"] }
  );

  assert.deepEqual(completas.map(item => item.nome), ["DANUBIA", "KAKA"]);
});

test("índice por processo é criado uma vez para reutilização em tela", () => {
  const faccoes = [
    { id: "1", nome: "DANUBIA", processos: ["SUTIÃ COMPLETO"] },
    { id: "2", nome: "KAKA", processos: ["SUTIÃ COMPLETO", "SUTIÃ MONTAGEM"] },
    { id: "3", nome: "LIVIA", processos: ["SUTIÃ MONTAGEM"] }
  ];

  const indice = criarIndiceFaccoesPorProcesso(faccoes);
  assert.deepEqual(
    indice.get("SUTIÃ COMPLETO").map(item => item.nome),
    ["DANUBIA", "KAKA"]
  );
  assert.deepEqual(
    indice.get("SUTIÃ MONTAGEM").map(item => item.nome),
    ["KAKA", "LIVIA"]
  );
});
