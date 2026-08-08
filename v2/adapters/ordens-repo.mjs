import { ordemAtiva } from "../core/ordens-regras.mjs";
import { normalizar, texto } from "../core/normalizacao.mjs";

const CAMPOS_COMPONENTES_LEGADOS_OP = Object.freeze([
  "possuiAlca",
  "possuiBojo",
  "possuiRenda"
]);

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

function mesmoNumero(ordem, numeroOP) {
  const alvo = normalizar(numeroOP);
  const valor = normalizar(
    ordem?.numeroOP || ordem?.numeroOPExterno || ordem?.op || String(ordem?.id || "").replace(/^calcinha-|^op-/i, "")
  );
  return valor === alvo;
}

async function consultarCampo({ db, fs, campo, numeroOP }) {
  const valores = valoresConsulta(numeroOP);
  if (!valores.length) return [];
  const filtro = valores.length > 1
    ? fs.where(campo, "in", valores)
    : fs.where(campo, "==", valores[0]);
  const snapshot = await fs.getDocs(fs.query(
    fs.collection(db, "ordensProducao"),
    filtro,
    fs.limit(10)
  ));
  return snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }));
}

function limparCamposLegadosLocal(dados = {}) {
  const limpo = { ...dados };
  for (const campo of CAMPOS_COMPONENTES_LEGADOS_OP) delete limpo[campo];
  return limpo;
}

export function criarOrdensGravacaoRepoFirestore({ db, fs, store }) {
  if (!store) throw new Error("Store V2 não configurado para Ordens.");
  for (const nome of ["collection", "query", "where", "limit", "getDocs", "doc", "getDoc", "setDoc", "serverTimestamp"]) {
    if (typeof fs?.[nome] !== "function") throw new Error(`Firestore API sem ${nome}().`);
  }

  return {
    async buscarTodosPorNumero(numeroOP) {
      const encontrados = new Map();

      // Consulta principal primeiro; compatibilidade legada só se necessário.
      const principais = await consultarCampo({ db, fs, campo: "numeroOP", numeroOP });
      principais.forEach(item => encontrados.set(item.id, item));

      if (!principais.length) {
        for (const campo of ["numeroOPExterno", "op"]) {
          const legados = await consultarCampo({ db, fs, campo, numeroOP });
          legados.forEach(item => encontrados.set(item.id, item));
          if (legados.length) break;
        }
      }

      const lista = [...encontrados.values()]
        .filter(ordemAtiva)
        .filter(item => mesmoNumero(item, numeroOP));

      lista.forEach(item => store.upsert("ordens", item));
      return lista;
    },

    async buscarPorId(id) {
      const cacheado = store.obter("ordens", id);
      if (cacheado) return cacheado;

      const snapshot = await fs.getDoc(fs.doc(db, "ordensProducao", String(id)));
      if (!snapshot.exists()) return null;
      const item = { id: snapshot.id, ...snapshot.data() };
      store.upsert("ordens", item);
      return item;
    },

    async salvar({ id, dados, usuario = null, novo = false }) {
      const documentoId = String(id || "").trim();
      if (!documentoId) throw new Error("ID da OP não informado.");

      const dadosLimpos = limparCamposLegadosLocal(dados);
      const payload = {
        ...dadosLimpos,
        atualizadoPor: usuario?.uid || dadosLimpos.atualizadoPor || "",
        atualizadoEm: fs.serverTimestamp()
      };

      if (novo) {
        payload.criadoPor = usuario?.uid || dadosLimpos.criadoPor || "";
        payload.criadoEm = fs.serverTimestamp();
      } else if (typeof fs.deleteField === "function") {
        // Limpeza segura de OPs antigas: merge preserva Manejo e demais dados,
        // enquanto apenas os três campos irrelevantes são removidos.
        for (const campo of CAMPOS_COMPONENTES_LEGADOS_OP) {
          payload[campo] = fs.deleteField();
        }
      }

      await fs.setDoc(
        fs.doc(db, "ordensProducao", documentoId),
        payload,
        novo ? undefined : { merge: true }
      );

      // upsert() é intencionalmente merge no store. Para não manter os campos
      // legados apenas em memória, substituímos este registro específico.
      const anteriorLocal = store.obter("ordens", documentoId) || {};
      const local = limparCamposLegadosLocal({ ...anteriorLocal, ...dadosLimpos, id: documentoId });
      store.remover("ordens", documentoId);
      store.upsert("ordens", local);
      return local;
    }
  };
}
