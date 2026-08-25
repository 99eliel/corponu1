(() => {
  "use strict";

  const VERSION = "2026-08-25-ajuste-local-rapido-236";
  const GUARD = "__CORPONU_MANEJO_CALCINHA_AJUSTE_LOCAL_RAPIDO_236__";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  // Mantém a limpeza segura da 235. Este arquivo não envolve salvarManejoLinha.
  const lock = window.__CORPONU_MANEJO_CALCINHA_RENDER_LOCK_232__;
  if (lock && typeof lock === "object") {
    lock.ativo = false;
    lock.contador = 0;
    lock.pendente = false;
    lock.inicio = 0;
    if (lock.ordens instanceof Set) lock.ordens.clear();
  }

  document.querySelectorAll('[data-corponu-antipisca-calcinha231="1"]').forEach(item => item.remove());
  const tabela = document.getElementById("listaManejoInline")?.closest("table");
  if (tabela instanceof HTMLElement && tabela.style.visibility === "hidden") tabela.style.visibility = "";

  const FIREBASE_VERSION = "10.12.5";
  let firebasePromise = null;
  let salvando = false;

  function calcinhaAtiva() {
    const pagina = document.querySelector(".page.active")?.id || "";
    const setor = document.querySelector('#manejo .manejo-setor-btn.active[data-setor="calcinha"]');
    return pagina === "manejo" && Boolean(setor);
  }

  function texto(valor) {
    return String(valor ?? "").trim().replace(/\s+/g, " ");
  }

  function textoMaiusculo(valor) {
    return texto(valor).toUpperCase();
  }

  function idSeguro(valor) {
    return texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "sem-id";
  }

  function labelLocal(local) {
    const labels = {
      MANEJO_AGUARDANDO_DESTINO: "Manejo / aguardando destino",
      DISPONIVEL_CASA: "Disponível casa",
      EM_FACCAO: "Em facção / aguardando chegada",
      EM_CELULA: "Em célula",
      RELATORIO_CELULAS: "Relatório células",
      FINALIZADO_BIPADO: "Finalizado / bipado",
      CANCELADA: "Cancelada"
    };
    return labels[local] || local || "";
  }

  function avisar(mensagem) {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = mensagem;
      toast.classList.remove("hidden");
      clearTimeout(window.__corponuAjusteLocal236Toast);
      window.__corponuAjusteLocal236Toast = setTimeout(() => toast.classList.add("hidden"), 4500);
      return;
    }
    console.info(`[CorpoNu] ${mensagem}`);
  }

  function botaoSalvar(form) {
    return form?.querySelector('button[type="submit"]') || null;
  }

  function setSalvando(form, ativo) {
    const botao = botaoSalvar(form);
    if (!botao) return;
    if (ativo) {
      botao.dataset.textoOriginal236 = botao.textContent || "Salvar correção";
      botao.textContent = "Salvando...";
      botao.disabled = true;
    } else {
      botao.textContent = botao.dataset.textoOriginal236 || "Salvar correção";
      delete botao.dataset.textoOriginal236;
      botao.disabled = false;
    }
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = (async () => {
      const [appModule, authModule, firestore] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
      ]);
      const app = appModule.getApps()[0];
      if (!app) throw new Error("Firebase ainda não foi inicializado.");
      return {
        auth: authModule.getAuth(app),
        db: firestore.getFirestore(app),
        firestore
      };
    })().catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function obterDocumentoRapido(ref, firestore) {
    try {
      const cache = await firestore.getDocFromCache(ref);
      if (cache.exists()) return cache;
    } catch (_) {}
    return firestore.getDoc(ref);
  }

  async function salvarAjusteCalcinhaRapido(form) {
    const ordemId = texto(document.getElementById("ajusteMigracaoOpId")?.value);
    const local = textoMaiusculo(document.getElementById("ajusteMigracaoLocal")?.value);
    const destino = textoMaiusculo(document.getElementById("ajusteMigracaoDestino")?.value);
    const processo = textoMaiusculo(document.getElementById("ajusteMigracaoProcesso")?.value);
    const dataEnvio = texto(document.getElementById("ajusteMigracaoDataEnvio")?.value);
    const dataChegada = texto(document.getElementById("ajusteMigracaoDataChegada")?.value);
    const proximoDestino = textoMaiusculo(document.getElementById("ajusteMigracaoProximoDestino")?.value);
    const motivo = texto(document.getElementById("ajusteMigracaoMotivo")?.value);

    if (!ordemId) throw new Error("OP não encontrada.");
    if (!motivo) {
      avisar("Informe o motivo da correção.");
      document.getElementById("ajusteMigracaoMotivo")?.focus?.();
      return false;
    }

    const { auth, db, firestore } = await firebase();
    const user = auth.currentUser;
    if (!user) throw new Error("Sua sessão expirou. Entre novamente.");

    const ordemRef = firestore.doc(db, "ordensProducao", ordemId);
    const ordemSnap = await obterDocumentoRapido(ordemRef, firestore);
    if (!ordemSnap.exists()) throw new Error("OP não encontrada no servidor.");
    const ordem = { id: ordemSnap.id, ...ordemSnap.data() };

    const ocultarDoManejo = ["RELATORIO_CELULAS", "FINALIZADO_BIPADO", "CANCELADA"].includes(local);
    const patch = {
      statusMigracaoLigia: local,
      localAtualMigracao: local,
      destinoAtualMigracao: destino,
      processoAtualMigracao: processo,
      dataEnvioAtualMigracao: dataEnvio,
      dataChegadaAtualMigracao: dataChegada,
      proximoDestinoMigracao: proximoDestino,
      ocultarDoManejo,
      ajusteManualMigracao: true,
      ultimoMotivoAjusteMigracao: motivo,
      relatorioMigracao: ocultarDoManejo ? labelLocal(local) : "",
      atualizadoPor: user.uid,
      atualizadoEm: firestore.serverTimestamp()
    };

    if (!ocultarDoManejo) {
      const manejoExistente = ordem?.manejosSetores?.calcinha || {};
      const faseCorrigida = processo || (
        local === "DISPONIVEL_CASA" ? "DISPONÍVEL P CASA" :
        local === "EM_FACCAO" ? "AGUARDANDO CHEGADA FACÇÃO" :
        local === "EM_CELULA" ? "PRODUÇÃO / CÉLULA" :
        "AGUARDANDO DESTINO"
      );

      const manejoCorrigido = {
        ...manejoExistente,
        fase: faseCorrigida,
        data: dataEnvio || manejoExistente.data || "",
        chegada: dataChegada || manejoExistente.chegada || "",
        faccao: local === "EM_FACCAO" ? destino : (manejoExistente.faccao || ""),
        celu: local === "EM_CELULA" ? destino : (manejoExistente.celu || ""),
        proximoDestino,
        processoAtualMigracao: processo,
        statusMigracao: local,
        observacoes: [manejoExistente.observacoes || "", `Ajustado manualmente: ${motivo}`].filter(Boolean).join(" | ")
      };

      patch.manejosSetores = { calcinha: manejoCorrigido };
      patch.manejoStatusSetores = { calcinha: "organizada" };
    }

    const ajusteRef = firestore.doc(firestore.collection(db, "ajustesMigracao"));
    const logRef = firestore.doc(firestore.collection(db, "logsAlteracoes"));
    const batch = firestore.writeBatch(db);

    batch.set(ordemRef, patch, { merge: true });
    batch.set(ajusteRef, {
      opId: ordemId,
      numeroOP: ordem.numeroOP || "",
      referencia: ordem.referencia || "",
      antes: {
        statusMigracaoLigia: ordem.statusMigracaoLigia || "",
        localAtualMigracao: ordem.localAtualMigracao || "",
        destinoAtualMigracao: ordem.destinoAtualMigracao || "",
        processoAtualMigracao: ordem.processoAtualMigracao || ""
      },
      depois: patch,
      motivo,
      criadoPor: user.uid,
      criadoEm: firestore.serverTimestamp()
    });

    if (["EM_FACCAO", "EM_CELULA"].includes(local) && destino) {
      const tipoDestino = local === "EM_CELULA" ? "celula" : "faccao";
      const movRef = firestore.doc(firestore.collection(db, "movimentacoesProducao"));
      batch.set(movRef, {
        origem: "ajuste_migracao",
        ajusteMigracaoId: ajusteRef.id,
        opId: ordemId,
        numeroOP: ordem.numeroOP || "",
        referencia: ordem.referencia || "",
        cor: ordem.cor || "",
        produtoNome: ordem.produtoNome || "",
        tipoDestino,
        tipoDestinoLabel: tipoDestino === "faccao" ? "Facção" : "Célula",
        destino,
        destinoId: idSeguro(destino),
        processo: tipoDestino === "celula" ? "CÉLULA INTERNA" : (processo || "PROCESSO A DEFINIR"),
        setor: "calcinha",
        setorLabel: "Calcinha",
        quantidadeEnviada: Number(ordem.quantidade || 0),
        dataEnvio,
        dataChegada,
        falta: 0,
        quantidadeRecebida: dataChegada ? Number(ordem.quantidade || 0) : 0,
        status: dataChegada ? "retornou" : "em_andamento",
        observacoes: `Criado por ajuste manual de migração. Motivo: ${motivo}`,
        criadoPor: user.uid,
        criadoEm: firestore.serverTimestamp(),
        atualizadoPor: user.uid,
        atualizadoEm: firestore.serverTimestamp()
      }, { merge: true });
    }

    // O log entra no MESMO lote: uma única confirmação de rede para concluir tudo.
    batch.set(logRef, {
      acao: "ajuste_migracao_op",
      tipoAlvo: "ordensProducao",
      alvoId: ordemId,
      detalhes: `OP ${ordem.numeroOP || ordemId} | ${local} | ${destino || "sem destino"} | ${motivo}`,
      usuarioUid: user.uid,
      usuarioNome: user.displayName || "",
      usuarioEmail: user.email || "",
      usuarioTipo: "admin",
      criadoEm: firestore.serverTimestamp()
    });

    await batch.commit();

    // Não força Rastreamento nem reconstrói o Manejo aqui. Os listeners já recebem
    // o snapshot autoritativo do batch e atualizam a tela sem uma segunda espera.
    document.getElementById("modalAjusteMigracao")?.classList.add("hidden");
    form.reset();
    avisar("Correção salva com histórico.");
    return true;
  }

  document.addEventListener("submit", async event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "formAjusteMigracao" || !calcinhaAtiva()) return;

    // Captura o submit antes do handler legado do app.js para evitar duas gravações.
    event.preventDefault();
    event.stopImmediatePropagation();
    if (salvando) return;

    salvando = true;
    setSalvando(form, true);
    try {
      await salvarAjusteCalcinhaRapido(form);
    } catch (error) {
      console.error("[Calcinha 236] Erro ao salvar ajuste local.", error);
      avisar(error?.message ? `Erro ao salvar: ${error.message}` : "Erro ao salvar ajuste de local.");
    } finally {
      salvando = false;
      setSalvando(form, false);
    }
  }, true);

  console.info(`[CorpoNu] Ajuste de local rápido do Manejo Calcinha ativo: ${VERSION}`);
})();
