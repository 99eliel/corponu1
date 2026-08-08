import { deduplicarFaccoes } from "../core/faccoes-regras.mjs";

function exigirApi(fs, nome) {
  if (typeof fs?.[nome] !== "function") {
    throw new Error(`Firestore API sem ${nome}().`);
  }
}

export function criarFaccoesRepoFirestore({ db, fs, store }) {
  if (!store) throw new Error("Store V2 não configurado para Facções.");
  exigirApi(fs, "collection");
  exigirApi(fs, "getDocs");

  let carregado = false;
  let carregando = null;

  async function carregarDoFirestore() {
    const snapshot = await fs.getDocs(fs.collection(db, "faccoes"));
    const itens = deduplicarFaccoes(
      snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
    );

    store.substituir("faccoes", itens);
    carregado = true;
    return store.listar("faccoes");
  }

  return {
    async garantirCarregadas({ forcar = false } = {}) {
      if (!forcar && carregado) return store.listar("faccoes");
      if (!forcar && carregando) return carregando;

      carregando = carregarDoFirestore();
      try {
        return await carregando;
      } finally {
        carregando = null;
      }
    },

    async recarregar() {
      return this.garantirCarregadas({ forcar: true });
    },

    estaCarregado() {
      return carregado;
    },

    listar() {
      return store.listar("faccoes");
    }
  };
}
