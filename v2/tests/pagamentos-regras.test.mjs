import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularSaldoPorOPProcesso,
  filtrarPagamentos,
  relatorioSimplificadoPix,
  resumirPagamentos,
  resumoQuitacao
} from "../core/pagamentos-regras.mjs";

const pagamentos = [
  { id: "p1", numeroOP: "70001", competencia: "2026-08", referencia: "414", processo: "SUTIÃ COMPLETO", responsavel: "DANUBIA", quantidade: 200, quantidadeOP: 500, valorUnitario: 1, total: 200, statusPagamento: "pendente" },
  { id: "p2", numeroOP: "70001", competencia: "2026-08", referencia: "414", processo: "SUTIÃ COMPLETO", responsavel: "DANUBIA", quantidade: 300, quantidadeOP: 500, valorUnitario: 1, total: 300, statusPagamento: "pago" },
  { id: "p3", numeroOP: "80001", competencia: "2026-08", referencia: "C100", processo: "CALCINHA COMPLETA", responsavel: "LORENA", quantidade: 420, quantidadeOP: 420, valorUnitario: 0.78, total: 327.6, statusPagamento: "pendente" },
  { id: "p4", numeroOP: "70002", competencia: "2026-07", referencia: "912", processo: "SUTIÃ COMPLETO", responsavel: "KAKA", quantidade: 100, total: 105, statusPagamento: "pendente" }
];

test("filtros de pagamentos acumulam como Excel", () => {
  const itens = filtrarPagamentos(pagamentos, {
    competencia: "2026-08",
    responsavel: "danu",
    referencia: "414",
    processo: "sutia completo",
    status: "pendente"
  });
  assert.deepEqual(itens.map(i => i.id), ["p1"]);
});

test("resumo usa somente itens filtrados", () => {
  const itens = filtrarPagamentos(pagamentos, { competencia: "2026-08" });
  const resumo = resumirPagamentos(itens);
  assert.equal(resumo.quantidadeLancamentos, 3);
  assert.equal(resumo.quantidadePecas, 920);
  assert.equal(resumo.total, 827.6);
  assert.equal(resumo.totalPendente, 527.6);
  assert.equal(resumo.totalPago, 300);
});

test("saldo parcial/restante soma lançamentos do mesmo OP e processo", () => {
  const saldo = calcularSaldoPorOPProcesso({ pagamentos, numeroOP: "70001", processo: "SUTIA COMPLETO", quantidadeOP: 500 });
  assert.equal(saldo.quantidadeFechada, 500);
  assert.equal(saldo.quantidadeRestante, 0);
  assert.equal(saldo.completo, true);
});

test("relatorio simplificado agrupa por pessoa e preserva PIX", () => {
  const linhas = relatorioSimplificadoPix(pagamentos.filter(i => i.competencia === "2026-08"), [
    { id: "f1", nome: "DANUBIA", chavePix: "danubia@pix" },
    { id: "f2", nome: "LORENA", chavePix: "11999999999" }
  ]);
  assert.deepEqual(linhas.map(i => [i.nome, i.pix, i.valor]), [
    ["DANUBIA", "danubia@pix", 500],
    ["LORENA", "11999999999", 327.6]
  ]);
});

test("quitacao filtrada seleciona somente pendentes", () => {
  const resumo = resumoQuitacao(pagamentos.filter(i => i.competencia === "2026-08"));
  assert.deepEqual(resumo.ids.sort(), ["p1", "p3"]);
  assert.equal(resumo.quantidade, 2);
  assert.equal(resumo.total, 527.6);
});
