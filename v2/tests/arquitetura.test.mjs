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
    "../core/fechamento-controller.mjs"
  ];

  for (const arquivo of arquivos) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /\bdocument\./, `${arquivo} acessou document`);
    assert.doesNotMatch(codigo, /\bwindow\./, `${arquivo} acessou window`);
    assert.doesNotMatch(codigo, /MutationObserver/, `${arquivo} criou MutationObserver`);
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

test("nenhum módulo V2 financeiro importa patches legados", async () => {
  const arquivos = [
    "../core/financeiro-regras.mjs",
    "../core/financeiro-service.mjs",
    "../core/fechamento-controller.mjs",
    "../adapters/firestore-repos.mjs",
    "../ui/fechamento-page.mjs"
  ];

  for (const arquivo of arquivos) {
    const codigo = await fonte(arquivo);
    assert.doesNotMatch(codigo, /corponu-[a-z0-9-]+\.js/i);
  }
});
