import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function fonte(caminhoRelativo) {
  return readFile(new URL(caminhoRelativo, import.meta.url), "utf8");
}

test("core V2 permanece independente de DOM", async () => {
  const arquivos = [
    "../core/normalizacao.mjs",
    "../core/store.mjs",
    "../core/faccoes-regras.mjs",
    "../core/financeiro-regras.mjs",
    "../core/financeiro-service.mjs",
    "../core/fechamento-controller.mjs",
    "../core/ordens-regras.mjs",
    "../core/ordens-service.mjs",
    "../core/ordens-controller.mjs",
    "../core/manejo-regras.mjs",
    "../core/manejo-service.mjs"
  ];

  for (const arquivo of arquivos) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /\bdocument\./, `${arquivo} acessou document`);
    assert.doesNotMatch(codigo, /\bwindow\./, `${arquivo} acessou window`);
    assert.doesNotMatch(codigo, /MutationObserver/, `${arquivo} criou MutationObserver`);
    assert.doesNotMatch(codigo, /new Blob\s*\(/, `${arquivo} executou código por Blob`);
    assert.doesNotMatch(codigo, /URL\.createObjectURL/, `${arquivo} executou código por URL temporária`);
  }
});

test("telas V2 não usam observer, polling ou listener Firestore", async () => {
  for (const arquivo of [
    "../ui/fechamento-page.mjs",
    "../ui/ordens-page.mjs",
    "../ui/ordens-ui-utils.mjs"
  ]) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /MutationObserver/, arquivo);
    assert.doesNotMatch(codigo, /setInterval\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /onSnapshot\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /new Blob\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /URL\.createObjectURL/, arquivo);
  }
});

test("adaptador financeiro não conhece movimentacoesProducao", async () => {
  const codigo = await fonte("../adapters/firestore-repos.mjs");
  assert.doesNotMatch(codigo, /movimentacoesProducao/);
  assert.match(codigo, /entregasPagamento/);
});

test("Manejo V2 não conhece nem grava coleção financeira", async () => {
  for (const arquivo of [
    "../core/manejo-regras.mjs",
    "../core/manejo-service.mjs",
    "../adapters/manejo-repo.mjs"
  ]) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /entregasPagamento/, arquivo);
    assert.doesNotMatch(codigo, /statusPagamento/, arquivo);
    assert.doesNotMatch(codigo, /valorUnitario/, arquivo);
  }

  const repo = await fonte("../adapters/manejo-repo.mjs");
  assert.match(repo, /ordensProducao/);
  assert.match(repo, /movimentacoesProducao/);
});

test("bootstraps V2 reutilizam Firebase existente", async () => {
  for (const arquivo of [
    "../bootstrap/fechamento-app.mjs",
    "../bootstrap/ordens-app.mjs"
  ]) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /initializeApp\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /getFirestore\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /onSnapshot\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /firebase-app\.js/, arquivo);
    assert.doesNotMatch(codigo, /firebase-firestore\.js/, arquivo);
    assert.match(codigo, /\bdb\b/);
    assert.match(codigo, /\bfs\b/);
  }
});

test("repositório de Facções não cria listener em tempo real", async () => {
  const codigo = await fonte("../adapters/faccoes-repo.mjs");
  assert.doesNotMatch(codigo, /onSnapshot\s*\(/);
  assert.doesNotMatch(codigo, /setInterval\s*\(/);
  assert.match(codigo, /getDocs\s*\(/);
});

test("repositórios V2 reutilizam Firebase existente", async () => {
  for (const arquivo of [
    "../adapters/ordens-repo.mjs",
    "../adapters/produtos-repo.mjs",
    "../adapters/manejo-repo.mjs"
  ]) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /initializeApp\s*\(/);
    assert.doesNotMatch(codigo, /getFirestore\s*\(/);
    assert.doesNotMatch(codigo, /firebase-app\.js/);
    assert.doesNotMatch(codigo, /firebase-firestore\.js/);
    assert.doesNotMatch(codigo, /onSnapshot\s*\(/);
  }
});

test("nenhum módulo V2 importa patches legados", async () => {
  const arquivos = [
    "../core/financeiro-regras.mjs",
    "../core/financeiro-service.mjs",
    "../core/fechamento-controller.mjs",
    "../core/ordens-regras.mjs",
    "../core/ordens-service.mjs",
    "../core/ordens-controller.mjs",
    "../core/manejo-regras.mjs",
    "../core/manejo-service.mjs",
    "../adapters/firestore-repos.mjs",
    "../adapters/faccoes-repo.mjs",
    "../adapters/ordens-repo.mjs",
    "../adapters/produtos-repo.mjs",
    "../adapters/manejo-repo.mjs",
    "../bootstrap/fechamento-app.mjs",
    "../bootstrap/ordens-app.mjs",
    "../ui/fechamento-page.mjs",
    "../ui/ordens-page.mjs",
    "../ui/ordens-ui-utils.mjs"
  ];

  for (const arquivo of arquivos) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /corponu-[a-z0-9-]+\.js/i);
  }
});
