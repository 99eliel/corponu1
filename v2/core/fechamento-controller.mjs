import {
  listarFaccoesPorProcesso
} from "./faccoes-regras.mjs";
import {
  processoCanonico,
  texto
} from "./normalizacao.mjs";

export class FechamentoController {
  constructor({
    store,
    financeiroService,
    fallbackFaccoesPorProcesso = {}
  }) {
    if (!store) throw new Error("Store V2 não configurado.");
    if (!financeiroService) throw new Error("Serviço financeiro V2 não configurado.");

    this.store = store;
    this.financeiroService = financeiroService;
    this.fallbackFaccoesPorProcesso = fallbackFaccoesPorProcesso;
    this.opAtual = null;
  }

  async buscarOP(numeroOP) {
    const numero = texto(numeroOP);
    const cacheada = this.store.buscarOrdemPorNumero(numero);
    if (cacheada) {
      this.opAtual = cacheada;
      return { ok: true, erros: [], op: cacheada, origem: "store" };
    }

    const resultado = await this.financeiroService.carregarOP(numero);
    if (!resultado.ok) {
      this.opAtual = null;
      return { ...resultado, origem: "repositorio" };
    }

    this.store.upsert("ordens", resultado.op);
    this.opAtual = resultado.op;
    return { ...resultado, origem: "repositorio" };
  }

  selecionarOP(op) {
    if (!op?.id) throw new Error("OP inválida.");
    this.store.upsert("ordens", op);
    this.opAtual = op;
    return { ...op };
  }

  listarResponsaveis(processo) {
    const processoNormalizado = processoCanonico(processo);
    const nomesFallback = this.fallbackFaccoesPorProcesso[processoNormalizado] || [];

    return listarFaccoesPorProcesso(
      this.store.listar("faccoes"),
      processoNormalizado,
      { nomesFallback }
    );
  }

  async preparar(entrada = {}) {
    const op = entrada.op ||
      this.store.buscarOrdemPorNumero(entrada.numeroOP) ||
      this.opAtual;

    if (!op) {
      const carregada = await this.buscarOP(entrada.numeroOP);
      if (!carregada.ok) return carregada;
      return this.financeiroService.prepararLancamento({
        ...entrada,
        op: carregada.op
      });
    }

    return this.financeiroService.prepararLancamento({
      ...entrada,
      op
    });
  }

  async salvar(entrada = {}) {
    const op = entrada.op ||
      this.store.buscarOrdemPorNumero(entrada.numeroOP) ||
      this.opAtual;

    let opFinal = op;
    if (!opFinal) {
      const carregada = await this.buscarOP(entrada.numeroOP);
      if (!carregada.ok) return carregada;
      opFinal = carregada.op;
    }

    const resultado = await this.financeiroService.salvarLancamento({
      ...entrada,
      op: opFinal
    });

    if (resultado.ok && resultado.salvo?.id) {
      this.store.upsert("pagamentos", resultado.salvo);
    }

    return resultado;
  }
}
