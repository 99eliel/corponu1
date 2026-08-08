import test from "node:test";
import assert from "node:assert/strict";

import {
  criarOrdensRepoFirestore,
  criarPagamentosRepoFirestore,
  criarValoresRepoFirestore
} from "../adapters/firestore-repos.mjs";

function clone(valor) {
  return valor == null ? valor : structuredClone(valor);
}

function criarFirestoreFake({
  ordens = [],
  precos = [],
  configuracoes = {},
  pagamentos = []
} = {}) {
  const metricas = {
    getDocs: [],
    getDoc: [],
    transactionGet: [],
    transactionSet: []
  };

  const colecoes = new Map([
    ["ordensProducao", new Map(ordens.map(item => [item.id, clone(item)]))],
    ["precosReferencia", new Map(precos.map(item => [item.id, clone(item)]))],
    ["configuracoes", new Map(Object.entries(configuracoes).map(([id, item]) => [id, { id, ...clone(item) }]))],
    ["entregasPagamento", new Map(pagamentos.map(item => [item.id, clone(item)]))]
  ]);

  const db = { fake: true };

  function snapshotDocumento(ref) {
    const item = colecoes.get(ref.colecao)?.get(ref.id) || null;
    return {
      id: ref.id,
      exists: () => Boolean(item),
      data: () => clone(item)
    };
  }

  function aplicarFiltro(itens, filtro) {
    if (!filtro) return itens;
    return itens.filter(item => {
      const valor = item[filtro.campo];
      if (filtro.operador === "==") return valor === filtro.valor;
      if (filtro.operador === "in") {
        return Array.isArray(filtro.valor) && filtro.valor.some(alvo => alvo === valor);
      }
      throw new Error(`Operador fake não suportado: ${filtro.operador}`);
    });
  }

  const fs = {
    collection(_db, nome) {
      return { tipo: "collection", nome };
    },
    doc(_db, colecao, id) {
      return { tipo: "doc", colecao, id };
    },
    where(campo, operador, valor) {
      return { tipo: "where", campo, operador, valor };
    },
    limit(valor) {
      return { tipo: "limit", valor };
    },
    query(referencia, ...restricoes) {
      return { tipo: "query", referencia, restricoes };
    },
    async getDocs(consulta) {
      const nome = consulta.referencia.nome;
      metricas.getDocs.push({
        colecao: nome,
        restricoes: clone(consulta.restricoes)
      });

      let itens = [...(colecoes.get(nome)?.values() || [])].map(clone);
      const filtro = consulta.restricoes.find(item => item.tipo === "where");
      const limite = consulta.restricoes.find(item => item.tipo === "limit")?.valor;
      itens = aplicarFiltro(itens, filtro);
      if (Number.isFinite(limite)) itens = itens.slice(0, limite);

      return {
        docs: itens.map(item => ({
          id: item.id,
          data: () => clone(item)
        })),
        empty: itens.length === 0
      };
    },
    async getDoc(ref) {
      metricas.getDoc.push({ colecao: ref.colecao, id: ref.id });
      return snapshotDocumento(ref);
    },
    serverTimestamp() {
      return { __serverTimestamp: true };
    },
    async runTransaction(_db, callback) {
      const transacao = {
        async get(ref) {
          metricas.transactionGet.push({ colecao: ref.colecao, id: ref.id });
          return snapshotDocumento(ref);
        },
        set(ref, dados, opcoes) {
          metricas.transactionSet.push({
            colecao: ref.colecao,
            id: ref.id,
            dados: clone(dados),
            opcoes: clone(opcoes)
          });
          if (!colecoes.has(ref.colecao)) colecoes.set(ref.colecao, new Map());
          colecoes.get(ref.colecao).set(ref.id, clone(dados));
        }
      };
      return callback(transacao);
    }
  };

  return { fs, db, metricas, colecoes };
}

test("ordensRepo usa cache e faz zero leituras quando a OP já está no store", async () => {
  const ambiente = criarFirestoreFake();
  const cache = new Map([
    ["op-58193", {
      id: "op-58193",
      numeroOP: "58193",
      referencia: "414",
      quantidade: 500
    }]
  ]);

  const repo = criarOrdensRepoFirestore({
    db: ambiente.db,
    fs: ambiente.fs,
    cache
  });

  const op = await repo.buscarPorNumero("58193");
  assert.equal(op.numeroOP, "58193");
  assert.equal(ambiente.metricas.getDocs.length, 0);
});

test("ordensRepo encontra OP normal com uma única consulta por numeroOP", async () => {
  const ambiente = criarFirestoreFake({
    ordens: [{
      id: "op-58193",
      numeroOP: "58193",
      referencia: "414",
      quantidade: 500
    }]
  });

  const repo = criarOrdensRepoFirestore({ db: ambiente.db, fs: ambiente.fs });
  const op = await repo.buscarPorNumero("58193");

  assert.equal(op.id, "op-58193");
  assert.equal(ambiente.metricas.getDocs.length, 1);
  assert.equal(
    ambiente.metricas.getDocs[0].restricoes.find(item => item.tipo === "where").campo,
    "numeroOP"
  );
});

