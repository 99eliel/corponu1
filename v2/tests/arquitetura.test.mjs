import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function fonte(caminhoRelativo) {
  return readFile(new URL(caminhoRelativo, import.meta.url), "utf8");
}

test("core V2 permanece independente de DOM", async () => {
  const arquivos = [
    "../core/normalizacao.mjs", "../core/store.mjs", "../core/faccoes-regras.mjs",
    "../core/financeiro-regras.mjs", "../core/financeiro-service.mjs", "../core/fechamento-controller.mjs",
    "../core/pagamentos-regras.mjs", "../core/pagamentos-controller.mjs",
    "../core/ordens-regras.mjs", "../core/ordens-service.mjs", "../core/ordens-controller.mjs",
    "../core/manejo-regras.mjs", "../core/manejo-service.mjs", "../core/manejo-filtros.mjs", "../core/manejo-controller.mjs"
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
    "../ui/fechamento-page.mjs", "../ui/pagamentos-page.mjs",
    "../ui/ordens-page.mjs", "../ui/ordens-ui-utils.mjs", "../ui/manejo-page.mjs", "../ui/manejo-ui-utils.mjs"
  ]) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /MutationObserver/, arquivo);
    assert.doesNotMatch(codigo, /setInterval\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /onSnapshot\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /new Blob\s*\(/, arquivo);
    assert.doesNotMatch(codigo, /URL\.createObjectURL/, arquivo);
  }
});

test("adaptadores financeiros não conhecem movimentacoesProducao", async () => {
  for (const arquivo of ["../adapters/firestore-repos.mjs", "../adapters/pagamentos-repo.mjs"]) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /movimentacoesProducao/);
    assert.match(codigo, /entregasPagamento/);
  }
});

test("Manejo V2 não conhece nem grava coleção financeira", async () => {
  for (const arquivo of ["../core/manejo-regras.mjs", "../core/manejo-service.mjs", "../core/manejo-filtros.mjs", "../core/manejo-controller.mjs", "../adapters/manejo-repo.mjs"]) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /entregasPagamento/, arquivo);
    assert.doesNotMatch(codigo, /statusPagamento/, arquivo);
    assert.doesNotMatch(codigo, /valorUnitario/, arquivo);
  }
  const repo = await fonte("../adapters/manejo-repo.mjs");
  assert.match(repo, /ordensProducao/);
  assert.match(repo, /movimentacoesProducao/);
});

test("Manejo V2 não oferece Célula nem carrega catálogo de Células", async () => {
  const arquivos = ["../core/manejo-regras.mjs", "../core/manejo-controller.mjs", "../ui/manejo-page.mjs", "../ui/manejo-template.mjs", "../ui/manejo-ui-utils.mjs", "../bootstrap/manejo-app.mjs"];
  for (const arquivo of arquivos) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /DESTINO_CELULA|PROCESSO_CELULA|data-v2-enviar-celula/i, arquivo);
  }
  const bootstrap = await fonte("../bootstrap/manejo-app.mjs");
  assert.doesNotMatch(bootstrap, /celulas-repo|celulasRepo|criarCelulasRepoFirestore/i);
});

test("bootstraps V2 reutilizam Firebase existente", async () => {
  for (const arquivo of ["../bootstrap/fechamento-app.mjs", "../bootstrap/pagamentos-app.mjs", "../bootstrap/ordens-app.mjs", "../bootstrap/manejo-app.mjs"]) {
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

test("repositórios de catálogos não criam listener em tempo real", async () => {
  for (const arquivo of ["../adapters/faccoes-repo.mjs", "../adapters/celulas-repo.mjs"]) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /onSnapshot\s*\(/);
    assert.doesNotMatch(codigo, /setInterval\s*\(/);
    assert.match(codigo, /getDocs\s*\(/);
  }
});

test("repositórios V2 reutilizam Firebase existente", async () => {
  for (const arquivo of ["../adapters/ordens-repo.mjs", "../adapters/produtos-repo.mjs", "../adapters/manejo-repo.mjs", "../adapters/celulas-repo.mjs", "../adapters/pagamentos-repo.mjs"]) {
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
    "../core/financeiro-regras.mjs", "../core/financeiro-service.mjs", "../core/fechamento-controller.mjs",
    "../core/pagamentos-regras.mjs", "../core/pagamentos-controller.mjs",
    "../core/ordens-regras.mjs", "../core/ordens-service.mjs", "../core/ordens-controller.mjs",
    "../core/manejo-regras.mjs", "../core/manejo-service.mjs", "../core/manejo-filtros.mjs", "../core/manejo-controller.mjs",
    "../adapters/firestore-repos.mjs", "../adapters/pagamentos-repo.mjs", "../adapters/faccoes-repo.mjs", "../adapters/celulas-repo.mjs", "../adapters/ordens-repo.mjs", "../adapters/produtos-repo.mjs", "../adapters/manejo-repo.mjs",
    "../bootstrap/fechamento-app.mjs", "../bootstrap/pagamentos-app.mjs", "../bootstrap/ordens-app.mjs", "../bootstrap/manejo-app.mjs",
    "../ui/fechamento-page.mjs", "../ui/pagamentos-page.mjs", "../ui/ordens-page.mjs", "../ui/ordens-ui-utils.mjs", "../ui/manejo-page.mjs", "../ui/manejo-ui-utils.mjs"
  ];
  for (const arquivo of arquivos) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /corponu-[a-z0-9-]+\.js/i);
  }
});
