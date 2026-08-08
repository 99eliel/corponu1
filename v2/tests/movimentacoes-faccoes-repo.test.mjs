import test from "node:test";
import assert from "node:assert/strict";

import { criarMovimentacoesFaccoesRepoFirestore } from "../adapters/movimentacoes-faccoes-repo.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";

function ambiente({ pagina1 = [], pagina2 = [] } = {}) {
  const store = criarStoreCorpoNu();
  const paginas = [pagina1, pagina2];
  const metricas = { getDocs: 0, restricoes: [] };
  const db = { fake: true };

  function docFake(item) {
    return {
      id: item.id,
      data: () => structuredClone(item)
    };
  }

  const fs = {
    collection(_db, nome) { return { nome }; },
    orderBy(campo, direcao) { return { tipo: "orderBy", campo, direcao }; },
    limit(valor) { return { tipo: "limit", valor }; },
    startAfter(cursor) { return { tipo: "startAfter", cursorId: cursor.id }; },
    query(ref, ...restricoes) { return { ref, restricoes }; },
    async getDocs(consulta) {
      metricas.restricoes.push(structuredClone(consulta.restricoes));
      const indice = metricas.getDocs;
      metricas.getDocs += 1;
      return { docs: (paginas[indice] || []).map(docFake) };
    }
  };

  return {
    store,
    metricas,
    repo: criarMovimentacoesFaccoesRepoFirestore({
      db,
      fs,
      store,
      tamanhoPagina: 2
    })
  };
}

test("primeira página lê somente um lote e guarda apenas Facções no store", async () => {
  const a = ambiente({
    pagina1: [
      { id: "m1", tipoDestino: "faccao", numeroOP: "1", criadoEm: 3 },
      { id: "m2", tipoDestino: "celula", numeroOP: "2", criadoEm: 2 }
    ]
  });

  const resultado = await a.repo.carregarPrimeiraPagina();

  assert.equal(a.metricas.getDocs, 1);
  assert.equal(resultado.lidos, 2);
  assert.deepEqual(a.repo.listarCarregadas().map(item => item.id), ["m1"]);
  assert.equal(a.store.obter("movimentacoes", "m2"), null);
});

test("carregarMais usa cursor e não relê a primeira página", async () => {
  const a = ambiente({
    pagina1: [
      { id: "m1", tipoDestino: "faccao", criadoEm: 4 },
      { id: "m2", tipoDestino: "faccao", criadoEm: 3 }
    ],
    pagina2: [
      { id: "m3", tipoDestino: "faccao", criadoEm: 2 }
    ]
  });

  await a.repo.carregarPrimeiraPagina();
  const segundo = await a.repo.carregarMais();

  assert.equal(a.metricas.getDocs, 2);
  assert.equal(
    a.metricas.restricoes[1].some(item => item.tipo === "startAfter" && item.cursorId === "m2"),
    true
  );
  assert.equal(segundo.acabou, true);
  assert.deepEqual(
    new Set(a.repo.listarCarregadas().map(item => item.id)),
    new Set(["m1", "m2", "m3"])
  );
});

test("depois do fim carregarMais não gera leitura adicional", async () => {
  const a = ambiente({
    pagina1: [{ id: "m1", tipoDestino: "faccao", criadoEm: 1 }]
  });

  await a.repo.carregarPrimeiraPagina();
  await a.repo.carregarMais();
  await a.repo.carregarMais();

  assert.equal(a.metricas.getDocs, 1);
  assert.equal(a.repo.acabou(), true);
});

test("não usa where composto; pagina pelo criadoEm para evitar índice extra obrigatório", async () => {
  const a = ambiente({
    pagina1: [
      { id: "m1", tipoDestino: "faccao", criadoEm: 2 },
      { id: "m2", tipoDestino: "celula", criadoEm: 1 }
    ]
  });

  await a.repo.carregarPrimeiraPagina();
  const restricoes = a.metricas.restricoes[0];
  assert.equal(restricoes.some(item => item.tipo === "where"), false);
  assert.equal(restricoes.some(item => item.tipo === "orderBy" && item.campo === "criadoEm"), true);
  assert.equal(restricoes.some(item => item.tipo === "limit" && item.valor === 2), true);
});
