import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const batUrl = new URL("../../homologacao-v2/ABRIR-HOMOLOGACAO.bat", import.meta.url);
const psUrl = new URL("../../homologacao-v2/SERVIDOR-HOMOLOGACAO.ps1", import.meta.url);

test("launcher da homologacao nao depende de Node ou Python", async () => {
  const bat = await readFile(batUrl, "utf8");
  const normalizado = bat.toLowerCase();

  assert.match(normalizado, /powershell\.exe|pwsh\.exe/);
  assert.match(normalizado, /servidor-homologacao\.ps1/);
  assert.doesNotMatch(normalizado, /where\s+node/);
  assert.doesNotMatch(normalizado, /where\s+python/);
  assert.doesNotMatch(normalizado, /where\s+py\b/);
  assert.doesNotMatch(normalizado, /node\s+"/);
  assert.doesNotMatch(normalizado, /python\s+-m\s+http\.server/);
  assert.doesNotMatch(normalizado, /py\s+-m\s+http\.server/);
});

test("servidor portatil usa somente loopback e abre a homologacao V2", async () => {
  const ps = await readFile(psUrl, "utf8");

  assert.match(ps, /System\.Net\.Sockets\.TcpListener/);
  assert.match(ps, /System\.Net\.IPAddress\]::Loopback/);
  assert.match(ps, /127\.0\.0\.1:\$Port\/homologacao-v2\//);
  assert.match(ps, /Start-Process \$url/);
  assert.doesNotMatch(ps, /Firebase/i);
  assert.doesNotMatch(ps, /0\.0\.0\.0/);
});
