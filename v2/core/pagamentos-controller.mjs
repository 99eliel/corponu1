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
    this.store.substituir("pagamentos", itens);
    return this.listar({ competencia });
  }

  async carregarMais() {
    const itens = await this.pagamentosRepo.carregarMais();
    itens.forEach(item => this.store.upsert("pagamentos", item));
    return itens;
  }

  acabou() {
    return this.pagamentosRepo.acabou();
  }

  listar(filtros = {}) {
    const itens = filtrarPagamentos(this.store.listar("pagamentos"), filtros);
    return { itens, resumo: resumirPagamentos(itens) };
  }

  relatorioSimplificado(filtros = {}) {
    const { itens } = this.listar(filtros);
    return relatorioSimplificadoPix(itens, this.store.listar("faccoes"));
  }

  async quitarFiltrados(filtros = {}, { usuario = null } = {}) {
    const todos = await this.pagamentosRepo.buscarTodos({ competencia: filtros.competencia });
    const filtrados = filtrarPagamentos(todos, filtros);
    const resumo = resumoQuitacao(filtrados);
    if (!resumo.quantidade) return { ok: false, erros: ["NENHUM_PAGAMENTO_PENDENTE"], resumo };

    const resultado = await this.pagamentosRepo.quitarEmLote(resumo.ids, { usuario });
    if (!resultado.ok) return { ...resultado, resumo };

    resultado.ids.forEach(id => {
      const atual = this.store.obter("pagamentos", id);
      if (atual) this.store.upsert("pagamentos", { ...atual, statusPagamento: "pago" });
    });

    return { ok: true, erros: [], resumo, ids: resultado.ids };
  }
}
