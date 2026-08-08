import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const hotfix = await readFile(new URL("../../corponu-pagamentos-filtro-op-performance-157.js", import.meta.url), "utf8");
const updater = await readFile(new URL("../../corponu-atualizador.js", import.meta.url), "utf8");
const release = JSON.parse(await readFile(new URL("../../corponu-release.json", import.meta.url), "utf8"));

test("filtro 157 consulta entregasPagamento por campo da OP, sem varrer a coleção inteira", () => {
  assert.match(hotfix, /fs\.where\(campo, "==", valor\)/);
  assert.match(hotfix, /"numeroOP"/);
  assert.match(hotfix, /"numeroOPExterno", "op", "numeroOrdem"/);
  assert.doesNotMatch(hotfix, /fs\.getDocs\(fs\.collection\(db, "entregasPagamento"\)\)/);
});

test("documento interno de saldo nunca é tratado como pagamento", () => {
  assert.match(hotfix, /item\.tipoDocumento === "controle_processo_v2"/);
  assert.match(hotfix, /item\.tipoDocumento === "lancamento_financeiro_v2"/);
  assert.match(hotfix, /Fechamento V2/);
});

test("hotfix intercepta o filtro antigo sem observer, polling ou realtime", () => {
  assert.match(hotfix, /event\.stopImmediatePropagation\(\)/);
  assert.doesNotMatch(hotfix, /MutationObserver/);
  assert.doesNotMatch(hotfix, /setInterval\s*\(/);
  assert.doesNotMatch(hotfix, /onSnapshot\s*\(/);
});

test("updater mantém o motor 157 antes do filtro legado", () => {
  const motor = updater.indexOf("corponu-pagamentos-filtro-op-performance-157.js");
  const antigo = updater.indexOf("corponu-pagamentos-filtro-op.js");
  assert.ok(motor >= 0, "motor 157 precisa estar no atualizador");
  assert.ok(antigo >= 0, "filtro legado precisa continuar presente por compatibilidade");
  assert.ok(motor < antigo, "motor 157 precisa carregar antes do filtro legado");
});

test("release atual é 158 sem remover o motor de consulta 157", () => {
  assert.equal(release.version, "2026-08-08-pagamentos-filtro-op-v2-compat-158");
  assert.match(updater, /LOCAL_RELEASE = "2026-08-08-pagamentos-filtro-op-v2-compat-158"/);
  assert.match(updater, /corponu-pagamentos-filtro-op-performance-157\.js/);
});
