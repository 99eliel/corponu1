import test from "node:test";
import assert from "node:assert/strict";

import { criarStoreCorpoNu } from "../core/store.mjs";

test("store mantém uma única coleção por domínio e substitui snapshot inteiro", () => {
  const store = criarStoreCorpoNu();

  store.substituir("ordens", [
    { id: "op-1", numeroOP: "1", quantidade: 100 },
    { id: "op-2", numeroOP: "2", quantidade: 200 }
  ]);

  assert.equal(store.mapa("ordens").size, 2);
  assert.equal(store.listar("ordens").length, 2);
  assert.equal(store.versao("ordens"), 1);

  store.substituir("ordens", [
    { id: "op-2", numeroOP: "2", quantidade: 250 }
  ]);

  assert.equal(store.mapa("ordens").size, 1);
  assert.equal(store.obter("ordens", "op-2").quantidade, 250);
  assert.equal(store.versao("ordens"), 2);
});

test("upsert atualiza o mesmo item sem criar estado paralelo", () => {
  const store = criarStoreCorpoNu();
  store.upsert("pagamentos", { id: "pag-1", total: 100, statusPagamento: "pendente" });
  store.upsert("pagamentos", { id: "pag-1", total: 120 });

  assert.equal(store.mapa("pagamentos").size, 1);
  assert.deepEqual(store.obter("pagamentos", "pag-1"), {
    id: "pag-1",
    total: 120,
    statusPagamento: "pendente"
  });
});

test("substituirItem troca um registro sem herdar campos antigos e notifica uma vez", () => {
  const store = criarStoreCorpoNu();
  store.upsert("ordens", {
    id: "op-1",
    numeroOP: "1",
    quantidade: 100,
    possuiBojo: true
  });

  const eventos = [];
  const parar = store.assinar("ordens", evento => eventos.push(evento));
  store.substituirItem("ordens", {
    id: "op-1",
    numeroOP: "1",
    quantidade: 100
  });
  parar();

  const ordem = store.obter("ordens", "op-1");
  assert.equal("possuiBojo" in ordem, false);
  assert.equal(eventos.length, 1);
  assert.equal(eventos[0].tipo, "substituir_item");
});

test("assinantes recebem somente mudanças do domínio assinado", () => {
  const store = criarStoreCorpoNu();
  const eventos = [];
  const parar = store.assinar("faccoes", evento => eventos.push(evento));

  store.upsert("ordens", { id: "op-1", numeroOP: "1" });
  store.upsert("faccoes", { id: "fac-1", nome: "LIVIA" });
  store.upsert("faccoes", { id: "fac-1", pix: "123" });
  parar();
  store.remover("faccoes", "fac-1");

  assert.equal(eventos.length, 2);
  assert.equal(eventos[0].dominio, "faccoes");
  assert.equal(eventos[0].tipo, "upsert");
  assert.equal(eventos[1].versao, 2);
});

test("busca OP por campos atuais e legados, ignorando excluídas", () => {
  const store = criarStoreCorpoNu();
  store.substituir("ordens", [
    { id: "a", numeroOP: "58193", excluida: true },
    { id: "b", numeroOPExterno: 58193, referencia: "414" },
    { id: "c", op: "99999", referencia: "500" }
  ]);

  const encontrada = store.buscarOrdemPorNumero("58193");
  assert.equal(encontrada.id, "b");
  assert.equal(store.buscarOrdemPorNumero("99999").id, "c");
});

test("busca produto por referência e tipo sem campo de quantidade", () => {
  const store = criarStoreCorpoNu();
  store.substituir("produtos", [
    { id: "s-414", referencia: "414", tipoPeca: "sutia", nome: "Sutiã 414" },
    { id: "c-414", referencia: "414", tipoPeca: "calcinha", nome: "Calcinha 414" }
  ]);

  assert.equal(store.buscarProdutoPorReferencia("414", "sutia").id, "s-414");
  assert.equal(store.buscarProdutoPorReferencia("414", "calcinha").id, "c-414");
  assert.equal("quantidade" in store.buscarProdutoPorReferencia("414", "calcinha"), false);
});

test("snapshot retornado não permite mutar silenciosamente o estado interno", () => {
  const store = criarStoreCorpoNu();
  store.upsert("ordens", { id: "op-1", numeroOP: "1", quantidade: 100 });

  const snapshot = store.snapshot();
  snapshot.ordens[0].quantidade = 999;

  assert.equal(store.obter("ordens", "op-1").quantidade, 100);
});
