import { normalizarCompetencia, texto } from "../core/normalizacao.mjs";

function exigirApi(fs, nomes) {
  nomes.forEach(nome => {
    if (typeof fs?.[nome] !== "function") throw new Error(`Firestore API sem ${nome}().`);
  });
}

function documento(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

function ordenarPorCriacao(itens = []) {
  return [...itens].sort((a, b) => String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
}

export function criarPagamentosConsultaRepoFirestore({ db, fs, colecao = "entregasPagamento" }) {
  exigirApi(fs, ["collection", "query", "where", "orderBy", "limit", "getDocs", "startAfter", "doc", "writeBatch", "serverTimestamp"]);
  if (colecao !== "entregasPagamento") throw new Error("Pagamentos V2 consulta somente entregasPagamento.");

  let cursorAtual = null;
  let filtrosAtuais = {};
  let acabouAtual = false;

  function consultaPagina({ competencia = "", limitePagina = 50, cursor = null } = {}) {
    const restricoes = [];
    const comp = normalizarCompetencia(competencia);
    // Com competência definida, uma única igualdade já restringe o mês e evita
    // depender de índice composto apenas para ordenar. A página é ordenada localmente.
    if (comp) restricoes.push(fs.where("competencia", "==", comp));
    else restricoes.push(fs.orderBy("criadoEm", "desc"));
    if (cursor) restricoes.push(fs.startAfter(cursor));
    restricoes.push(fs.limit(Math.max(1, Math.min(200, Number(limitePagina) || 50))));
    return fs.query(fs.collection(db, colecao), ...restricoes);
  }

  async function carregarPaginaInterna({ competencia = "", limitePagina = 50, cursor = null } = {}) {
    const tamanho = Math.max(1, Math.min(200, Number(limitePagina) || 50));
    const snapshot = await fs.getDocs(consultaPagina({ competencia, limitePagina: tamanho, cursor }));
    const docs = snapshot.docs || [];
    return {
      itens: ordenarPorCriacao(docs.map(documento)),
      cursor: docs.at(-1) || null,
      acabou: docs.length < tamanho
    };
  }

  return {
    async carregarPrimeiraPagina({ competencia = "", limitePagina = 50 } = {}) {
      filtrosAtuais = { competencia: normalizarCompetencia(competencia), limitePagina };
      cursorAtual = null;
      acabouAtual = false;
      const resultado = await carregarPaginaInterna(filtrosAtuais);
      cursorAtual = resultado.cursor;
      acabouAtual = resultado.acabou;
      return resultado.itens;
    },

    async carregarMais() {
      if (acabouAtual) return [];
      const resultado = await carregarPaginaInterna({ ...filtrosAtuais, cursor: cursorAtual });
      cursorAtual = resultado.cursor;
      acabouAtual = resultado.acabou;
      return resultado.itens;
    },

    acabou() { return acabouAtual; },

    async buscarTodos({ competencia = "", limitePagina = 200, maximo = 10000 } = {}) {
      const itens = [];
      let cursor = null;
      let acabou = false;
      while (!acabou && itens.length < maximo) {
        const pagina = await carregarPaginaInterna({ competencia, limitePagina, cursor });
        itens.push(...pagina.itens);
        cursor = pagina.cursor;
        acabou = pagina.acabou || !cursor;
      }
      if (!acabou && itens.length >= maximo) {
        throw new Error("LIMITE_SEGURANCA_PAGAMENTOS_ATINGIDO");
      }
      return ordenarPorCriacao(itens);
    },

    async quitarEmLote(ids = [], { usuario = null } = {}) {
      const unicos = [...new Set((ids || []).map(texto).filter(Boolean))];
      if (!unicos.length) return { ok: false, erros: ["NENHUM_PAGAMENTO_PENDENTE"], ids: [] };
      const agora = fs.serverTimestamp();
      for (let inicio = 0; inicio < unicos.length; inicio += 400) {
        const lote = unicos.slice(inicio, inicio + 400);
        const batch = fs.writeBatch(db);
        lote.forEach(id => batch.update(fs.doc(db, colecao, id), {
          statusPagamento: "pago",
          pagoEm: agora,
          pagoPor: texto(usuario?.uid || usuario?.id),
          pagoPorNome: texto(usuario?.nome || usuario?.displayName || usuario?.email),
          atualizadoEm: agora
        }));
        await batch.commit();
      }
      return { ok: true, erros: [], ids: unicos };
    }
  };
}
