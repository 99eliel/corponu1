import test from "node:test";
import assert from "node:assert/strict";

import {
  componentesOperacionaisPatch,
  criarDadosReenvioOperacional,
  criarPatchAvisoChegada,
  criarPatchConfirmacaoChegada,
  podeInformarChegada,
  quantidadeDisponivelReenvio,
  validarConfirmacaoChegada,
  validarReenvioOperacional
} from "../core/faccoes-operacional-regras.mjs";

const MOV = Object.freeze({
  id: "mov-1",
  opId: "op-1",
  numeroOP: "58193",
  referencia: "414",
  cor: "PRETO",
  produtoNome: "Sutiã 414",
  tipoDestino: "faccao",
  destino: "DANUBIA",
  processo: "SUTIÃ COMPLETO",
  setor: "sutia",
  quantidadeEnviada: 500,
  dataEnvio: "2026-08-01",
  dataChegada: "",
  falta: 0,
  defeito: 0,
  quantidadeRecebida: 0,
  status: "em_andamento"
});

test("usuário pode informar chegada de movimentação ativa", () => {
  assert.equal(podeInformarChegada(MOV), true);

  const resultado = criarPatchAvisoChegada({
    movimentacao: MOV,
    usuario: { uid: "u1", nome: "Ligia", email: "ligia@teste.com" },
    dataHoje: "2026-08-08"
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.patch.chegadaInformada, true);
  assert.equal(resultado.patch.chegadaInformadaPorNome, "Ligia");
  assert.equal(resultado.patch.chegadaInformadaData, "2026-08-08");
  assert.equal(resultado.patch.statusOperacional, "chegada_informada");
  assert.equal("statusPagamento" in resultado.patch, false);
  assert.equal("valorUnitario" in resultado.patch, false);
});

test("não permite informar chegada duas vezes", () => {
  const resultado = criarPatchAvisoChegada({
    movimentacao: { ...MOV, chegadaInformada: true }
  });
  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("CHEGADA_NAO_PODE_SER_INFORMADA"));
});

test("confirmação operacional calcula recebida por enviada - falta - defeito", () => {
  const validacao = validarConfirmacaoChegada({
    movimentacao: MOV,
    dataChegada: "2026-08-08",
    falta: 20,
    defeito: 10
  });

  assert.equal(validacao.ok, true);
  assert.equal(validacao.dados.quantidadeRecebida, 470);
  assert.equal(validacao.dados.falta, 20);
  assert.equal(validacao.dados.defeito, 10);
});

test("falta + defeito não pode ultrapassar quantidade enviada", () => {
  const resultado = validarConfirmacaoChegada({
    movimentacao: MOV,
    dataChegada: "2026-08-08",
    falta: 400,
    defeito: 101
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("FALTA_DEFEITO_MAIOR_QUE_ENVIADO"));
});

test("confirmar chegada é operacional e não cria campos financeiros", () => {
  const resultado = criarPatchConfirmacaoChegada({
    movimentacao: { ...MOV, chegadaInformada: true },
    dataChegada: "2026-08-08",
    falta: 5,
    defeito: 2,
    usuario: { uid: "adm1", nome: "Admin" }
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.patch.status, "retornou");
  assert.equal(resultado.patch.quantidadeRecebida, 493);
  assert.equal(resultado.patch.confirmacaoChegadaOperacional, true);
  assert.equal(resultado.patch.chegadaInformada, false);
  assert.equal("confirmacaoChegadaFinanceira" in resultado.patch, false);
  assert.equal("statusPagamento" in resultado.patch, false);
  assert.equal("total" in resultado.patch, false);
});

test("componentes informados na chegada ficam como dados operacionais consolidados", () => {
  const patch = componentesOperacionaisPatch({
    lateral: true,
    lateralResponsavel: "MARIA",
    bojo: false,
    fecho: true,
    pontoLuz: false
  });

  assert.deepEqual(patch.lateral, {
    informado: true,
    pronto: true,
    origem: "chegada_operacional_v2",
    responsavel: "MARIA"
  });
  assert.equal(patch.bojo.informado, true);
  assert.equal(patch.bojo.pronto, false);
  assert.equal(patch.fecho.pronto, true);
  assert.equal(patch.pontoLuz.pronto, false);
});

test("componente ausente permanece ausente, nunca vira não", () => {
  const patch = componentesOperacionaisPatch({
    lateral: null,
    bojo: "",
    fecho: undefined,
    pontoLuz: null
  });
  assert.deepEqual(patch, {});
});

test("quantidade disponível para reenvio usa recebida após chegada confirmada", () => {
  assert.equal(quantidadeDisponivelReenvio({
    ...MOV,
    dataChegada: "2026-08-08",
    quantidadeRecebida: 470,
    falta: 20,
    defeito: 10
  }), 470);
});

test("quantidade disponível antes da confirmação usa enviada menos falta/defeito", () => {
  assert.equal(quantidadeDisponivelReenvio({
    ...MOV,
    chegadaInformada: true,
    falta: 20,
    defeito: 10
  }), 470);
});

test("reenvio só é permitido depois de chegada informada ou confirmada", () => {
  const resultado = validarReenvioOperacional({
    movimentacao: MOV,
    processo: "SUTIÃ COMPLETO",
    destino: "KAKA",
    quantidade: 100,
    dataEnvio: "2026-08-08"
  });
  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("REENVIO_ANTES_DA_CHEGADA"));
});

test("Sutiã Completo pode ser reenviado sem Lateral/Bojo informados", () => {
  const resultado = criarDadosReenvioOperacional({
    movimentacao: { ...MOV, chegadaInformada: true },
    processo: "SUTIÃ COMPLETO",
    destino: "KAKA",
    quantidade: 200,
    dataEnvio: "2026-08-08"
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.dadosMovimentacao.processo, "SUTIÃ COMPLETO");
  assert.equal(resultado.dadosMovimentacao.reenvio, true);
  assert.equal("lateral" in resultado.dadosMovimentacao, false);
  assert.equal("bojo" in resultado.dadosMovimentacao, false);
});

test("reenvio não carrega nenhum dado financeiro", () => {
  const resultado = criarDadosReenvioOperacional({
    movimentacao: { ...MOV, chegadaInformada: true },
    processo: "SUTIÃ COMPLETO",
    destino: "KAKA",
    quantidade: 200,
    dataEnvio: "2026-08-08"
  });

  const dados = resultado.dadosMovimentacao;
  for (const campo of ["valorUnitario", "total", "statusPagamento", "competencia", "pagamentoId"]) {
    assert.equal(campo in dados, false);
  }
});

test("reenvio já criado não pode ser duplicado", () => {
  const resultado = validarReenvioOperacional({
    movimentacao: { ...MOV, chegadaInformada: true, reenvioCriadoId: "mov-2" },
    processo: "SUTIÃ COMPLETO",
    destino: "KAKA",
    quantidade: 100,
    dataEnvio: "2026-08-08"
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("REENVIO_JA_CRIADO"));
});
