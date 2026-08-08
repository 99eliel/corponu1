import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const regras = await readFile(new URL("../../firestore-rules.txt", import.meta.url), "utf8");

test("regras preservam acesso operacional às coleções reais da V2", () => {
  assert.match(regras, /match \/ordensProducao\/\{ordemId\}/);
  assert.match(regras, /match \/movimentacoesProducao\/\{movimentoId\}/);
  assert.match(regras, /match \/faccoes\/\{faccaoId\}/);
  assert.match(regras, /match \/produtos\/\{produtoId\}/);
  assert.match(regras, /match \/precosReferencia\/\{precoId\}/);
  assert.match(regras, /match \/configuracoes\/\{docId\}/);
  assert.match(regras, /match \/entregasPagamento\/\{entregaId\}/);
});

test("documentos financeiros V2 exigem permissão financeira e schema V2", () => {
  assert.match(regras, /function novoDocumentoFinanceiroV2Permitido\(\)/);
  assert.match(regras, /financeiroPodeDefinirValor\(\)[\s\S]*documentoFinanceiroV2\(\)/);
  assert.match(regras, /schemaVersion == 2/);
  assert.match(regras, /origem == "fechamento_financeiro_v2"/);
  assert.match(regras, /"lancamento_financeiro_v2"/);
  assert.match(regras, /"controle_processo_v2"/);
});

test("controle de saldo pode avançar entre usuários financeiros sem liberar campos arbitrários", () => {
  assert.match(regras, /function alteracaoControleFinanceiroV2Permitida\(\)/);
  assert.match(regras, /affectedKeys\(\)\.hasOnly\(\[[\s\S]*"quantidadeFechada"[\s\S]*"quantidadeRestante"[\s\S]*"ultimaParcela"[\s\S]*"atualizadoEm"/);
});

test("quitação V2 exige permissão marcarPagamentos e só altera campos de quitação", () => {
  assert.match(regras, /function podeMarcarPagamento\(\)/);
  assert.match(regras, /permissoes\.recursos\.marcarPagamentos == true/);
  assert.match(regras, /function quitacaoPagamentoV2Permitida\(\)/);
  assert.match(regras, /resource\.data\.statusPagamento == "pendente"/);
  assert.match(regras, /request\.resource\.data\.statusPagamento == "pago"/);
  assert.match(regras, /"pagoEm"/);
  assert.match(regras, /"pagoPor"/);
  assert.match(regras, /"pagoPorNome"/);
});

test("regras de entregasPagamento incorporam criação, controle e quitação V2 sem remover legado", () => {
  const bloco = regras.match(/match \/entregasPagamento\/\{entregaId\} \{([\s\S]*?)\n    \}/)?.[1] || "";
  assert.match(bloco, /novoPagamentoDoUsuario\(\)/);
  assert.match(bloco, /novoDocumentoFinanceiroV2Permitido\(\)/);
  assert.match(bloco, /alteracaoControleFinanceiroV2Permitida\(\)/);
  assert.match(bloco, /quitacaoPagamentoV2Permitida\(\)/);
});
