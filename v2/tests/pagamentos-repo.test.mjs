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
      const limite = q.restricoes.find(r => r.tipo === "limit")?.valor || 50;
      let lista = [...itens];

      for (const regra of q.restricoes.filter(r => r.tipo === "where")) {
        if (regra.operador === "==") lista = lista.filter(i => i[regra.campo] === regra.valor);
        if (regra.operador === ">=") lista = lista.filter(i => String(i[regra.campo] || "") >= String(regra.valor));
        if (regra.operador === "<") lista = lista.filter(i => String(i[regra.campo] || "") < String(regra.valor));
      }

      const ordem = q.restricoes.find(r => r.tipo === "orderBy");
      if (ordem) {
        lista.sort((a, b) => String(b[ordem.campo] || "").localeCompare(String(a[ordem.campo] || "")));
      }

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

test("consulta mensal combina competencia V2 e dataEntrega historica sem varrer a colecao", async () => {
  const a = fake([
    { id: "v2", tipoDocumento: "lancamento_financeiro_v2", competencia: "2026-08", criadoEm: "3" },
    { id: "controle", tipoDocumento: "controle_processo_v2", competencia: "2026-08", criadoEm: "4" },
    { id: "hist", origem: "movimentacao", dataEntrega: "2026-08-03", criadoEm: "2" },
    { id: "julho", origem: "movimentacao", dataEntrega: "2026-07-31", criadoEm: "1" }
  ]);
  const repo = criarPagamentosConsultaRepoFirestore(a);
  const lista = await repo.carregarPrimeiraPagina({ competencia: "2026-08", limitePagina: 6 });

  assert.deepEqual(new Set(lista.map(i => i.id)), new Set(["v2", "hist"]));
  assert.equal(a.chamadas.queries.length, 2);
  assert.ok(a.chamadas.queries.some(q => q.some(r => r.tipo === "where" && r.campo === "competencia" && r.operador === "==" && r.valor === "2026-08")));
  assert.ok(a.chamadas.queries.some(q => q.some(r => r.tipo === "where" && r.campo === "dataEntrega" && r.operador === ">=" && r.valor === "2026-08-01")));
  assert.ok(a.chamadas.queries.some(q => q.some(r => r.tipo === "where" && r.campo === "dataEntrega" && r.operador === "<" && r.valor === "2026-09-01")));
});

test("consulta mensal divide o limite entre V2 e historico para controlar leituras", async () => {
  const a = fake([
    { id: "v1", competencia: "2026-08" },
    { id: "v2", competencia: "2026-08" },
    { id: "h1", dataEntrega: "2026-08-03" },
    { id: "h2", dataEntrega: "2026-08-02" }
  ]);
  const repo = criarPagamentosConsultaRepoFirestore(a);
  await repo.carregarPrimeiraPagina({ competencia: "2026-08", limitePagina: 4 });
  const limites = a.chamadas.queries.map(q => q.find(r => r.tipo === "limit")?.valor).sort((x, y) => x - y);
  assert.deepEqual(limites, [2, 2]);
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

test("buscarTodos mensal inclui V2 e historico para relatorios criticos", async () => {
  const a = fake([
    { id: "v1", competencia: "2026-08", criadoEm: "3" },
    { id: "h1", dataEntrega: "2026-08-05", criadoEm: "2" },
    { id: "fora", dataEntrega: "2026-09-01", criadoEm: "1" }
  ]);
  const repo = criarPagamentosConsultaRepoFirestore(a);
  const todos = await repo.buscarTodos({ competencia: "2026-08", limitePagina: 4 });
  assert.deepEqual(new Set(todos.map(i => i.id)), new Set(["v1", "h1"]));
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
