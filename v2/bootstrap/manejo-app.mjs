import { criarFaccoesRepoFirestore } from "../adapters/faccoes-repo.mjs";
import { criarManejoRepoFirestore } from "../adapters/manejo-repo.mjs";
import { ManejoController } from "../core/manejo-controller.mjs";
import { ManejoService } from "../core/manejo-service.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";
import { montarTelaManejo } from "../ui/manejo-page.mjs";

export async function criarManejoAppV2({
  container,
  db,
  fs,
  store = criarStoreCorpoNu(),
  fallbackFaccoesPorProcesso = {},
  obterUsuario = () => null,
  auditoriaRepo = null
}) {
  if (!db) throw new Error("Firestore db não configurado.");
  if (!fs) throw new Error("Firestore API não configurada.");

  const faccoesRepo = criarFaccoesRepoFirestore({ db, fs, store });
  const manejoRepo = criarManejoRepoFirestore({ db, fs, store });

  await faccoesRepo.garantirCarregadas();

  const manejoService = new ManejoService({ manejoRepo, auditoriaRepo });
  const controller = new ManejoController({
    store,
    manejoService,
    fallbackFaccoesPorProcesso
  });
  const tela = montarTelaManejo({
    container,
    controller,
    store,
    obterUsuario
  });

  return {
    store,
    faccoesRepo,
    manejoRepo,
    manejoService,
    controller,
    tela,
    desmontar() {
      tela.desmontar();
    }
  };
}
