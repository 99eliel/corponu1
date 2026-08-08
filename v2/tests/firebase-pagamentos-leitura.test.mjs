import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const modulo = await readFile(new URL("../../firebase-v2-pagamentos-leitura/firebase-pagamentos-leitura.mjs", import.meta.url), "utf8");
const html = await readFile(new URL("../../firebase-v2-pagamentos-leitura/index.html", import.meta.url), "utf8");
const bat = await readFile(new URL("../../firebase-v2-pagamentos-leitura/ABRIR-FIREBASE-V2-PAGAMENTOS-LEITURA.bat", import.meta.url), "utf8");
const ps1 = await readFile(new URL("../../firebase-v2-pagamentos-leitura/SERVIDOR-FIREBASE-V2-PAGAMENTOS-LEITURA.ps1", import.meta.url), "utf8");

test("Pagamentos real usa Firebase atual e somente entregasPagamento/faccoes para leitura", () => {
  assert.match(modulo, /projectId:\s*"corponu-b4942"/);
  assert.match(modulo, /criarPagamentosConsultaRepoFirestore/);
  assert.match(modulo, /criarFaccoesRepoFirestore/);
  assert.doesNotMatch(modulo, /movimentacoesProducao/);
  assert.doesNotMatch(modulo, /ordensProducao/);
});

test("pacote bloqueia todas as primitivas de escrita", () => {
  assert.match(modulo, /PAGAMENTOS_V2_SOMENTE_LEITURA/);
  assert.match(modulo, /writeBatch:\s*bloquearEscrita/);
  assert.match(modulo, /setDoc:\s*bloquearEscrita/);
  assert.match(modulo, /updateDoc:\s*bloquearEscrita/);
  assert.match(modulo, /deleteDoc:\s*bloquearEscrita/);
  assert.match(modulo, /runTransaction:\s*bloquearEscrita/);
});

test("quitacao fica desativada mas filtros e relatorios permanecem na tela V2", () => {
  assert.match(modulo, /\[data-v2-quitar-filtrados\]/);
  assert.match(modulo, /quitar\.disabled = true/);
  assert.match(modulo, /Quitação bloqueada nesta etapa/);
  assert.match(html, /RELATÓRIOS LIBERADOS/);
  assert.match(html, /filtrar por origem/i);
  assert.match(html, /conferir PIX/i);
  assert.match(html, /relatórios completo e simplificado/i);
  assert.match(html, /Marcar como pago permanece bloqueado/i);
});

test("launcher abre somente em loopback e nao depende de Node ou Python", () => {
  assert.match(ps1, /127\.0\.0\.1/);
  assert.match(ps1, /firebase-v2-pagamentos-leitura/);
  assert.match(bat, /SERVIDOR-FIREBASE-V2-PAGAMENTOS-LEITURA\.ps1/);
  assert.doesNotMatch(bat, /^\s*node(?:\.exe)?\s/im);
  assert.doesNotMatch(bat, /^\s*python(?:\.exe)?\s/im);
});

test("standalone nao carrega app legado nem patches antigos", () => {
  assert.doesNotMatch(html, /(?:^|["'\/])app\.js(?:[?"']|$)/);
  assert.doesNotMatch(html, /corponu-atualizador\.js/);
  assert.doesNotMatch(html, /corponu-pagamentos-filtro-op/);
  assert.doesNotMatch(modulo, /onSnapshot\s*\(/);
  assert.doesNotMatch(modulo, /MutationObserver/);
});
