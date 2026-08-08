import { getManejoDaOrdemV2, setorManejoCanonico } from "../core/manejo-regras.mjs";
import { texto } from "../core/normalizacao.mjs";

function exigir(fs, nomes) {
  for (const nome of nomes) {
    if (typeof fs?.[nome] !== "function") throw new Error(`Firestore API sem ${nome}().`);
  }
}

function patchManejo({ setor, manejo, status = "organizada", extras = {} }) {
  const chave = setorManejoCanonico(setor);
  if (!chave) throw new Error("Setor de Manejo inválido.");

  return {
    manejosSetores: {
      [chave]: manejo
    },
    manejoStatusSetores: {
      [chave]: status
    },
    ...extras
  };
}

function atualizarOrdemLocal(ordem, setor, manejo, status, extras = {}) {
  const chave = setorManejoCanonico(setor);
  return {
    ...ordem,
    ...extras,
    manejosSetores: {
      ...(ordem.manejosSetores || {}),
      [chave]: manejo
    },
    manejoStatusSetores: {
      ...(ordem.manejoStatusSetores || {}),
      [chave]: status
    }
  };
}

export function criarManejoRepoFirestore({ db, fs, store }) {
  if (!store) throw new Error("Store V2 não configurado para Manejo.");
  exigir(fs, ["doc", "collection", "getDoc", "setDoc", "serverTimestamp", "writeBatch"]);

  async function buscarOrdem(id) {
    const cacheada = store.obter("ordens", id);
    if (cacheada) return cacheada;
    const snap = await fs.getDoc(fs.doc(db, "ordensProducao", String(id)));
    if (!snap.exists()) return null;
    const ordem = { id: snap.id, ...snap.data() };
    store.upsert("ordens", ordem);
    return ordem;
  }

  function manejoComAuditoria(manejo, usuario, anterior = null) {
    const agora = fs.serverTimestamp();
    const dados = {
      ...manejo,
      atualizadoPor: usuario?.uid || "",
      atualizadoEm: agora
    };
    if (!anterior?.criadoEm) {
      dados.criadoPor = usuario?.uid || "";
      dados.criadoEm = agora;
    } else {
      dados.criadoPor = anterior.criadoPor || "";
      dados.criadoEm = anterior.criadoEm;
    }
    return dados;
  }

  function extrasOrdem(necessidade, usuario) {
    return {
      necessidade: texto(necessidade),
      necessidadeTexto: texto(necessidade),
      necessidadeManual: true,
      atualizadoPor: usuario?.uid || "",
      atualizadoEm: fs.serverTimestamp()
    };
  }

  return {
    buscarOrdem,

    async salvarManejo({ ordem, setor, manejo, usuario = null, status = "organizada" }) {
      const anterior = getManejoDaOrdemV2(ordem, setor);
      const persistido = manejoComAuditoria(manejo, usuario, anterior);
      const extras = extrasOrdem(manejo.necessidade, usuario);
      const patch = patchManejo({ setor, manejo: persistido, status, extras });

      await fs.setDoc(fs.doc(db, "ordensProducao", ordem.id), patch, { merge: true });

      const local = atualizarOrdemLocal(ordem, setor, manejo, status, {
        necessidade: texto(manejo.necessidade),
        necessidadeTexto: texto(manejo.necessidade),
        necessidadeManual: true
      });
      store.upsert("ordens", local);
      return { ordem: local, manejo: { ...manejo } };
    },

    async criarMovimentacaoComManejo({
      ordem,
      setor,
      manejo,
      movimentacao,
      usuario = null,
      movimentacaoOrigemId = ""
    }) {
      const anterior = getManejoDaOrdemV2(ordem, setor);
      const persistido = manejoComAuditoria(manejo, usuario, anterior);
      const extras = extrasOrdem(manejo.necessidade, usuario);
      const patch = patchManejo({ setor, manejo: persistido, status: "organizada", extras });
      const ordemRef = fs.doc(db, "ordensProducao", ordem.id);
      const movRef = fs.doc(fs.collection(db, "movimentacoesProducao"));
      const batch = fs.writeBatch(db);
      const agora = fs.serverTimestamp();

      batch.set(ordemRef, patch, { merge: true });
      batch.set(movRef, {
        ...movimentacao,
        criadoPor: usuario?.uid || "",
        criadoEm: agora,
        atualizadoPor: usuario?.uid || "",
        atualizadoEm: agora
      }, { merge: false });

      if (texto(movimentacaoOrigemId)) {
        batch.set(fs.doc(db, "movimentacoesProducao", texto(movimentacaoOrigemId)), {
          status: "encaminhado",
          encaminhado: true,
          encaminhadoParaTipo: movimentacao.tipoDestino,
          encaminhadoParaLabel: movimentacao.tipoDestinoLabel,
          encaminhadoParaDestino: movimentacao.destino,
          encaminhadoParaProcesso: movimentacao.processo,
          encaminhadoMovimentacaoId: movRef.id,
          atualizadoPor: usuario?.uid || "",
          atualizadoEm: agora
        }, { merge: true });
      }

      await batch.commit();

      const ordemLocal = atualizarOrdemLocal(ordem, setor, manejo, "organizada", {
        necessidade: texto(manejo.necessidade),
        necessidadeTexto: texto(manejo.necessidade),
        necessidadeManual: true
      });
      const movLocal = { id: movRef.id, ...movimentacao };
      store.upsert("ordens", ordemLocal);
      store.upsert("movimentacoes", movLocal);

      if (texto(movimentacaoOrigemId)) {
        const origemAtual = store.obter("movimentacoes", movimentacaoOrigemId);
        if (origemAtual) {
          store.upsert("movimentacoes", {
            ...origemAtual,
            status: "encaminhado",
            encaminhado: true,
            encaminhadoMovimentacaoId: movRef.id
          });
        }
      }

      return { ordem: ordemLocal, manejo: { ...manejo }, movimentacao: movLocal };
    }
  };
}
