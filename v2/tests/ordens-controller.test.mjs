import test from "node:test";
import assert from "node:assert/strict";

import { OrdensController } from "../core/ordens-controller.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";

function ambiente() {
  const store = criarStoreCorpoNu();
  const chamadas = [];
  store.substituir("faccoes", [
    { id: "f1", nome: "LORENA", processosPermitidos: ["CALCINHA COMPLETA"] },
    { id: "f2", nome: "ANA FLAVIA", processosPermitidos: ["CALCINHA MONTAGEM"] }
  ]);

  const ordensService = {
    async salvar(args) {
      chamadas.push(args);
      if (args.entrada.numeroOP === "100" && !args.permitirConversaoTipo) {
        return {
          ok: false,
          erros: ["OP_CONFLITO_TIPO"],
          requerConfirmacaoConversao: true,
          conflito: { id: "100", tipoPeca: "sutia" }
        };
      }
      return {
        ok: true,
        erros: [],
        salvo: {
          id: args.currentId || `calcinha-${args.entrada.numeroOP}`,
          ...args.entrada
        }
      };
    }
  };

  const controller = new OrdensController({ store, ordensService });
  return { store, controller, chamadas };
}

test("lista Ordens por tipo usando um único store", () => {
  const { store, controller } = ambiente();
  store.substituir("ordens", [
    { id: "s1", numeroOP: "10", tipoPeca: "sutia" },
    { id: "c1", numeroOP: "20", tipoPeca: "calcinha" }
  ]);

  assert.deepEqual(controller.listar("sutia").map(item => item.id), ["s1"]);
  assert.deepEqual(controller.listar("calcinha").map(item => item.id), ["c1"]);
});

test("lista facções pelo processo sem nova consulta externa", () => {
  const { controller, chamadas } = ambiente();
  assert.deepEqual(
    controller.listarFaccoes("CALCINHA COMPLETA").map(item => item.nome),
    ["LORENA"]
  );
  assert.equal(chamadas.length, 0);
});

test("conversão de tipo só executa segunda gravação após confirmação", async () => {
  const { controller, chamadas } = ambiente();
  let confirmou = 0;

  const resultado = await controller.salvar({
    entrada: {
      tipoPeca: "calcinha",
      numeroOP: "100",
      referencia: "414",
      cor: "PRETO",
      quantidade: 500
    },
    confirmarConversao: async () => {
      confirmou += 1;
      return true;
    }
  });

  assert.equal(resultado.ok, true);
  assert.equal(confirmou, 1);
  assert.equal(chamadas.length, 2);
  assert.equal(chamadas[0].permitirConversaoTipo, undefined);
  assert.equal(chamadas[1].permitirConversaoTipo, true);
});

test("cancelar conversão não executa segunda gravação", async () => {
  const { controller, chamadas } = ambiente();

  const resultado = await controller.salvar({
    entrada: {
      tipoPeca: "calcinha",
      numeroOP: "100",
      referencia: "414",
      cor: "PRETO",
      quantidade: 500
    },
    confirmarConversao: async () => false
  });

  assert.equal(resultado.canceladoPeloUsuario, true);
  assert.equal(chamadas.length, 1);
});

test("selecionar para edição não altera o documento do store", () => {
  const { store, controller } = ambiente();
  store.upsert("ordens", {
    id: "c1",
    numeroOP: "20",
    tipoPeca: "calcinha",
    quantidade: 500
  });

  const editando = controller.selecionarParaEdicao("c1");
  editando.quantidade = 999;
  assert.equal(store.obter("ordens", "c1").quantidade, 500);
});
