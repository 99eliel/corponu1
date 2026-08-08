import { criarFaccoesRepoFirestore } from "../adapters/faccoes-repo.mjs";
import { criarFaccoesOperacionalRepoFirestore } from "../adapters/faccoes-operacional-repo.mjs";
import { criarMovimentacoesFaccoesRepoFirestore } from "../adapters/movimentacoes-faccoes-repo.mjs";
import { FaccoesController } from "../core/faccoes-controller.mjs";
import { FaccoesOperacionalService } from "../core/faccoes-operacional-service.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";
import { montarTelaFaccoes } from "../ui/faccoes-page.mjs";

export async function criarFaccoesAppV2({
  container,
  db,
  fs,
  store = criarStoreCorpoNu(),
  fallbackFaccoesPorProcesso = {},
  referenciaEspecial = "912",
  tamanhoPagina = 80,
  obterPerfil = () => ({}),
  obterUsuario = () => null,
  confirmarAviso = null,
  auditoriaRepo = null
}) {
  if (!db) throw new Error("Firestore db não configurado.");
  if (!fs) throw new Error("Firestore API não configurada.");

  const faccoesRepo = criarFaccoesRepoFirestore({ db, fs, store });
  const movimentosRepo = criarMovimentacoesFaccoesRepoFirestore({
    db,
    fs,
    store,
    tamanhoPagina
  });
  const operacionalRepo = criarFaccoesOperacionalRepoFirestore({ db, fs, store });

  await Promise.all([
    faccoesRepo.garantirCarregadas(),
    movimentosRepo.carregarPrimeiraPagina()
  ]);

  const operacionalService = new FaccoesOperacionalService({
    repo: operacionalRepo,
    auditoriaRepo
  });
  const controller = new FaccoesController({
    store,
    movimentosRepo,
    operacionalService,
    fallbackFaccoesPorProcesso,
    referenciaEspecial
  });
  const tela = montarTelaFaccoes({
    container,
    controller,
    store,
    obterPerfil,
    obterUsuario,
    confirmarAviso
  });

  return {
    store,
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
