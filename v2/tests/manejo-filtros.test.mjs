import test from "node:test";
import assert from "node:assert/strict";

import {
  filtrarOrdensManejo,
  opcoesFiltrosManejo,
  ordemPassaFiltrosManejo
} from "../core/manejo-filtros.mjs";

const ORDENS = [
  {
    id: "1",
    numeroOP: "100",
    referencia: "414",
    cor: "PRETO",
    quantidade: 500,
    tipoPeca: "sutia",
    necessidade: "URGENTE",
    manejosSetores: {
      sutia: {
        fase: "SEPARAÇÃO",
        faseLateral: "PREPARAÇÃO",
        silkNome: "SILK A",
        tecidoNome: "TECIDO X",
        dataTecido: "2026-08-08",
        faccao: "DANUBIA",
        chegada: "",
        falta: 0,
        celu: "CELULA 1",
        status: "organizada"
      }
    }
  },
  {
    id: "2",
    numeroOP: "101",
    referencia: "414",
    cor: "BLUSH",
    quantidade: 300,
    tipoPeca: "sutia",
    necessidade: "NORMAL",
    manejosSetores: {
      sutia: {
        faseBojo: "CORTE",
        faseLateral: "",
        silkNome: "SILK B",
        tecidoNome: "TECIDO X",
        dataTecido: "2026-08-09",
        faccao: "LIVIA",
        chegada: "2026-08-10",
        falta: 10,
        celu: "CELULA 2",
        status: "organizada"
      }
    }
  },
  {
    id: "3",
    numeroOP: "102",
    referencia: "500",
    cor: "PRETO",
    quantidade: 500,
    tipoPeca: "sutia",
    necessidade: "URGENTE",
    manejosSetores: {
      sutia: {
        fase: "SEPARAÇÃO",
        faseLateral: "CORTE",
        silkNome: "SILK A",
        tecidoNome: "TECIDO Y",
        dataTecido: "2026-08-08",
        faccao: "DANUBIA",
        chegada: "",
        falta: 0,
        celu: "CELULA 1",
        status: "pendente"
      }
    }
  }
];

test("um filtro isolado funciona", () => {
  const resultado = filtrarOrdensManejo(ORDENS, "sutia", { cor: "PRETO" });
  assert.deepEqual(resultado.map(item => item.id), ["1", "3"]);
});

test("filtros acumulativos aplicam interseção estilo Excel", () => {
  const resultado = filtrarOrdensManejo(ORDENS, "sutia", {
    cor: "PRETO",
    referencia: "414",
    faseBojo: "SEPARAÇÃO",
    faseLateral: "PREPARAÇÃO",
    faccao: "DANUBIA",
    necessidade: "URGENTE"
  });

  assert.deepEqual(resultado.map(item => item.id), ["1"]);
});

test("Fase Bojo lê dados antigos de fase e Fase Lateral é independente", () => {
  assert.deepEqual(
    filtrarOrdensManejo(ORDENS, "sutia", { faseBojo: "SEPARAÇÃO" }).map(item => item.id),
    ["1", "3"]
  );
  assert.deepEqual(
    filtrarOrdensManejo(ORDENS, "sutia", { faseLateral: "PREPARAÇÃO" }).map(item => item.id),
    ["1"]
  );
  assert.deepEqual(
    filtrarOrdensManejo(ORDENS, "sutia", { faseBojo: "SEPARAÇÃO", faseLateral: "CORTE" }).map(item => item.id),
    ["3"]
  );
});

test("filtro legado fase continua apontando para Fase Bojo durante transição", () => {
  assert.deepEqual(
    filtrarOrdensManejo(ORDENS, "sutia", { fase: "CORTE" }).map(item => item.id),
    ["2"]
  );
});

test("adicionar outro filtro nunca reabre registros excluídos pelos anteriores", () => {
  const primeiro = filtrarOrdensManejo(ORDENS, "sutia", { cor: "PRETO" });
  const segundo = filtrarOrdensManejo(ORDENS, "sutia", { cor: "PRETO", status: "organizada" });

  assert.deepEqual(primeiro.map(item => item.id), ["1", "3"]);
  assert.deepEqual(segundo.map(item => item.id), ["1"]);
});

test("busca livre acumula com filtros estruturados e encontra as duas fases", () => {
  const resultado = filtrarOrdensManejo(ORDENS, "sutia", {
    busca: "PREPARAÇÃO",
    referencia: "414",
    cor: "PRETO"
  });
  assert.deepEqual(resultado.map(item => item.id), ["1"]);
});

test("OP usa correspondência parcial para facilitar digitação", () => {
  assert.equal(ordemPassaFiltrosManejo(ORDENS[0], "sutia", { op: "10" }), true);
  assert.equal(ordemPassaFiltrosManejo(ORDENS[1], "sutia", { op: "100" }), false);
});

test("quantidade e falta são filtros numéricos exatos quando ativos", () => {
  assert.deepEqual(
    filtrarOrdensManejo(ORDENS, "sutia", { quantidade: 500 }).map(item => item.id),
    ["1", "3"]
  );
  assert.deepEqual(
    filtrarOrdensManejo(ORDENS, "sutia", { falta: 10 }).map(item => item.id),
    ["2"]
  );
});

test("opções dos filtros derivam Fase Bojo e Fase Lateral sem duplicidade", () => {
  const opcoes = opcoesFiltrosManejo(ORDENS, "sutia");
  assert.deepEqual(opcoes.referencia, ["414", "500"]);
  assert.deepEqual(opcoes.cor, ["BLUSH", "PRETO"]);
  assert.deepEqual(opcoes.faseBojo, ["CORTE", "SEPARAÇÃO"]);
  assert.deepEqual(opcoes.faseLateral, ["CORTE", "PREPARAÇÃO"]);
  assert.deepEqual(opcoes.fase, opcoes.faseBojo);
  assert.deepEqual(opcoes.faccao, ["DANUBIA", "LIVIA"]);
});
