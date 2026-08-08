import test from "node:test";
import assert from "node:assert/strict";

import { templateManejoV2 } from "../ui/manejo-template.mjs";
import { htmlLinhaManejo } from "../ui/manejo-ui-utils.mjs";

test("Manejo possui abas explícitas de Sutiã e Calcinha", () => {
  const html = templateManejoV2();
  assert.match(html, /data-v2-manejo-setor="sutia"/);
  assert.match(html, /data-v2-manejo-setor="calcinha"/);
});

test("Manejo mantém somente os campos operacionais corretos", () => {
  const html = templateManejoV2();
  for (const textoEsperado of [
    "Necessidade",
    "Silk",
    "Data Silk",
    "Tecido",
    "Data Tecido",
    "Fase Bojo",
    "Fase Lateral"
  ]) {
    assert.match(html, new RegExp(textoEsperado, "i"));
  }
});

test("linha do Manejo não possui Facção, Chegada, Falta ou CELU como campos", () => {
  const linha = htmlLinhaManejo({
    id: "op-1",
    numeroOP: "1",
    referencia: "414",
    cor: "PRETO",
    quantidade: 100,
    tipoPeca: "sutia"
  }, "sutia");

  for (const campo of ["faccao", "chegada", "falta", "celu"]) {
    assert.doesNotMatch(linha, new RegExp(`data-campo="${campo}"`, "i"));
  }
});

test("Fase Bojo e Fase Lateral mantêm digitação livre com sugestões", () => {
  const linha = htmlLinhaManejo({
    id: "op-1",
    numeroOP: "1",
    referencia: "414",
    cor: "PRETO",
    quantidade: 100,
    tipoPeca: "sutia"
  }, "sutia");

  assert.match(linha, /data-campo="faseBojo"/);
  assert.match(linha, /data-campo="faseLateral"/);
  assert.equal((linha.match(/list="v2ManejoFasesSugestoes"/g) || []).length, 2);
});

test("filtros estruturados existem e podem acumular", () => {
  const html = templateManejoV2();
  for (const campo of ["busca", "status", "referencia", "cor", "faseBojo", "faseLateral", "necessidade"]) {
    assert.match(html, new RegExp(`name="${campo}"`));
  }
  assert.doesNotMatch(html, /name="faccao"/);
  assert.match(html, /data-v2-limpar-filtros/);
});

test("ações da linha são somente Salvar e Enviar facção", () => {
  const linha = htmlLinhaManejo({
    id: "op-1",
    numeroOP: "1",
    referencia: "414",
    cor: "PRETO",
    quantidade: 100,
    tipoPeca: "sutia"
  }, "sutia");
  assert.match(linha, /data-v2-salvar-manejo/);
  assert.match(linha, /data-v2-enviar-faccao/);
  assert.doesNotMatch(linha, /data-v2-enviar-celula/);
  assert.doesNotMatch(linha, /Enviar célula/i);
});

test("modal de envio é exclusivo para Facção", () => {
  const html = templateManejoV2();
  assert.match(html, /Enviar para Facção/);
  assert.doesNotMatch(html, /Enviar para Célula/i);
  assert.doesNotMatch(html, /name="tipoDestino"/);
});

test("modal de envio não pergunta Lateral ou Bojo", () => {
  const html = templateManejoV2();
  assert.doesNotMatch(html, /name="lateral"/i);
  assert.doesNotMatch(html, /name="bojo"/i);
  assert.doesNotMatch(html, /Lateral já/i);
  assert.doesNotMatch(html, /Bojo já/i);
});

test("modal de envio não possui campos financeiros", () => {
  const html = templateManejoV2();
  assert.doesNotMatch(html, /statusPagamento/i);
  assert.doesNotMatch(html, /valorUnitario/i);
  assert.doesNotMatch(html, /total a pagar/i);
  assert.doesNotMatch(html, /competência/i);
});
