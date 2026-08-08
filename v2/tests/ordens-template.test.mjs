import test from "node:test";
import assert from "node:assert/strict";

import { templateOrdensV2 } from "../ui/ordens-template.mjs";

test("formulário possui abas explícitas de Sutiã e Calcinha", () => {
  const html = templateOrdensV2();
  assert.match(html, /data-v2-tipo="sutia"/);
  assert.match(html, /data-v2-tipo="calcinha"/);
});

test("OP, referência, cor e quantidade são obrigatórios", () => {
  const html = templateOrdensV2();
  for (const campo of ["numeroOP", "referencia", "cor", "quantidade"]) {
    assert.match(html, new RegExp(`name="${campo}"[^>]*required`));
  }
});

test("necessidade continua opcional e livre", () => {
  const html = templateOrdensV2();
  const campo = html.match(/<input name="necessidadeTexto"[^>]*>/)?.[0] || "";
  assert.ok(campo);
  assert.doesNotMatch(campo, /required/);
  assert.match(campo, /type="text"/);
});

test("serviço e facção da Calcinha são opcionais", () => {
  const html = templateOrdensV2();
  const processo = html.match(/<select name="processoPlanejado"[^>]*>/)?.[0] || "";
  const faccao = html.match(/<select name="faccaoPlanejada"[^>]*>/)?.[0] || "";
  assert.ok(processo);
  assert.ok(faccao);
  assert.doesNotMatch(processo, /required/);
  assert.doesNotMatch(faccao, /required/);
  assert.match(html, /Definir somente no envio/);
});

test("datas de necessidade existem mas são opcionais", () => {
  const html = templateOrdensV2();
  for (const campo of ["necessidadeInicio", "necessidadeFim"]) {
    const input = html.match(new RegExp(`<input name="${campo}"[^>]*>`))?.[0] || "";
    assert.ok(input);
    assert.match(input, /type="date"/);
    assert.doesNotMatch(input, /required/);
  }
});

test("quantidade pertence à OP e não há campo de quantidade de Produto", () => {
  const html = templateOrdensV2();
  const ocorrencias = html.match(/name="quantidade"/g) || [];
  assert.equal(ocorrencias.length, 1);
  assert.doesNotMatch(html, /produtoQuantidade/);
});

test("lista possui edição direta e atualização pelo store", () => {
  const html = templateOrdensV2();
  assert.match(html, /data-v2-ordens-lista/);
  assert.match(html, /A lista é alimentada pelo store V2/);
});
