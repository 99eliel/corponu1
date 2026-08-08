import test from "node:test";
import assert from "node:assert/strict";

import { OrdensService } from "../core/ordens-service.mjs";

function criarAmbiente({ encontradas = [], produtoCalcinha = true, produtoSutia = true } = {}) {
  const salvos = [];
  const chamadas = [];

  const produtosRepo = {
    async buscarPorReferencia(referencia, tipo) {
      chamadas.push(["produto", referencia, tipo]);
      if (tipo === "calcinha" && !produtoCalcinha) return null;
      if (tipo === "sutia" && !produtoSutia) return null;
      return {
        id: tipo === "calcinha" ? `calcinha-${referencia}` : `produto-${referencia}`,
        referencia,
        tipoPeca: tipo,
        nome: tipo === "calcinha" ? `Calcinha ${referencia}` : `Sutiã ${referencia}`,
        possuiAlca: tipo === "sutia",
        possuiBojo: tipo === "sutia",
        possuiRenda: false
      };
    }
  };

  const mapaPorId = new Map(encontradas.map(item => [item.id, item]));
  const ordensRepo = {
    async buscarTodosPorNumero(numeroOP) {
      chamadas.push(["duplicidade", numeroOP]);
      return encontradas.map(item => ({ ...item }));
    },
    async buscarPorId(id) {
      chamadas.push(["porId", id]);
      const item = mapaPorId.get(id);
      return item ? { ...item } : null;
    },
    async salvar(payload) {
      chamadas.push(["salvar", payload.id, payload.novo]);
      salvos.push(structuredClone(payload));
      return { id: payload.id, ...structuredClone(payload.dados) };
    }
  };

  const service = new OrdensService({ produtosRepo, ordensRepo });
  return { service, salvos, chamadas };
}

function entradaCalcinha(extra = {}) {
  return {
    tipoPeca: "calcinha",
    numeroOP: "58193",
    referencia: "414",
    cor: "PRETO",
    quantidade: 500,
    necessidadeTexto: "",
    processoPlanejado: "",
    faccaoPlanejada: "",
    observacoes: "",
    ...extra
  };
}

function entradaSutia(extra = {}) {
  return {
    tipoPeca: "sutia",
    numeroOP: "58193",
    referencia: "414",
    cor: "PRETO",
    quantidade: 500,
    necessidadeTexto: "",
    observacoes: "",
    ...extra
  };
}

test("salva Calcinha nova sem necessidade, serviço ou facção", async () => {
  const { service, salvos } = criarAmbiente();

  const resultado = await service.salvar({ entrada: entradaCalcinha(), usuario: { uid: "u1" } });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.id, "calcinha-58193");
  assert.equal(resultado.salvo.tipoPeca, "calcinha");
  assert.equal(resultado.salvo.quantidade, 500);
  assert.equal(resultado.salvo.necessidade, "");
  assert.equal(resultado.salvo.planejamentoCalcinhaPendente, true);
  assert.equal(salvos[0].novo, true);
});

test("salva Sutiã novo com necessidade vazia sem copiar Alça, Bojo ou Renda do Produto", async () => {
  const { service } = criarAmbiente();

  const resultado = await service.salvar({ entrada: entradaSutia() });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.id, "op-58193");
  assert.equal(resultado.salvo.tipoPeca, "sutia");
  assert.equal(resultado.salvo.necessidade, "");
  assert.equal("possuiAlca" in resultado.salvo, false);
  assert.equal("possuiBojo" in resultado.salvo, false);
  assert.equal("possuiRenda" in resultado.salvo, false);
});

test("produto e duplicidade são consultados em paralelo lógico antes do save", async () => {
  const { service, chamadas } = criarAmbiente();
  const resultado = await service.salvar({ entrada: entradaCalcinha() });

  assert.equal(resultado.ok, true);
  assert.ok(chamadas.some(item => item[0] === "produto"));
  assert.ok(chamadas.some(item => item[0] === "duplicidade"));
  assert.equal(chamadas.filter(item => item[0] === "salvar").length, 1);
});

test("bloqueia referência não cadastrada no tipo correto", async () => {
  const { service, salvos } = criarAmbiente({ produtoCalcinha: false });

  const resultado = await service.salvar({ entrada: entradaCalcinha() });

  assert.equal(resultado.ok, false);
  assert.deepEqual(resultado.erros, ["PRODUTO_CALCINHA_NAO_ENCONTRADO"]);
  assert.equal(salvos.length, 0);
});

test("bloqueia OP duplicada de Calcinha", async () => {
  const { service, salvos } = criarAmbiente({
    encontradas: [{ id: "calcinha-58193", numeroOP: "58193", tipoPeca: "calcinha" }]
  });

  const resultado = await service.salvar({ entrada: entradaCalcinha() });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("OP_DUPLICADA"));
  assert.equal(salvos.length, 0);
});

test("conflito Sutiã -> Calcinha exige confirmação e não salva antes dela", async () => {
  const { service, salvos } = criarAmbiente({
    encontradas: [{
      id: "58193",
      numeroOP: "58193",
      tipoPeca: "sutia",
      status: "aberta",
      linhaCalcinha: "CORPO NU"
    }]
  });

  const resultado = await service.salvar({ entrada: entradaCalcinha() });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.requerConfirmacaoConversao, true);
  assert.equal(resultado.conflito.id, "58193");
  assert.equal(salvos.length, 0);
});

test("após confirmação corrige o mesmo documento em vez de criar outra OP", async () => {
  const { service, salvos } = criarAmbiente({
    encontradas: [{
      id: "58193",
      numeroOP: "58193",
      tipoPeca: "sutia",
      status: "aberta",
      linhaCalcinha: "CORPO NU"
    }]
  });

  const resultado = await service.salvar({
    entrada: entradaCalcinha(),
    permitirConversaoTipo: true
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.id, "58193");
  assert.equal(resultado.convertendoTipo, true);
  assert.equal(resultado.salvo.tipoPeca, "calcinha");
  assert.equal(resultado.salvo.linhaCalcinha, "CORPO NU");
  assert.equal(salvos.length, 1);
  assert.equal(salvos[0].novo, false);
});

test("edição atualiza o currentId e não cria documento novo", async () => {
  const anterior = {
    id: "calcinha-58193",
    numeroOP: "58193",
    tipoPeca: "calcinha",
    status: "aberta",
    linhaCalcinha: "COTTON LINE"
  };
  const { service, salvos } = criarAmbiente({ encontradas: [anterior] });

  const resultado = await service.salvar({
    currentId: "calcinha-58193",
    entrada: entradaCalcinha({ quantidade: 480, necessidadeTexto: "URGENTE" })
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.id, "calcinha-58193");
  assert.equal(resultado.salvo.quantidade, 480);
  assert.equal(resultado.salvo.necessidade, "URGENTE");
  assert.equal(resultado.salvo.linhaCalcinha, "COTTON LINE");
  assert.equal(salvos[0].novo, false);
});

test("múltiplos conflitos bloqueiam qualquer escrita", async () => {
  const { service, salvos } = criarAmbiente({
    encontradas: [
      { id: "a", numeroOP: "58193", tipoPeca: "sutia" },
      { id: "b", numeroOP: "58193", tipoPeca: "sutia" }
    ]
  });

  const resultado = await service.salvar({
    entrada: entradaCalcinha(),
    permitirConversaoTipo: true
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("OP_CONFLITO_MULTIPLO"));
  assert.equal(salvos.length, 0);
});
