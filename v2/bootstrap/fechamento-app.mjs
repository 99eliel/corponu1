import { criarRepositoriosFirestoreV2 } from "../adapters/firestore-repos.mjs";
import { criarFaccoesRepoFirestore } from "../adapters/faccoes-repo.mjs";
import { FechamentoController } from "../core/fechamento-controller.mjs";
import { FechamentoFinanceiroService } from "../core/financeiro-service.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";
import { montarTelaFechamento } from "../ui/fechamento-page.mjs";

export async function criarFechamentoAppV2({
  container,
  db,
  fs,
  store = criarStoreCorpoNu(),
  fallbackFaccoesPorProcesso = {},
  competenciaPadrao,
  onSalvo = null
}) {
  if (!db) throw new Error("Firestore db não configurado.");
  if (!fs) throw new Error("Firestore API não configurada.");

  const repositorios = criarRepositoriosFirestoreV2({
    db,
    fs,
    cacheOrdens: {
      buscarPorNumero: numeroOP => store.buscarOrdemPorNumero(numeroOP)
    }
  });

  const faccoesRepo = criarFaccoesRepoFirestore({ db, fs, store });
  await faccoesRepo.garantirCarregadas();

  const financeiroService = new FechamentoFinanceiroService(repositorios);
  const controller = new FechamentoController({
    store,
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
    store,
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
