import test from "node:test";
import assert from "node:assert/strict";

import { criarFaccoesOperacionalRepoFirestore } from "../adapters/faccoes-operacional-repo.mjs";
import { criarPatchConfirmacaoChegada } from "../core/faccoes-operacional-regras.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";

function clonar(valor) {
  return valor === undefined ? undefined : structuredClone(valor);
}

function ambiente() {
  const store = criarStoreCorpoNu();
  const dados = {
    movimentacoesProducao: new Map([
      ["mov-1", {
        id: "mov-1",
        opId: "op-1",
        numeroOP: "58193",
        referencia: "414",
        tipoDestino: "faccao",
        processo: "SUTIÃ COMPLETO",
        setor: "sutia",
        quantidadeEnviada: 500,
        status: "em_andamento",
        componentesConsolidados: {
          lateral: { informado: true, pronto: true, responsavel: "MARIA" }
        }
      }]
    ]),
    ordensProducao: new Map([
      ["op-1", {
        id: "op-1",
        numeroOP: "58193",
        referencia: "414",
        tipoPeca: "sutia",
        componentesConsolidados: {
          lateral: { informado: true, pronto: true, responsavel: "MARIA" }
        }
      }]
    ])
  };
  const metricas = { gets: [], sets: [] };
  const db = {};

  function snapshot(ref) {
    const item = dados[ref.colecao]?.get(ref.id) || null;
    return {
      id: ref.id,
      exists: () => Boolean(item),
      data: () => clonar(item)
    };
  }

  const fs = {
    collection(_db, nome) { return { tipo: "collection", nome }; },
    doc(primeiro, segundo, terceiro) {
      if (primeiro?.tipo === "collection" && segundo === undefined) {
        return { colecao: primeiro.nome, id: "auto-1" };
      }
      return { colecao: segundo, id: terceiro };
    },
    async getDoc(ref) { return snapshot(ref); },
    serverTimestamp() { return { server: true }; },
    async runTransaction(_db, callback) {
      const pendentes = [];
      const tx = {
        async get(ref) {
          metricas.gets.push(clonar(ref));
          return snapshot(ref);
        },
        set(ref, patch, opcoes) {
          metricas.sets.push({ ref: clonar(ref), patch: clonar(patch), opcoes: clonar(opcoes) });
          pendentes.push({ ref, patch: clonar(patch), opcoes });
        }
      };
      const resultado = await callback(tx);
      for (const item of pendentes) {
        const atual = dados[item.ref.colecao]?.get(item.ref.id) || {};
        const componentes = item.patch.componentesConsolidados
          ? { ...(atual.componentesConsolidados || {}), ...item.patch.componentesConsolidados }
          : atual.componentesConsolidados;
        const proximo = item.opcoes?.merge
          ? { ...atual, ...item.patch, ...(componentes ? { componentesConsolidados: componentes } : {}) }
          : item.patch;
        dados[item.ref.colecao].set(item.ref.id, { id: item.ref.id, ...proximo });
      }
      return resultado;
    }
  };

  return {
    store,
    dados,
    metricas,
    repo: criarFaccoesOperacionalRepoFirestore({ db, fs, store })
  };
}

test("confirmar componente lê OP somente quando há componente novo", async () => {
  const a = ambiente();
  await a.repo.transacionarMovimentacao("mov-1", atual =>
    criarPatchConfirmacaoChegada({
      movimentacao: atual,
      dataChegada: "2026-08-08",
      componentes: { bojo: false }
    })
  );

  assert.deepEqual(
    a.metricas.gets.map(item => item.colecao),
    ["movimentacoesProducao", "ordensProducao"]
  );
});

test("componentes novos são mesclados na movimentação e na OP sem apagar os anteriores", async () => {
  const a = ambiente();
  const resultado = await a.repo.transacionarMovimentacao("mov-1", atual =>
    criarPatchConfirmacaoChegada({
      movimentacao: atual,
      dataChegada: "2026-08-08",
      componentes: {
        bojo: false,
        fecho: true,
        pontoLuz: false
      }
    })
  );

  assert.equal(resultado.ok, true);
  const mov = a.dados.movimentacoesProducao.get("mov-1");
  const op = a.dados.ordensProducao.get("op-1");

  assert.equal(mov.componentesConsolidados.lateral.pronto, true);
  assert.equal(mov.componentesConsolidados.bojo.pronto, false);
  assert.equal(op.componentesConsolidados.lateral.pronto, true);
  assert.equal(op.componentesConsolidados.bojo.pronto, false);
  assert.equal(op.componentesConsolidados.fecho.pronto, true);
  assert.equal(op.componentesConsolidados.pontoLuz.pronto, false);
});

test("transação com componentes escreve somente movimentação e OP", async () => {
  const a = ambiente();
  await a.repo.transacionarMovimentacao("mov-1", atual =>
    criarPatchConfirmacaoChegada({
      movimentacao: atual,
      dataChegada: "2026-08-08",
      componentes: { bojo: false }
    })
  );

  assert.deepEqual(
    new Set(a.metricas.sets.map(item => item.ref.colecao)),
    new Set(["movimentacoesProducao", "ordensProducao"])
  );
  assert.equal(
    a.metricas.sets.some(item => item.ref.colecao === "entregasPagamento"),
    false
  );
});

test("aviso simples continua sem leitura/escrita adicional na OP", async () => {
  const a = ambiente();
  await a.repo.transacionarMovimentacao("mov-1", atual => ({
    ok: true,
    erros: [],
    patch: {
      chegadaInformada: true,
      chegadaInformadaStatus: "aguardando_confirmacao_admin"
    }
  }));

  assert.deepEqual(a.metricas.gets.map(item => item.colecao), ["movimentacoesProducao"]);
  assert.deepEqual(a.metricas.sets.map(item => item.ref.colecao), ["movimentacoesProducao"]);
});
