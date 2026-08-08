import { ManejoController } from "../core/manejo-controller.mjs";
import { ManejoService } from "../core/manejo-service.mjs";
import { criarContextoFirebaseV2 } from "./firebase-context.mjs";
import { montarTelaManejo } from "../ui/manejo-page.mjs";

export async function criarManejoAppV2({
  container,
  db,
  fs,
  store,
  contexto = null,
  fallbackFaccoesPorProcesso = {},
  obterUsuario = () => null,
  auditoriaRepo = null
}) {
  const ctx = contexto || criarContextoFirebaseV2({ db, fs, store });
  const storeV2 = ctx.store;
  const faccoesRepo = ctx.faccoesRepo;
  const manejoRepo = ctx.manejoRepo;

  await Promise.all([
    ctx.garantirFaccoes(),
    ctx.carregarPrimeiraPaginaOrdens()
  ]);

  const manejoService = new ManejoService({ manejoRepo, auditoriaRepo });
  const controller = new ManejoController({
    store: storeV2,
    manejoService,
    fallbackFaccoesPorProcesso
  });
  const tela = montarTelaManejo({
    container,
    controller,
    store: storeV2,
    obterUsuario
  });

  return {
    contexto: ctx,
    store: storeV2,
    faccoesRepo,
    manejoRepo,
    ordensConsultaRepo: ctx.ordensConsultaRepo,
    manejoService,
    controller,
    tela,
    carregarMaisOrdens(opcoes) {
      return ctx.carregarMaisOrdens(opcoes);
    },
    desmontar() {
      tela.desmontar();
    }
  };
}
