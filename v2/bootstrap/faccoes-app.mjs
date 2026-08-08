import { FaccoesController } from "../core/faccoes-controller.mjs";
import { FaccoesOperacionalService } from "../core/faccoes-operacional-service.mjs";
import { criarContextoFirebaseV2 } from "./firebase-context.mjs";
import { montarTelaFaccoes } from "../ui/faccoes-page.mjs";

export async function criarFaccoesAppV2({
  container,
  db,
  fs,
  store,
  contexto = null,
  fallbackFaccoesPorProcesso = {},
  referenciaEspecial = "912",
  tamanhoPagina = 80,
  obterPerfil = () => ({}),
  obterUsuario = () => null,
  confirmarAviso = null,
  auditoriaRepo = null
}) {
  const ctx = contexto || criarContextoFirebaseV2({
    db,
    fs,
    store,
    tamanhoPaginaFaccoes: tamanhoPagina
  });
  const storeV2 = ctx.store;
  const faccoesRepo = ctx.faccoesRepo;
  const movimentosRepo = ctx.movimentacoesFaccoesRepo;
  const operacionalRepo = ctx.faccoesOperacionalRepo;

  await Promise.all([
    ctx.garantirFaccoes(),
    ctx.carregarPrimeiraPaginaFaccoes()
  ]);

  const operacionalService = new FaccoesOperacionalService({
    repo: operacionalRepo,
    auditoriaRepo
  });
  const controller = new FaccoesController({
    store: storeV2,
    movimentosRepo,
    operacionalService,
    fallbackFaccoesPorProcesso,
    referenciaEspecial
  });
  const tela = montarTelaFaccoes({
    container,
    controller,
    store: storeV2,
    obterPerfil,
    obterUsuario,
    confirmarAviso
  });

  return {
    contexto: ctx,
    store: storeV2,
    faccoesRepo,
    movimentosRepo,
    operacionalRepo,
    operacionalService,
    controller,
    tela,
    desmontar() {
      tela.desmontar();
    }
  };
}
