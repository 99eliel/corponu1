import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { criarFaccoesRepoFirestore } from "../adapters/faccoes-repo.mjs";
import {
  COLECOES_FIREBASE_V2,
  criarContextoFirebaseV2
} from "../bootstrap/firebase-context.mjs";

function criarFirestoreFake() {
  const metricas = { getDocs: [] };
  const db = { fake: true };
  const faccoes = [
    { id: "f1", nome: "LIVIA", ativo: true, processos: ["SUTIÃ MONTAGEM"] },
    { id: "f2", nome: "LORENA", ativo: true, processos: ["CALCINHA COMPLETA"] }
  ];

  function nomeColecao(ref) {
    return ref?.nome || ref?.referencia?.nome || ref?.colecao || "";
  }

  const fs = {
    collection(_db, nome) { return { tipo: "collection", nome }; },
    query(referencia, ...restricoes) { return { tipo: "query", referencia, restricoes }; },
    where(campo, operador, valor) { return { tipo: "where", campo, operador, valor }; },
    orderBy(campo, direcao) { return { tipo: "orderBy", campo, direcao }; },
    documentId() { return "__name__"; },
    limit(valor) { return { tipo: "limit", valor }; },
    startAfter(cursor) { return { tipo: "startAfter", cursor }; },
    doc(base, colecao, id) {
      if (base?.tipo === "collection" && colecao === undefined) {
        return { tipo: "doc", colecao: base.nome, id: "auto-id" };
      }
      return { tipo: "doc", colecao, id };
    },
    async getDoc(ref) {
      return { id: ref.id, exists: () => false, data: () => ({}) };
    },
    async getDocs(ref) {
      const colecao = nomeColecao(ref);
      metricas.getDocs.push(colecao);
      const itens = colecao === "faccoes" ? faccoes : [];
      return {
        docs: itens.map(item => ({ id: item.id, data: () => ({ ...item }) })),
        empty: itens.length === 0
      };
    },
    async setDoc() {},
    serverTimestamp() { return { __serverTimestamp: true }; },
    writeBatch() {
      return {
        set() {},
        update() {},
        async commit() {}
      };
    },
    async runTransaction(_db, callback) {
      return callback({
        async get(ref) { return fs.getDoc(ref); },
        set() {}
      });
    }
  };

  return { db, fs, metricas };
}

test("contexto V2 usa exatamente as coleções reais esperadas", () => {
  assert.deepEqual(COLECOES_FIREBASE_V2, {
    ordens: "ordensProducao",
    movimentacoes: "movimentacoesProducao",
    faccoes: "faccoes",
    produtos: "produtos",
    precos: "precosReferencia",
    configuracoes: "configuracoes",
    pagamentos: "entregasPagamento"
  });
});

test("um único contexto compartilha store e repositórios entre todos os módulos", () => {
  const ambiente = criarFirestoreFake();
  const contexto = criarContextoFirebaseV2({ db: ambiente.db, fs: ambiente.fs });

  assert.ok(contexto.store);
  assert.ok(contexto.faccoesRepo);
  assert.ok(contexto.produtosRepo);
  assert.ok(contexto.ordensConsultaRepo);
  assert.ok(contexto.ordensGravacaoRepo);
  assert.ok(contexto.manejoRepo);
  assert.ok(contexto.movimentacoesFaccoesRepo);
  assert.ok(contexto.faccoesOperacionalRepo);
  assert.ok(contexto.repositoriosFinanceiro);
  assert.ok(contexto.pagamentosConsultaRepo);
  assert.equal(contexto.repositoriosFinanceiro.ordensRepo !== contexto.ordensGravacaoRepo, true);
});

test("catálogo de facções é lido uma vez e reaproveitado até por outro repo no mesmo store", async () => {
  const ambiente = criarFirestoreFake();
  const contexto = criarContextoFirebaseV2({ db: ambiente.db, fs: ambiente.fs });

  await contexto.garantirFaccoes();
  await contexto.garantirFaccoes();
  assert.equal(ambiente.metricas.getDocs.filter(nome => nome === "faccoes").length, 1);

  const outroRepo = criarFaccoesRepoFirestore({
    db: ambiente.db,
    fs: ambiente.fs,
    store: contexto.store
  });
  await outroRepo.garantirCarregadas();

  assert.equal(ambiente.metricas.getDocs.filter(nome => nome === "faccoes").length, 1);
  assert.equal(outroRepo.listar().length, 2);
});

test("primeira página de OPs do contexto não é relida ao trocar de módulo", async () => {
  const ambiente = criarFirestoreFake();
  const contexto = criarContextoFirebaseV2({ db: ambiente.db, fs: ambiente.fs });

  await contexto.carregarPrimeiraPaginaOrdens();
  await contexto.carregarPrimeiraPaginaOrdens();

  assert.equal(ambiente.metricas.getDocs.filter(nome => nome === "ordensProducao").length, 1);
});

test("contexto e ponto de integração não inicializam um segundo Firebase", async () => {
  const contextoFonte = await readFile(new URL("../bootstrap/firebase-context.mjs", import.meta.url), "utf8");
  const integracaoFonte = await readFile(new URL("../bootstrap/corpo-nu-flow-firebase.mjs", import.meta.url), "utf8");
  const fonte = `${contextoFonte}\n${integracaoFonte}`;

  assert.doesNotMatch(fonte, /initializeApp\s*\(/);
  assert.doesNotMatch(fonte, /initializeFirestore\s*\(/);
  assert.doesNotMatch(fonte, /getFirestore\s*\(/);
});
