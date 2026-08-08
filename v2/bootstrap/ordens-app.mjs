import { criarFaccoesRepoFirestore } from "../adapters/faccoes-repo.mjs";
import { criarOrdensGravacaoRepoFirestore } from "../adapters/ordens-repo.mjs";
import { criarProdutosRepoFirestore } from "../adapters/produtos-repo.mjs";
import { OrdensController } from "../core/ordens-controller.mjs";
import { OrdensService } from "../core/ordens-service.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";
import { montarTelaOrdens } from "../ui/ordens-page.mjs";

export async function criarOrdensAppV2({
  container,
  db,
  fs,
  store = criarStoreCorpoNu(),
  fallbackFaccoesPorProcesso = {},
  obterUsuario = () => null,
  confirmarConversao = null,
  auditoriaRepo = null
}) {
  if (!db) throw new Error("Firestore db não configurado.");
  if (!fs) throw new Error("Firestore API não configurada.");

  const produtosRepo = criarProdutosRepoFirestore({ db, fs, store });
  const ordensRepo = criarOrdensGravacaoRepoFirestore({ db, fs, store });
  const faccoesRepo = criarFaccoesRepoFirestore({ db, fs, store });
  await faccoesRepo.garantirCarregadas();

  const ordensService = new OrdensService({
    produtosRepo,
    ordensRepo,
    auditoriaRepo
  });
  const controller = new OrdensController({
    store,
    ordensService,
    fallbackFaccoesPorProcesso
  });
  const tela = montarTelaOrdens({
    container,
    controller,
    store,
    obterUsuario,
    confirmarConversao
  });

  return {
    store,
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
