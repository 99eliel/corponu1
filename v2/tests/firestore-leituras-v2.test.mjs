import test from "node:test";
import assert from "node:assert/strict";

import { criarPagamentosRepoFirestore } from "../adapters/firestore-repos.mjs";
import { criarChaveControleProcesso } from "../core/financeiro-regras.mjs";

function clone(valor) {
  return valor == null ? valor : structuredClone(valor);
}

function criarFake() {
  const db = { fake: true };
  const documentos = new Map();
  const metricas = {
    getDoc: 0,
    getDocs: 0,
    transactionGet: 0,
    transactionSet: 0
  };

  function snapshot(ref) {
    const item = documentos.get(`${ref.colecao}/${ref.id}`) || null;
    return {
      id: ref.id,
      exists: () => Boolean(item),
      data: () => clone(item)
    };
  }

  const fs = {
    collection(_db, nome) { return { nome }; },
    query(referencia, ...restricoes) { return { referencia, restricoes }; },
    where(campo, operador, valor) { return { campo, operador, valor }; },
    doc(_db, colecao, id) { return { colecao, id }; },
    async getDoc(ref) {
      metricas.getDoc += 1;
      return snapshot(ref);
    },
    async getDocs() {
      metricas.getDocs += 1;
      return { docs: [], empty: true };
    },
    serverTimestamp() { return { __serverTimestamp: true }; },
    async runTransaction(_db, callback) {
      return callback({
        async get(ref) {
          metricas.transactionGet += 1;
          return snapshot(ref);
        },
        set(ref, dados) {
          metricas.transactionSet += 1;
          documentos.set(`${ref.colecao}/${ref.id}`, clone(dados));
        }
      });
    }
  };

  return { db, fs, metricas, documentos };
}

function pagamento(quantidade = 200) {
  const base = {
    origem: "fechamento_financeiro_v2",
    tipoDocumento: "lancamento_financeiro_v2",
    opId: "op-58193",
    numeroOP: "58193",
    referencia: "414",
    tipoPeca: "sutia",
    competencia: "2026-08",
    processo: "SUTIÃ MONTAGEM",
    responsavel: "LIVIA",
    quantidade,
    quantidadeOP: 500,
    valorUnitario: 1.25,
    total: quantidade * 1.25,
    statusPagamento: "pendente"
  };
  return {
    ...base,
    chaveControle: criarChaveControleProcesso(base)
  };
}

test("consultas repetidas de saldo em poucos segundos não repetem leituras Firestore", async () => {
  const ambiente = criarFake();
  const repo = criarPagamentosRepoFirestore({
    db: ambiente.db,
    fs: ambiente.fs,
    ttlSaldoMs: 60000
  });

  const entrada = {
    opId: "op-58193",
    numeroOP: "58193",
    processo: "SUTIÃ MONTAGEM",
    quantidadeOP: 500
  };

  const primeira = await repo.obterSaldoProcesso(entrada);
  const leiturasDepoisPrimeira = {
    getDoc: ambiente.metricas.getDoc,
    getDocs: ambiente.metricas.getDocs
  };
  const segunda = await repo.obterSaldoProcesso(entrada);

  assert.deepEqual(segunda, primeira);
  assert.equal(ambiente.metricas.getDoc, leiturasDepoisPrimeira.getDoc);
  assert.equal(ambiente.metricas.getDocs, leiturasDepoisPrimeira.getDocs);
});

test("salvar atualiza o cache de saldo e a consulta seguinte faz zero leituras extras", async () => {
  const ambiente = criarFake();
  const repo = criarPagamentosRepoFirestore({
    db: ambiente.db,
    fs: ambiente.fs,
    ttlSaldoMs: 60000
  });

  const entradaSaldo = {
    opId: "op-58193",
    numeroOP: "58193",
    processo: "SUTIÃ MONTAGEM",
    quantidadeOP: 500
  };
  const inicial = await repo.obterSaldoProcesso(entradaSaldo);
  const salvo = await repo.salvarComSaldo(pagamento(200), { saldoInicial: inicial });
  assert.equal(salvo.ok, true);
  assert.equal(salvo.saldo.quantidadeRestante, 300);

  const antes = {
    getDoc: ambiente.metricas.getDoc,
    getDocs: ambiente.metricas.getDocs,
    transactionGet: ambiente.metricas.transactionGet
  };
  const depois = await repo.obterSaldoProcesso(entradaSaldo);

  assert.equal(depois.quantidadeFechada, 200);
  assert.equal(depois.quantidadeRestante, 300);
  assert.equal(ambiente.metricas.getDoc, antes.getDoc);
  assert.equal(ambiente.metricas.getDocs, antes.getDocs);
  assert.equal(ambiente.metricas.transactionGet, antes.transactionGet);
});

test("forçar saldo ignora cache quando uma conferência explícita do servidor for necessária", async () => {
  const ambiente = criarFake();
  const repo = criarPagamentosRepoFirestore({
    db: ambiente.db,
    fs: ambiente.fs,
    ttlSaldoMs: 60000
  });
  const entrada = {
    opId: "op-58193",
    numeroOP: "58193",
    processo: "SUTIÃ MONTAGEM",
    quantidadeOP: 500
  };

  await repo.obterSaldoProcesso(entrada);
  const getDocAntes = ambiente.metricas.getDoc;
  await repo.obterSaldoProcesso({ ...entrada, forcar: true });

  assert.equal(ambiente.metricas.getDoc, getDocAntes + 1);
});
