import test from "node:test";
import assert from "node:assert/strict";

import {
  DESTINO_CELULA,
  DESTINO_FACCAO,
  PROCESSO_CELULA,
  criarDadosManejo,
  criarDadosMovimentacao,
  getManejoDaOrdemV2,
  processoPermitidoNoManejo,
  validarEntradaManejo,
  validarManejoParaMovimentacao,
  validarMovimentacaoManejo
} from "../core/manejo-regras.mjs";

const SUTIA = Object.freeze({
  id: "op-1",
  numeroOP: "58193",
  referencia: "414",
  cor: "PRETO",
  quantidade: 500,
  tipoPeca: "sutia"
});

const CALCINHA = Object.freeze({
  id: "calcinha-1",
  numeroOP: "58194",
  referencia: "1001",
  cor: "BLUSH",
  quantidade: 400,
  tipoPeca: "calcinha"
});

function manejoBase(extra = {}) {
  return {
    // Entrada legada mantida de propósito para garantir compatibilidade.
    fase: "SEPARAÇÃO",
    silkNome: "SILK A",
    silkData: "",
    tecidoNome: "FORNECEDOR X",
    dataTecido: "2026-08-08",
    necessidade: "URGENTE",
    falta: 0,
    ...extra
  };
}

test("salvar Manejo exige Fase Bojo, mas não exige Fase Lateral, Silk nem Data Tecido", () => {
  const valido = validarEntradaManejo({
    ordem: SUTIA,
    setor: "sutia",
    entrada: { faseBojo: "CORTE", faseLateral: "", necessidade: "" }
  });
  assert.equal(valido.ok, true);
  assert.equal(valido.dados.faseBojo, "CORTE");
  assert.equal(valido.dados.faseLateral, "");

  const invalido = validarEntradaManejo({
    ordem: SUTIA,
    setor: "sutia",
    entrada: { faseBojo: "", faseLateral: "SEPARAÇÃO" }
  });
  assert.equal(invalido.ok, false);
  assert.ok(invalido.erros.includes("FASE_NAO_INFORMADA"));
});

