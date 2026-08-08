import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function fonte(caminhoRelativo) {
  return readFile(new URL(caminhoRelativo, import.meta.url), "utf8");
}

test("UI de Facções não usa observers, polling ou listener Firestore", async () => {
  for (const arquivo of [
    "../ui/faccoes-template.mjs",
    "../ui/faccoes-ui-utils.mjs",
    "../ui/faccoes-page.mjs"
  ]) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /MutationObserver/, arquivo);
    assert.doesNotMatch(codigo, /setInterval\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /onSnapshot\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /new Blob\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /URL\.createObjectURL/, arquivo);
  }
});

test("UI e bootstrap de Facções não conhecem financeiro", async () => {
  for (const arquivo of [
    "../ui/faccoes-template.mjs",
    "../ui/faccoes-ui-utils.mjs",
    "../ui/faccoes-page.mjs",
    "../bootstrap/faccoes-app.mjs"
  ]) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /entregasPagamento/, arquivo);
    assert.doesNotMatch(codigo, /statusPagamento/, arquivo);
    assert.doesNotMatch(codigo, /valorUnitario/, arquivo);
    assert.doesNotMatch(codigo, /renderPagamentos/, arquivo);
    assert.doesNotMatch(codigo, /gerarPagamento/, arquivo);
  }
});

test("bootstrap de Facções reutiliza Firebase existente", async () => {
  const codigo = await fonte("../bootstrap/faccoes-app.mjs");
  assert.doesNotMatch(codigo, /initializeApp\s*\(/);
  assert.doesNotMatch(codigo, /getFirestore\s*\(/);
  assert.doesNotMatch(codigo, /firebase-app\.js/);
  assert.doesNotMatch(codigo, /firebase-firestore\.js/);
  assert.doesNotMatch(codigo, /onSnapshot\s*\(/);
  assert.match(codigo, /movimentosRepo\.carregarPrimeiraPagina\(\)/);
});

test("UI de Facções não contém legado do badge ou botão Bipar", async () => {
  const codigo = [
    await fonte("../ui/faccoes-template.mjs"),
    await fonte("../ui/faccoes-ui-utils.mjs"),
    await fonte("../ui/faccoes-page.mjs")
  ].join("\n");

  assert.doesNotMatch(codigo, /data-aviso-chegada-badge/i);
  assert.doesNotMatch(codigo, /data-chegada-aviso-131/i);
  assert.doesNotMatch(codigo, /biparMovimentacao/i);
  assert.doesNotMatch(codigo, /btn-bipado/i);
});
