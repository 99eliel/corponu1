import test from "node:test";
import assert from "node:assert/strict";

import { templateFaccoesV2 } from "../ui/faccoes-template.mjs";
import { htmlCamposComponentesFaltantes, htmlLinhaFaccao } from "../ui/faccoes-ui-utils.mjs";

test("tela declara Facções como operacional e sem pagamento", () => {
  const html = templateFaccoesV2();
  assert.match(html, /Nenhuma ação desta tela gera pagamento/);
});

test("tabela possui coluna Status normal e não usa badge injetado", () => {
  const html = templateFaccoesV2();
  assert.match(html, /<th>Status<\/th>/);
  assert.doesNotMatch(html, /data-aviso-chegada-badge/i);
  assert.doesNotMatch(html, /data-chegada-aviso-131/i);
  assert.doesNotMatch(html, /badge.*chegada/i);
});

test("não existe botão Bipar na tela V2", () => {
  const html = templateFaccoesV2();
  assert.doesNotMatch(html, />\s*Bipar\s*</i);
  assert.doesNotMatch(html, /biparMovimentacao/i);
  assert.doesNotMatch(html, /btn-bipado/i);
});

test("tela usa paginação explícita por Carregar mais", () => {
  const html = templateFaccoesV2();
  assert.match(html, /data-v2-faccoes-mais/);
  assert.match(html, />Carregar mais</);
});

test("modal de chegada possui falta e defeito, mas nenhum campo financeiro", () => {
  const html = templateFaccoesV2();
  assert.match(html, /name="falta"/);
  assert.match(html, /name="defeito"/);
  assert.match(html, /name="dataChegada"/);
  assert.doesNotMatch(html, /name="competencia"/i);
  assert.doesNotMatch(html, /name="valorUnitario"/i);
  assert.doesNotMatch(html, /name="statusPagamento"/i);
});

test("reenvio informa explicitamente que Lateral/Bojo não bloqueiam", () => {
  const html = templateFaccoesV2();
  assert.match(html, /Lateral e Bojo não bloqueiam o reenvio/);
  assert.match(html, /não informada/);
});

test("linha renderiza status de chegada exatamente uma vez", () => {
  const controller = {
    statusChegada() {
      return { chave: "avisada", rotulo: "Chegada avisada por Ligia • 2026-08-08" };
    },
    acaoChegada() {
      return { tipo: "nenhuma", rotulo: "Aviso enviado", disabled: true };
    }
  };
  const html = htmlLinhaFaccao({
    id: "m1",
    numeroOP: "58193",
    referencia: "414",
    cor: "PRETO",
    processo: "SUTIÃ COMPLETO",
    destino: "DANUBIA",
    quantidadeEnviada: 500,
    dataEnvio: "2026-08-01",
    chegadaInformada: true
  }, controller, { admin: false });

  const ocorrencias = html.match(/Chegada avisada por Ligia/g) || [];
  assert.equal(ocorrencias.length, 1);
  assert.match(html, /data-v2-status-chegada="m1"/);
});

test("usuário comum recebe botão Informar chegada quando ação permite", () => {
  const controller = {
    statusChegada: () => ({ chave: "andamento", rotulo: "Em andamento" }),
    acaoChegada: () => ({ tipo: "informar", rotulo: "Informar chegada", disabled: false })
  };
  const html = htmlLinhaFaccao({
    id: "m1",
    tipoDestino: "faccao",
    quantidadeEnviada: 100
  }, controller, { admin: false });
  assert.match(html, /data-v2-informar-chegada="m1"/);
  assert.match(html, />Informar chegada</);
});

test("admin recebe botão Confirmar chegada quando ação permite", () => {
  const controller = {
    statusChegada: () => ({ chave: "avisada", rotulo: "Chegada avisada" }),
    acaoChegada: () => ({ tipo: "confirmar", rotulo: "Confirmar chegada", disabled: false })
  };
  const html = htmlLinhaFaccao({
    id: "m1",
    tipoDestino: "faccao",
    quantidadeEnviada: 100,
    chegadaInformada: true
  }, controller, { admin: true });
  assert.match(html, /data-v2-confirmar-chegada="m1"/);
  assert.match(html, />Confirmar chegada</);
});

test("campos de componentes são criados somente para a lista faltante", () => {
  const html = htmlCamposComponentesFaltantes(["bojo", "pontoLuz"]);
  assert.match(html, /name="bojo"/);
  assert.match(html, /name="bojoResponsavel"/);
  assert.match(html, /name="pontoLuz"/);
  assert.doesNotMatch(html, /name="lateral"/);
  assert.doesNotMatch(html, /name="fecho"/);
});