test("fase antiga é preservada como Fase Bojo e Fase Lateral nasce vazia", () => {
  const resultado = criarDadosManejo({
    ordem: SUTIA,
    setor: "sutia",
    entrada: manejoBase()
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.dados.fase, "SEPARAÇÃO");
  assert.equal(resultado.dados.faseBojo, "SEPARAÇÃO");
  assert.equal(resultado.dados.faseLateral, "");
});

test("Fase Bojo e Fase Lateral são salvas independentemente", () => {
  const resultado = criarDadosManejo({
    ordem: SUTIA,
    setor: "sutia",
    entrada: manejoBase({
      fase: undefined,
      faseBojo: "CORTE",
      faseLateral: "PREPARAÇÃO"
    })
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.dados.fase, "CORTE");
  assert.equal(resultado.dados.faseBojo, "CORTE");
  assert.equal(resultado.dados.faseLateral, "PREPARAÇÃO");
});

test("necessidade do Manejo é texto livre e pode ser salva vazia", () => {
  const livre = criarDadosManejo({
    ordem: SUTIA,
    setor: "sutia",
    entrada: manejoBase({ necessidade: "PRECISA SAIR AMANHÃ" })
  });
  assert.equal(livre.ok, true);
  assert.equal(livre.dados.necessidade, "PRECISA SAIR AMANHÃ");

  const vazia = criarDadosManejo({
    ordem: SUTIA,
    setor: "sutia",
    entrada: manejoBase({ necessidade: "" })
  });
  assert.equal(vazia.ok, true);
  assert.equal(vazia.dados.necessidade, "");
});

test("falta nunca pode ultrapassar a quantidade da OP", () => {
  const resultado = validarEntradaManejo({
    ordem: SUTIA,
    setor: "sutia",
    entrada: manejoBase({ falta: 501 })
  });
  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("FALTA_MAIOR_QUE_OP"));
});

test("antes de movimentar exige Silk por nome ou data e exige Data Tecido", () => {
  const vazio = validarManejoParaMovimentacao({ faseBojo: "CORTE" });
  assert.equal(vazio.ok, false);
  assert.deepEqual(new Set(vazio.erros), new Set(["SILK_NAO_INFORMADO", "DATA_TECIDO_NAO_INFORMADA"]));

  const porNome = validarManejoParaMovimentacao({
    silkNome: "SILK A",
    dataTecido: "2026-08-08"
  });
  assert.equal(porNome.ok, true);

  const porData = validarManejoParaMovimentacao({
    silkData: "2026-08-07",
    dataTecido: "2026-08-08"
  });
  assert.equal(porData.ok, true);
});

test("Sutiã aceita somente processos de Sutiã na saída para facção", () => {
  assert.equal(processoPermitidoNoManejo("SUTIÃ COMPLETO", "sutia", DESTINO_FACCAO), true);
  assert.equal(processoPermitidoNoManejo("ENCAPAR BOJO", "sutia", DESTINO_FACCAO), true);
  assert.equal(processoPermitidoNoManejo("CALCINHA COMPLETA", "sutia", DESTINO_FACCAO), false);
});

test("Calcinha aceita somente processos de Calcinha na saída para facção", () => {
  assert.equal(processoPermitidoNoManejo("CALCINHA MONTAGEM", "calcinha", DESTINO_FACCAO), true);
  assert.equal(processoPermitidoNoManejo("CALCINHA COMPLETA", "calcinha", DESTINO_FACCAO), true);
  assert.equal(processoPermitidoNoManejo("SUTIÃ MONTAGEM", "calcinha", DESTINO_FACCAO), false);
});

test("envio para célula usa processo único CÉLULA INTERNA", () => {
  assert.equal(processoPermitidoNoManejo(PROCESSO_CELULA, "sutia", DESTINO_CELULA), true);
  assert.equal(processoPermitidoNoManejo(PROCESSO_CELULA, "calcinha", DESTINO_CELULA), true);
});

test("Sutiã Completo pode sair sem Lateral ou Bojo informados", () => {
  const resultado = validarMovimentacaoManejo({
    ordem: SUTIA,
    setor: "sutia",
    manejo: manejoBase(),
    tipoDestino: "faccao",
    destino: "DANUBIA",
    processo: "SUTIÃ COMPLETO",
    quantidade: 500,
    dataEnvio: "2026-08-08"
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.erros.includes("LATERAL_NAO_INFORMADA"), false);
  assert.equal(resultado.erros.includes("BOJO_NAO_INFORMADO"), false);
});

test("quantidade enviada não pode superar o disponível", () => {
  const resultado = validarMovimentacaoManejo({
    ordem: SUTIA,
    setor: "sutia",
    manejo: manejoBase(),
    tipoDestino: "faccao",
    destino: "DANUBIA",
    processo: "SUTIÃ COMPLETO",
    quantidade: 301,
    quantidadeMaxima: 300,
    dataEnvio: "2026-08-08"
  });
  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("QUANTIDADE_MAIOR_QUE_DISPONIVEL"));
});

test("movimentação criada é puramente operacional", () => {
  const validacao = validarMovimentacaoManejo({
    ordem: CALCINHA,
    setor: "calcinha",
    manejo: manejoBase(),
    tipoDestino: "faccao",
    destino: "LORENA",
    processo: "CALCINHA COMPLETA",
    quantidade: 300,
    dataEnvio: "2026-08-08"
  });
  const resultado = criarDadosMovimentacao({
    ordem: CALCINHA,
    validacao,
    origem: "manejo"
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.dados.status, "em_andamento");
  assert.equal(resultado.dados.dataChegada, "");
  assert.equal(resultado.dados.quantidadeRecebida, 0);
  assert.equal("valorUnitario" in resultado.dados, false);
  assert.equal("total" in resultado.dados, false);
  assert.equal("statusPagamento" in resultado.dados, false);
});

test("reenvio guarda vínculo com movimento anterior sem mudar regra financeira", () => {
  const validacao = validarMovimentacaoManejo({
    ordem: SUTIA,
    setor: "sutia",
    manejo: manejoBase(),
    tipoDestino: "celula",
    destino: "CELULA 1",
    processo: PROCESSO_CELULA,
    quantidade: 200,
    quantidadeMaxima: 200,
    dataEnvio: "2026-08-08"
  });
  const resultado = criarDadosMovimentacao({
    ordem: SUTIA,
    validacao,
    origem: "movimentacao",
    movimentacaoOrigemId: "mov-123"
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.dados.reenvio, true);
  assert.equal(resultado.dados.movimentacaoOrigemId, "mov-123");
  assert.equal(resultado.dados.processo, PROCESSO_CELULA);
});

test("lê manejo V2 por setor convertendo fase antiga em Fase Bojo", () => {
  const atual = getManejoDaOrdemV2({
    ...SUTIA,
    manejosSetores: { sutia: { fase: "CORTE" } }
  }, "sutia");
  assert.equal(atual.fase, "CORTE");
  assert.equal(atual.faseBojo, "CORTE");
  assert.equal(atual.faseLateral, "");
  assert.equal(atual.origemLegada, undefined);

  const legado = getManejoDaOrdemV2({ ...SUTIA, manejo: { fase: "SEPARAÇÃO" } }, "sutia");
  assert.equal(legado.fase, "SEPARAÇÃO");
  assert.equal(legado.faseBojo, "SEPARAÇÃO");
  assert.equal(legado.faseLateral, "");
  assert.equal(legado.origemLegada, true);
});
