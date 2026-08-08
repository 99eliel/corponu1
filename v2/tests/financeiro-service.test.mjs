import test from "node:test";
import assert from "node:assert/strict";

import { FechamentoFinanceiroService } from "../core/financeiro-service.mjs";

function criarAmbiente() {
  const chamadas = [];
  const pagamentos = new Map();

  const op = {
    id: "op-58193",
    numeroOP: "58193",
    referencia: "414",
    cor: "PRETO",
    quantidade: 500,
    tipoPeca: "sutia",
    dataChegada: "2026-08-08",
    movimentacaoId: "mov-antiga"
  };

  const ordensRepo = {
    async buscarPorNumero(numeroOP) {
      chamadas.push(["buscarOP", numeroOP]);
      return numeroOP === "58193" ? { ...op } : null;
    }
  };

  const valoresRepo = {
    async buscarValorUnitario(referencia, processo) {
      chamadas.push(["buscarValorUnitario", referencia, processo]);
      const valores = {
        "SUTIÃ MONTAGEM": 1.25,
        "CALCINHA COMPLETA": 0.42,
        "CALCINHA MONTAGEM": 0.30,
        "ENCAPAR BOJO": 0.70,
        "ALÇA": 0.20,
        "LATERAL": 0.35
      };
      return valores[processo] || 0;
    },
    async buscarConfiguracaoSutiaCompleto() {
      chamadas.push(["buscarConfiguracaoSutiaCompleto"]);
      return {
        referenciaEspecial: "912",
        valorBaseGeral: 5.5,
        valorBaseReferenciaEspecial: 6.5,
        descontoFechoNaoFeito: 0.25,
        descontoPontoLuzNaoFeito: 0.15
      };
    },
    async buscarValoresComponentes(referencia) {
      chamadas.push(["buscarValoresComponentes", referencia]);
      return { lateral: 0.35, bojo: 0.70 };
    }
  };

  const pagamentosRepo = {
    async salvarSeAusente(chave, documento) {
      chamadas.push(["salvarSeAusente", chave]);
      if (pagamentos.has(chave)) {
        return {
          ok: false,
          motivo: "LANCAMENTO_DUPLICADO",
          existente: structuredClone(pagamentos.get(chave))
        };
      }

      const salvo = structuredClone(documento);
      pagamentos.set(chave, salvo);
      return { ok: true, documento: structuredClone(salvo) };
    }
  };

  const service = new FechamentoFinanceiroService({
    ordensRepo,
    valoresRepo,
    pagamentosRepo
  });

  return { service, chamadas, pagamentos, op };
}

test("busca OP sem consultar movimentações", async () => {
  const { service, chamadas } = criarAmbiente();
  const resultado = await service.carregarOP("58193");

  assert.equal(resultado.ok, true);
  assert.equal(resultado.op.numeroOP, "58193");
  assert.deepEqual(chamadas, [["buscarOP", "58193"]]);
});

test("cria fechamento de processo comum sem usar data de chegada", async () => {
  const { service, pagamentos } = criarAmbiente();

  const resultado = await service.salvarLancamento({
    numeroOP: "58193",
    processo: "SUTIÃ MONTAGEM",
    responsavel: "LIVIA",
    competencia: "2026-07",
    quantidade: 500,
    ocorrencia: 1
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.salvo.competencia, "2026-07");
  assert.equal(resultado.salvo.total, 625);
  assert.equal("dataChegada" in resultado.salvo, false);
  assert.equal("movimentacaoId" in resultado.salvo, false);
  assert.equal(pagamentos.size, 1);
});

test("bloqueia repetição exata do mesmo fechamento na mesma operação de persistência", async () => {
  const { service, pagamentos, chamadas } = criarAmbiente();
  const entrada = {
    numeroOP: "58193",
    processo: "SUTIÃ MONTAGEM",
    responsavel: "LIVIA",
    competencia: "2026-08",
    quantidade: 250,
    ocorrencia: 1
  };

  const primeiro = await service.salvarLancamento(entrada);
  const segundo = await service.salvarLancamento(entrada);

  assert.equal(primeiro.ok, true);
  assert.equal(segundo.ok, false);
  assert.deepEqual(segundo.erros, ["LANCAMENTO_DUPLICADO"]);
  assert.equal(pagamentos.size, 1);

  const operacoesPersistencia = chamadas.filter(([nome]) => nome === "salvarSeAusente");
  assert.equal(operacoesPersistencia.length, 2);
  assert.equal(
    chamadas.some(([nome]) => nome === "buscarPagamento"),
    false
  );
});

test("permite ocorrência 2 para retrabalho legítimo", async () => {
  const { service, pagamentos } = criarAmbiente();
  const base = {
    numeroOP: "58193",
    processo: "SUTIÃ MONTAGEM",
    responsavel: "LIVIA",
    competencia: "2026-08",
    quantidade: 100
  };

  const primeiro = await service.salvarLancamento({ ...base, ocorrencia: 1 });
  const retrabalho = await service.salvarLancamento({ ...base, ocorrencia: 2 });

  assert.equal(primeiro.ok, true);
  assert.equal(retrabalho.ok, true);
  assert.notEqual(
    primeiro.salvo.chaveFechamento,
    retrabalho.salvo.chaveFechamento
  );
  assert.equal(pagamentos.size, 2);
});

test("fechamento parcial não cria saldo operacional nem movimentação", async () => {
  const { service, chamadas } = criarAmbiente();

  const resultado = await service.salvarLancamento({
    numeroOP: "58193",
    processo: "SUTIÃ MONTAGEM",
    responsavel: "LIVIA",
    competencia: "2026-08",
    quantidade: 180
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.salvo.quantidade, 180);
  assert.equal(resultado.salvo.quantidadeOP, 500);
  assert.equal(
    chamadas.some(chamada => String(chamada[0]).toLowerCase().includes("moviment")),
    false
  );
});

test("Sutiã Completo usa cálculo consolidado no serviço", async () => {
  const { service } = criarAmbiente();

  const resultado = await service.prepararLancamento({
    numeroOP: "58193",
    processo: "SUTIÃ COMPLETO",
    responsavel: "DANUBIA",
    competencia: "2026-08",
    quantidade: 100,
    componentes: {
      lateral: true,
      bojo: true,
      fecho: true,
      pontoLuz: true
    }
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.calculo.valorUnitario, 4.45);
  assert.equal(resultado.documento.total, 445);
});

test("Sutiã Completo para se componente necessário estiver não informado", async () => {
  const { service } = criarAmbiente();

  const resultado = await service.prepararLancamento({
    numeroOP: "58193",
    processo: "SUTIÃ COMPLETO",
    responsavel: "DANUBIA",
    competencia: "2026-08",
    quantidade: 100,
    componentes: {
      lateral: null,
      bojo: true,
      fecho: true,
      pontoLuz: true
    }
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("LATERAL_NAO_INFORMADA"));
});

test("OP inexistente não produz lançamento", async () => {
  const { service, pagamentos } = criarAmbiente();

  const resultado = await service.salvarLancamento({
    numeroOP: "99999",
    processo: "CALCINHA COMPLETA",
    responsavel: "LORENA",
    competencia: "2026-08",
    quantidade: 100
  });

  assert.equal(resultado.ok, false);
  assert.deepEqual(resultado.erros, ["OP_NAO_ENCONTRADA"]);
  assert.equal(pagamentos.size, 0);
});
