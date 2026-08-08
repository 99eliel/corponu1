import { normalizarCompetencia, texto } from "../core/normalizacao.mjs";

function copiar(valor) {
  return valor == null ? valor : structuredClone(valor);
}

export function criarPagamentosRepoLocal(store) {
  let carregados = [];
  let posicao = 0;
  let limitePagina = 50;

  function preparar(competencia = "") {
    const comp = normalizarCompetencia(competencia);
    carregados = store.listar("pagamentos")
      .filter(item => !comp || normalizarCompetencia(item.competencia) === comp)
      .sort((a, b) => String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
    posicao = 0;
  }

  return {
    async carregarPrimeiraPagina({ competencia = "", limitePagina: limite = 50 } = {}) {
      limitePagina = Math.max(1, Number(limite) || 50);
      preparar(competencia);
      const pagina = carregados.slice(0, limitePagina).map(copiar);
      posicao = pagina.length;
      return pagina;
    },
    async carregarMais() {
      const pagina = carregados.slice(posicao, posicao + limitePagina).map(copiar);
      posicao += pagina.length;
      return pagina;
    },
    acabou() {
      return posicao >= carregados.length;
    },
    async buscarTodos({ competencia = "" } = {}) {
      const comp = normalizarCompetencia(competencia);
      return store.listar("pagamentos")
        .filter(item => !comp || normalizarCompetencia(item.competencia) === comp)
        .map(copiar);
    },
    async quitarEmLote(ids = [], { usuario = null } = {}) {
      const unicos = [...new Set((ids || []).map(texto).filter(Boolean))];
      if (!unicos.length) return { ok: false, erros: ["NENHUM_PAGAMENTO_PENDENTE"], ids: [] };
      const agora = new Date().toISOString();
      unicos.forEach(id => {
        const atual = store.obter("pagamentos", id);
        if (!atual) return;
        store.upsert("pagamentos", {
          ...atual,
          statusPagamento: "pago",
          pagoEm: agora,
          pagoPor: texto(usuario?.uid || usuario?.id),
          pagoPorNome: texto(usuario?.nome || usuario?.email),
          atualizadoEm: agora
        });
      });
      return { ok: true, erros: [], ids: unicos };
    }
  };
}
