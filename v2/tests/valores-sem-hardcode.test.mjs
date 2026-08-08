import test from "node:test";
import assert from "node:assert/strict";

import { criarValoresRepoFirestore } from "../adapters/firestore-repos.mjs";

test("configuração financeira ausente não inventa nenhum valor monetário", async () => {
  const db = {};
  const fs = {
    collection(_db, nome) { return { nome }; },
    query(ref, ...restricoes) { return { ref, restricoes }; },
    where(campo, operador, valor) { return { campo, operador, valor }; },
    async getDocs() { return { docs: [] }; },
    doc(_db, colecao, id) { return { colecao, id }; },
    async getDoc(ref) {
      assert.equal(ref.colecao, "configuracoes");
      assert.equal(ref.id, "sutia-completo-pagamento");
      return { exists: () => false, data: () => ({}) };
    }
  };

  const repo = criarValoresRepoFirestore({ db, fs });
  const config = await repo.buscarConfiguracaoSutiaCompleto();

  assert.deepEqual(config, {
    referenciaEspecial: "912",
    valorBaseGeral: 0,
    valorBaseReferenciaEspecial: 0,
    descontoFechoNaoFeito: 0,
    descontoPontoLuzNaoFeito: 0
  });
});
