import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../../firebase-v2-leitura/index.html", import.meta.url), "utf8");
const login = await readFile(new URL("../../firebase-v2-leitura/firebase-readonly-login.mjs", import.meta.url), "utf8");
const servidor = await readFile(new URL("../../firebase-v2-leitura/SERVIDOR-FIREBASE-V2-LEITURA.ps1", import.meta.url), "utf8");
const launcher = await readFile(new URL("../../firebase-v2-leitura/ABRIR-FIREBASE-V2-LEITURA.bat", import.meta.url), "utf8");
const workflow = await readFile(new URL("../../.github/workflows/validar-corponu.yml", import.meta.url), "utf8");

const ambiente = `${html}\n${login}\n${servidor}\n${launcher}`;

test("ambiente standalone não carrega app.js nem patches legados", () => {
  assert.doesNotMatch(html, /app\.js/i);
  assert.doesNotMatch(html, /corponu-atualizador\.js/i);
  assert.doesNotMatch(html, /corponu-(?!v2-firebase-bridge)/i);
  assert.doesNotMatch(login, /app\.js/i);
  assert.doesNotMatch(login, /onSnapshot\s*\(/);
});

test("standalone inicializa somente um Firebase e bridge continua reutilizando esse app", () => {
  const inicializacoes = [...login.matchAll(/initializeApp\s*\(/g)].length;
  assert.equal(inicializacoes, 1);
  assert.match(login, /getApps\(\)\[0\] \|\| initializeApp/);
  assert.match(login, /getFirestore\(app\)/);
  assert.doesNotMatch(login, /SecondaryUserCreator/);
  assert.doesNotMatch(login, /initializeFirestore\s*\(/);
});

test("ambiente standalone remove v2write e abre explicitamente em somente leitura", () => {
  assert.match(login, /parametros\.has\("v2write"\)/);
  assert.match(login, /parametros\.delete\("v2write"\)/);
  assert.match(servidor, /\/firebase-v2-leitura\/\?v2firebase=1/);
  assert.doesNotMatch(servidor, /v2write=1/);
  assert.doesNotMatch(launcher, /v2write=1/);
});

test("servidor portátil fica restrito ao loopback e aceita apenas GET ou HEAD", () => {
  assert.match(servidor, /IPAddress\]::Loopback/);
  assert.match(servidor, /TcpListener\(\$loopback, \$Port\)/);
  assert.match(servidor, /\$method -ne "GET" -and -not \$isHead/);
  assert.doesNotMatch(servidor, /IPAddress\]::Any/);
});

test("launcher não depende de Node ou Python", () => {
  assert.doesNotMatch(launcher, /node(?:\.exe)?\s/i);
  assert.doesNotMatch(launcher, /python(?:\.exe)?\s/i);
  assert.match(launcher, /powershell\.exe/i);
});

test("artifact readonly não empacota sistema legado", () => {
  const bloco = workflow.split("- name: Gerar pacote Firebase V2 somente leitura")[1] || "";
  assert.match(bloco, /firebase-v2-leitura/);
  assert.match(bloco, /corponu-v2-firebase-bridge\.js/);
  assert.doesNotMatch(bloco, /\n\s+app\.js\s*$/m);
  assert.doesNotMatch(bloco, /\n\s+index\.html\s*$/m);
  assert.doesNotMatch(bloco, /corponu-\*\.js/);
  assert.doesNotMatch(bloco, /\*\.json/);
});

test("arquivos standalone não possuem métodos Firestore de escrita", () => {
  assert.doesNotMatch(ambiente, /setDoc\s*\(/);
  assert.doesNotMatch(ambiente, /updateDoc\s*\(/);
  assert.doesNotMatch(ambiente, /deleteDoc\s*\(/);
  assert.doesNotMatch(ambiente, /writeBatch\s*\(/);
  assert.doesNotMatch(ambiente, /runTransaction\s*\(/);
});
