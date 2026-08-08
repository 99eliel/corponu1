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
    if (!numero) {
      this.opAtual = null;
      return { ok: false, erros: ["OP_NAO_INFORMADA"], op: null, origem: "entrada" };
    }

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

  limparOP() {
    this.opAtual = null;
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

  async diagnosticarComponentes(processo, op = this.opAtual) {
    if (!op?.id) {
      return { ok: false, erros: ["OP_NAO_INFORMADA"], diagnostico: null };
    }

    const diagnostico = await this.financeiroService.diagnosticarComponentes({ op, processo });
    return { ok: true, erros: [], diagnostico };
  }

  async consultarSaldo(processo, op = this.opAtual) {
    if (!op?.id) {
      return { ok: false, erros: ["OP_NAO_INFORMADA"], saldo: null };
    }
    const saldo = await this.financeiroService.consultarSaldo({ op, processo });
    return { ok: true, erros: [], saldo };
  }

  async resolverOP(entrada = {}) {
    if (entrada.op) return { ok: true, erros: [], op: entrada.op, origem: "entrada" };

    const numero = texto(entrada.numeroOP);
    if (numero) {
      const cacheada = this.store.buscarOrdemPorNumero(numero);
      if (cacheada) {
        this.opAtual = cacheada;
        return { ok: true, erros: [], op: cacheada, origem: "store" };
      }
      return this.buscarOP(numero);
    }

    if (this.opAtual) {
      return { ok: true, erros: [], op: this.opAtual, origem: "selecionada" };
    }

    return { ok: false, erros: ["OP_NAO_INFORMADA"], op: null, origem: "entrada" };
  }

  async preparar(entrada = {}) {
    const resolvida = await this.resolverOP(entrada);
    if (!resolvida.ok) return resolvida;

    return this.financeiroService.prepararLancamento({
      ...entrada,
      op: resolvida.op
    });
  }

  async salvar(entrada = {}) {
    const resolvida = await this.resolverOP(entrada);
    if (!resolvida.ok) return resolvida;

    const resultado = await this.financeiroService.salvarLancamento({
      ...entrada,
      op: resolvida.op
    });

    if (resultado.ok && resultado.salvo?.id) {
      this.store.upsert("pagamentos", resultado.salvo);
    }

    return resultado;
  }
}
