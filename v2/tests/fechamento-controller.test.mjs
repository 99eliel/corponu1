import test from "node:test";
import assert from "node:assert/strict";

import { FechamentoController } from "../core/fechamento-controller.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";

function ambiente() {
  const chamadas = [];
  const store = criarStoreCorpoNu();

  store.substituir("faccoes", [
    { id: "f1", nome: "DANUBIA", processosPermitidos: ["SUTIÃ COMPLETO"] },
    { id: "f2", nome: "LIVIA", processosPermitidos: ["SUTIÃ MONTAGEM"] },
    { id: "f3", nome: "LORENA", processosPermitidos: ["CALCINHA COMPLETA"] }
  ]);

  const ops = new Map([
    ["58193", { id: "op-58193", numeroOP: "58193", referencia: "414", quantidade: 500 }],
    ["99999", { id: "op-99999", numeroOP: "99999", referencia: "500", quantidade: 300 }]
  ]);

  const financeiroService = {
    async carregarOP(numeroOP) {
      chamadas.push(["carregarOP", numeroOP]);
      const op = ops.get(numeroOP) || null;
      return op
        ? { ok: true, erros: [], op: { ...op } }
        : { ok: false, erros: ["OP_NAO_ENCONTRADA"], op: null };
    },
    async prepararLancamento(entrada) {
      chamadas.push(["preparar", entrada.op?.numeroOP]);
      return {
        ok: true,
        erros: [],
        op: entrada.op,
        calculo: { ok: true, total: 100, valorUnitario: 1 },
        documento: { numeroOP: entrada.op?.numeroOP }
      };
    },
    async salvarLancamento(entrada) {
      chamadas.push(["salvar", entrada.op?.numeroOP]);
      return {
        ok: true,
        erros: [],
        salvo: {
          id: `pag-${entrada.op?.numeroOP}`,
          numeroOP: entrada.op?.numeroOP,
          total: 100
        }
      };
    }
  };

  const controller = new FechamentoController({ store, financeiroService });
  return { controller, store, chamadas };
}

test("buscarOP usa store antes do repositório", async () => {
  const { controller, store, chamadas } = ambiente();
  store.upsert("ordens", {
    id: "op-58193",
    numeroOP: "58193",
    referencia: "414",
    quantidade: 500
  });

  const resultado = await controller.buscarOP("58193");
  assert.equal(resultado.ok, true);
  assert.equal(resultado.origem, "store");
  assert.equal(chamadas.length, 0);
});

test("buscarOP carrega do repositório e coloca no store", async () => {
  const { controller, store, chamadas } = ambiente();

  const resultado = await controller.buscarOP("58193");
  assert.equal(resultado.ok, true);
  assert.equal(resultado.origem, "repositorio");
  assert.equal(store.buscarOrdemPorNumero("58193").id, "op-58193");
  assert.deepEqual(chamadas, [["carregarOP", "58193"]]);
});

test("listarResponsaveis usa facções já carregadas no store", () => {
  const { controller, chamadas } = ambiente();

  const completas = controller.listarResponsaveis("sutia completo");
  assert.deepEqual(completas.map(item => item.nome), ["DANUBIA"]);
  assert.equal(chamadas.length, 0);
});

test("limparOP remove a seleção interna", async () => {
  const { controller } = ambiente();
  await controller.buscarOP("58193");
  assert.equal(controller.opAtual.numeroOP, "58193");

  controller.limparOP();
  assert.equal(controller.opAtual, null);
});

test("digitar outra OP não reaproveita a OP anterior", async () => {
  const { controller, chamadas } = ambiente();
  await controller.buscarOP("58193");

  const resultado = await controller.preparar({
    numeroOP: "99999",
    processo: "SUTIÃ MONTAGEM",
    responsavel: "LIVIA",
    competencia: "2026-08",
    quantidade: 100
  });

  assert.equal(resultado.op.numeroOP, "99999");
  assert.ok(chamadas.some(chamada =>
    chamada[0] === "carregarOP" && chamada[1] === "99999"
  ));
  assert.ok(chamadas.some(chamada =>
    chamada[0] === "preparar" && chamada[1] === "99999"
  ));
});

test("salvar atualiza o store de pagamentos", async () => {
  const { controller, store } = ambiente();

  const resultado = await controller.salvar({
    numeroOP: "58193",
    processo: "SUTIÃ MONTAGEM",
    responsavel: "LIVIA",
    competencia: "2026-08",
    quantidade: 100
  });

  assert.equal(resultado.ok, true);
  assert.equal(store.obter("pagamentos", "pag-58193").numeroOP, "58193");
});
