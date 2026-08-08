import { criarContextoFirebaseV2 } from "./firebase-context.mjs";
import { criarFaccoesAppV2 } from "./faccoes-app.mjs";
import { criarFechamentoAppV2 } from "./fechamento-app.mjs";
import { criarManejoAppV2 } from "./manejo-app.mjs";
import { criarOrdensAppV2 } from "./ordens-app.mjs";
import { criarPagamentosAppV2 } from "./pagamentos-app.mjs";

export function criarCorpoNuFlowFirebaseV2({
  db,
  fs,
  store,
  fallbackFaccoesPorProcesso = {},
  referenciaEspecial = "912",
  tamanhoPaginaOrdens = 150,
  tamanhoPaginaFaccoes = 80,
  obterUsuario = () => null,
  obterPerfil = () => ({}),
  auditoriaRepo = null
} = {}) {
  const contexto = criarContextoFirebaseV2({
    db,
    fs,
    store,
    tamanhoPaginaOrdens,
    tamanhoPaginaFaccoes
  });

  const apps = new Map();

  function substituir(nome, app) {
    apps.get(nome)?.desmontar?.();
    apps.set(nome, app);
    return app;
  }

  return Object.freeze({
    contexto,
    store: contexto.store,
    colecoes: contexto.colecoes,

    async montarOrdens(container, opcoes = {}) {
      return substituir("ordens", await criarOrdensAppV2({
        container,
        contexto,
        fallbackFaccoesPorProcesso,
        obterUsuario,
        auditoriaRepo,
        ...opcoes
      }));
    },

    async montarManejo(container, opcoes = {}) {
      return substituir("manejo", await criarManejoAppV2({
        container,
        contexto,
        fallbackFaccoesPorProcesso,
        obterUsuario,
        auditoriaRepo,
        ...opcoes
      }));
    },

    async montarFaccoes(container, opcoes = {}) {
      return substituir("faccoes", await criarFaccoesAppV2({
        container,
        contexto,
        fallbackFaccoesPorProcesso,
        referenciaEspecial,
        obterPerfil,
        obterUsuario,
        auditoriaRepo,
        ...opcoes
      }));
    },

    async montarFechamento(container, opcoes = {}) {
      return substituir("fechamento", await criarFechamentoAppV2({
        container,
        contexto,
        fallbackFaccoesPorProcesso,
        ...opcoes
      }));
    },

    async montarPagamentos(container, opcoes = {}) {
      return substituir("pagamentos", await criarPagamentosAppV2({
        container,
        contexto,
        obterUsuario,
        ...opcoes
      }));
    },

    desmontar(nome = "") {
      if (nome) {
        apps.get(nome)?.desmontar?.();
        apps.delete(nome);
        return;
      }
      for (const app of apps.values()) app?.desmontar?.();
      apps.clear();
    },

    appsMontados() {
      return [...apps.keys()];
    }
  });
}
