function exigir(fs, nomes) {
  for (const nome of nomes) {
    if (typeof fs?.[nome] !== "function") throw new Error(`Firestore API sem ${nome}().`);
  }
}

function copiar(item) {
  return item && typeof item === "object" ? { ...item } : item;
}

function mesclarMovimentacao(atual = {}, patch = {}) {
  return {
    ...atual,
    ...patch,
    componentesConsolidados: patch.componentesConsolidados
      ? {
          ...(atual.componentesConsolidados || {}),
          ...patch.componentesConsolidados
        }
      : atual.componentesConsolidados
  };
}

function mesclarOrdem(atual = {}, componentes = {}) {
  return {
    ...atual,
    componentesConsolidados: {
      ...(atual.componentesConsolidados || {}),
      ...componentes
    }
  };
}

export function criarFaccoesOperacionalRepoFirestore({ db, fs, store }) {
  if (!store) throw new Error("Store V2 não configurado para Facções operacionais.");
  exigir(fs, ["doc", "collection", "getDoc", "runTransaction", "serverTimestamp"]);

  async function buscarMovimentacao(id) {
    const cacheada = store.obter("movimentacoes", id);
    if (cacheada) return cacheada;
    const snap = await fs.getDoc(fs.doc(db, "movimentacoesProducao", String(id)));
    if (!snap.exists()) return null;
    const item = { id: snap.id, ...snap.data() };
    store.upsert("movimentacoes", item);
    return item;
  }

  async function transacionarMovimentacao(id, resolver) {
    if (typeof resolver !== "function") throw new Error("Resolver transacional não informado.");
    const ref = fs.doc(db, "movimentacoesProducao", String(id));

    const resultado = await fs.runTransaction(db, async transacao => {
      const snap = await transacao.get(ref);
      if (!snap.exists()) {
        return { ok: false, erros: ["MOVIMENTACAO_NAO_ENCONTRADA"] };
      }

      const atual = { id: snap.id, ...snap.data() };
      const resolvido = await resolver(copiar(atual));
      if (!resolvido?.ok || !resolvido.patch) return resolvido;

      const agora = fs.serverTimestamp();
      const patch = {
        ...resolvido.patch,
        atualizadoEm: agora
      };
      if (resolvido.patch.chegadaInformada === true) patch.chegadaInformadaEm = agora;
      if (resolvido.patch.confirmacaoChegadaOperacional === true) patch.chegadaConfirmadaEm = agora;

      let ordemAtualizada = null;
      const componentesNovos = resolvido.patch.componentesConsolidados;
      const opId = String(atual.opId || "").trim();

      if (componentesNovos && opId) {
        const ordemRef = fs.doc(db, "ordensProducao", opId);
        const ordemSnap = await transacao.get(ordemRef);
        if (ordemSnap.exists()) {
          const ordemAtual = { id: ordemSnap.id, ...ordemSnap.data() };
          ordemAtualizada = mesclarOrdem(ordemAtual, componentesNovos);
          transacao.set(ordemRef, {
            componentesConsolidados: ordemAtualizada.componentesConsolidados,
            atualizadoEm: agora
          }, { merge: true });
        }
      }

      transacao.set(ref, patch, { merge: true });
      return {
        ...resolvido,
        movimentacao: mesclarMovimentacao(atual, resolvido.patch),
        ordem: ordemAtualizada
      };
    });

    if (resultado?.ok && resultado.movimentacao) {
      store.upsert("movimentacoes", resultado.movimentacao);
    }
    if (resultado?.ok && resultado.ordem) {
      store.upsert("ordens", resultado.ordem);
    }
    return resultado;
  }

  async function transacionarReenvio(id, resolver, usuario = null) {
    if (typeof resolver !== "function") throw new Error("Resolver de reenvio não informado.");
    const origemRef = fs.doc(db, "movimentacoesProducao", String(id));

    const resultado = await fs.runTransaction(db, async transacao => {
      const snap = await transacao.get(origemRef);
      if (!snap.exists()) return { ok: false, erros: ["MOVIMENTACAO_NAO_ENCONTRADA"] };

      const origem = { id: snap.id, ...snap.data() };
      const resolvido = await resolver(copiar(origem));
      if (!resolvido?.ok || !resolvido.dadosMovimentacao || !resolvido.patchOrigem) return resolvido;

      const novaRef = fs.doc(fs.collection(db, "movimentacoesProducao"));
      const agora = fs.serverTimestamp();
      const nova = {
        ...resolvido.dadosMovimentacao,
        criadoPor: usuario?.uid || "",
        criadoEm: agora,
        atualizadoPor: usuario?.uid || "",
        atualizadoEm: agora
      };
      const patchOrigem = {
        ...resolvido.patchOrigem,
        reenvioCriadoId: novaRef.id,
        reenvioCriadoEm: agora,
        atualizadoPor: usuario?.uid || "",
        atualizadoEm: agora
      };

      transacao.set(novaRef, nova, { merge: false });
      transacao.set(origemRef, patchOrigem, { merge: true });

      return {
        ...resolvido,
        movimentacaoOrigem: mesclarMovimentacao(origem, {
          ...resolvido.patchOrigem,
          reenvioCriadoId: novaRef.id
        }),
        novaMovimentacao: { id: novaRef.id, ...resolvido.dadosMovimentacao }
      };
    });

    if (resultado?.ok) {
      if (resultado.movimentacaoOrigem) store.upsert("movimentacoes", resultado.movimentacaoOrigem);
      if (resultado.novaMovimentacao) store.upsert("movimentacoes", resultado.novaMovimentacao);
    }
    return resultado;
  }

  return {
    buscarMovimentacao,
    transacionarMovimentacao,
    transacionarReenvio
  };
}
