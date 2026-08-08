import { listarFaccoesPorProcesso } from "./faccoes-regras.mjs";
import { filtrarOrdensManejo, opcoesFiltrosManejo } from "./manejo-filtros.mjs";
import {
  DESTINO_FACCAO,
  PROCESSOS_FACCAO_POR_SETOR,
  getManejoDaOrdemV2,
  ordemPertenceAoManejo,
  setorManejoCanonico
} from "./manejo-regras.mjs";
import { processoCanonico, texto } from "./normalizacao.mjs";

export class ManejoController {
  constructor({
    store,
    manejoService,
    fallbackFaccoesPorProcesso = {}
  }) {
    if (!store) throw new Error("Store V2 não configurado.");
    if (!manejoService) throw new Error("Serviço de Manejo V2 não configurado.");
    this.store = store;
    this.manejoService = manejoService;
    this.fallbackFaccoesPorProcesso = fallbackFaccoesPorProcesso;
  }

  listar(setor, filtros = {}) {
    const chave = setorManejoCanonico(setor);
    const base = this.store.listar("ordens")
      .filter(ordem => ordemPertenceAoManejo(ordem, chave))
      .filter(ordem => ordem.excluida !== true);
    return filtrarOrdensManejo(base, chave, filtros);
  }

  opcoesFiltros(setor) {
    const chave = setorManejoCanonico(setor);
    const base = this.store.listar("ordens")
      .filter(ordem => ordemPertenceAoManejo(ordem, chave))
      .filter(ordem => ordem.excluida !== true);
    return opcoesFiltrosManejo(base, chave);
  }

  obterOrdem(id) {
    return this.store.obter("ordens", texto(id));
  }

  obterManejo(ordemId, setor) {
    const ordem = this.obterOrdem(ordemId);
    return getManejoDaOrdemV2(ordem, setor);
  }

  processosFaccoes(setor) {
    return [...(PROCESSOS_FACCAO_POR_SETOR[setorManejoCanonico(setor)] || [])];
  }

  listarDestinos({ tipoDestino, processo = "" } = {}) {
    if (tipoDestino !== DESTINO_FACCAO) return [];

    const canonico = processoCanonico(processo);
    return listarFaccoesPorProcesso(
      this.store.listar("faccoes"),
      canonico,
      { nomesFallback: this.fallbackFaccoesPorProcesso[canonico] || [] }
    );
  }

  async salvar({ ordemId, setor, entrada, usuario = null }) {
    const ordem = this.obterOrdem(ordemId);
    return this.manejoService.salvarManejo({
      ordem,
      ordemId,
      setor,
      entrada,
      usuario
    });
  }

  async movimentar({ ordemId, setor, destinoId = "", ...entrada }) {
    const ordem = this.obterOrdem(ordemId);
    return this.manejoService.movimentar({
      ...entrada,
      ordem,
      ordemId,
      setor,
      destinoId
    });
  }
}
