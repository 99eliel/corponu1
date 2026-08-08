import test from "node:test";
import assert from "node:assert/strict";

import { criarFaccoesRepoFirestore } from "../adapters/faccoes-repo.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";

function ambiente() {
  const metricas = { getDocs: 0 };
  const store = criarStoreCorpoNu();
  const db = { fake: true };
  const fs = {
    collection(_db, nome) {
      return { nome };
    },
    async getDocs(ref) {
      assert.equal(ref.nome, "faccoes");
      metricas.getDocs += 1;
      return {
        docs: [
          {
            id: "1",
            data: () => ({
              nome: "DANUBIA",
              ativo: true,
              processosPermitidos: ["SUTIÃ COMPLETO"]
            })
          },
          {
            id: "2",
            data: () => ({
              nome: "LIVIA",
              ativo: true,
              processosPermitidos: ["SUTIÃ MONTAGEM"]
            })
          },
          {
            id: "3",
            data: () => ({
              nome: "INATIVA",
              ativo: false,
              processosPermitidos: ["SUTIÃ COMPLETO"]
            })
          }
        ]
      };
    }
  };

  const repo = criarFaccoesRepoFirestore({ db, fs, store });
  return { repo, store, metricas };
}

test("garantirCarregadas lê Facções uma única vez", async () => {
  const { repo, store, metricas } = ambiente();

  const primeira = await repo.garantirCarregadas();
  const segunda = await repo.garantirCarregadas();
  const terceira = await repo.garantirCarregadas();

  assert.equal(metricas.getDocs, 1);
  assert.equal(repo.estaCarregado(), true);
  assert.equal(store.listar("faccoes").length, 2);
  assert.deepEqual(primeira, segunda);
  assert.deepEqual(segunda, terceira);
});

test("chamadas concorrentes compartilham a mesma leitura", async () => {
  const { repo, metricas } = ambiente();

  const [a, b, c] = await Promise.all([
    repo.garantirCarregadas(),
    repo.garantirCarregadas(),
    repo.garantirCarregadas()
  ]);

  assert.equal(metricas.getDocs, 1);
  assert.deepEqual(a, b);
  assert.deepEqual(b, c);
});

test("recarregar força somente uma nova leitura explícita", async () => {
  const { repo, metricas } = ambiente();

  await repo.garantirCarregadas();
  await repo.recarregar();
  await repo.garantirCarregadas();

  assert.equal(metricas.getDocs, 2);
});
