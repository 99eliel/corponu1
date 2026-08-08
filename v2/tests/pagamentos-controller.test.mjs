import test from "node:test";
import assert from "node:assert/strict";
import { criarStoreCorpoNu } from "../core/store.mjs";
import { PagamentosController } from "../core/pagamentos-controller.mjs";

function ambiente() {
  const store = criarStoreCorpoNu();
  const chamadas = [];
  const base = [
    { id: "p1", competencia: "2026-08", numeroOP: "1", responsavel: "A", referencia: "414", processo: "ALÇA", quantidade: 10, total: 10, statusPagamento: "pendente" },
    { id: "p2", competencia: "2026-08", numeroOP: "2", responsavel: "B", referencia: "414", processo: "ALÇA", quantidade: 20, total: 20, statusPagamento: "pago" }
  ];
  const repo = {
    async carregarPrimeiraPagina() { chamadas.push("pagina1"); return [base[0]]; },
    async carregarMais() { chamadas.push("mais"); return [base[1]]; },
    acabou() { return chamadas.includes("mais"); },
    async buscarTodos() { chamadas.push("todos"); return structuredClone(base); },
    async quitarEmLote(ids) { chamadas.push(["quitar", ...ids]); return { ok: true, ids }; }
  };
  return { store, chamadas, controller: new PagamentosController({ store, pagamentosRepo: repo }) };
}

test("pagamentos carregam paginas sem apagar itens de outra competencia ja no store", async () => {
  const { store, controller } = ambiente();
  store.upsert("pagamentos", { id: "julho", competencia: "2026-07", numeroOP: "9", total: 9 });
  await controller.carregar({ competencia: "2026-08" });
  assert.ok(store.obter("pagamentos", "julho"));
  assert.ok(store.obter("pagamentos", "p1"));
});

test("preparar quitacao faz uma unica busca completa e considera somente pendentes", async () => {
  const { controller, chamadas } = ambiente();
  const preparado = await controller.prepararQuitacao({ competencia: "2026-08" });
  assert.equal(preparado.ok, true);
  assert.deepEqual(preparado.ids, ["p1"]);
  assert.equal(chamadas.filter(c => c === "todos").length, 1);
});

test("quitar preparados nao relê pagamentos", async () => {
  const { controller, chamadas } = ambiente();
  const preparado = await controller.prepararQuitacao({ competencia: "2026-08" });
  const antes = chamadas.filter(c => c === "todos").length;
  const resultado = await controller.quitarPreparados(preparado, { usuario: { uid: "u1" } });
  assert.equal(resultado.ok, true);
  assert.equal(chamadas.filter(c => c === "todos").length, antes);
  assert.ok(chamadas.some(c => Array.isArray(c) && c[0] === "quitar"));
});
