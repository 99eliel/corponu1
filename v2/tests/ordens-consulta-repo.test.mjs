import test from "node:test";
import assert from "node:assert/strict";

import { criarOrdensConsultaRepoFirestore } from "../adapters/ordens-consulta-repo.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";

function criarAmbiente(paginas) {
  const store = criarStoreCorpoNu();
  const chamadas = [];
  let indice = 0;
  const db = { fake: true };
  const fs = {
    collection(_db, nome) { return { nome }; },
    query(referencia, ...restricoes) { return { referencia, restricoes }; },
    orderBy(campo) { return { tipo: "orderBy", campo }; },
    documentId() { return "__name__"; },
    limit(valor) { return { tipo: "limit", valor }; },
    startAfter(cursor) { return { tipo: "startAfter", cursor }; },
    async getDocs(consulta) {
      chamadas.push(consulta);
      const dados = paginas[indice++] || [];
      return {
        docs: dados.map(item => ({
          id: item.id,
          data: () => ({ ...item })
        }))
      };
    }
  };
  return { db, fs, store, chamadas };
}

test("primeira página de OPs é lida uma única vez", async () => {
  const ambiente = criarAmbiente([[
    { id: "op-1", numeroOP: "1", tipoPeca: "sutia", quantidade: 100 },
    { id: "op-2", numeroOP: "2", tipoPeca: "calcinha", quantidade: 200 }
  ]]);
  const repo = criarOrdensConsultaRepoFirestore({
    ...ambiente,
    tamanhoPagina: 50
  });

  const primeira = await repo.carregarPrimeiraPagina();
  const repetida = await repo.carregarPrimeiraPagina();

  assert.equal(primeira.length, 2);
  assert.deepEqual(repetida, []);
  assert.equal(ambiente.chamadas.length, 1);
  assert.equal(ambiente.store.listar("ordens").length, 2);
});

test("página seguinte usa cursor e não relê documentos anteriores", async () => {
  const pagina1 = Array.from({ length: 20 }, (_, i) => ({
    id: `op-${String(i + 1).padStart(2, "0")}`,
    numeroOP: String(i + 1),
    tipoPeca: "sutia",
    quantidade: 100
  }));
  const pagina2 = [
    { id: "op-21", numeroOP: "21", tipoPeca: "sutia", quantidade: 100 }
  ];
  const ambiente = criarAmbiente([pagina1, pagina2]);
  const repo = criarOrdensConsultaRepoFirestore({ ...ambiente, tamanhoPagina: 20 });

  await repo.carregarPrimeiraPagina();
  const mais = await repo.carregarMais();

  assert.equal(mais.length, 1);
  assert.equal(ambiente.chamadas.length, 2);
  assert.ok(ambiente.chamadas[1].restricoes.some(item => item.tipo === "startAfter"));
  assert.equal(ambiente.store.listar("ordens").length, 21);
  assert.equal(repo.acabou(), true);
});

test("OP excluída ou cancelada não entra no store V2", async () => {
  const ambiente = criarAmbiente([[
    { id: "op-1", numeroOP: "1", quantidade: 100, tipoPeca: "sutia" },
    { id: "op-2", numeroOP: "2", quantidade: 100, tipoPeca: "sutia", excluida: true },
    { id: "op-3", numeroOP: "3", quantidade: 100, tipoPeca: "sutia", status: "cancelada" }
  ]]);
  const repo = criarOrdensConsultaRepoFirestore({ ...ambiente, tamanhoPagina: 50 });

  const itens = await repo.carregarPrimeiraPagina();
  assert.deepEqual(itens.map(item => item.id), ["op-1"]);
  assert.deepEqual(ambiente.store.listar("ordens").map(item => item.id), ["op-1"]);
});

test("paginação usa apenas ordensProducao e não cria listener em tempo real", async () => {
  const ambiente = criarAmbiente([[]]);
  const repo = criarOrdensConsultaRepoFirestore({ ...ambiente, tamanhoPagina: 50 });
  await repo.carregarPrimeiraPagina();

  assert.equal(ambiente.chamadas[0].referencia.nome, "ordensProducao");
});
