import { normalizar, texto } from "../core/normalizacao.mjs";

function celulaAtiva(item = {}) {
  if (!item || item.ativo === false) return false;
  if (item.excluida === true || item.excluido === true) return false;
  const status = normalizar(item.status);
  if (["INATIVA", "INATIVO", "EXCLUIDA", "EXCLUIDO"].includes(status)) return false;
  return Boolean(texto(item.nome || item.descricao || item.id));
}

function deduplicar(itens = []) {
  const mapa = new Map();
  for (const item of itens) {
    if (!celulaAtiva(item)) continue;
    const nome = texto(item.nome || item.descricao || item.id);
    const chave = normalizar(nome);
    if (!chave || mapa.has(chave)) continue;
    mapa.set(chave, { ...item, nome });
  }
  return [...mapa.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })
  );
}

export function criarCelulasRepoFirestore({ db, fs, store }) {
  if (!store) throw new Error("Store V2 não configurado para Células.");
  if (typeof fs?.collection !== "function" || typeof fs?.getDocs !== "function") {
    throw new Error("Firestore API incompleta para Células.");
  }

  let carregado = false;
  let carregando = null;

  async function carregar() {
    const snapshot = await fs.getDocs(fs.collection(db, "celulas"));
    const itens = deduplicar(
      snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
    );
    store.substituir("celulas", itens);
    carregado = true;
    return store.listar("celulas");
  }

  return {
    async garantirCarregadas({ forcar = false } = {}) {
      if (!forcar && carregado) return store.listar("celulas");
      if (!forcar && carregando) return carregando;
      carregando = carregar();
      try {
        return await carregando;
      } finally {
        carregando = null;
      }
    },
    async recarregar() {
      return this.garantirCarregadas({ forcar: true });
    },
    listar() {
      return store.listar("celulas");
    },
    estaCarregado() {
      return carregado;
    }
  };
}
