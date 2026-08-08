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
    "../core/ordens-service.mjs"
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

test("tela de fechamento não usa observer, polling ou listener Firestore", async () => {
  const codigo = await fonte("../ui/fechamento-page.mjs");

  assert.doesNotMatch(codigo, /MutationObserver/);
  assert.doesNotMatch(codigo, /setInterval\s*\(/);
  assert.doesNotMatch(codigo, /onSnapshot\s*\(/);
});

test("adaptador financeiro não conhece movimentacoesProducao", async () => {
  const codigo = await fonte("../adapters/firestore-repos.mjs");

  assert.doesNotMatch(codigo, /movimentacoesProducao/);
  assert.match(codigo, /entregasPagamento/);
});

test("bootstrap de fechamento reutiliza Firebase existente", async () => {
  const codigo = await fonte("../bootstrap/fechamento-app.mjs");

  assert.doesNotMatch(codigo, /initializeApp\s*\(/);
  assert.doesNotMatch(codigo, /getFirestore\s*\(/);
  assert.doesNotMatch(codigo, /onSnapshot\s*\(/);
  assert.doesNotMatch(codigo, /firebase-app\.js/);
  assert.doesNotMatch(codigo, /firebase-firestore\.js/);
  assert.match(codigo, /\bdb\b/);
  assert.match(codigo, /\bfs\b/);
});

test("repositório de Facções não cria listener em tempo real", async () => {
  const codigo = await fonte("../adapters/faccoes-repo.mjs");

  assert.doesNotMatch(codigo, /onSnapshot\s*\(/);
  assert.doesNotMatch(codigo, /setInterval\s*\(/);
  assert.match(codigo, /getDocs\s*\(/);
});

test("repositórios de Ordens e Produtos reutilizam Firebase existente", async () => {
  for (const arquivo of ["../adapters/ordens-repo.mjs", "../adapters/produtos-repo.mjs"]) {
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
    "../adapters/firestore-repos.mjs",
    "../adapters/faccoes-repo.mjs",
    "../adapters/ordens-repo.mjs",
    "../adapters/produtos-repo.mjs",
    "../bootstrap/fechamento-app.mjs",
    "../ui/fechamento-page.mjs"
  ];

  for (const arquivo of arquivos) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /corponu-[a-z0-9-]+\.js/i);
  }
});
