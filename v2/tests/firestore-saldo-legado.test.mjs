import test from "node:test";
import assert from "node:assert/strict";

import { criarPagamentosRepoFirestore } from "../adapters/firestore-repos.mjs";

test("saldo inicial soma pagamentos da mesma OP com opId e somente numeroOP", async () => {
  const pagamentos = [
    {
      id: "p-com-opid",
      opId: "op-100",
      numeroOP: "100",
      processo: "SUTIÃ MONTAGEM",
      quantidade: 200,
      statusPagamento: "pago"
    },
    {
      id: "p-legado-sem-opid",
      numeroOP: "100",
      processo: "SUTIÃ MONTAGEM",
      quantidade: 100,
      statusPagamento: "pendente"
    },
    {
      id: "p-outro-processo",
      opId: "op-100",
      numeroOP: "100",
      processo: "ALÇA",
      quantidade: 500,
      statusPagamento: "pago"
    }
  ];

  const fs = {
    collection(_db, nome) { return { nome }; },
    query(referencia, ...restricoes) { return { referencia, restricoes }; },
    where(campo, operador, valor) { return { campo, operador, valor }; },
    doc(_db, colecao, id) { return { colecao, id }; },
    async getDoc(ref) {
      return { id: ref.id, exists: () => false, data: () => null };
    },
    async getDocs(consulta) {
      const filtro = consulta.restricoes[0];
      const encontrados = pagamentos.filter(item => {
        if (filtro.operador !== "==") return false;
        return item[filtro.campo] === filtro.valor;
      });
      return {
        docs: encontrados.map(item => ({ id: item.id, data: () => ({ ...item }) }))
      };
    },
    async runTransaction() { throw new Error("não usado neste teste"); },
    serverTimestamp() { return {}; }
  };

  const repo = criarPagamentosRepoFirestore({ db: {}, fs });
  const saldo = await repo.obterSaldoProcesso({
    opId: "op-100",
    numeroOP: "100",
    processo: "SUTIÃ MONTAGEM",
    quantidadeOP: 500
  });

  assert.equal(saldo.quantidadeFechada, 300);
  assert.equal(saldo.quantidadeRestante, 200);
  assert.equal(saldo.quantidadeLancamentos, 2);
});