test("campos legados só são consultados quando numeroOP não encontra resultado", async () => {
  const ambiente = criarFirestoreFake({
    ordens: [{
      id: "legada-1",
      numeroOPExterno: "58193",
      referencia: "414",
      quantidade: 500
    }]
  });

  const repo = criarOrdensRepoFirestore({ db: ambiente.db, fs: ambiente.fs });
  const op = await repo.buscarPorNumero("58193");

  assert.equal(op.id, "legada-1");
  assert.equal(ambiente.metricas.getDocs.length, 2);
  const campos = ambiente.metricas.getDocs.map(chamada =>
    chamada.restricoes.find(item => item.tipo === "where").campo
  );
  assert.deepEqual(campos, ["numeroOP", "numeroOPExterno"]);
});

test("preços da mesma referência são lidos uma vez e reutilizados para componentes", async () => {
  const ambiente = criarFirestoreFake({
    precos: [
      { id: "414-mont", referencia: "414", processo: "SUTIÃ MONTAGEM", valor: 1.25, ativo: true },
      { id: "414-lat", referencia: "414", processo: "LATERAL", valor: 0.35, ativo: true },
      { id: "414-bojo", referencia: "414", processo: "ENCAPAR BOJO", valor: 0.70, ativo: true }
    ]
  });

  const repo = criarValoresRepoFirestore({ db: ambiente.db, fs: ambiente.fs });
  const montagem = await repo.buscarValorUnitario("414", "SUTIÃ MONTAGEM");
  const componentes = await repo.buscarValoresComponentes("414");

  assert.equal(montagem, 1.25);
  assert.deepEqual(componentes, { lateral: 0.35, bojo: 0.70 });
  assert.equal(ambiente.metricas.getDocs.length, 1);
  assert.equal(ambiente.metricas.getDocs[0].colecao, "precosReferencia");
});

test("configuração de Sutiã Completo usa cache compartilhado", async () => {
  const ambiente = criarFirestoreFake({
    configuracoes: {
      "sutia-completo-pagamento": {
        valorBaseGeral: 5.5,
        referenciaEspecial: "912",
        valorBaseReferenciaEspecial: 6.5,
        descontoFechoNaoFeito: 0.25,
        descontoPontoLuzNaoFeito: 0.15
      }
    }
  });

  const repo = criarValoresRepoFirestore({ db: ambiente.db, fs: ambiente.fs });
  const primeira = await repo.buscarConfiguracaoSutiaCompleto();
  const segunda = await repo.buscarConfiguracaoSutiaCompleto();

  assert.equal(primeira.valorBaseGeral, 5.5);
  assert.deepEqual(primeira, segunda);
  assert.equal(ambiente.metricas.getDoc.length, 1);
});

test("pagamentosRepo grava atomicamente somente em entregasPagamento", async () => {
  const ambiente = criarFirestoreFake();
  const repo = criarPagamentosRepoFirestore({ db: ambiente.db, fs: ambiente.fs });
  const documento = {
    origem: "fechamento_financeiro_v2",
    chaveFechamento: "fechamento-v2-op-1",
    numeroOP: "58193",
    competencia: "2026-08",
    processo: "SUTIÃ MONTAGEM",
    responsavel: "LIVIA",
    quantidade: 500,
    total: 625
  };

  const resultado = await repo.salvarSeAusente(documento.chaveFechamento, documento);

  assert.equal(resultado.ok, true);
  assert.equal(ambiente.metricas.transactionGet.length, 1);
  assert.equal(ambiente.metricas.transactionSet.length, 1);
  assert.equal(ambiente.metricas.transactionSet[0].colecao, "entregasPagamento");
  assert.equal(
    ambiente.metricas.transactionSet.some(item => item.colecao === "movimentacoesProducao"),
    false
  );
});

test("pagamentosRepo bloqueia duplicidade dentro da transação sem segundo set", async () => {
  const documento = {
    id: "fechamento-v2-op-1",
    origem: "fechamento_financeiro_v2",
    chaveFechamento: "fechamento-v2-op-1",
    numeroOP: "58193"
  };
  const ambiente = criarFirestoreFake({ pagamentos: [documento] });
  const repo = criarPagamentosRepoFirestore({ db: ambiente.db, fs: ambiente.fs });

  const resultado = await repo.salvarSeAusente(documento.id, documento);

  assert.equal(resultado.ok, false);
  assert.equal(resultado.motivo, "LANCAMENTO_DUPLICADO");
  assert.equal(ambiente.metricas.transactionGet.length, 1);
  assert.equal(ambiente.metricas.transactionSet.length, 0);
});

test("pagamentosRepo recusa qualquer coleção financeira alternativa", () => {
  const ambiente = criarFirestoreFake();

  assert.throws(
    () => criarPagamentosRepoFirestore({
      db: ambiente.db,
      fs: ambiente.fs,
      colecao: "movimentacoesProducao"
    }),
    /somente em entregasPagamento/
  );
});
