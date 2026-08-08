import { criarPagamentosConsultaRepoFirestore } from "../adapters/pagamentos-repo.mjs";
import { criarFaccoesRepoFirestore } from "../adapters/faccoes-repo.mjs";
import { PagamentosController } from "../core/pagamentos-controller.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";
import { montarTelaPagamentos } from "../ui/pagamentos-page.mjs";

export async function criarPagamentosAppV2({
  container,
  db,
  fs,
  store = criarStoreCorpoNu(),
  obterUsuario = () => null,
  competenciaPadrao,
  confirmarQuitacao
}) {
  if (!db) throw new Error("Firestore db não configurado.");
  if (!fs) throw new Error("Firestore API não configurada.");

  const pagamentosRepo = criarPagamentosConsultaRepoFirestore({ db, fs });
  const faccoesRepo = criarFaccoesRepoFirestore({ db, fs, store });
  await faccoesRepo.garantirCarregadas();

  const controller = new PagamentosController({ store, pagamentosRepo, faccoesRepo });
  const tela = montarTelaPagamentos({
    container,
    controller,
    store,
    obterUsuario,
    competenciaPadrao,
    confirmarQuitacao
  });

  return {
    store,
    controller,
    pagamentosRepo,
    faccoesRepo,
    tela,
    desmontar() { tela.desmontar(); }
  };
}
