import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const compat = await readFile(new URL("../../corponu-pagamentos-filtro-op-v2-compat-158.js", import.meta.url), "utf8");
const updater = await readFile(new URL("../../corponu-atualizador.js", import.meta.url), "utf8");

test("compat 158 neutraliza o módulo antigo antes de ele registrar eventos", () => {
  assert.match(compat, /VERSAO_FILTRO_ANTIGO = "2026-08-02-filtro-op-pagamentos-90"/);
  assert.match(compat, /window\.__CORPONU_PAGAMENTOS_FILTRO_OP__ = VERSAO_FILTRO_ANTIGO/);
});

test("compat 158 cria e assume o campo Nº OP sem observer ou polling", () => {
  assert.match(compat, /INPUT_ID = "pagamentoFiltroOP"/);
  assert.match(compat, /Busca direta no Firebase somente desta OP/);
  assert.match(compat, /document\.createElement\("label"\)/);
  assert.doesNotMatch(compat, /MutationObserver/);
  assert.doesNotMatch(compat, /setInterval\s*\(/);
  assert.doesNotMatch(compat, /onSnapshot\s*\(/);
});

test("ordem de carregamento é compat 158, motor 157 e só depois filtro legado", () => {
  const compatPos = updater.indexOf("corponu-pagamentos-filtro-op-v2-compat-158.js");
  const motorPos = updater.indexOf("corponu-pagamentos-filtro-op-performance-157.js");
  const legadoPos = updater.indexOf("corponu-pagamentos-filtro-op.js");

  assert.ok(compatPos >= 0, "compat 158 precisa estar no atualizador");
  assert.ok(motorPos >= 0, "motor 157 precisa estar no atualizador");
  assert.ok(legadoPos >= 0, "arquivo legado permanece listado para compatibilidade");
  assert.ok(compatPos < motorPos, "compat 158 deve carregar antes do motor 157");
  assert.ok(motorPos < legadoPos, "motor 157 deve carregar antes do legado neutralizado");
});
