import test from "node:test";
import assert from "node:assert/strict";

import { validarReenvioOperacional } from "../core/faccoes-operacional-regras.mjs";

test("reenvio com disponível zero bloqueia qualquer quantidade positiva", () => {
  const resultado = validarReenvioOperacional({
    movimentacao: {
      id: "mov-1",
      tipoDestino: "faccao",
      setor: "sutia",
      processo: "SUTIÃ COMPLETO",
      quantidadeEnviada: 500,
      quantidadeRecebida: 0,
      dataChegada: "2026-08-08",
      status: "retornou"
    },
    processo: "SUTIÃ COMPLETO",
    destino: "KAKA",
    quantidade: 1,
    dataEnvio: "2026-08-08"
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("QUANTIDADE_MAIOR_QUE_DISPONIVEL"));
});
