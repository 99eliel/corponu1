import { movimentacaoFaccaoAtiva } from "../core/faccoes-operacional-regras.mjs";
import { normalizar } from "../core/normalizacao.mjs";

function ehFaccao(item = {}) {
  return normalizar(item.tipoDestino || item.tipo) === "FACCAO";
}

export function criarMovimentacoesFaccoesRepoFirestore({
  db,
  fs,
  store,
  tamanhoPagina = 80
}) {
  if (!store) throw new Error("Store V2 não configurado para movimentações de Facções.");
  for (const nome of ["collection", "query", "orderBy", "limit", "startAfter", "getDocs"]) {
    if (typeof fs?.[nome] !== "function") throw new Error(`Firestore API sem ${nome}().`);
  }

  let cursor = null;
  let acabou = false;
  let carregando = null;

  async function carregar({ reiniciar = false } = {}) {
    if (carregando) return carregando;
    if (acabou && !reiniciar) {
      return { itens: [], acabou: true, totalNoStore: store.listar("movimentacoes").filter(ehFaccao).length };
    }

    carregando = (async () => {
      if (reiniciar) {
        cursor = null;
        acabou = false;
      }

      const restricoes = [
        fs.orderBy("criadoEm", "desc"),
        fs.limit(tamanhoPagina)
      ];
      if (cursor) restricoes.push(fs.startAfter(cursor));

      const snapshot = await fs.getDocs(fs.query(
        fs.collection(db, "movimentacoesProducao"),
        ...restricoes
      ));

      const docs = snapshot.docs || [];
      if (docs.length) cursor = docs[docs.length - 1];
      if (docs.length < tamanhoPagina) acabou = true;

      const itens = docs
        .map(documento => ({ id: documento.id, ...documento.data() }))
        .filter(ehFaccao);

      itens.forEach(item => store.upsert("movimentacoes", item));

      return {
        itens,
        acabou,
        lidos: docs.length,
        totalNoStore: store.listar("movimentacoes").filter(ehFaccao).length
      };
    })();

    try {
      return await carregando;
    } finally {
      carregando = null;
    }
  }

  return {
    carregarPrimeiraPagina() {
      return carregar({ reiniciar: true });
    },
    carregarMais() {
      return carregar();
    },
    listarCarregadas({ somenteAtivas = false } = {}) {
      const itens = store.listar("movimentacoes").filter(ehFaccao);
      return somenteAtivas ? itens.filter(movimentacaoFaccaoAtiva) : itens;
    },
    acabou() {
      return acabou;
    }
  };
}
