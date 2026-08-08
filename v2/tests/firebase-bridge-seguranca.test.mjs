import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridge = await readFile(new URL("../../corponu-v2-firebase-bridge.js", import.meta.url), "utf8");
const atualizador = await readFile(new URL("../../corponu-atualizador.js", import.meta.url), "utf8");

test("ponte Firebase V2 não inicializa outro app Firebase", () => {
  assert.doesNotMatch(bridge, /initializeApp\s*\(/);
  assert.doesNotMatch(bridge, /initializeFirestore\s*\(/);
  assert.match(bridge, /getApps\(\)/);
  assert.match(bridge, /getFirestore\(app\)/);
});

test("ponte só é carregada quando v2firebase=1 estiver explicitamente na URL", () => {
  assert.match(atualizador, /parametros\.get\("v2firebase"\) === "1"/);
  assert.match(atualizador, /corponu-v2-firebase-bridge\.js/);
  assert.match(bridge, /parametros\.get\("v2firebase"\) !== "1"/);
});

test("escrita real permanece bloqueada por padrão e modos de escrita são explícitos", () => {
  assert.match(bridge, /parametros\.get\("v2write"\)/);
  assert.match(bridge, /const escritaCompleta = modoEscrita === "1"/);
  assert.match(bridge, /const escritaOrdensManejo = modoEscrita === "ordens-manejo"/);
  assert.match(bridge, /const escritaLiberada = escritaCompleta \|\| escritaOrdensManejo/);
  assert.match(bridge, /ESCRITA_V2_BLOQUEADA_NESTA_ETAPA/);
  assert.match(bridge, /setDoc: escritaCompleta \? firestoreSdk\.setDoc : \(escritaOrdensManejo \? setDocControlado : bloqueada\)/);
  assert.match(bridge, /writeBatch: escritaCompleta \? firestoreSdk\.writeBatch : \(escritaOrdensManejo \? writeBatchControlado : bloqueada\)/);
  assert.match(bridge, /runTransaction: escritaCompleta \? firestoreSdk\.runTransaction : bloqueada/);
  assert.match(bridge, /addEventListener\("submit"/);
  assert.match(bridge, /ehBotaoDeEscrita/);
});

test("ponte mantém a V2 isolada das páginas legadas", () => {
  assert.match(bridge, /corponuV2FirebaseLab/);
  assert.match(bridge, /flow\.desmontar\(\)/);
  assert.doesNotMatch(bridge, /querySelector\(["']#page-/);
  assert.doesNotMatch(bridge, /MutationObserver/);
  assert.doesNotMatch(bridge, /setInterval\s*\(/);
});

test("ponte usa carregamento paginado de OPs e um único fluxo compartilhado", () => {
  assert.match(bridge, /criarCorpoNuFlowFirebaseV2/);
  assert.match(bridge, /tamanhoPaginaOrdens: escritaLiberada \? 150 : 40/);
  assert.match(bridge, /carregarMaisOrdens\(\)/);
  assert.match(bridge, /flow\.montarOrdens/);
  assert.match(bridge, /flow\.montarManejo/);
  assert.match(bridge, /flow\.montarFaccoes/);
  assert.match(bridge, /flow\.montarFechamento/);
  assert.match(bridge, /flow\.montarPagamentos/);
});

test("modo leitura executa diagnóstico real antes de abrir módulos", () => {
  assert.match(bridge, /firebase-readonly\.mjs/);
  assert.match(bridge, /executarDiagnosticoFirebaseSomenteLeitura/);
  assert.match(bridge, /await montar\("diagnostico"\)/);
  assert.match(bridge, /getDocMetricado/);
  assert.match(bridge, /getDocsMetricado/);
  assert.match(bridge, /documentos lidos/);
});
