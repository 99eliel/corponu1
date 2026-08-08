import { FechamentoController } from "../core/fechamento-controller.mjs";
import { FechamentoFinanceiroService } from "../core/financeiro-service.mjs";
import { criarContextoFirebaseV2 } from "./firebase-context.mjs";
import { montarTelaFechamento } from "../ui/fechamento-page.mjs";

export async function criarFechamentoAppV2({
  container,
  db,
  fs,
  store,
  contexto = null,
  fallbackFaccoesPorProcesso = {},
  competenciaPadrao,
  onSalvo = null
}) {
  const ctx = contexto || criarContextoFirebaseV2({ db, fs, store });
  const storeV2 = ctx.store;
  const repositorios = ctx.repositoriosFinanceiro;
  const faccoesRepo = ctx.faccoesRepo;

  await ctx.garantirFaccoes();

  const financeiroService = new FechamentoFinanceiroService(repositorios);
  const controller = new FechamentoController({
    store: storeV2,
    financeiroService,
    fallbackFaccoesPorProcesso
  });

  const tela = montarTelaFechamento({
    container,
    controller,
    competenciaPadrao,
    onSalvo
  });

  return {
    contexto: ctx,
    store: storeV2,
    controller,
    financeiroService,
    faccoesRepo,
    repositorios,
    tela,
    desmontar() {
      tela.desmontar();
    }
  };
}
