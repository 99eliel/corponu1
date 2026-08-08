import { filtrarPagamentos, relatorioSimplificadoPix, resumirPagamentos, resumoQuitacao } from "./pagamentos-regras.mjs";

export class PagamentosController {
  constructor({ store, pagamentosRepo, faccoesRepo = null }) {
    if (!store) throw new Error("Store V2 não configurado.");
    if (!pagamentosRepo) throw new Error("Repositório de pagamentos não configurado.");
    this.store = store;
    this.pagamentosRepo = pagamentosRepo;
    this.faccoesRepo = faccoesRepo;
  }

  async carregar({ competencia = "", limitePagina = 50 } = {}) {
    const itens = await this.pagamentosRepo.carregarPrimeiraPagina({ competencia, limitePagina });
    itens.forEach(item => this.store.upsert("pagamentos", item));
    return this.listar({ competencia });
  }

  async carregarMais() {
    const itens = await this.pagamentosRepo.carregarMais();
    itens.forEach(item => this.store.upsert("pagamentos", item));
    return itens;
  }

  acabou() { return this.pagamentosRepo.acabou(); }

  listar(filtros = {}) {
    const itens = filtrarPagamentos(this.store.listar("pagamentos"), filtros);
    return { itens, resumo: resumirPagamentos(itens) };
  }

  relatorioSimplificado(filtros = {}) {
    const { itens } = this.listar(filtros);
    return relatorioSimplificadoPix(itens, this.store.listar("faccoes"));
  }

  async buscarFiltradosCompletos(filtros = {}) {
    const todos = await this.pagamentosRepo.buscarTodos({ competencia: filtros.competencia });
    const itens = filtrarPagamentos(todos, filtros);
    return {
      itens,
      resumo: resumirPagamentos(itens),
      simplificado: relatorioSimplificadoPix(itens, this.store.listar("faccoes"))
    };
  }

  async prepararQuitacao(filtros = {}) {
    const { itens } = await this.buscarFiltradosCompletos(filtros);
    const resumo = resumoQuitacao(itens);
    return {
      ok: resumo.quantidade > 0,
      erros: resumo.quantidade ? [] : ["NENHUM_PAGAMENTO_PENDENTE"],
      resumo,
      ids: resumo.ids
    };
  }

  async quitarPreparados(preparado, { usuario = null } = {}) {
    const ids = preparado?.ids || preparado?.resumo?.ids || [];
    if (!ids.length) return { ok: false, erros: ["NENHUM_PAGAMENTO_PENDENTE"], resumo: preparado?.resumo || null };

    const resultado = await this.pagamentosRepo.quitarEmLote(ids, { usuario });
    if (!resultado.ok) return { ...resultado, resumo: preparado?.resumo || null };

    resultado.ids.forEach(id => {
      const atual = this.store.obter("pagamentos", id);
      if (atual) this.store.upsert("pagamentos", { ...atual, statusPagamento: "pago" });
    });
    return { ok: true, erros: [], resumo: preparado?.resumo || null, ids: resultado.ids };
  }

  async quitarFiltrados(filtros = {}, { usuario = null } = {}) {
    const preparado = await this.prepararQuitacao(filtros);
    if (!preparado.ok) return preparado;
    return this.quitarPreparados(preparado, { usuario });
  }
}
