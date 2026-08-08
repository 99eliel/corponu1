import { ordemAtiva } from "../core/ordens-regras.mjs";

function exigirApi(fs, nomes) {
  nomes.forEach(nome => {
    if (typeof fs?.[nome] !== "function") throw new Error(`Firestore API sem ${nome}().`);
  });
}

function documento(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

export function criarOrdensConsultaRepoFirestore({
  db,
  fs,
  store,
  tamanhoPagina = 150
}) {
  if (!store) throw new Error("Store V2 não configurado para consulta de Ordens.");
  exigirApi(fs, [
    "collection",
    "query",
    "orderBy",
    "documentId",
    "limit",
    "getDocs",
    "startAfter"
  ]);

  const limitePadrao = Math.max(20, Math.min(300, Number(tamanhoPagina) || 150));
  let cursorAtual = null;
  let acabouAtual = false;
  let primeiraPaginaCarregada = false;
  let carregandoPrimeira = null;

  function montarConsulta(cursor = null, limitePagina = limitePadrao) {
    const restricoes = [fs.orderBy(fs.documentId())];
    if (cursor) restricoes.push(fs.startAfter(cursor));
    restricoes.push(fs.limit(Math.max(1, Math.min(300, Number(limitePagina) || limitePadrao))));
    return fs.query(fs.collection(db, "ordensProducao"), ...restricoes);
  }

  async function lerPagina({ cursor = null, limitePagina = limitePadrao } = {}) {
    const tamanho = Math.max(1, Math.min(300, Number(limitePagina) || limitePadrao));
    const snapshot = await fs.getDocs(montarConsulta(cursor, tamanho));
    const docs = snapshot.docs || [];
    const itens = docs.map(documento).filter(ordemAtiva);
    store.mesclar("ordens", itens);

    return {
      itens,
      documentosLidos: docs.length,
      cursor: docs.at(-1) || null,
      acabou: docs.length < tamanho
    };
  }

  return {
    async carregarPrimeiraPagina({ forcar = false, limitePagina = limitePadrao } = {}) {
      if (!forcar && primeiraPaginaCarregada) return [];
      if (!forcar && carregandoPrimeira) return carregandoPrimeira;

      carregandoPrimeira = (async () => {
        const resultado = await lerPagina({ limitePagina });
        cursorAtual = resultado.cursor;
        acabouAtual = resultado.acabou;
        primeiraPaginaCarregada = true;
        return resultado.itens;
      })();

      try {
        return await carregandoPrimeira;
      } finally {
        carregandoPrimeira = null;
      }
    },

    async carregarMais({ limitePagina = limitePadrao } = {}) {
      if (!primeiraPaginaCarregada) return this.carregarPrimeiraPagina({ limitePagina });
      if (acabouAtual || !cursorAtual) return [];

      const resultado = await lerPagina({ cursor: cursorAtual, limitePagina });
      cursorAtual = resultado.cursor;
      acabouAtual = resultado.acabou;
      return resultado.itens;
    },

    acabou() {
      return acabouAtual;
    },

    primeiraPaginaCarregada() {
      return primeiraPaginaCarregada;
    },

    quantidadeNoStore() {
      return store.listar("ordens").length;
    }
  };
}
