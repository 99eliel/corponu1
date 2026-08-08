import test from "node:test";
import assert from "node:assert/strict";

import { templateManejoV2 } from "../ui/manejo-template.mjs";
import { htmlLinhaManejo } from "../ui/manejo-ui-utils.mjs";

test("Manejo possui abas explícitas de Sutiã e Calcinha", () => {
  const html = templateManejoV2();
  assert.match(html, /data-v2-manejo-setor="sutia"/);
  assert.match(html, /data-v2-manejo-setor="calcinha"/);
});

test("Manejo mantém necessidade livre e campos operacionais principais", () => {
  const html = templateManejoV2();
  for (const textoEsperado of [
    "Necessidade",
    "Silk",
    "Data Silk",
    "Tecido",
    "Data Tecido",
    "Fase Bojo",
    "Fase Lateral",
    "Facção",
    "Chegada",
    "Falta",
    "CELU"
  ]) {
    assert.match(html, new RegExp(textoEsperado, "i"));
  }
});

test("linha possui Fase Bojo e Fase Lateral com digitação livre e sugestões", () => {
  const linha = htmlLinhaManejo({
    id: "op-1",
    numeroOP: "1",
    referencia: "414",
    cor: "PRETO",
    quantidade: 100,
    tipoPeca: "sutia",
    manejosSetores: {
      sutia: { fase: "SEPARAÇÃO" }
    }
  }, "sutia");

  assert.match(linha, /data-campo="faseBojo"/);
  assert.match(linha, /data-campo="faseLateral"/);
  assert.equal((linha.match(/list="v2ManejoFasesSugestoes"/g) || []).length, 2);
  assert.equal((linha.match(/placeholder="Digite ou escolha"/g) || []).length, 2);
  assert.match(linha, /data-campo="faseBojo"[^>]*value="SEPARAÇÃO"/);
  assert.match(linha, /data-campo="faseLateral"[^>]*value=""/);
});

test("filtros estruturados incluem Fase Bojo e Fase Lateral separadas", () => {
  const html = templateManejoV2();
  for (const campo of ["busca", "status", "referencia", "cor", "faseBojo", "faseLateral", "faccao", "necessidade"]) {
    assert.match(html, new RegExp(`name="${campo}"`));
  }
  assert.match(html, /data-v2-limpar-filtros/);
});

test("ações da linha são Salvar, Enviar facção e Enviar célula", () => {
  const html = templateManejoV2();
  assert.match(html, /data-v2-manejo-lista/);
  assert.match(html, /Nenhuma ação desta tela gera pagamento/);
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
