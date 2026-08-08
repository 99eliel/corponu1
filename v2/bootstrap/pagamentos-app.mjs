import { PagamentosController } from "../core/pagamentos-controller.mjs";
import { criarContextoFirebaseV2 } from "./firebase-context.mjs";
import { montarTelaPagamentos } from "../ui/pagamentos-page.mjs";

export async function criarPagamentosAppV2({
  container,
  db,
  fs,
  store,
  contexto = null,
  obterUsuario = () => null,
  competenciaPadrao,
  confirmarQuitacao
}) {
  const ctx = contexto || criarContextoFirebaseV2({ db, fs, store });
  const storeV2 = ctx.store;
  const pagamentosRepo = ctx.pagamentosConsultaRepo;
  const faccoesRepo = ctx.faccoesRepo;

  await ctx.garantirFaccoes();

  const controller = new PagamentosController({ store: storeV2, pagamentosRepo, faccoesRepo });
  const tela = montarTelaPagamentos({
    container,
    controller,
    store: storeV2,
    obterUsuario,
    competenciaPadrao,
    confirmarQuitacao
  });

  return {
    contexto: ctx,
    store: storeV2,
    controller,
    pagamentosRepo,
    faccoesRepo,
    tela,
    desmontar() { tela.desmontar(); }
  };
}
