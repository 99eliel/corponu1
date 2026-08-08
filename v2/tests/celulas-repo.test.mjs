import test from "node:test";
import assert from "node:assert/strict";

import { criarCelulasRepoFirestore } from "../adapters/celulas-repo.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";

function ambiente() {
  const store = criarStoreCorpoNu();
  const metricas = { leituras: 0 };
  const db = { fake: true };
  const fs = {
    collection(_db, nome) { return { nome }; },
    async getDocs(ref) {
      assert.equal(ref.nome, "celulas");
      metricas.leituras += 1;
      return {
        docs: [
          { id: "1", data: () => ({ nome: "CELULA A", ativo: true }) },
          { id: "2", data: () => ({ nome: "CELULA B", ativo: true }) },
          { id: "3", data: () => ({ nome: "INATIVA", ativo: false }) }
        ]
      };
    }
  };
  return {
    store,
    metricas,
    repo: criarCelulasRepoFirestore({ db, fs, store })
  };
}

test("carrega células uma única vez", async () => {
  const a = ambiente();
  await a.repo.garantirCarregadas();
  await a.repo.garantirCarregadas();
  await a.repo.garantirCarregadas();

  assert.equal(a.metricas.leituras, 1);
  assert.deepEqual(a.store.listar("celulas").map(item => item.nome), ["CELULA A", "CELULA B"]);
});

test("chamadas concorrentes compartilham a mesma leitura", async () => {
  const a = ambiente();
  await Promise.all([
    a.repo.garantirCarregadas(),
    a.repo.garantirCarregadas(),
    a.repo.garantirCarregadas()
  ]);
  assert.equal(a.metricas.leituras, 1);
});

test("recarregar é a única forma de forçar nova leitura", async () => {
  const a = ambiente();
  await a.repo.garantirCarregadas();
  await a.repo.recarregar();
  await a.repo.garantirCarregadas();
  assert.equal(a.metricas.leituras, 2);
});
