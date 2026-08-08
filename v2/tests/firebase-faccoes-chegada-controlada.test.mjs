import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridge = await readFile(new URL("../../corponu-v2-firebase-bridge.js", import.meta.url), "utf8");
const login = await readFile(new URL("../../firebase-v2-faccoes-chegada/firebase-write-faccoes-chegada-login.mjs", import.meta.url), "utf8");
const html = await readFile(new URL("../../firebase-v2-faccoes-chegada/index.html", import.meta.url), "utf8");
const bat = await readFile(new URL("../../firebase-v2-faccoes-chegada/ABRIR-FIREBASE-V2-FACCOES-CHEGADA.bat", import.meta.url), "utf8");
const ps1 = await readFile(new URL("../../firebase-v2-faccoes-chegada/SERVIDOR-FIREBASE-V2-FACCOES-CHEGADA.ps1", import.meta.url), "utf8");

test("modo controlado é explicitamente faccoes-chegada", () => {
  assert.match(login, /parametros\.get\("v2write"\) !== "faccoes-chegada"/);
  assert.match(login, /parametros\.set\("v2write", "faccoes-chegada"\)/);
  assert.match(bridge, /const escritaFaccoesChegada = modoEscrita === "faccoes-chegada"/);
  assert.match(bridge, /ESCRITA CONTROLADA · FACÇÕES \+ CHEGADA/);
});

test("chegada controlada usa somente transação e coleções operacionais", () => {
  assert.match(bridge, /COLECOES_OPERACIONAIS_CONTROLADAS = new Set\(\["ordensProducao", "movimentacoesProducao"\]\)/);
  assert.match(bridge, /runTransactionChegadaControlada/);
  assert.match(bridge, /setDoc: escritaCompleta \? firestoreSdk\.setDoc : \(escritaOrdensManejo \? setDocControlado : bloqueada\)/);
  assert.match(bridge, /writeBatch: escritaCompleta \? firestoreSdk\.writeBatch : \(escritaOrdensManejo \? writeBatchControlado : bloqueada\)/);
  assert.doesNotMatch(bridge.match(/COLECOES_OPERACIONAIS_CONTROLADAS[^;]+;/)?.[0] || "", /entregasPagamento/);
});

test("patch de movimentação só pode representar chegada", () => {
  assert.match(bridge, /dados\?\.chegadaInformada === true \|\| dados\?\.confirmacaoChegadaOperacional === true/);
  assert.match(bridge, /FACCOES_V2_APENAS_CHEGADA_NESTA_ETAPA/);
  assert.match(bridge, /REENVIO_V2_BLOQUEADO_NESTA_ETAPA/);
  assert.match(bridge, /opcoes\?\.merge !== true/);
});

test("patch da OP fica limitado à consolidação de componentes da chegada", () => {
  assert.match(bridge, /"componentesConsolidados", "atualizadoEm", "atualizadoPor"/);
  assert.match(bridge, /OP_V2_APENAS_COMPONENTES_DA_CHEGADA_NESTA_ETAPA/);
});

test("interface libera chegada e mantém reenvio bloqueado", () => {
  assert.match(bridge, /\[data-v2-chegada-form\]/);
  assert.match(bridge, /\[data-v2-informar-chegada\],\[data-v2-confirmar-chegada\]/);
  assert.match(bridge, /Reenvio e financeiro continuam bloqueados/);
});

test("clique no submit do modal de chegada não é bloqueado antes do submit", () => {
  const trecho = bridge.match(/instalarBloqueioInterface\(conteudo, aviso, \(\{ event, botao, submit \}\) => \{([\s\S]*?)\n      \}\);/)?.[1] || "";
  assert.match(trecho, /String\(botao\?\.type \|\| ""\)\.toLowerCase\(\) === "submit"/);
  assert.match(trecho, /botao\?\.closest\?\.\("\[data-v2-chegada-form\]"\) != null/);
  assert.doesNotMatch(trecho, /data-v2-reenvio-form/);
});

test("cada transação real exige confirmação GRAVAR", () => {
  assert.match(bridge, /Digite GRAVAR para confirmar/);
  assert.match(bridge, /Transação operacional de Facções\/Chegada/);
  assert.match(bridge, /GRAVACAO_REAL_CANCELADA_PELO_USUARIO/);
});

test("pacote é standalone, portátil e não carrega sistema legado", () => {
  assert.match(html, /firebase-write-faccoes-chegada-login\.mjs/);
  assert.doesNotMatch(html, /(?:^|["'\/])app\.js(?:["'?]|$)/m);
  assert.doesNotMatch(html, /corponu-atualizador\.js/);
  assert.match(bat, /powershell\.exe/i);
  assert.doesNotMatch(bat, /(?:^|\r?\n)\s*node(?:\.exe)?\s/i);
  assert.doesNotMatch(bat, /(?:^|\r?\n)\s*python(?:\.exe)?\s/i);
  assert.match(ps1, /127\.0\.0\.1/);
  assert.match(ps1, /v2write=faccoes-chegada/);
  assert.match(ps1, /\$Port = 8768/);
});