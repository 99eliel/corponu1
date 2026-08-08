import test from "node:test";
import assert from "node:assert/strict";

import { criarManejoRepoFirestore } from "../adapters/manejo-repo.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";

function clonar(valor) {
  return valor === undefined ? undefined : structuredClone(valor);
}

function ambiente() {
  const store = criarStoreCorpoNu();
  const colecoes = new Map([
    ["ordensProducao", new Map()],
    ["movimentacoesProducao", new Map()],
    ["entregasPagamento", new Map()]
  ]);
  const metricas = {
    getDoc: [],
    setDoc: [],
    batches: []
  };
  let autoId = 0;
  const db = { fake: true };

  const fs = {
    collection(_db, nome) {
      return { tipo: "collection", nome };
    },
    doc(primeiro, segundo, terceiro) {
      if (primeiro?.tipo === "collection" && segundo === undefined) {
        autoId += 1;
        return { colecao: primeiro.nome, id: `auto-${autoId}` };
      }
      return { colecao: segundo, id: terceiro };
    },
    async getDoc(ref) {
      metricas.getDoc.push({ ...ref });
      const item = colecoes.get(ref.colecao)?.get(ref.id) || null;
      return {
        id: ref.id,
        exists: () => Boolean(item),
        data: () => clonar(item)
      };
    },
    async setDoc(ref, dados, opcoes) {
      metricas.setDoc.push({ ref: clonar(ref), dados: clonar(dados), opcoes: clonar(opcoes) });
      const atual = colecoes.get(ref.colecao)?.get(ref.id) || {};
      const proximo = opcoes?.merge ? { ...atual, ...clonar(dados) } : clonar(dados);
      colecoes.get(ref.colecao).set(ref.id, proximo);
    },
    serverTimestamp() {
      return { serverTimestamp: true };
    },
    writeBatch() {
      const operacoes = [];
      const batch = {
        set(ref, dados, opcoes) {
          operacoes.push({ tipo: "set", ref: clonar(ref), dados: clonar(dados), opcoes: clonar(opcoes) });
          return batch;
        },
        async commit() {
          for (const op of operacoes) {
            const atual = colecoes.get(op.ref.colecao)?.get(op.ref.id) || {};
            const proximo = op.opcoes?.merge ? { ...atual, ...clonar(op.dados) } : clonar(op.dados);
            colecoes.get(op.ref.colecao).set(op.ref.id, proximo);
          }
          metricas.batches.push(clonar(operacoes));
        }
      };
      return batch;
    }
  };

  const ordem = {
    id: "op-1",
    numeroOP: "58193",
    referencia: "414",
    cor: "PRETO",
    quantidade: 500,
    tipoPeca: "sutia",
    manejosSetores: {}
  };
  store.upsert("ordens", ordem);

  return {
    store,
    fs,
    db,
    colecoes,
    metricas,
    ordem,
    repo: criarManejoRepoFirestore({ db, fs, store })
  };
}

function manejo() {
  return {
    setor: "sutia",
    setorLabel: "Sutiã",
    fase: "SEPARAÇÃO",
    silk: "SILK A",
    silkNome: "SILK A",
    silkData: "",
    tecido: "FORNECEDOR X",
    tecidoNome: "FORNECEDOR X",
    dataTecido: "2026-08-08",
    necessidade: "URGENTE",
    necessidadeTexto: "URGENTE",
    falta: 0,
    status: "organizada"
  };
}

function movimento() {
  return {
    origem: "manejo",
    movimentacaoOrigemId: "",
    opId: "op-1",
    numeroOP: "58193",
    referencia: "414",
    cor: "PRETO",
    tipoDestino: "faccao",
    tipoDestinoLabel: "Facção",
    destino: "DANUBIA",
    processo: "SUTIÃ COMPLETO",
    setor: "sutia",
    setorLabel: "Sutiã",
    quantidadeEnviada: 500,
    dataEnvio: "2026-08-08",
    dataChegada: "",
    falta: 0,
    quantidadeRecebida: 0,
    status: "em_andamento",
    reenvio: false
  };
}

test("salvar Manejo grava somente em ordensProducao e atualiza store", async () => {
  const a = ambiente();
  await a.repo.salvarManejo({
    ordem: a.ordem,
    setor: "sutia",
    manejo: manejo(),
    usuario: { uid: "u1" }
  });

  assert.equal(a.metricas.setDoc.length, 1);
  assert.equal(a.metricas.setDoc[0].ref.colecao, "ordensProducao");
  assert.equal(a.colecoes.get("entregasPagamento").size, 0);
  assert.equal(a.store.obter("ordens", "op-1").manejosSetores.sutia.fase, "SEPARAÇÃO");
  assert.equal(a.store.obter("ordens", "op-1").necessidade, "URGENTE");
});

test("movimentar usa um único batch com OP + movimentação", async () => {
  const a = ambiente();
  const resultado = await a.repo.criarMovimentacaoComManejo({
    ordem: a.ordem,
    setor: "sutia",
    manejo: manejo(),
    movimentacao: movimento(),
    usuario: { uid: "u1" }
  });

  assert.equal(a.metricas.batches.length, 1);
  const colecoes = a.metricas.batches[0].map(op => op.ref.colecao);
  assert.deepEqual(new Set(colecoes), new Set(["ordensProducao", "movimentacoesProducao"]));
  assert.equal(colecoes.includes("entregasPagamento"), false);
  assert.equal(resultado.movimentacao.id, "auto-1");
  assert.equal(a.store.obter("movimentacoes", "auto-1").destino, "DANUBIA");
});

test("reenvio atualiza a movimentação de origem no mesmo batch", async () => {
  const a = ambiente();
  a.store.upsert("movimentacoes", {
    id: "mov-antiga",
    opId: "op-1",
    status: "retornou"
  });
  const mov = { ...movimento(), origem: "movimentacao", movimentacaoOrigemId: "mov-antiga", reenvio: true };

  await a.repo.criarMovimentacaoComManejo({
    ordem: a.ordem,
    setor: "sutia",
    manejo: manejo(),
    movimentacao: mov,
    usuario: { uid: "u1" },
    movimentacaoOrigemId: "mov-antiga"
  });

  assert.equal(a.metricas.batches[0].length, 3);
  const origem = a.metricas.batches[0].find(op => op.ref.id === "mov-antiga");
  assert.equal(origem.dados.status, "encaminhado");
  assert.equal(origem.dados.encaminhadoParaDestino, "DANUBIA");
  assert.equal(a.store.obter("movimentacoes", "mov-antiga").status, "encaminhado");
});

test("Manejo repo não cria nenhum documento financeiro", async () => {
  const a = ambiente();
  await a.repo.criarMovimentacaoComManejo({
    ordem: a.ordem,
    setor: "sutia",
    manejo: manejo(),
    movimentacao: movimento()
  });

  assert.equal(a.colecoes.get("entregasPagamento").size, 0);
  assert.equal(
    a.metricas.batches.flat().some(op => op.ref.colecao === "entregasPagamento"),
    false
  );
});

test("buscarOrdem usa store sem leitura quando já carregada", async () => {
  const a = ambiente();
  const ordem = await a.repo.buscarOrdem("op-1");
  assert.equal(ordem.numeroOP, "58193");
  assert.equal(a.metricas.getDoc.length, 0);
});
