import test from "node:test";
import assert from "node:assert/strict";
import { templatePagamentos } from "../ui/pagamentos-template.mjs";

test("Pagamentos V2 possui filtros acumulativos essenciais", () => {
  const html = templatePagamentos({ competenciaPadrao: "2026-08" });
  for (const campo of ["competencia", "responsavel", "referencia", "processo", "numeroOP", "status"]) {
    assert.match(html, new RegExp(`name="${campo}"`));
  }
  assert.match(html, /value="2026-08"/);
});

test("Pagamentos V2 possui confirmação filtrada e dois relatórios", () => {
  const html = templatePagamentos();
  assert.match(html, /data-v2-quitar-filtrados/);
  assert.match(html, /Confirmar pagamentos filtrados/);
  assert.match(html, /data-v2-relatorio-completo/);
  assert.match(html, /data-v2-relatorio-simples/);
  assert.match(html, /Nome \+ PIX \+ Valor/);
});

test("Pagamentos V2 não possui campos de chegada ou movimentação operacional", () => {
  const html = templatePagamentos();
  assert.doesNotMatch(html, /name="dataChegada"/i);
  assert.doesNotMatch(html, /name="movimentacaoId"/i);
  assert.doesNotMatch(html, /Bipar/i);
});
