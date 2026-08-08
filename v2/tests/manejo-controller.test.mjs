import test from "node:test";
import assert from "node:assert/strict";

import { ManejoController } from "../core/manejo-controller.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";

function ambiente() {
  const store = criarStoreCorpoNu();
  store.substituir("ordens", [
    {
      id: "s1",
      numeroOP: "100",
      referencia: "414",
      cor: "PRETO",
      quantidade: 500,
      tipoPeca: "sutia",
      necessidade: "URGENTE",
      manejosSetores: {
        sutia: { fase: "SEPARAÇÃO", silkNome: "SILK A", dataTecido: "2026-08-08" }
      }
    },
    {
      id: "s2",
      numeroOP: "101",
      referencia: "500",
      cor: "BLUSH",
      quantidade: 300,
      tipoPeca: "sutia",
      necessidade: "NORMAL",
      manejosSetores: {
        sutia: { fase: "CORTE", silkNome: "SILK B", dataTecido: "2026-08-09" }
      }
    },
    {
      id: "c1",
      numeroOP: "200",
      referencia: "1001",
      cor: "PRETO",
      quantidade: 400,
      tipoPeca: "calcinha",
      manejosSetores: {
        calcinha: { fase: "SEPARAÇÃO" }
      }
    }
  ]);
  store.substituir("faccoes", [
    { id: "f1", nome: "DANUBIA", processosPermitidos: ["SUTIÃ COMPLETO"] },
    { id: "f2", nome: "LIVIA", processosPermitidos: ["SUTIÃ MONTAGEM"] },
    { id: "f3", nome: "LORENA", processosPermitidos: ["CALCINHA COMPLETA"] }
  ]);

  const chamadas = [];
  const manejoService = {
    async salvarManejo(args) {
      chamadas.push(["salvar", args.ordem?.id, args.setor]);
      return { ok: true, salvo: { ordem: args.ordem } };
    },
    async movimentar(args) {
      chamadas.push(["movimentar", args.ordem?.id, args.tipoDestino, args.processo, args.destino]);
      return { ok: true, salvo: { movimentacao: { id: "mov-1" } } };
    }
  };

  return {
    store,
    chamadas,
    controller: new ManejoController({ store, manejoService })
  };
}

test("lista somente OPs do setor atual", () => {
  const { controller } = ambiente();
  assert.deepEqual(controller.listar("sutia").map(item => item.id), ["s1", "s2"]);
  assert.deepEqual(controller.listar("calcinha").map(item => item.id), ["c1"]);
});

test("filtros acumulativos passam pelo controller sem consulta externa", () => {
  const { controller, chamadas } = ambiente();
  const resultado = controller.listar("sutia", {
    cor: "PRETO",
    referencia: "414",
    faseBojo: "SEPARAÇÃO"
  });

  assert.deepEqual(resultado.map(item => item.id), ["s1"]);
  assert.equal(chamadas.length, 0);
});

test("processos exibidos são separados por Sutiã e Calcinha", () => {
  const { controller } = ambiente();
  assert.deepEqual(controller.processosFaccoes("sutia"), [
    "ENCAPAR BOJO",
    "SUTIÃ COMPLETO",
    "SUTIÃ MONTAGEM",
    "ALÇA"
  ]);
  assert.deepEqual(controller.processosFaccoes("calcinha"), [
    "CALCINHA MONTAGEM",
    "CALCINHA COMPLETA"
  ]);
});

test("facções são filtradas pelo processo usando o store", () => {
  const { controller, chamadas } = ambiente();
  assert.deepEqual(
    controller.listarDestinos({ tipoDestino: "faccao", processo: "SUTIÃ COMPLETO" }).map(item => item.nome),
    ["DANUBIA"]
  );
  assert.equal(chamadas.length, 0);
});

test("controller não oferece Célula como destino do Manejo", () => {
  const { controller } = ambiente();
  assert.deepEqual(controller.listarDestinos({ tipoDestino: "celula", processo: "CÉLULA INTERNA" }), []);
});

test("salvar e movimentar encaminham a própria OP carregada no store", async () => {
  const { controller, chamadas } = ambiente();

  await controller.salvar({
    ordemId: "s1",
    setor: "sutia",
    entrada: { faseBojo: "CORTE" }
  });
  await controller.movimentar({
    ordemId: "s1",
    setor: "sutia",
    entradaManejo: { faseBojo: "CORTE", silkNome: "SILK A", dataTecido: "2026-08-08" },
    tipoDestino: "faccao",
    processo: "SUTIÃ COMPLETO",
    destino: "DANUBIA",
    quantidade: 500,
    dataEnvio: "2026-08-08"
  });

  assert.deepEqual(chamadas[0], ["salvar", "s1", "sutia"]);
  assert.deepEqual(chamadas[1], ["movimentar", "s1", "faccao", "SUTIÃ COMPLETO", "DANUBIA"]);
});
