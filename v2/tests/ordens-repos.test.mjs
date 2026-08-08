import test from "node:test";
import assert from "node:assert/strict";

import { criarOrdensGravacaoRepoFirestore } from "../adapters/ordens-repo.mjs";
import { criarProdutosRepoFirestore } from "../adapters/produtos-repo.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";

function criarFake({ produtos = [], ordens = [] } = {}) {
  const colecoes = new Map([
    ["produtos", new Map(produtos.map(item => [item.id, structuredClone(item)]))],
    ["ordensProducao", new Map(ordens.map(item => [item.id, structuredClone(item)]))]
  ]);
  const metricas = { getDocs: [], getDoc: [], setDoc: [] };
  const db = { fake: true };

  function filtrar(consulta) {
    const nome = consulta.ref.nome;
    const filtro = consulta.restricoes.find(item => item.tipo === "where");
    const limite = consulta.restricoes.find(item => item.tipo === "limit")?.valor;
    let itens = [...(colecoes.get(nome)?.values() || [])].map(structuredClone);
    if (filtro) {
      itens = itens.filter(item => {
        const valor = item[filtro.campo];
        if (filtro.operador === "==") return valor === filtro.valor;
        if (filtro.operador === "in") return filtro.valor.some(alvo => alvo === valor);
        return false;
      });
    }
    if (limite) itens = itens.slice(0, limite);
    return itens;
  }

  const fs = {
    collection(_db, nome) { return { nome }; },
    query(ref, ...restricoes) { return { ref, restricoes }; },
    where(campo, operador, valor) { return { tipo: "where", campo, operador, valor }; },
    limit(valor) { return { tipo: "limit", valor }; },
    async getDocs(consulta) {
      metricas.getDocs.push({
        colecao: consulta.ref.nome,
        campo: consulta.restricoes.find(item => item.tipo === "where")?.campo || ""
      });
      const itens = filtrar(consulta);
      return {
        docs: itens.map(item => ({ id: item.id, data: () => structuredClone(item) }))
      };
    },
    doc(_db, colecao, id) { return { colecao, id }; },
    async getDoc(ref) {
      metricas.getDoc.push({ colecao: ref.colecao, id: ref.id });
      const item = colecoes.get(ref.colecao)?.get(ref.id) || null;
      return {
        id: ref.id,
        exists: () => Boolean(item),
        data: () => structuredClone(item)
      };
    },
    async setDoc(ref, dados, opcoes) {
      metricas.setDoc.push({ colecao: ref.colecao, id: ref.id, opcoes: structuredClone(opcoes) });
      const atual = colecoes.get(ref.colecao)?.get(ref.id) || {};
      const proximo = opcoes?.merge ? { ...atual, ...structuredClone(dados) } : structuredClone(dados);
      if (!colecoes.has(ref.colecao)) colecoes.set(ref.colecao, new Map());
      colecoes.get(ref.colecao).set(ref.id, proximo);
    },
    serverTimestamp() { return { server: true }; }
  };

  return { db, fs, colecoes, metricas };
}

test("produto já no store gera zero leitura", async () => {
  const store = criarStoreCorpoNu();
  store.upsert("produtos", {
    id: "calcinha-414",
    referencia: "414",
    tipoPeca: "calcinha",
    nome: "Calcinha 414"
  });
  const fake = criarFake();
  const repo = criarProdutosRepoFirestore({ db: fake.db, fs: fake.fs, store });

  const produto = await repo.buscarPorReferencia("414", "calcinha");

  assert.equal(produto.id, "calcinha-414");
  assert.equal(fake.metricas.getDocs.length, 0);
});

test("produto ausente no store usa uma consulta por referência e alimenta o store", async () => {
  const store = criarStoreCorpoNu();
  const fake = criarFake({
    produtos: [{ id: "calcinha-414", referencia: "414", tipoPeca: "calcinha", nome: "Calcinha 414" }]
  });
  const repo = criarProdutosRepoFirestore({ db: fake.db, fs: fake.fs, store });

  const produto = await repo.buscarPorReferencia("414", "calcinha");

  assert.equal(produto.id, "calcinha-414");
  assert.equal(fake.metricas.getDocs.length, 1);
  assert.equal(store.obter("produtos", "calcinha-414").nome, "Calcinha 414");
});

test("duplicidade normal consulta somente numeroOP", async () => {
  const store = criarStoreCorpoNu();
  const fake = criarFake({
    ordens: [{ id: "calcinha-58193", numeroOP: "58193", tipoPeca: "calcinha" }]
  });
  const repo = criarOrdensGravacaoRepoFirestore({ db: fake.db, fs: fake.fs, store });

  const lista = await repo.buscarTodosPorNumero("58193");

  assert.equal(lista.length, 1);
  assert.deepEqual(fake.metricas.getDocs.map(item => item.campo), ["numeroOP"]);
});

test("busca legada só acontece quando numeroOP não encontra", async () => {
  const store = criarStoreCorpoNu();
  const fake = criarFake({
    ordens: [{ id: "legada", numeroOPExterno: "58193", tipoPeca: "sutia" }]
  });
  const repo = criarOrdensGravacaoRepoFirestore({ db: fake.db, fs: fake.fs, store });

  const lista = await repo.buscarTodosPorNumero("58193");

  assert.equal(lista.length, 1);
  assert.deepEqual(fake.metricas.getDocs.map(item => item.campo), ["numeroOP", "numeroOPExterno"]);
});

test("salvar OP nova atualiza Firestore e store sem refresh geral", async () => {
  const store = criarStoreCorpoNu();
  const fake = criarFake();
  const repo = criarOrdensGravacaoRepoFirestore({ db: fake.db, fs: fake.fs, store });

  const salvo = await repo.salvar({
    id: "calcinha-58193",
    novo: true,
    usuario: { uid: "u1" },
    dados: {
      numeroOP: "58193",
      referencia: "414",
      cor: "PRETO",
      quantidade: 500,
      tipoPeca: "calcinha"
    }
  });

  assert.equal(salvo.id, "calcinha-58193");
  assert.equal(fake.metricas.setDoc.length, 1);
  assert.equal(fake.metricas.setDoc[0].colecao, "ordensProducao");
  assert.equal(store.obter("ordens", "calcinha-58193").quantidade, 500);
  assert.equal(fake.metricas.getDocs.length, 0);
});

test("editar OP usa merge e mantém o mesmo documento", async () => {
  const store = criarStoreCorpoNu();
  const fake = criarFake({
    ordens: [{ id: "calcinha-58193", numeroOP: "58193", quantidade: 500, status: "aberta" }]
  });
  const repo = criarOrdensGravacaoRepoFirestore({ db: fake.db, fs: fake.fs, store });

  await repo.salvar({
    id: "calcinha-58193",
    novo: false,
    dados: { numeroOP: "58193", quantidade: 480, tipoPeca: "calcinha" }
  });

  assert.equal(fake.metricas.setDoc[0].opcoes.merge, true);
  assert.equal(fake.colecoes.get("ordensProducao").get("calcinha-58193").quantidade, 480);
  assert.equal(fake.colecoes.get("ordensProducao").size, 1);
});
