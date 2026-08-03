(() => {
  "use strict";

  const VERSION = "2026-08-03-excluir-movimentacao-alca-96";
  const FIREBASE_VERSION = "10.12.5";

  if (window.__CORPONU_LATERAL_ALCA_EXCLUSAO__ === VERSION) return;
  window.__CORPONU_LATERAL_ALCA_EXCLUSAO__ = VERSION;

  let firebasePromise = null;
  let perfilPromise = null;
  let observer = null;
  let aplicando = false;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function avisar(mensagem) {
    const toast = document.getElementById("toast");
    if (!toast) {
      window.alert(mensagem);
      return;
    }
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    window.clearTimeout(window.__corponuExcluirAlca96Toast);
    window.__corponuExcluirAlca96Toast = window.setTimeout(() => toast.classList.add("hidden"), 6500);
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

  async function obterPerfil() {
    if (perfilPromise) return perfilPromise;
    perfilPromise = (async () => {
      const { auth, db, fs } = await firebase();
      const usuario = auth.currentUser;
      if (!usuario) return { usuario: null, perfil: null, admin: false };
      const snap = await fs.getDoc(fs.doc(db, "usuarios", usuario.uid));
      const perfil = snap.exists() ? snap.data() : {};
      const tipo = normalizar(perfil.tipo || perfil.perfil || perfil.role);
      return {
        usuario,
        perfil,
        admin: ["ADMIN", "ADMINISTRADOR"].includes(tipo)
      };
    })().catch(error => {
      perfilPromise = null;
      throw error;
    });
    return perfilPromise;
  }

  function pagamentoPago(item) {
    return item?.pago === true || normalizar(item?.statusPagamento || item?.status) === "PAGO";
  }

  async function buscarPagamentos(movimentacaoId) {
    const { db, fs } = await firebase();
    const snap = await fs.getDocs(fs.query(
      fs.collection(db, "entregasPagamento"),
      fs.where("movimentacaoId", "==", movimentacaoId),
      fs.limit(20)
    ));
    return snap.docs.map(docSnap => ({ id: docSnap.id, ref: docSnap.ref, ...docSnap.data() }));
  }

  async function excluirMovimentacao(id, botao) {
    const acesso = await obterPerfil();
    if (!acesso.admin || !acesso.usuario) {
      avisar("Somente o administrador pode excluir uma movimentação de Alça.");
      return;
    }

    const { db, fs } = await firebase();
    const movRef = fs.doc(db, "movimentacoesProducao", id);
    const movSnap = await fs.getDoc(movRef);
    if (!movSnap.exists()) {
      avisar("Essa movimentação já não existe no sistema.");
      botao.closest("tr")?.remove();
      return;
    }

    const mov = { id: movSnap.id, ...movSnap.data() };
    const processo = normalizar(mov.processo);
    if (!["ALCA", "ALCAS"].includes(processo)) {
      avisar("Esta exclusão foi liberada somente para movimentações de Alça desta integração.");
      return;
    }

    const pagamentos = await buscarPagamentos(id);
    const pagos = pagamentos.filter(pagamentoPago);
    if (pagos.length) {
      avisar("Não é possível excluir: o pagamento desta movimentação já foi marcado como pago.");
      return;
    }

    const op = texto(mov.numeroOP || "-");
    const faccao = texto(mov.destino || mov.faccao || "-");
    const complemento = pagamentos.length
      ? `\nTambém será excluído ${pagamentos.length === 1 ? "o pagamento pendente vinculado" : `${pagamentos.length} pagamentos pendentes vinculados`}.`
      : "\nNenhum pagamento vinculado foi encontrado.";

    const confirmar = window.confirm(
      `Excluir esta movimentação de Alça?\n\nOP: ${op}\nFacção: ${faccao}${complemento}\n\nEssa ação não poderá ser desfeita.`
    );
    if (!confirmar) return;

    botao.disabled = true;
    const textoOriginal = botao.textContent;
    botao.textContent = "Excluindo...";

    try {
      const batch = fs.writeBatch(db);
      pagamentos.forEach(item => batch.delete(item.ref));
      batch.delete(movRef);

      const logRef = fs.doc(fs.collection(db, "logsAlteracoes"));
      batch.set(logRef, {
        acao: "movimentacao_alca_excluida",
        entidade: "movimentacaoProducao",
        entidadeId: id,
        tipoAlvo: "movimentacaoProducao",
        alvoId: id,
        detalhes: `OP ${op} | ALÇA | ${faccao} | ${pagamentos.length} pagamento(s) pendente(s) removido(s)`,
        usuarioId: acesso.usuario.uid,
        usuarioUid: acesso.usuario.uid,
        usuarioEmail: acesso.usuario.email || "",
        criadoPor: acesso.usuario.uid,
        criadoEm: fs.serverTimestamp(),
        versao: VERSION
      });

      await batch.commit();
      botao.closest("tr")?.remove();
      avisar("Movimentação de Alça e pagamento pendente excluídos com sucesso.");

      window.setTimeout(() => document.getElementById("btnCorteAtualizar")?.click(), 100);
      window.setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 450);
    } catch (error) {
      console.error("Não foi possível excluir a movimentação de Alça.", error);
      botao.disabled = false;
      botao.textContent = textoOriginal;
      avisar("Não foi possível excluir. Verifique as permissões do Firebase e tente novamente.");
    }
  }

  async function aplicarBotoes() {
    if (aplicando) return;
    aplicando = true;
    try {
      const acesso = await obterPerfil().catch(() => ({ admin: false }));
      document.querySelectorAll('tr[data-lateral-alca-extra="1"]').forEach(linha => {
        const id = linha.getAttribute("data-movimentacao-id") || "";
        const processo = normalizar(linha.children?.[3]?.textContent || "");
        const container = linha.querySelector(".corte-actions") || linha.lastElementChild;
        const existente = linha.querySelector("[data-excluir-movimentacao-alca]");

        if (!acesso.admin || !id || !["ALCA", "ALCAS"].includes(processo)) {
          existente?.remove();
          return;
        }
        if (existente || !(container instanceof HTMLElement)) return;

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "btn btn-sm btn-danger";
        botao.textContent = "Excluir";
        botao.setAttribute("data-excluir-movimentacao-alca", id);
        container.appendChild(botao);
      });
    } finally {
      aplicando = false;
    }
  }

  function observar() {
    const tbody = document.getElementById("listaFaccoesCorte");
    if (!(tbody instanceof HTMLTableSectionElement)) return;
    if (observer?.__alvo === tbody) return;
    observer?.disconnect();

    observer = new MutationObserver(() => window.setTimeout(aplicarBotoes, 0));
    observer.__alvo = tbody;
    observer.observe(tbody, { childList: true, subtree: true });
    aplicarBotoes();
  }

  function iniciar() {
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      const botao = alvo?.closest("[data-excluir-movimentacao-alca]");
      if (!(botao instanceof HTMLButtonElement)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const id = botao.getAttribute("data-excluir-movimentacao-alca") || "";
      if (id) excluirMovimentacao(id, botao);
    }, true);

    let tentativas = 0;
    const timer = window.setInterval(() => {
      tentativas += 1;
      observar();
      aplicarBotoes();
      if (tentativas >= 60) window.clearInterval(timer);
    }, 250);

    window.addEventListener("focus", aplicarBotoes);
    window.addEventListener("pageshow", aplicarBotoes);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
