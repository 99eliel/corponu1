import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridge = await readFile(new URL("../../corponu-v2-firebase-bridge.js", import.meta.url), "utf8");
const html = await readFile(new URL("../../firebase-v2-escrita-controlada/index.html", import.meta.url), "utf8");
const login = await readFile(new URL("../../firebase-v2-escrita-controlada/firebase-write-ordens-manejo-login.mjs", import.meta.url), "utf8");
const servidor = await readFile(new URL("../../firebase-v2-escrita-controlada/SERVIDOR-FIREBASE-V2-ESCRITA-CONTROLADA.ps1", import.meta.url), "utf8");
const launcher = await readFile(new URL("../../firebase-v2-escrita-controlada/ABRIR-FIREBASE-V2-ESCRITA-CONTROLADA.bat", import.meta.url), "utf8");

test("modo controlado é explicitamente ordens-manejo", () => {
  assert.match(bridge, /modoEscrita === "ordens-manejo"/);
  assert.match(login, /parametros\.set\("v2write", "ordens-manejo"\)/);
  assert.match(servidor, /v2write=ordens-manejo/);
  assert.doesNotMatch(servidor, /v2write=1/);
});

test("escrita controlada só admite coleções operacionais desta etapa", () => {
  assert.match(bridge, /new Set\(\["ordensProducao", "movimentacoesProducao"\]\)/);
  const trecho = bridge.match(/const COLECOES_ORDENS_MANEJO = new Set\(([^;]+)\);/)?.[1] || "";
  assert.doesNotMatch(trecho, /entregasPagamento/);
  assert.doesNotMatch(trecho, /faccoes/);
  assert.doesNotMatch(trecho, /configuracoes/);
  assert.match(bridge, /exigirColecaoPermitida\(ref\)/);
});

test("financeiro continua sem transação no modo controlado", () => {
  assert.match(bridge, /runTransaction: escritaCompleta \? firestoreSdk\.runTransaction : bloqueada/);
  assert.match(bridge, /updateDoc: escritaCompleta \? firestoreSdk\.updateDoc : bloqueada/);
  assert.match(bridge, /deleteDoc: escritaCompleta \? firestoreSdk\.deleteDoc : bloqueada/);
});

test("cada commit real pede confirmação GRAVAR", () => {
  assert.match(bridge, /Digite GRAVAR para confirmar/);
  assert.match(bridge, /setDocControlado/);
  assert.match(bridge, /confirmarGravacao\(`Destino:/);
  assert.match(bridge, /async commit\(\)/);
  assert.match(bridge, /confirmarGravacao\(`Operação em lote:/);
});

test("pacote controlado é standalone e não depende de Node ou Python", () => {
  assert.doesNotMatch(html, /src=["']\.\.\/app\.js/i);
  assert.doesNotMatch(login, /onSnapshot\s*\(/);
  assert.equal([...login.matchAll(/initializeApp\s*\(/g)].length, 1);
  assert.match(servidor, /IPAddress\]::Loopback/);
  assert.doesNotMatch(launcher, /node(?:\.exe)?\s/i);
  assert.doesNotMatch(launcher, /python(?:\.exe)?\s/i);
  assert.match(launcher, /powershell\.exe/i);
});
