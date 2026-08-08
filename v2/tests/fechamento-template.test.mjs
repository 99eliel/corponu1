import test from "node:test";
import assert from "node:assert/strict";

import { templateFechamentoPagamento } from "../ui/fechamento-template.mjs";

test("tela usa competência mensal própria", () => {
  const html = templateFechamentoPagamento({ competenciaPadrao: "2026-08" });

  assert.match(html, /name="competencia"/);
  assert.match(html, /type="month"/);
  assert.match(html, /value="2026-08"/);
});

test("tela possui OP, serviço, responsável, quantidade e ocorrência", () => {
  const html = templateFechamentoPagamento();

  for (const campo of ["numeroOP", "processo", "responsavel", "quantidade", "ocorrencia"]) {
    assert.match(html, new RegExp(`name="${campo}"`));
  }
});

test("tela não possui campo operacional de chegada ou movimentação", () => {
  const html = templateFechamentoPagamento();

  assert.doesNotMatch(html, /name="dataChegada"/i);
  assert.doesNotMatch(html, /name="movimentacaoId"/i);
  assert.doesNotMatch(html, /id="[^\"]*Chegada[^\"]*"/i);
});

test("Sutiã Completo possui quatro respostas binárias no fechamento", () => {
  const html = templateFechamentoPagamento();

  for (const campo of ["lateral", "bojo", "fecho", "pontoLuz"]) {
    assert.match(html, new RegExp(`name="${campo}"`));
  }

  const quantidadeSim = (html.match(/<option value="sim">Sim<\/option>/g) || []).length;
  const quantidadeNao = (html.match(/<option value="nao">Não<\/option>/g) || []).length;
  assert.equal(quantidadeSim, 4);
  assert.equal(quantidadeNao, 4);
});

test("valor só é conferido por ação explícita, não a cada digitação", () => {
  const html = templateFechamentoPagamento();

  assert.match(html, /data-v2-conferir-valor/);
  assert.match(html, />Conferir valor</);
  assert.match(html, />Adicionar ao fechamento</);
});
