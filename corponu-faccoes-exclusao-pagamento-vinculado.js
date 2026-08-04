(() => {
  "use strict";

  const VERSION = "2026-08-04-exclusao-faccao-pagamento-vinculado-115";
  const FIREBASE_VERSION = "10.12.5";
  const MODAL_PENDENCIAS_ID = "modalPendenciasValoresFinanceiro";

  if (window.__CORPONU_EXCLUSAO_FACCAO_PAGAMENTO_115__ === VERSION) return;
  window.__CORPONU_EXCLUSAO_FACCAO_PAGAMENTO_115__ = VERSION;

  let firebasePromise = null;
  let perfilPromise = null;
  let excluirOriginal = null;
  let excluindo = false;
  let verificandoOrfaos = false;
  const orfaosJaAvisados = new Set();

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function avisar(mensagem, erro = false) {
    const toast = document.getElementById("toast");
    if (!toast) {
      window.alert(mensagem);
      return;
    }
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = erro ? "#991b1b" : "#166534";
    window.clearTimeout(window.__corponuExcluirFaccao115Toast);
    window.__corponuExcluirFaccao115Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, erro ? 7500 : 5600);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não foi inicializado.");
      const app = appMod.getApp();
      return {
        auth: authMod.getAuth(app),
        db: fs.getFirestore(app),
        fs
      };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function aguardarUsuario(auth) {
    for (let tentativa = 0; tentativa < 35 && !auth.currentUser; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 140));
    }
    return auth.currentUser || null;
  }

  async function obterAcesso(forcar = false) {
    if (forcar) perfilPromise = null;
    if (perfilPromise) return perfilPromise;

    perfilPromise = (async () => {
      const { auth, db, fs } = await firebase();
      const usuario = await aguardarUsuario(auth);
      if (!usuario) return { usuario: null, perfil: null, admin: false };

      const snap = await fs.getDoc(fs.doc(db, "usuarios", usuario.uid));
      const perfil = snap.exists() ? snap.data() : {};
      const tipo = normalizar(perfil.tipo || perfil.perfil || perfil.role || "");
      return {
        usuario,
        perfil,
        admin: perfil.ativo !== false && ["ADMIN", "ADMINISTRADOR"].includes(tipo)
      };
    })().catch(error => {
      perfilPromise = null;
      throw error;
    });

    return perfilPromise;
  }

  function pagamentoPago(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    return item?.pago === true || ["PAGO", "PAGA", "QUITADO", "QUITADA"].includes(status);
  }

  function pagamentoAtivo(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    return item?.cancelado !== true &&
      item?.excluido !== true &&
      !["CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"].includes(status);
  }

  async function buscarPagamentosDaMovimentacao(movimentacaoId) {
    const { db, fs } = await firebase();
    const snap = await fs.getDocs(fs.query(
      fs.collection(db, "entregasPagamento"),
      fs.where("movimentacaoId", "==", movimentacaoId),
      fs.limit(100)
    ));
    return snap.docs.map(docSnap => ({ id: docSnap.id, ref: docSnap.ref, ...docSnap.data() }));
  }

  function atualizarTelas() {
    window.setTimeout(() => {
      try {
        const atualizar = document.getElementById("btnAtualizarServidor");
        if (atualizar instanceof HTMLButtonElement) atualizar.click();
        else if (typeof window.renderPagamentos === "function") window.renderPagamentos();
      } catch (error) {
        console.warn("A exclusão foi concluída, mas a tela não atualizou automaticamente.", error);
      }
    }, 180);
  }

  async function registrarExclusaoEmLote({ fs, db, acesso, movRef, mov, pagamentos }) {
    const op = texto(mov?.numeroOP || "-");
    const faccao = texto(mov?.destino || mov?.faccao || "-");
    const processo = texto(mov?.processo || "-");
    const batch = fs.writeBatch(db);

    pagamentos.forEach(item => batch.delete(item.ref));
    batch.delete(movRef);

    const logRef = fs.doc(fs.collection(db, "logsAlteracoes"));
    batch.set(logRef, {
      acao: "movimentacao_faccao_excluida_com_pagamento",
      entidade: "movimentacaoProducao",
      entidadeId: movRef.id,
      tipoAlvo: "movimentacaoProducao",
      alvoId: movRef.id,
      detalhes: `OP ${op} | ${processo} | ${faccao} | ${pagamentos.length} pagamento(s) pendente(s) vinculado(s) removido(s)`,
      usuarioId: acesso.usuario.uid,
      usuarioUid: acesso.usuario.uid,
      usuarioNome: acesso.perfil?.nome || acesso.usuario.displayName || "",
      usuarioEmail: acesso.perfil?.email || acesso.usuario.email || "",
      usuarioTipo: acesso.perfil?.tipo || "admin",
      criadoPor: acesso.usuario.uid,
      criadoEm: fs.serverTimestamp(),
      versao: VERSION
    });

    await batch.commit();
  }

  async function excluirMovimentacaoComPagamento(id) {
    if (excluindo) return;
    const movimentacaoId = texto(id);
    if (!movimentacaoId) return;

    try {
      const acesso = await obterAcesso();
      if (!acesso.admin || !acesso.usuario) {
        avisar("Somente o administrador pode excluir movimentações de facção.", true);
        return;
      }

      const { db, fs } = await firebase();
      const movRef = fs.doc(db, "movimentacoesProducao", movimentacaoId);
      const movSnap = await fs.getDoc(movRef);

      if (!movSnap.exists()) {
        avisar("Essa movimentação já não existe. Abra as pendências financeiras para remover o pagamento órfão vinculado.", true);
        return;
      }

      const mov = { id: movSnap.id, ...movSnap.data() };
      if (normalizar(mov.tipoDestino) !== "FACCAO") {
        if (typeof excluirOriginal === "function") return excluirOriginal.call(window, movimentacaoId);
        avisar("A rotina original de exclusão não está disponível. Atualize a página e tente novamente.", true);
        return;
      }

      const pagamentosEncontrados = await buscarPagamentosDaMovimentacao(movimentacaoId);
      const pagamentosAtivos = pagamentosEncontrados.filter(pagamentoAtivo);
      const pagos = pagamentosAtivos.filter(pagamentoPago);

      if (pagos.length) {
        avisar("Não é possível excluir: existe pagamento desta movimentação já marcado como pago.", true);
        return;
      }

      const pagamentosPendentes = pagamentosAtivos.filter(item => !pagamentoPago(item));
      const op = texto(mov.numeroOP || "-");
      const faccao = texto(mov.destino || mov.faccao || "-");
      const processo = texto(mov.processo || "-");
      const complemento = pagamentosPendentes.length
        ? `\nTambém será removido ${pagamentosPendentes.length === 1 ? "o pagamento pendente vinculado" : `${pagamentosPendentes.length} pagamentos pendentes vinculados`}.`
        : "\nNenhum pagamento pendente vinculado foi encontrado.";

      const confirmar = window.confirm(
        `Excluir esta movimentação de facção?\n\nOP: ${op}\nProcesso: ${processo}\nFacção: ${faccao}${complemento}\n\nEssa ação não poderá ser desfeita.`
      );
      if (!confirmar) return;

      excluindo = true;
      await registrarExclusaoEmLote({
        fs,
        db,
        acesso,
        movRef,
        mov,
        pagamentos: pagamentosPendentes
      });

      avisar("Movimentação de facção e pagamento pendente vinculados foram excluídos.");
      atualizarTelas();
    } catch (error) {
      console.error("Não foi possível excluir a movimentação e o pagamento vinculado.", error);
      const permissao = String(error?.code || "").includes("permission-denied");
      avisar(
        permissao
          ? "Seu usuário não possui permissão para concluir esta exclusão."
          : "Não foi possível excluir. Confira a conexão e tente novamente.",
        true
      );
    } finally {
      excluindo = false;
    }
  }

  function idsPendentesVisiveis() {
    const modal = document.getElementById(MODAL_PENDENCIAS_ID);
    if (!modal) return [];

    const ids = new Set();
    modal.querySelectorAll('[data-acao-pendencia][data-id]').forEach(elemento => {
      const id = texto(elemento.getAttribute("data-id"));
      if (id) ids.add(id);
    });
    modal.querySelectorAll('[id^="valorPendencia-"]').forEach(elemento => {
      const id = texto(elemento.id).replace(/^valorPendencia-/, "");
      if (id) ids.add(id);
    });
    return [...ids];
  }

  async function verificarPagamentosOrfaosVisiveis() {
    if (verificandoOrfaos) return;
    const ids = idsPendentesVisiveis();
    if (!ids.length) return;

    verificandoOrfaos = true;
    try {
      const acesso = await obterAcesso();
      if (!acesso.admin || !acesso.usuario) return;

      const { db, fs } = await firebase();
      const pagamentos = [];

      for (let inicio = 0; inicio < ids.length; inicio += 20) {
        const bloco = ids.slice(inicio, inicio + 20);
        const snaps = await Promise.all(
          bloco.map(id => fs.getDoc(fs.doc(db, "entregasPagamento", id)))
        );
        snaps.forEach(snap => {
          if (snap.exists()) pagamentos.push({ id: snap.id, ref: snap.ref, ...snap.data() });
        });
      }

      const candidatos = pagamentos.filter(item =>
        pagamentoAtivo(item) &&
        !pagamentoPago(item) &&
        texto(item.movimentacaoId)
      );
      if (!candidatos.length) return;

      const movimentos = new Map();
      const idsMovimentos = [...new Set(candidatos.map(item => texto(item.movimentacaoId)))];
      for (let inicio = 0; inicio < idsMovimentos.length; inicio += 20) {
        const bloco = idsMovimentos.slice(inicio, inicio + 20);
        const snaps = await Promise.all(
          bloco.map(id => fs.getDoc(fs.doc(db, "movimentacoesProducao", id)))
        );
        snaps.forEach((snap, indice) => movimentos.set(bloco[indice], snap.exists()));
      }

      const orfaos = candidatos.filter(item => movimentos.get(texto(item.movimentacaoId)) === false);
      if (!orfaos.length) return;

      const chaveAviso = orfaos.map(item => item.id).sort().join("|");
      if (orfaosJaAvisados.has(chaveAviso)) return;
      orfaosJaAvisados.add(chaveAviso);

      const ops = [...new Set(orfaos.map(item => texto(item.numeroOP || item.op || "-")).filter(Boolean))];
      const confirmar = window.confirm(
        `${orfaos.length} pagamento(s) pendente(s) estão vinculados a movimentações que já foram excluídas.\n\n` +
        `OPs: ${ops.slice(0, 12).join(", ")}${ops.length > 12 ? "..." : ""}\n\n` +
        "Deseja remover agora somente esses pagamentos órfãos? Pagamentos já pagos não entram nesta limpeza."
      );
      if (!confirmar) return;

      const batch = fs.writeBatch(db);
      orfaos.forEach(item => batch.delete(item.ref));
      const logRef = fs.doc(fs.collection(db, "logsAlteracoes"));
      batch.set(logRef, {
        acao: "pagamentos_orfaos_movimentacao_excluida_removidos",
        entidade: "entregasPagamento",
        entidadeId: orfaos.map(item => item.id).join(",").slice(0, 900),
        tipoAlvo: "entregasPagamento",
        alvoId: orfaos[0]?.id || "",
        detalhes: `${orfaos.length} pagamento(s) pendente(s) órfão(s) removido(s) | OPs: ${ops.join(", ").slice(0, 900)}`,
        usuarioId: acesso.usuario.uid,
        usuarioUid: acesso.usuario.uid,
        usuarioNome: acesso.perfil?.nome || acesso.usuario.displayName || "",
        usuarioEmail: acesso.perfil?.email || acesso.usuario.email || "",
        usuarioTipo: acesso.perfil?.tipo || "admin",
        criadoPor: acesso.usuario.uid,
        criadoEm: fs.serverTimestamp(),
        versao: VERSION
      });
      await batch.commit();

      avisar(`${orfaos.length} pagamento(s) órfão(s) foram removidos com segurança.`);
      window.setTimeout(() => {
        const modal = document.getElementById(MODAL_PENDENCIAS_ID);
        const atualizar = [...(modal?.querySelectorAll("button") || [])].find(botao =>
          normalizar(botao.textContent).includes("ATUALIZAR LISTA")
        );
        if (atualizar instanceof HTMLButtonElement) atualizar.click();
        atualizarTelas();
      }, 180);
    } catch (error) {
      console.error("Não foi possível conferir pagamentos órfãos.", error);
      avisar("Não foi possível conferir os pagamentos órfãos agora. Nenhum dado foi alterado.", true);
    } finally {
      verificandoOrfaos = false;
    }
  }

  function instalarSubstituicao() {
    const atual = window.excluirMovimentacao;
    if (typeof atual !== "function") return false;
    if (atual.__corponuPagamentoVinculado115 === true) return true;

    excluirOriginal = atual;
    const substituta = function(id) {
      return excluirMovimentacaoComPagamento(id);
    };
    substituta.__corponuPagamentoVinculado115 = true;
    window.excluirMovimentacao = substituta;
    return true;
  }

  function instalarEventos() {
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target.closest("button, a") : null;
      if (!alvo) return;

      if (alvo.id === "btnAtualizarConferenciaPagamentoFinal") {
        window.setTimeout(verificarPagamentosOrfaosVisiveis, 900);
        window.setTimeout(verificarPagamentosOrfaosVisiveis, 1600);
        return;
      }

      const modal = alvo.closest(`#${MODAL_PENDENCIAS_ID}`);
      if (modal && normalizar(alvo.textContent).includes("ATUALIZAR LISTA")) {
        window.setTimeout(verificarPagamentosOrfaosVisiveis, 750);
      }
    }, true);
  }

  function iniciar() {
    instalarEventos();
    let tentativas = 0;
    const timer = window.setInterval(() => {
      tentativas += 1;
      const instalado = instalarSubstituicao();
      if (instalado || tentativas >= 80) window.clearInterval(timer);
    }, 200);

    window.addEventListener("pageshow", instalarSubstituicao);
    window.addEventListener("focus", instalarSubstituicao);
  }

  window.CorpoNuExclusaoFaccaoPagamento = {
    versao: VERSION,
    verificarOrfaos: verificarPagamentosOrfaosVisiveis
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
