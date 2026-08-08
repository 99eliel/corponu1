import test from "node:test";
import assert from "node:assert/strict";

import { FaccoesController } from "../core/faccoes-controller.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";

function ambiente() {
  const store = criarStoreCorpoNu();
  store.substituir("faccoes", [
    { id: "f1", nome: "DANUBIA", processosPermitidos: ["SUTIÃ COMPLETO"] },
    { id: "f2", nome: "KAKA", processosPermitidos: ["SUTIÃ COMPLETO"] }
  ]);
  store.substituir("ordens", [
    { id: "op-1", numeroOP: "58193", referencia: "414", tipoPeca: "sutia" }
  ]);
  store.substituir("movimentacoes", [
    {
      id: "m1",
      opId: "op-1",
      numeroOP: "58193",
      referencia: "414",
      cor: "PRETO",
      tipoDestino: "faccao",
      destino: "DANUBIA",
      processo: "SUTIÃ COMPLETO",
      setor: "sutia",
      quantidadeEnviada: 500,
      dataEnvio: "2026-08-01",
      status: "em_andamento"
    },
    {
      id: "m2",
      opId: "op-1",
      numeroOP: "58194",
      referencia: "414",
      cor: "BLUSH",
      tipoDestino: "faccao",
      destino: "KAKA",
      processo: "SUTIÃ COMPLETO",
      setor: "sutia",
      quantidadeEnviada: 400,
      dataEnvio: "2026-08-02",
      chegadaInformada: true,
      chegadaInformadaPorNome: "Ligia",
      chegadaInformadaData: "2026-08-08",
      status: "em_andamento"
    }
  ]);

  const chamadas = [];
  const movimentosRepo = {
    async carregarPrimeiraPagina() { chamadas.push(["primeira"]); return { itens: [], acabou: false }; },
    async carregarMais() { chamadas.push(["mais"]); return { itens: [], acabou: true }; },
    acabou() { return false; },
    listarCarregadas() { return store.listar("movimentacoes"); }
  };
  const operacionalService = {
    async informarChegada(args) { chamadas.push(["informar", args.id]); return { ok: true }; },
    async confirmarChegada(args) { chamadas.push(["confirmar", args.id, args.componentes]); return { ok: true }; },
    async reenviar(args) { chamadas.push(["reenviar", args.id]); return { ok: true }; }
  };

  return {
    store,
    chamadas,
    controller: new FaccoesController({ store, movimentosRepo, operacionalService })
  };
}

test("status é renderizável como dado normal da linha", () => {
  const { controller } = ambiente();
  assert.deepEqual(controller.statusChegada(controller.obter("m1")), {
    chave: "andamento",
    rotulo: "Em andamento"
  });
  assert.equal(controller.statusChegada(controller.obter("m2")).rotulo, "Chegada avisada por Ligia • 2026-08-08");
});

test("usuário comum vê Informar chegada somente quando permitido", () => {
  const { controller } = ambiente();
  assert.deepEqual(controller.acaoChegada(controller.obter("m1"), { admin: false }), {
    tipo: "informar",
    rotulo: "Informar chegada",
    disabled: false
  });
  assert.equal(controller.acaoChegada(controller.obter("m2"), { admin: false }).rotulo, "Aviso enviado");
});

test("admin vê Confirmar chegada sem depender de pagamento", () => {
  const { controller } = ambiente();
  const acao = controller.acaoChegada(controller.obter("m2"), { admin: true });
  assert.equal(acao.tipo, "confirmar");
  assert.equal(acao.rotulo, "Confirmar chegada");
});

test("filtros operacionais combinam busca, processo e destino", () => {
  const { controller } = ambiente();
  const resultado = controller.listar({
    busca: "BLUSH",
    processo: "SUTIÃ COMPLETO",
    destino: "KAKA"
  });
  assert.deepEqual(resultado.map(item => item.id), ["m2"]);
});

test("confirmação de Sutiã Completo pede somente componentes faltantes", () => {
  const { controller, store } = ambiente();
  store.upsert("movimentacoes", {
    ...controller.obter("m2"),
    componentesConsolidados: {
      lateral: { informado: true, pronto: true, responsavel: "MARIA" },
      fecho: { informado: true, pronto: false }
    }
  });

  const preparado = controller.prepararConfirmacao("m2");
  assert.equal(preparado.ok, true);
  assert.deepEqual(preparado.faltantes, ["bojo", "pontoLuz"]);
});

test("confirmação bloqueia componente faltante sem resposta", async () => {
  const { controller, chamadas } = ambiente();
  const resultado = await controller.confirmarChegada({
    id: "m2",
    dataChegada: "2026-08-08",
    respostasComponentes: {}
  });

  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("LATERAL_NAO_INFORMADO"));
  assert.equal(chamadas.some(([nome]) => nome === "confirmar"), false);
});

test("Lateral feita exige responsável na confirmação", async () => {
  const { controller } = ambiente();
  const resultado = await controller.confirmarChegada({
    id: "m2",
    dataChegada: "2026-08-08",
    respostasComponentes: {
      lateral: true,
      bojo: false,
      fecho: true,
      pontoLuz: true
    }
  });
  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("LATERAL_SEM_RESPONSAVEL"));
});

test("respostas completas seguem para service como componentes explícitos", async () => {
  const { controller, chamadas } = ambiente();
  const resultado = await controller.confirmarChegada({
    id: "m2",
    dataChegada: "2026-08-08",
    respostasComponentes: {
      lateral: true,
      lateralResponsavel: "MARIA",
      bojo: false,
      fecho: true,
      pontoLuz: false
    }
  });

  assert.equal(resultado.ok, true);
  const chamada = chamadas.find(([nome]) => nome === "confirmar");
  assert.equal(chamada[2].lateral, true);
  assert.equal(chamada[2].lateralResponsavel, "MARIA");
  assert.equal(chamada[2].bojo, false);
});

test("referência especial não exige perguntas de componentes", async () => {
  const { controller, store, chamadas } = ambiente();
  store.upsert("movimentacoes", {
    ...controller.obter("m2"),
    referencia: "912"
  });

  const preparado = controller.prepararConfirmacao("m2");
  assert.deepEqual(preparado.faltantes, []);

  const resultado = await controller.confirmarChegada({
    id: "m2",
    dataChegada: "2026-08-08"
  });
  assert.equal(resultado.ok, true);
  assert.equal(chamadas.some(([nome]) => nome === "confirmar"), true);
});

test("destinos de reenvio vêm do store de Facções", () => {
  const { controller, chamadas } = ambiente();
  assert.deepEqual(
    controller.listarDestinosReenvio("SUTIÃ COMPLETO").map(item => item.nome),
    ["DANUBIA", "KAKA"]
  );
  assert.equal(chamadas.length, 0);
});
