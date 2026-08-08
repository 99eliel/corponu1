import test from "node:test";
import assert from "node:assert/strict";
import {
  STATUS_PAGAMENTO,
  calcularSaldoPorOPProcesso,
  filtrarPagamentos,
  normalizarPagamento,
  relatorioSimplificadoPix,
  resumirPagamentos,
  resumoQuitacao
} from "../core/pagamentos-regras.mjs";

const pagamentos = [
  { id: "p1", tipoDocumento: "lancamento_financeiro_v2", numeroOP: "70001", competencia: "2026-08", referencia: "414", processo: "SUTIÃ COMPLETO", responsavel: "DANUBIA", quantidade: 200, quantidadeOP: 500, valorUnitario: 1, total: 200, statusPagamento: "pendente" },
  { id: "p2", tipoDocumento: "lancamento_financeiro_v2", numeroOP: "70001", competencia: "2026-08", referencia: "414", processo: "SUTIÃ COMPLETO", responsavel: "DANUBIA", quantidade: 300, quantidadeOP: 500, valorUnitario: 1, total: 300, statusPagamento: "pago" },
  { id: "p3", tipoDocumento: "lancamento_financeiro_v2", numeroOP: "80001", competencia: "2026-08", referencia: "C100", processo: "CALCINHA COMPLETA", responsavel: "LORENA", quantidade: 420, quantidadeOP: 420, valorUnitario: 0.78, total: 327.6, statusPagamento: "pendente" },
  { id: "p4", tipoDocumento: "lancamento_financeiro_v2", numeroOP: "70002", competencia: "2026-07", referencia: "912", processo: "SUTIÃ COMPLETO", responsavel: "KAKA", quantidade: 100, total: 105, statusPagamento: "pendente" }
];

const historicos = [
  { id: "h1", origem: "movimentacao", numeroOP: "60001", dataEntrega: "2026-08-03", referencia: "411", servicoNome: "SUTIÃ MONTAGEM", faccao: "LIVIA", quantidade: 100, valorUnitario: 0.4, total: 40, statusPagamento: "pago" },
  { id: "h2", origem: "movimentacao", numeroOP: "60002", dataEntrega: "2026-08-04", referencia: "411", processoMovimentacao: "ENCAPAR BOJO", faccao: "DIVINA", quantidade: 50, valorUnitario: 0, total: 0, statusPagamento: "sem_valor", valorPendente: true }
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

test("pagamento historico deriva competencia da data de entrega sem alterar documento", () => {
  const normalizado = normalizarPagamento(historicos[0]);
  assert.equal(normalizado.competencia, "2026-08");
  assert.equal(normalizado.tipoRegistroFinanceiro, "historico");
  assert.equal(normalizado.historico, true);
  assert.equal(normalizado.statusPagamento, STATUS_PAGAMENTO.PAGO);
  assert.equal(historicos[0].competencia, undefined);
});

test("historico sem valor permanece separado de pendente e nunca entra na quitacao", () => {
  const normalizado = normalizarPagamento(historicos[1]);
  assert.equal(normalizado.statusPagamento, STATUS_PAGAMENTO.SEM_VALOR);
  assert.deepEqual(resumoQuitacao(historicos).ids, []);
});

test("filtro por competencia combina V2 e historico derivado", () => {
  const itens = filtrarPagamentos([...pagamentos, ...historicos], { competencia: "2026-08" });
  assert.deepEqual(new Set(itens.map(i => i.id)), new Set(["p1", "p2", "p3", "h1", "h2"]));
  assert.equal(filtrarPagamentos(itens, { origem: "historico" }).length, 2);
  assert.equal(filtrarPagamentos(itens, { origem: "v2" }).length, 3);
});

test("resumo usa somente itens filtrados e separa origem", () => {
  const itens = filtrarPagamentos([...pagamentos, ...historicos], { competencia: "2026-08" });
  const resumo = resumirPagamentos(itens);
  assert.equal(resumo.quantidadeLancamentos, 5);
  assert.equal(resumo.quantidadePecas, 1070);
  assert.equal(resumo.total, 867.6);
  assert.equal(resumo.totalPendente, 527.6);
  assert.equal(resumo.totalPago, 340);
  assert.equal(resumo.semValor, 1);
  assert.equal(resumo.historicos, 2);
  assert.equal(resumo.v2, 3);
});

test("saldo parcial/restante soma lançamentos do mesmo OP e processo", () => {
  const saldo = calcularSaldoPorOPProcesso({ pagamentos, numeroOP: "70001", processo: "SUTIA COMPLETO", quantidadeOP: 500 });
  assert.equal(saldo.quantidadeFechada, 500);
  assert.equal(saldo.quantidadeRestante, 0);
  assert.equal(saldo.completo, true);
});

test("historico sem valor ainda ocupa quantidade financeira e evita duplicacao futura", () => {
  const saldo = calcularSaldoPorOPProcesso({ pagamentos: [historicos[1]], numeroOP: "60002", processo: "ENCAPAR BOJO", quantidadeOP: 100 });
  assert.equal(saldo.quantidadeFechada, 50);
  assert.equal(saldo.quantidadeRestante, 50);
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

test("relatorio simplificado ignora historico aguardando valor", () => {
  const linhas = relatorioSimplificadoPix(historicos, [
    { nome: "LIVIA", chavePix: "livia@pix" },
    { nome: "DIVINA", chavePix: "divina@pix" }
  ]);
  assert.deepEqual(linhas.map(i => [i.nome, i.valor]), [["LIVIA", 40]]);
});

test("quitacao filtrada seleciona somente pendentes com valor", () => {
  const resumo = resumoQuitacao([...pagamentos, ...historicos].filter(i => i.competencia === "2026-08" || i.dataEntrega?.startsWith("2026-08")));
  assert.deepEqual(resumo.ids.sort(), ["p1", "p3"]);
  assert.equal(resumo.quantidade, 2);
  assert.equal(resumo.total, 527.6);
});
