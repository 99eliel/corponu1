import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../../firebase-v2-fechamento-controlado/firebase-fechamento-controlado.mjs", import.meta.url), "utf8");
const html = await readFile(new URL("../../firebase-v2-fechamento-controlado/index.html", import.meta.url), "utf8");
const bat = await readFile(new URL("../../firebase-v2-fechamento-controlado/ABRIR-FIREBASE-V2-FECHAMENTO-CONTROLADO.bat", import.meta.url), "utf8");
const ps1 = await readFile(new URL("../../firebase-v2-fechamento-controlado/SERVIDOR-FIREBASE-V2-FECHAMENTO-CONTROLADO.ps1", import.meta.url), "utf8");

test("fechamento controlado grava somente em entregasPagamento", () => {
  assert.match(app, /colecaoRaiz\(ref\) !== "entregasPagamento"/);
  assert.match(app, /FINANCEIRO_V2_COLECAO_BLOQUEADA/);
  assert.match(app, /FINANCEIRO_V2_TRANSACAO_SOMENTE_ENTREGAS_PAGAMENTO/);
  assert.doesNotMatch(app, /movimentacoesProducao.*(?:set|update|delete)/s);
});

test("transação aceita somente lançamento e controle V2", () => {
  assert.match(app, /dados\.tipoDocumento === "lancamento_financeiro_v2"/);
  assert.match(app, /dados\.tipoDocumento === "controle_processo_v2"/);
  assert.match(app, /dados\?\.schemaVersion !== 2/);
  assert.match(app, /dados\?\.origem !== "fechamento_financeiro_v2"/);
  assert.match(app, /lancamentos !== 1 \|\| controles !== 1/);
  assert.match(app, /FINANCEIRO_V2_TRANSACAO_INCOMPLETA/);
});

test("operações financeiras fora do fechamento permanecem bloqueadas", () => {
  assert.match(app, /setDoc: bloqueada/);
  assert.match(app, /updateDoc: bloqueada/);
  assert.match(app, /deleteDoc: bloqueada/);
  assert.match(app, /writeBatch: bloqueada/);
  assert.match(app, /update: bloqueada/);
  assert.match(app, /delete: bloqueada/);
});

test("cada fechamento real exige confirmação GRAVAR", () => {
  assert.match(app, /Digite GRAVAR para confirmar/);
  assert.match(app, /GRAVACAO_REAL_CANCELADA_PELO_USUARIO/);
});

test("perfil precisa estar ativo e ter permissão financeira", () => {
  assert.match(app, /perfil\.ativo !== true/);
  assert.match(app, /recursos\.gerenciarValores === true \|\| recursos\.marcarPagamentos === true/);
});

test("inicialização possui timeout e não fica em carregamento infinito", () => {
  assert.match(app, /function comTimeout/);
  assert.match(app, /TEMPO_LIMITE/);
  assert.match(app, /12000/);
  assert.match(app, /15000/);
});

test("pacote financeiro é standalone e portátil", () => {
  assert.match(html, /firebase-fechamento-controlado\.mjs/);
  assert.doesNotMatch(html, /(?:^|["'\/])app\.js(?:["'?]|$)/m);
  assert.doesNotMatch(html, /corponu-v2-firebase-bridge\.js/);
  assert.match(bat, /powershell\.exe/i);
  assert.doesNotMatch(bat, /(?:^|\r?\n)\s*node(?:\.exe)?\s/i);
  assert.doesNotMatch(bat, /(?:^|\r?\n)\s*python(?:\.exe)?\s/i);
  assert.match(ps1, /127\.0\.0\.1/);
  assert.match(ps1, /\$Port = 8769/);
  assert.match(ps1, /firebase-v2-fechamento-controlado/);
});
