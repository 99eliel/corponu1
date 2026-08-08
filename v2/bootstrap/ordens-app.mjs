import { OrdensController } from "../core/ordens-controller.mjs";
import { OrdensService } from "../core/ordens-service.mjs";
import { criarContextoFirebaseV2 } from "./firebase-context.mjs";
import { montarTelaOrdens } from "../ui/ordens-page.mjs";

export async function criarOrdensAppV2({
  container,
  db,
  fs,
  store,
  contexto = null,
  fallbackFaccoesPorProcesso = {},
  obterUsuario = () => null,
  confirmarConversao = null,
  auditoriaRepo = null
}) {
  const ctx = contexto || criarContextoFirebaseV2({ db, fs, store });
  const storeV2 = ctx.store;
  const produtosRepo = ctx.produtosRepo;
  const ordensRepo = ctx.ordensGravacaoRepo;
  const faccoesRepo = ctx.faccoesRepo;

  await ctx.garantirFaccoes();

  const ordensService = new OrdensService({
    produtosRepo,
    ordensRepo,
    auditoriaRepo
  });
  const controller = new OrdensController({
    store: storeV2,
    ordensService,
    fallbackFaccoesPorProcesso
  });
  const tela = montarTelaOrdens({
    container,
    controller,
    store: storeV2,
    obterUsuario,
    confirmarConversao
  });

  return {
    contexto: ctx,
    store: storeV2,
    produtosRepo,
    ordensRepo,
    faccoesRepo,
    ordensService,
    controller,
    tela,
    desmontar() {
      tela.desmontar();
    }
  };
}
