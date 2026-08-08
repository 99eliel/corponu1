import test from "node:test";
import assert from "node:assert/strict";
import { criarPagamentosConsultaRepoFirestore } from "../adapters/pagamentos-repo.mjs";

function fake(itens = []) {
  const chamadas = { queries: [], updates: [], commits: 0 };
  const db = {};
  const fs = {
    collection(_db, nome) { return { nome }; },
    where(campo, operador, valor) { return { tipo: "where", campo, operador, valor }; },
    orderBy(campo, direcao) { return { tipo: "orderBy", campo, direcao }; },
    limit(valor) { return { tipo: "limit", valor }; },
    startAfter(cursor) { return { tipo: "startAfter", cursor }; },
    query(ref, ...restricoes) { return { ref, restricoes }; },
    async getDocs(q) {
      chamadas.queries.push(q.restricoes);
      const comp = q.restricoes.find(r => r.tipo === "where")?.valor;
      const limite = q.restricoes.find(r => r.tipo === "limit")?.valor || 50;
      let lista = itens.filter(i => !comp || i.competencia === comp);
      const cursor = q.restricoes.find(r => r.tipo === "startAfter")?.cursor;
      if (cursor) {
        const pos = lista.findIndex(i => i.id === cursor.id);
        lista = pos >= 0 ? lista.slice(pos + 1) : lista;
      }
      lista = lista.slice(0, limite);
      return { docs: lista.map(i => ({ id: i.id, data: () => ({ ...i }) })) };
    },
    doc(_db, colecao, id) { return { colecao, id }; },
    writeBatch() {
      return {
        update(ref, dados) { chamadas.updates.push({ ref, dados }); },
        async commit() { chamadas.commits += 1; }
      };
    },
    serverTimestamp() { return { server: true }; }
  };
  return { fs, db, chamadas };
}

test("consulta por competencia evita orderBy composto", async () => {
  const a = fake([{ id: "1", competencia: "2026-08", criadoEm: "2" }]);
  const repo = criarPagamentosConsultaRepoFirestore(a);
  const lista = await repo.carregarPrimeiraPagina({ competencia: "2026-08" });
  assert.equal(lista.length, 1);
  assert.ok(a.chamadas.queries[0].some(r => r.tipo === "where" && r.campo === "competencia"));
  assert.equal(a.chamadas.queries[0].some(r => r.tipo === "orderBy"), false);
});

test("consulta geral ordena por criadoEm e pagina sob demanda", async () => {
  const a = fake([
    { id: "1", competencia: "2026-08", criadoEm: "3" },
    { id: "2", competencia: "2026-08", criadoEm: "2" },
    { id: "3", competencia: "2026-08", criadoEm: "1" }
  ]);
  const repo = criarPagamentosConsultaRepoFirestore(a);
  const primeira = await repo.carregarPrimeiraPagina({ limitePagina: 2 });
  const segunda = await repo.carregarMais();
  assert.equal(primeira.length, 2);
  assert.equal(segunda.length, 1);
  assert.ok(a.chamadas.queries[0].some(r => r.tipo === "orderBy" && r.campo === "criadoEm"));
});

test("quitacao em lote escreve somente em entregasPagamento", async () => {
  const a = fake();
  const repo = criarPagamentosConsultaRepoFirestore(a);
  const resultado = await repo.quitarEmLote(["p1", "p2"], { usuario: { uid: "u1", nome: "Teste" } });
  assert.equal(resultado.ok, true);
  assert.equal(a.chamadas.updates.length, 2);
  assert.ok(a.chamadas.updates.every(u => u.ref.colecao === "entregasPagamento"));
  assert.ok(a.chamadas.updates.every(u => u.dados.statusPagamento === "pago"));
  assert.equal(a.chamadas.commits, 1);
});
