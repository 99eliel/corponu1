import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function fonte(caminhoRelativo) {
  return readFile(new URL(caminhoRelativo, import.meta.url), "utf8");
}

test("Facções operacional não conhece coleção ou campos financeiros", async () => {
  const arquivos = [
    "../core/faccoes-operacional-regras.mjs",
    "../core/faccoes-operacional-service.mjs",
    "../adapters/faccoes-operacional-repo.mjs",
    "../adapters/movimentacoes-faccoes-repo.mjs"
  ];

  for (const arquivo of arquivos) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /entregasPagamento/, arquivo);
    assert.doesNotMatch(codigo, /statusPagamento/, arquivo);
    assert.doesNotMatch(codigo, /valorUnitario/, arquivo);
    assert.doesNotMatch(codigo, /renderPagamentos/, arquivo);
    assert.doesNotMatch(codigo, /gerarPagamento/, arquivo);
  }
});

test("Facções operacional não usa observer, polling ou listener em tempo real", async () => {
  const arquivos = [
    "../core/faccoes-operacional-regras.mjs",
    "../core/faccoes-operacional-service.mjs",
    "../adapters/faccoes-operacional-repo.mjs",
    "../adapters/movimentacoes-faccoes-repo.mjs"
  ];

  for (const arquivo of arquivos) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /MutationObserver/, arquivo);
    assert.doesNotMatch(codigo, /setInterval\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /onSnapshot\s*\(/, arquivo);
  }
});

test("repositórios de Facções reutilizam Firebase existente", async () => {
  for (const arquivo of [
    "../adapters/faccoes-operacional-repo.mjs",
    "../adapters/movimentacoes-faccoes-repo.mjs"
  ]) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /initializeApp\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /getFirestore\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /firebase-app\.js/, arquivo);
    assert.doesNotMatch(codigo, /firebase-firestore\.js/, arquivo);
  }
});

test("Facções V2 não importa patches legados", async () => {
  for (const arquivo of [
    "../core/faccoes-operacional-regras.mjs",
    "../core/faccoes-operacional-service.mjs",
    "../adapters/faccoes-operacional-repo.mjs",
    "../adapters/movimentacoes-faccoes-repo.mjs"
  ]) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /corponu-[a-z0-9-]+\.js/i, arquivo);
  }
});
