import test from "node:test";
import assert from "node:assert/strict";

import { ManejoService } from "../core/manejo-service.mjs";

function ambiente() {
  const chamadas = [];
  const ordem = {
    id: "op-1",
    numeroOP: "58193",
    referencia: "414",
    cor: "PRETO",
    quantidade: 500,
    tipoPeca: "sutia",
    manejosSetores: {}
  };

  const manejoRepo = {
    async buscarOrdem(id) {
      chamadas.push(["buscarOrdem", id]);
      return id === "op-1" ? structuredClone(ordem) : null;
    },
    async salvarManejo(payload) {
      chamadas.push(["salvarManejo", payload.setor, payload.manejo.faseBojo]);
      return {
        ordem: { ...payload.ordem, manejosSetores: { [payload.setor]: payload.manejo } },
        manejo: structuredClone(payload.manejo)
      };
    },
    async criarMovimentacaoComManejo(payload) {
      chamadas.push([
        "criarMovimentacaoComManejo",
        payload.movimentacao.tipoDestino,
        payload.movimentacao.processo,
        payload.movimentacao.destino
      ]);
      return {
        ordem: payload.ordem,
        manejo: payload.manejo,
        movimentacao: { id: "mov-1", ...payload.movimentacao }
      };
    }
  };

  return { service: new ManejoService({ manejoRepo }), chamadas, ordem };
}

function entradaManejo(extra = {}) {
  return {
    faseBojo: "SEPARAÇÃO",
    faseLateral: "",
    silkNome: "SILK A",
    dataTecido: "2026-08-08",
    necessidade: "URGENTE",
    ...extra
  };
}

test("salvar Manejo não exige dados financeiros", async () => {
  const { service, chamadas } = ambiente();
  const resultado = await service.salvarManejo({
    ordemId: "op-1",
    setor: "sutia",
    entrada: entradaManejo(),
    usuario: { uid: "u1" }
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.salvo.manejo.faseBojo, "SEPARAÇÃO");
  assert.equal(chamadas.some(([nome]) => nome.toLowerCase().includes("pagamento")), false);
});

test("movimentar salva manejo e movimento em uma única chamada ao repositório", async () => {
  const { service, chamadas } = ambiente();
  const resultado = await service.movimentar({
    ordemId: "op-1",
    setor: "sutia",
    entradaManejo: entradaManejo(),
    tipoDestino: "faccao",
    destino: "DANUBIA",
    processo: "SUTIÃ COMPLETO",
    quantidade: 500,
    dataEnvio: "2026-08-08",
    usuario: { uid: "u1" }
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.salvo.movimentacao.id, "mov-1");
  assert.equal(
    chamadas.filter(([nome]) => nome === "criarMovimentacaoComManejo").length,
    1
  );
  assert.equal(
    chamadas.filter(([nome]) => nome === "salvarManejo").length,
    0
  );
});

test("movimentação para se faltar Silk", async () => {
  const { service, chamadas } = ambiente();
  const resultado = await service.movimentar({
    ordemId: "op-1",
    setor: "sutia",
    entradaManejo: entradaManejo({ silkNome: "", silkData: "" }),
    tipoDestino: "faccao",
    destino: "DANUBIA",
    processo: "SUTIÃ COMPLETO",
    quantidade: 500,
    dataEnvio: "2026-08-08"
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("SILK_NAO_INFORMADO"));
  assert.equal(chamadas.some(([nome]) => nome === "criarMovimentacaoComManejo"), false);
});

test("movimentação para se faltar Data Tecido", async () => {
  const { service } = ambiente();
  const resultado = await service.prepararMovimentacao({
    ordemId: "op-1",
    setor: "sutia",
    entradaManejo: entradaManejo({ dataTecido: "" }),
    tipoDestino: "faccao",
    destino: "DANUBIA",
    processo: "SUTIÃ COMPLETO",
    quantidade: 500,
    dataEnvio: "2026-08-08"
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("DATA_TECIDO_NAO_INFORMADA"));
});

test("Sutiã Completo sai sem consultar ou exigir Lateral/Bojo", async () => {
  const { service, chamadas } = ambiente();
  const resultado = await service.movimentar({
    ordemId: "op-1",
    setor: "sutia",
    entradaManejo: entradaManejo(),
    tipoDestino: "faccao",
    destino: "DANUBIA",
    processo: "SUTIÃ COMPLETO",
    quantidade: 500,
    dataEnvio: "2026-08-08"
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.movimentacao.processo, "SUTIÃ COMPLETO");
  assert.equal(chamadas.some(chamada =>
    JSON.stringify(chamada).toLowerCase().includes("lateral") ||
    JSON.stringify(chamada).toLowerCase().includes("bojo")
  ), false);
});

test("tentativa de envio para Célula é bloqueada antes de gravar movimentação", async () => {
  const { service, chamadas } = ambiente();
  const resultado = await service.movimentar({
    ordemId: "op-1",
    setor: "sutia",
    entradaManejo: entradaManejo(),
    tipoDestino: "celula",
    destino: "CELULA A",
    processo: "CÉLULA INTERNA",
    quantidade: 200,
    dataEnvio: "2026-08-08"
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("TIPO_DESTINO_INVALIDO"));
  assert.equal(chamadas.some(([nome]) => nome === "criarMovimentacaoComManejo"), false);
});

test("reenvio para Facção mantém vínculo de origem", async () => {
  const { service } = ambiente();
  const resultado = await service.movimentar({
    ordemId: "op-1",
    setor: "sutia",
    entradaManejo: entradaManejo(),
    tipoDestino: "faccao",
    destino: "LIVIA",
    processo: "SUTIÃ MONTAGEM",
    quantidade: 200,
    quantidadeMaxima: 200,
    dataEnvio: "2026-08-08",
    origem: "movimentacao",
    movimentacaoOrigemId: "mov-antigo"
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.movimentacao.movimentacaoOrigemId, "mov-antigo");
  assert.equal(resultado.movimentacao.reenvio, true);
});

test("OP inexistente não escreve nada", async () => {
  const { service, chamadas } = ambiente();
  const resultado = await service.salvarManejo({
    ordemId: "nao-existe",
    setor: "sutia",
    entrada: entradaManejo()
  });

  assert.equal(resultado.ok, false);
  assert.deepEqual(resultado.erros, ["OP_NAO_ENCONTRADA"]);
  assert.equal(chamadas.some(([nome]) => nome === "salvarManejo"), false);
});
