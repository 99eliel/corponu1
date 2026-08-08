import test from "node:test";
import assert from "node:assert/strict";

import { criarFaccoesOperacionalRepoFirestore } from "../adapters/faccoes-operacional-repo.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";
import {
  criarDadosReenvioOperacional,
  criarPatchAvisoChegada,
  criarPatchConfirmacaoChegada
} from "../core/faccoes-operacional-regras.mjs";

function clonar(valor) {
  return valor === undefined ? undefined : structuredClone(valor);
}

function ambiente() {
  const store = criarStoreCorpoNu();
  const movimentos = new Map([
    ["mov-1", {
      id: "mov-1",
      opId: "op-1",
      numeroOP: "58193",
      referencia: "414",
      cor: "PRETO",
      tipoDestino: "faccao",
      destino: "DANUBIA",
      processo: "SUTIÃ COMPLETO",
      setor: "sutia",
      quantidadeEnviada: 500,
      dataChegada: "",
      falta: 0,
      defeito: 0,
      quantidadeRecebida: 0,
      status: "em_andamento"
    }]
  ]);
  const metricas = { getDoc: 0, transacoes: 0, gets: [], sets: [] };
  const db = { fake: true };
  let autoId = 1;

  function snapshot(ref) {
    const item = movimentos.get(ref.id) || null;
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
        autoId += 1;
        return { colecao: primeiro.nome, id: `mov-${autoId}` };
      }
      return { colecao: segundo, id: terceiro };
    },
    async getDoc(ref) {
      metricas.getDoc += 1;
      return snapshot(ref);
    },
    serverTimestamp() { return { server: true }; },
    async runTransaction(_db, callback) {
      metricas.transacoes += 1;
      const pendentes = [];
      const tx = {
        async get(ref) {
          metricas.gets.push(clonar(ref));
          return snapshot(ref);
        },
        set(ref, dados, opcoes) {
          pendentes.push({ ref: clonar(ref), dados: clonar(dados), opcoes: clonar(opcoes) });
          metricas.sets.push({ ref: clonar(ref), dados: clonar(dados), opcoes: clonar(opcoes) });
        }
      };
      const resultado = await callback(tx);
      for (const op of pendentes) {
        const atual = movimentos.get(op.ref.id) || {};
        const proximo = op.opcoes?.merge
          ? {
              ...atual,
              ...clonar(op.dados),
              componentesConsolidados: op.dados.componentesConsolidados
                ? { ...(atual.componentesConsolidados || {}), ...clonar(op.dados.componentesConsolidados) }
                : atual.componentesConsolidados
            }
          : clonar(op.dados);
        movimentos.set(op.ref.id, { id: op.ref.id, ...proximo });
      }
      return resultado;
    }
  };

  const repo = criarFaccoesOperacionalRepoFirestore({ db, fs, store });
  return { repo, store, movimentos, metricas };
}

test("buscarMovimentacao usa store antes de Firestore", async () => {
  const a = ambiente();
  a.store.upsert("movimentacoes", { id: "mov-1", numeroOP: "58193", tipoDestino: "faccao" });

  const resultado = await a.repo.buscarMovimentacao("mov-1");
  assert.equal(resultado.numeroOP, "58193");
  assert.equal(a.metricas.getDoc, 0);
});

test("aviso de chegada faz uma transação e um único set operacional", async () => {
  const a = ambiente();
  const resultado = await a.repo.transacionarMovimentacao("mov-1", atual =>
    criarPatchAvisoChegada({ movimentacao: atual, usuario: { uid: "u1", nome: "Ligia" }, dataHoje: "2026-08-08" })
  );

  assert.equal(resultado.ok, true);
  assert.equal(a.metricas.transacoes, 1);
  assert.equal(a.metricas.gets.length, 1);
  assert.equal(a.metricas.sets.length, 1);
  assert.equal(a.metricas.sets[0].ref.colecao, "movimentacoesProducao");
  assert.equal(a.store.obter("movimentacoes", "mov-1").chegadaInformada, true);
});

test("confirmação de chegada continua em movimentacoesProducao e mescla componentes", async () => {
  const a = ambiente();
  a.movimentos.get("mov-1").componentesConsolidados = {
    lateral: { informado: true, pronto: true, responsavel: "MARIA" }
  };

  const resultado = await a.repo.transacionarMovimentacao("mov-1", atual =>
    criarPatchConfirmacaoChegada({
      movimentacao: atual,
      dataChegada: "2026-08-08",
      componentes: { bojo: false },
      usuario: { uid: "adm", nome: "Admin" }
    })
  );

  assert.equal(resultado.ok, true);
  assert.equal(a.metricas.sets.length, 1);
  assert.equal(a.metricas.sets[0].ref.colecao, "movimentacoesProducao");
  const local = a.store.obter("movimentacoes", "mov-1");
  assert.equal(local.componentesConsolidados.lateral.pronto, true);
  assert.equal(local.componentesConsolidados.bojo.pronto, false);
});

test("resolver inválido não executa set", async () => {
  const a = ambiente();
  const resultado = await a.repo.transacionarMovimentacao("mov-1", () => ({
    ok: false,
    erros: ["BLOQUEADO"],
    patch: null
  }));

  assert.equal(resultado.ok, false);
  assert.equal(a.metricas.transacoes, 1);
  assert.equal(a.metricas.sets.length, 0);
});

test("reenvio cria novo movimento e marca origem na mesma transação", async () => {
  const a = ambiente();
  a.movimentos.get("mov-1").chegadaInformada = true;

  const resultado = await a.repo.transacionarReenvio(
    "mov-1",
    atual => criarDadosReenvioOperacional({
      movimentacao: atual,
      processo: "SUTIÃ COMPLETO",
      destino: "KAKA",
      quantidade: 200,
      dataEnvio: "2026-08-08"
    }),
    { uid: "u1" }
  );

  assert.equal(resultado.ok, true);
  assert.equal(a.metricas.transacoes, 1);
  assert.equal(a.metricas.sets.length, 2);
  assert.equal(a.metricas.sets.every(item => item.ref.colecao === "movimentacoesProducao"), true);
  assert.equal(resultado.novaMovimentacao.id, "mov-2");
  assert.equal(a.store.obter("movimentacoes", "mov-1").reenvioCriadoId, "mov-2");
  assert.equal(a.store.obter("movimentacoes", "mov-2").destino, "KAKA");
});

test("nenhuma transação operacional escreve em entregasPagamento", async () => {
  const a = ambiente();
  await a.repo.transacionarMovimentacao("mov-1", atual =>
    criarPatchAvisoChegada({ movimentacao: atual, dataHoje: "2026-08-08" })
  );

  assert.equal(
    a.metricas.sets.some(item => item.ref.colecao === "entregasPagamento"),
    false
  );
});
