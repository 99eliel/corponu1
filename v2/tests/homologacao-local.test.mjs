import test from "node:test";
import assert from "node:assert/strict";

import { criarStoreCorpoNu } from "../core/store.mjs";
import { ManejoService } from "../core/manejo-service.mjs";
import { FaccoesOperacionalService } from "../core/faccoes-operacional-service.mjs";
import { FechamentoFinanceiroService } from "../core/financeiro-service.mjs";
import {
  criarRepositoriosLocais,
  dadosIniciaisHomologacao,
  hidratarStoreLocal
} from "../homologacao/local-db.mjs";

function ambiente() {
  const store = hidratarStoreLocal(criarStoreCorpoNu(), dadosIniciaisHomologacao());
  const repos = criarRepositoriosLocais(store);
  return { store, repos };
}

test("homologação local nasce com dados sem acessar Firebase", () => {
  const { store } = ambiente();
  assert.equal(store.listar("ordens").length, 3);
  assert.equal(store.listar("movimentacoes").length, 2);
  assert.equal(store.listar("pagamentos").length, 0);
});

test("Manejo local cria movimentação sem criar pagamento", async () => {
  const { store, repos } = ambiente();
  const service = new ManejoService({ manejoRepo: repos.manejoRepo });
  const ordem = store.obter("ordens", "op-sutia-70002");

  const resultado = await service.movimentar({
    ordem,
    ordemId: ordem.id,
    setor: "sutia",
    entradaManejo: {
      fase: "PRODUÇÃO",
      silkNome: "SILK TESTE",
      dataTecido: "2026-08-08",
      necessidade: "TESTE HOMOLOGAÇÃO"
    },
    tipoDestino: "faccao",
    destino: "LIVIA",
    destinoId: "f-livia",
    processo: "SUTIÃ MONTAGEM",
    quantidade: 300,
    quantidadeMaxima: 300,
    dataEnvio: "2026-08-08",
    usuario: { uid: "teste" }
  });

  assert.equal(resultado.ok, true);
  assert.equal(store.listar("movimentacoes").length, 3);
  assert.equal(store.listar("pagamentos").length, 0);
});

test("chegada operacional local continua sem criar pagamento", async () => {
  const { store, repos } = ambiente();
  const service = new FaccoesOperacionalService({ repo: repos.faccoesOperacionalRepo });

  const aviso = await service.informarChegada({
    id: "mov-calcinha-1",
    usuario: { uid: "u1", nome: "Lígia" },
    dataHoje: "2026-08-08"
  });
  assert.equal(aviso.ok, true);
  assert.equal(store.obter("movimentacoes", "mov-calcinha-1").chegadaInformada, true);
  assert.equal(store.listar("pagamentos").length, 0);

  const confirmacao = await service.confirmarChegada({
    id: "mov-calcinha-1",
    dataChegada: "2026-08-08",
    falta: 5,
    defeito: 0,
    usuario: { uid: "adm", nome: "Administrador" }
  });
  assert.equal(confirmacao.ok, true);
  assert.equal(store.obter("movimentacoes", "mov-calcinha-1").quantidadeRecebida, 415);
  assert.equal(store.listar("pagamentos").length, 0);
});

test("Fechamento local é o único fluxo que cria pagamento", async () => {
  const { store, repos } = ambiente();
  const service = new FechamentoFinanceiroService({
    ordensRepo: { buscarPorNumero: async numero => store.buscarOrdemPorNumero(numero) },
    valoresRepo: repos.valoresRepo,
    pagamentosRepo: repos.pagamentosRepo
  });

  const resultado = await service.salvarLancamento({
    numeroOP: "80001",
    processo: "CALCINHA COMPLETA",
    responsavel: "LORENA",
    competencia: "2026-08",
    quantidade: 420
  });

  assert.equal(resultado.ok, true);
  assert.equal(store.listar("pagamentos").length, 1);
  assert.equal(store.listar("pagamentos")[0].origem, "fechamento_financeiro_v2");
  assert.equal("dataChegada" in store.listar("pagamentos")[0], false);
  assert.equal("movimentacaoId" in store.listar("pagamentos")[0], false);
});
