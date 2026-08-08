import {
  TIPO_CALCINHA,
  tipoPecaCanonico
} from "../core/ordens-regras.mjs";
import {
  normalizarReferencia,
  texto
} from "../core/normalizacao.mjs";

function tipoProduto(produto = {}) {
  const explicito = tipoPecaCanonico(
    produto.tipoPeca || produto.tipoPecaPadrao || produto.tipoPecaLabel || produto.setor
  );
  if (explicito) return explicito;
  return String(produto.id || "").toLowerCase().startsWith("calcinha-")
    ? TIPO_CALCINHA
    : "sutia";
}

function valoresConsulta(valor) {
  const bruto = texto(valor);
  if (!bruto) return [];
  const valores = [bruto];
  const numero = Number(bruto.replace(",", "."));
  if (Number.isFinite(numero)) valores.push(numero);
  return valores.filter((item, indice, lista) =>
    lista.findIndex(outro => typeof outro === typeof item && String(outro) === String(item)) === indice
  );
}

export function criarProdutosRepoFirestore({ db, fs, store }) {
  if (!store) throw new Error("Store V2 não configurado para Produtos.");
  for (const nome of ["collection", "query", "where", "getDocs"]) {
    if (typeof fs?.[nome] !== "function") throw new Error(`Firestore API sem ${nome}().`);
  }

  return {
    async buscarPorReferencia(referencia, tipoPeca) {
      const tipo = tipoPecaCanonico(tipoPeca);
      const cacheado = store.buscarProdutoPorReferencia(referencia, tipo);
      if (cacheado) return cacheado;

      const valores = valoresConsulta(referencia);
      if (!valores.length) return null;

      const filtro = valores.length > 1
        ? fs.where("referencia", "in", valores)
        : fs.where("referencia", "==", valores[0]);

      const snapshot = await fs.getDocs(fs.query(
        fs.collection(db, "produtos"),
        filtro
      ));

      const alvo = normalizarReferencia(referencia);
      let encontrado = null;

      for (const documento of snapshot.docs) {
        const produto = { id: documento.id, ...documento.data() };
        store.upsert("produtos", produto);
        if (
          !encontrado &&
          normalizarReferencia(produto.referencia) === alvo &&
          tipoProduto(produto) === tipo
        ) {
          encontrado = produto;
        }
      }

      return encontrado;
    }
  };
}
