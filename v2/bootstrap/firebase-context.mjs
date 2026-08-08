import { criarFaccoesOperacionalRepoFirestore } from "../adapters/faccoes-operacional-repo.mjs";
import { criarFaccoesRepoFirestore } from "../adapters/faccoes-repo.mjs";
import { criarRepositoriosFirestoreV2 } from "../adapters/firestore-repos.mjs";
import { criarManejoRepoFirestore } from "../adapters/manejo-repo.mjs";
import { criarMovimentacoesFaccoesRepoFirestore } from "../adapters/movimentacoes-faccoes-repo.mjs";
import { criarOrdensConsultaRepoFirestore } from "../adapters/ordens-consulta-repo.mjs";
import { criarOrdensGravacaoRepoFirestore } from "../adapters/ordens-repo.mjs";
import { criarPagamentosConsultaRepoFirestore } from "../adapters/pagamentos-repo.mjs";
import { criarProdutosRepoFirestore } from "../adapters/produtos-repo.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";

export const COLECOES_FIREBASE_V2 = Object.freeze({
  ordens: "ordensProducao",
  movimentacoes: "movimentacoesProducao",
  faccoes: "faccoes",
  produtos: "produtos",
  precos: "precosReferencia",
  configuracoes: "configuracoes",
  pagamentos: "entregasPagamento"
});

function exigirContexto(db, fs) {
  if (!db) throw new Error("Firestore db não configurado para o contexto V2.");
  if (!fs) throw new Error("Firestore API não configurada para o contexto V2.");
}

export function criarContextoFirebaseV2({
  db,
  fs,
  store = criarStoreCorpoNu(),
  tamanhoPaginaOrdens = 150,
  tamanhoPaginaFaccoes = 80,
  ttlPrecosMs = 120000,
  ttlSaldoMs = 30000
} = {}) {
  exigirContexto(db, fs);

  const faccoesRepo = criarFaccoesRepoFirestore({ db, fs, store });
  const produtosRepo = criarProdutosRepoFirestore({ db, fs, store });
  const ordensConsultaRepo = criarOrdensConsultaRepoFirestore({
    db,
    fs,
    store,
    tamanhoPagina: tamanhoPaginaOrdens
  });
  const ordensGravacaoRepo = criarOrdensGravacaoRepoFirestore({ db, fs, store });
  const manejoRepo = criarManejoRepoFirestore({ db, fs, store });
  const movimentacoesFaccoesRepo = criarMovimentacoesFaccoesRepoFirestore({
    db,
    fs,
    store,
    tamanhoPagina: tamanhoPaginaFaccoes
  });
  const faccoesOperacionalRepo = criarFaccoesOperacionalRepoFirestore({ db, fs, store });
  const repositoriosFinanceiro = criarRepositoriosFirestoreV2({
    db,
    fs,
    cacheOrdens: {
      buscarPorNumero: numeroOP => store.buscarOrdemPorNumero(numeroOP)
    },
    ttlPrecosMs,
    ttlSaldoMs
  });
  const pagamentosConsultaRepo = criarPagamentosConsultaRepoFirestore({ db, fs });

  return Object.freeze({
    db,
    fs,
    store,
    colecoes: COLECOES_FIREBASE_V2,
    faccoesRepo,
    produtosRepo,
    ordensConsultaRepo,
    ordensGravacaoRepo,
    manejoRepo,
    movimentacoesFaccoesRepo,
    faccoesOperacionalRepo,
    repositoriosFinanceiro,
    pagamentosConsultaRepo,

    garantirFaccoes() {
      return faccoesRepo.garantirCarregadas();
    },

    carregarPrimeiraPaginaOrdens(opcoes) {
      return ordensConsultaRepo.carregarPrimeiraPagina(opcoes);
    },

    carregarMaisOrdens(opcoes) {
      return ordensConsultaRepo.carregarMais(opcoes);
    },

    carregarPrimeiraPaginaFaccoes() {
      return movimentacoesFaccoesRepo.carregarPrimeiraPagina();
    },

    limparCachesFinanceiros() {
      repositoriosFinanceiro.valoresRepo.limparCache?.();
      repositoriosFinanceiro.pagamentosRepo.limparCacheSaldo?.();
    }
  });
}
