import test from "node:test";
import assert from "node:assert/strict";

import { templateFechamentoPagamento } from "../ui/fechamento-template.mjs";

test("tela usa competência mensal própria", () => {
  const html = templateFechamentoPagamento({ competenciaPadrao: "2026-08" });
  assert.match(html, /name="competencia"/);
  assert.match(html, /type="month"/);
  assert.match(html, /value="2026-08"/);
});

test("tela possui OP, serviço, responsável e quantidade sem ocorrência", () => {
  const html = templateFechamentoPagamento();
  for (const campo of ["numeroOP", "processo", "responsavel", "quantidade"]) {
    assert.match(html, new RegExp(`name="${campo}"`));
  }
  assert.doesNotMatch(html, /name="ocorrencia"/i);
  assert.doesNotMatch(html, /retrabalho/i);
  assert.match(html, /data-v2-saldo-processo/);
});

test("serviço fica bloqueado até localizar a OP e não traz opções incompatíveis hard-coded", () => {
  const html = templateFechamentoPagamento();
  assert.match(html, /name="processo" required disabled/);
  assert.match(html, />Busque uma OP primeiro</);
  for (const processo of [
    "ENCAPAR BOJO",
    "ALÇA",
    "LATERAL",
    "SUTIÃ MONTAGEM",
    "SUTIÃ COMPLETO",
    "CALCINHA MONTAGEM",
    "CALCINHA COMPLETA"
  ]) {
    assert.doesNotMatch(html, new RegExp(`<option[^>]*>${processo}</option>`));
  }
});

test("tela não possui campo operacional de chegada ou movimentação", () => {
  const html = templateFechamentoPagamento();
  assert.doesNotMatch(html, /name="dataChegada"/i);
  assert.doesNotMatch(html, /name="movimentacaoId"/i);
});

test("Sutiã Completo possui quatro respostas binárias identificadas individualmente", () => {
  const html = templateFechamentoPagamento();
  for (const campo of ["lateral", "bojo", "fecho", "pontoLuz"]) {
    assert.match(html, new RegExp(`data-v2-componente-campo="${campo}"`));
    assert.match(html, new RegExp(`name="${campo}"`));
  }
  assert.match(html, /data-v2-componentes-conhecidos/);
});

test("valor só é conferido por ação explícita, não a cada digitação", () => {
  const html = templateFechamentoPagamento();
  assert.match(html, /data-v2-conferir-valor/);
  assert.match(html, />Conferir valor</);
  assert.match(html, />Adicionar ao fechamento</);
});
