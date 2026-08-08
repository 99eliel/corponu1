import test from "node:test";
import assert from "node:assert/strict";

import { FaccoesOperacionalService } from "../core/faccoes-operacional-service.mjs";

function ambiente() {
  const chamadas = [];
  let atual = {
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
  };

  const repo = {
    async buscarMovimentacao(id) {
      chamadas.push(["buscar", id]);
      return id === atual.id ? structuredClone(atual) : null;
    },
    async transacionarMovimentacao(id, resolver) {
      chamadas.push(["transacao", id]);
      if (id !== atual.id) return { ok: false, erros: ["MOVIMENTACAO_NAO_ENCONTRADA"] };
      const resultado = await resolver(structuredClone(atual));
      if (resultado?.ok && resultado.patch) {
        atual = { ...atual, ...structuredClone(resultado.patch) };
        return { ...resultado, movimentacao: structuredClone(atual) };
      }
      return resultado;
    },
    async transacionarReenvio(id, resolver) {
      chamadas.push(["reenvio", id]);
      if (id !== atual.id) return { ok: false, erros: ["MOVIMENTACAO_NAO_ENCONTRADA"] };
      const resultado = await resolver(structuredClone(atual));
      if (!resultado?.ok) return resultado;
      const nova = { id: "mov-2", ...structuredClone(resultado.dadosMovimentacao) };
      atual = {
        ...atual,
        ...structuredClone(resultado.patchOrigem),
        reenvioCriadoId: "mov-2"
      };
      return {
        ...resultado,
        movimentacaoOrigem: structuredClone(atual),
        novaMovimentacao: nova
      };
    }
  };

  return {
    service: new FaccoesOperacionalService({ repo }),
    chamadas,
    atual: () => structuredClone(atual)
  };
}

test("informar chegada usa uma única transação e não pagamento", async () => {
  const a = ambiente();
  const resultado = await a.service.informarChegada({
    id: "mov-1",
    usuario: { uid: "u1", nome: "Ligia" },
    dataHoje: "2026-08-08"
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.movimentacao.chegadaInformada, true);
  assert.deepEqual(a.chamadas, [["transacao", "mov-1"]]);
  assert.equal(
    a.chamadas.some(chamada => JSON.stringify(chamada).toLowerCase().includes("pagamento")),
    false
  );
});

test("segunda tentativa de aviso é bloqueada pelo estado atual da transação", async () => {
  const a = ambiente();
  const primeiro = await a.service.informarChegada({ id: "mov-1", dataHoje: "2026-08-08" });
  const segundo = await a.service.informarChegada({ id: "mov-1", dataHoje: "2026-08-08" });

  assert.equal(primeiro.ok, true);
  assert.equal(segundo.ok, false);
  assert.ok(segundo.erros.includes("CHEGADA_NAO_PODE_SER_INFORMADA"));
  assert.equal(a.chamadas.filter(([nome]) => nome === "transacao").length, 2);
});

test("admin confirma chegada operacional sem criar financeiro", async () => {
  const a = ambiente();
  await a.service.informarChegada({ id: "mov-1", dataHoje: "2026-08-08" });
  const resultado = await a.service.confirmarChegada({
    id: "mov-1",
    dataChegada: "2026-08-08",
    falta: 20,
    defeito: 10,
    usuario: { uid: "adm", nome: "Admin" }
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.movimentacao.quantidadeRecebida, 470);
  assert.equal(resultado.movimentacao.status, "retornou");
  assert.equal("statusPagamento" in resultado.movimentacao, false);
  assert.equal("total" in resultado.movimentacao, false);
});

test("componentes informados no admin são preservados no movimento", async () => {
  const a = ambiente();
  const resultado = await a.service.confirmarChegada({
    id: "mov-1",
    dataChegada: "2026-08-08",
    componentes: {
      lateral: true,
      lateralResponsavel: "MARIA",
      bojo: false
    }
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.movimentacao.componentesConsolidados.lateral.pronto, true);
  assert.equal(resultado.movimentacao.componentesConsolidados.lateral.responsavel, "MARIA");
  assert.equal(resultado.movimentacao.componentesConsolidados.bojo.pronto, false);
});

test("reenvio legítimo usa uma única transação de reenvio", async () => {
  const a = ambiente();
  await a.service.informarChegada({ id: "mov-1", dataHoje: "2026-08-08" });

  const resultado = await a.service.reenviar({
    id: "mov-1",
    processo: "SUTIÃ COMPLETO",
    destino: "KAKA",
    quantidade: 200,
    dataEnvio: "2026-08-08"
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.novaMovimentacao.id, "mov-2");
  assert.equal(resultado.novaMovimentacao.destino, "KAKA");
  assert.equal(a.chamadas.filter(([nome]) => nome === "reenvio").length, 1);
});

test("service bloqueia reenvio quando não existe quantidade disponível", async () => {
  const a = ambiente();
  await a.service.confirmarChegada({
    id: "mov-1",
    dataChegada: "2026-08-08",
    falta: 500,
    defeito: 0
  });

  const resultado = await a.service.reenviar({
    id: "mov-1",
    processo: "SUTIÃ COMPLETO",
    destino: "KAKA",
    quantidade: 1,
    dataEnvio: "2026-08-08"
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("QUANTIDADE_MAIOR_QUE_DISPONIVEL"));
});

test("Sutiã Completo reenvia sem perguntar Lateral ou Bojo", async () => {
  const a = ambiente();
  await a.service.informarChegada({ id: "mov-1", dataHoje: "2026-08-08" });

  const resultado = await a.service.reenviar({
    id: "mov-1",
    processo: "SUTIÃ COMPLETO",
    destino: "KAKA",
    quantidade: 100,
    dataEnvio: "2026-08-08"
  });

  assert.equal(resultado.ok, true);
  assert.equal("lateral" in resultado.novaMovimentacao, false);
  assert.equal("bojo" in resultado.novaMovimentacao, false);
});
