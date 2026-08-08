import test from "node:test";
import assert from "node:assert/strict";

import { FechamentoFinanceiroService } from "../core/financeiro-service.mjs";
import { criarChaveLancamento, validarSaldoProcesso } from "../core/financeiro-regras.mjs";
import { processoCanonico } from "../core/normalizacao.mjs";

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
      return {
        referenciaEspecial: "912",
        valorBaseGeral: 5.5,
        valorBaseReferenciaEspecial: 6.5,
        descontoFechoNaoFeito: 0.25,
        descontoPontoLuzNaoFeito: 0.15
      };
    },
    async buscarValoresComponentes() {
      return { lateral: 0.35, bojo: 0.70 };
    }
  };

  function itensProcesso({ opId, processo }) {
    return [...pagamentos.values()].filter(item =>
      item.opId === opId && processoCanonico(item.processo) === processoCanonico(processo)
    );
  }

  const pagamentosRepo = {
    async obterSaldoProcesso({ opId, processo, quantidadeOP }) {
      const itens = itensProcesso({ opId, processo });
      const quantidadeFechada = itens.reduce((soma, item) => soma + item.quantidade, 0);
      chamadas.push(["obterSaldo", processoCanonico(processo), quantidadeFechada]);
      return {
        quantidadeOP,
        quantidadeFechada,
        quantidadeRestante: quantidadeOP - quantidadeFechada,
        quantidadeLancamentos: itens.length
      };
    },
    async salvarComSaldo(documento) {
      const saldoAtual = await this.obterSaldoProcesso(documento);
      const saldo = validarSaldoProcesso({
        quantidadeOP: documento.quantidadeOP,
        quantidadeFechada: saldoAtual.quantidadeFechada,
        quantidadeNova: documento.quantidade
      });
      if (!saldo.ok) return { ok: false, motivo: saldo.erros[0], saldo };
      const parcela = saldoAtual.quantidadeLancamentos + 1;
      const id = criarChaveLancamento({ ...documento, parcela });
      const salvo = { ...structuredClone(documento), id, chaveFechamento: id, parcela };
      pagamentos.set(id, salvo);
      chamadas.push(["salvarComSaldo", id]);
      return {
        ok: true,
        documento: structuredClone(salvo),
        saldo: {
          ...saldo,
          quantidadeFechada: saldo.quantidadeFechadaDepois,
          quantidadeRestante: saldo.quantidadeRestanteDepois,
          quantidadeLancamentos: parcela
        }
      };
    }
  };

  const service = new FechamentoFinanceiroService({ ordensRepo, valoresRepo, pagamentosRepo });
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
    numeroOP: "58193", processo: "SUTIÃ MONTAGEM", responsavel: "LIVIA",
    competencia: "2026-07", quantidade: 500
  });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.salvo.total, 625);
  assert.equal("dataChegada" in resultado.salvo, false);
  assert.equal("movimentacaoId" in resultado.salvo, false);
  assert.equal("ocorrencia" in resultado.salvo, false);
  assert.equal(resultado.saldo.quantidadeRestante, 0);
  assert.equal(pagamentos.size, 1);
});

test("permite parcelas até completar a quantidade da OP e bloqueia qualquer excedente", async () => {
  const { service, pagamentos } = criarAmbiente();

  const primeira = await service.salvarLancamento({
    numeroOP: "58193", processo: "SUTIÃ MONTAGEM", responsavel: "LIVIA",
    competencia: "2026-08", quantidade: 200
  });
  const segunda = await service.salvarLancamento({
    numeroOP: "58193", processo: "SUTIÃ MONTAGEM", responsavel: "OUTRA PESSOA",
    competencia: "2026-09", quantidade: 300
  });
  const excedente = await service.salvarLancamento({
    numeroOP: "58193", processo: "SUTIÃ MONTAGEM", responsavel: "LIVIA",
    competencia: "2026-10", quantidade: 1
  });

  assert.equal(primeira.ok, true);
  assert.equal(primeira.saldo.quantidadeRestante, 300);
  assert.equal(segunda.ok, true);
  assert.equal(segunda.saldo.quantidadeRestante, 0);
  assert.equal(excedente.ok, false);
  assert.ok(excedente.erros.includes("QUANTIDADE_MAIOR_QUE_RESTANTE"));
  assert.equal(pagamentos.size, 2);
});

test("saldo é separado por processo dentro da mesma OP", async () => {
  const { service } = criarAmbiente();
  await service.salvarLancamento({
    numeroOP: "58193", processo: "ALÇA", responsavel: "JANAINA", competencia: "2026-08", quantidade: 500
  });
  const montagem = await service.prepararLancamento({
    numeroOP: "58193", processo: "SUTIÃ MONTAGEM", responsavel: "LIVIA", competencia: "2026-08", quantidade: 500
  });
  assert.equal(montagem.ok, true);
  assert.equal(montagem.saldo.quantidadeFechada, 0);
  assert.equal(montagem.saldo.quantidadeRestanteDepois, 0);
});

test("Sutiã Completo usa cálculo consolidado no serviço", async () => {
  const { service } = criarAmbiente();
  const resultado = await service.prepararLancamento({
    numeroOP: "58193", processo: "SUTIÃ COMPLETO", responsavel: "DANUBIA",
    competencia: "2026-08", quantidade: 100,
    componentes: { lateral: true, bojo: true, fecho: true, pontoLuz: true }
  });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.calculo.valorUnitario, 4.45);
  assert.equal(resultado.documento.total, 445);
});

test("Sutiã Completo para se componente necessário estiver não informado", async () => {
  const { service } = criarAmbiente();
  const resultado = await service.prepararLancamento({
    numeroOP: "58193", processo: "SUTIÃ COMPLETO", responsavel: "DANUBIA",
    competencia: "2026-08", quantidade: 100,
    componentes: { lateral: null, bojo: true, fecho: true, pontoLuz: true }
  });
  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("LATERAL_NAO_INFORMADA"));
});

test("OP inexistente não produz lançamento", async () => {
  const { service, pagamentos } = criarAmbiente();
  const resultado = await service.salvarLancamento({
    numeroOP: "99999", processo: "CALCINHA COMPLETA", responsavel: "LORENA",
    competencia: "2026-08", quantidade: 100
  });
  assert.equal(resultado.ok, false);
  assert.deepEqual(resultado.erros, ["OP_NAO_ENCONTRADA"]);
  assert.equal(pagamentos.size, 0);
});
