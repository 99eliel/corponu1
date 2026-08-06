(() => {
  "use strict";

  const VERSION = "2026-08-06-chegada-usuario-guard-131";
  const FIREBASE_VERSION = "10.12.5";

  if (window.__CORPONU_CHEGADA_USUARIO_GUARD__ === VERSION) return;
  window.__CORPONU_CHEGADA_USUARIO_GUARD__ = VERSION;

  const state = {
    firebase: null,
    auth: null,
    db: null,
    user: null,
    perfil: null,
    avisos: new Map(),
    observer: null,
    aplicando: false,
    timer: 0
  };

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const ehAdmin = () => normalizar(state.perfil?.tipo) === "ADMIN";

  const hojeISO = () => {
    const agora = new Date();
    return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  };

  function toast(mensagem, erro = false) {
    const principal = document.getElementById("toast");
    if (principal) {
      principal.textContent = mensagem;
      principal.classList.remove("hidden");
      principal.style.background = erro ? "#991b1b" : "#166534";
      clearTimeout(window.__corponuChegadaGuardToast131);
      window.__corponuChegadaGuardToast131 = setTimeout(() => {
        principal.classList.add("hidden");
        principal.style.background = "";
      }, 6000);
      return;
    }

    let elemento = document.getElementById("corponuChegadaGuardToast131");
    if (!elemento) {
      elemento = document.createElement("div");
      elemento.id = "corponuChegadaGuardToast131";
      elemento.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:100200;max-width:430px;padding:13px 15px;border-radius:13px;color:#fff;font:800 13px/1.45 Arial;box-shadow:0 18px 42px #0f172a44";
      document.body.appendChild(elemento);
    }
    elemento.style.background = erro ? "#991b1b" : "#166534";
    elemento.textContent = mensagem;
    clearTimeout(elemento._timer);
    elemento._timer = setTimeout(() => elemento.remove(), 6000);
  }

  async function carregarFirebase() {
    if (state.firebase) return state.firebase;
    const [appModulo, authModulo, firestoreModulo] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]);
    const app = appModulo.getApps()[0] || appModulo.getApp();
    state.auth = authModulo.getAuth(app);
    state.db = firestoreModulo.getFirestore(app);
    state.firebase = { ...appModulo, ...authModulo, ...firestoreModulo };
    return state.firebase;
  }

  async function carregarPerfil() {
    state.user = state.auth?.currentUser || null;
    if (!state.user) return null;
    const referencia = state.firebase.doc(state.db, "usuarios", state.user.uid);
    const snapshot = await state.firebase.getDoc(referencia);
    state.perfil = snapshot.exists() ? snapshot.data() : {};
    document.body.dataset.corponuChegadaPerfil131 = ehAdmin() ? "admin" : "usuario";
    return state.perfil;
  }

  async function carregarAvisos() {
    if (!state.user) return;
    try {
      const consulta = state.firebase.query(
        state.firebase.collection(state.db, "movimentacoesProducao"),
        state.firebase.where("chegadaInformada", "==", true)
      );
      const snapshot = await state.firebase.getDocs(consulta);
      state.avisos = new Map(snapshot.docs.map(documento => [
        documento.id,
        { id: documento.id, ...documento.data() }
      ]));
    } catch (error) {
      console.warn("[Chegada 131] Não foi possível carregar os avisos.", error);
    }
    agendarAplicacao();
  }

  function idDoBotao(botao) {
    if (!(botao instanceof Element)) return "";
    const dataset = botao.dataset || {};
    const direto = dataset.avisarChegada || dataset.avisarChegada131 || dataset.chegadaCorte || "";
    if (direto) return String(direto);

    const onclick = String(botao.getAttribute("onclick") || "");
    const correspondencia = onclick.match(/registrarChegadaMovimentacao\(\s*['\"]([^'\"]+)['\"]/i);
    return correspondencia?.[1] || "";
  }

  function botaoDeChegadaAntigo(alvo) {
    if (!(alvo instanceof Element)) return null;
    return alvo.closest(
      '[data-avisar-chegada], [data-avisar-chegada-131], [data-chegada-corte], [onclick*="registrarChegadaMovimentacao"]'
    );
  }

  function dataHoraBR(valor) {
    if (!valor) return "";
    if (typeof valor?.toDate === "function") return valor.toDate().toLocaleString("pt-BR");
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) {
      return String(valor).split("-").reverse().join("/");
    }
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? "" : data.toLocaleString("pt-BR");
  }

  function inserirBadge(botao, aviso) {
    if (!botao || !aviso) return;
    const celula = botao.closest("td") || botao.parentElement;
    if (!celula) return;
    let badge = celula.querySelector(`[data-chegada-aviso-131="${CSS.escape(String(aviso.id))}"]`);
    if (!badge) {
      badge = document.createElement("span");
      badge.dataset.chegadaAviso131 = String(aviso.id);
      badge.style.cssText = "display:inline-flex;margin:3px 5px 3px 0;padding:5px 8px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:900;white-space:normal";
      celula.prepend(badge);
    }
    const quando = dataHoraBR(aviso.chegadaInformadaEm || aviso.chegadaInformadaData);
    badge.textContent = `Chegada avisada por ${aviso.chegadaInformadaPorNome || "usuário"}${quando ? ` • ${quando}` : ""}`;
  }

  function fecharModalFinanceiroUsuario() {
    if (ehAdmin()) return;
    const modal = document.getElementById("modalChegadaMovimentacao");
    if (modal && !modal.classList.contains("hidden")) {
      modal.classList.add("hidden");
      document.getElementById("formChegadaMovimentacao")?.reset();
      toast("Usuário comum deve usar “Avisar que chegou”. A confirmação financeira é exclusiva do administrador.", true);
    }

    const modalCorte = document.getElementById("modalChegadaCorte");
    if (modalCorte && !modalCorte.classList.contains("hidden")) {
      modalCorte.classList.add("hidden");
      document.getElementById("formChegadaCorte")?.reset();
      toast("Usuário comum deve usar “Avisar que chegou”. A confirmação financeira é exclusiva do administrador.", true);
    }
  }

  function aplicarInterface() {
    if (!state.user || !state.perfil || state.aplicando) return;
    state.aplicando = true;
    try {
      document.querySelectorAll(
        '[data-avisar-chegada], [data-avisar-chegada-131], [data-chegada-corte], [onclick*="registrarChegadaMovimentacao"]'
      ).forEach(botao => {
        const id = idDoBotao(botao);
        if (!id) return;
        const aviso = state.avisos.get(String(id));

        if (ehAdmin()) {
          if (botao.dataset.chegadaCorte) {
            botao.textContent = "Confirmar chegada";
          } else {
            botao.textContent = "Confirmar chegada";
            botao.title = "Confirma oficialmente a chegada e gera o pagamento";
          }
          return;
        }

        botao.removeAttribute("onclick");
        botao.dataset.avisarChegada = String(id);
        botao.dataset.avisarChegada131 = String(id);
        botao.textContent = aviso ? "Aviso enviado" : "Avisar que chegou";
        botao.title = "Registra somente o retorno operacional, sem gerar pagamento";
        botao.disabled = Boolean(aviso);
        if (aviso) inserirBadge(botao, aviso);
      });

      const chegadaManual = document.getElementById("btnAbrirChegadaManualFaccao");
      if (chegadaManual) chegadaManual.style.display = ehAdmin() ? "" : "none";

      const chegadaTopoCorte = document.getElementById("btnCorteRegistrarChegada");
      if (chegadaTopoCorte) {
        chegadaTopoCorte.style.display = ehAdmin() ? "" : "none";
        if (ehAdmin()) chegadaTopoCorte.textContent = "Confirmar chegada";
      }

      fecharModalFinanceiroUsuario();
    } finally {
      state.aplicando = false;
    }
  }

  function agendarAplicacao() {
    clearTimeout(state.timer);
    state.timer = setTimeout(aplicarInterface, 20);
  }

  async function registrarLog(movimentacao, id) {
    try {
      await state.firebase.addDoc(
        state.firebase.collection(state.db, "logsAlteracoes"),
        {
          acao: "chegada_faccao_informada",
          tipoAlvo: "movimentacaoProducao",
          alvoId: String(id),
          detalhes: `OP ${movimentacao.numeroOP || "-"} | ${movimentacao.destino || "-"} | ${movimentacao.processo || "-"} | sem pagamento`,
          usuarioUid: state.user.uid,
          usuarioNome: state.perfil?.nome || "",
          usuarioEmail: state.perfil?.email || state.user.email || "",
          usuarioTipo: state.perfil?.tipo || "",
          criadoEm: state.firebase.serverTimestamp()
        }
      );
    } catch (error) {
      console.warn("[Chegada 131] O aviso foi salvo, mas o log não foi gravado.", error);
    }
  }

  async function avisarChegada(id, botao = null) {
    if (!id || ehAdmin()) return;
    try {
      const referencia = state.firebase.doc(state.db, "movimentacoesProducao", String(id));
      const snapshot = await state.firebase.getDoc(referencia);
      if (!snapshot.exists()) {
        toast("Movimentação não encontrada. Atualize a lista e tente novamente.", true);
        return;
      }

      const movimentacao = { id: snapshot.id, ...snapshot.data() };
      if (movimentacao.dataChegada) {
        toast("Essa chegada já foi confirmada pelo administrador.", true);
        return;
      }
      if (movimentacao.chegadaInformada === true) {
        state.avisos.set(String(id), movimentacao);
        agendarAplicacao();
        toast("Essa chegada já foi avisada.");
        return;
      }
      if (["FINALIZADO", "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUÍDO"].includes(normalizar(movimentacao.status))) {
        toast("Essa movimentação não aceita aviso de chegada.", true);
        return;
      }

      const confirmado = window.confirm(
        `Avisar que a OP ${movimentacao.numeroOP || "-"} voltou de ${movimentacao.destino || "facção"}?\n\nNenhum pagamento será gerado.`
      );
      if (!confirmado) return;

      if (botao) {
        botao.disabled = true;
        botao.textContent = "Salvando aviso...";
      }

      const dados = {
        chegadaInformada: true,
        chegadaInformadaStatus: "aguardando_confirmacao_admin",
        chegadaInformadaData: hojeISO(),
        chegadaInformadaEm: state.firebase.serverTimestamp(),
        chegadaInformadaPor: state.user.uid,
        chegadaInformadaPorNome: state.perfil?.nome || state.user.email || "Usuário",
        chegadaInformadaPorEmail: state.perfil?.email || state.user.email || "",
        statusOperacional: "chegada_informada",
        atualizadoPor: state.user.uid,
        atualizadoEm: state.firebase.serverTimestamp(),
        versaoAvisoChegada: VERSION
      };

      await state.firebase.setDoc(referencia, dados, { merge: true });
      const avisoLocal = {
        ...movimentacao,
        ...dados,
        id: String(id),
        chegadaInformadaEm: new Date()
      };
      state.avisos.set(String(id), avisoLocal);
      await registrarLog(movimentacao, id);
      agendarAplicacao();
      toast("Chegada avisada sem gerar pagamento. A OP já pode seguir para reenvio.");
    } catch (error) {
      console.error("[Chegada 131] Não foi possível registrar o aviso.", error);
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Avisar que chegou";
      }
      toast("Não foi possível registrar o aviso de chegada.", true);
    }
  }

  function instalarEventos() {
    if (document.documentElement.dataset.chegadaGuardEventos131 === VERSION) return;
    document.documentElement.dataset.chegadaGuardEventos131 = VERSION;

    document.addEventListener("click", event => {
      if (ehAdmin()) return;
      const botao = botaoDeChegadaAntigo(event.target);
      if (!botao) return;
      const id = idDoBotao(botao);
      if (!id) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      fecharModalFinanceiroUsuario();
      avisarChegada(id, botao);
    }, true);

    document.addEventListener("submit", event => {
      if (ehAdmin()) return;
      const idFormulario = event.target?.id || "";
      if (!["formChegadaMovimentacao", "formChegadaCorte", "formChegadaManualFaccao"].includes(idFormulario)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      fecharModalFinanceiroUsuario();
      toast("Somente o administrador pode confirmar chegada e gerar pagamento.", true);
    }, true);
  }

  async function iniciar() {
    try {
      await carregarFirebase();
      instalarEventos();
      state.firebase.onAuthStateChanged(state.auth, async usuario => {
        state.user = usuario;
        if (!usuario) return;
        await carregarPerfil();
        await carregarAvisos();
        agendarAplicacao();
      });

      state.observer = new MutationObserver(agendarAplicacao);
      state.observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "onclick"]
      });

      [200, 500, 1000, 2000, 4000].forEach(atraso => setTimeout(agendarAplicacao, atraso));
      setInterval(() => {
        if (document.visibilityState === "visible") {
          carregarAvisos().catch(() => {});
          agendarAplicacao();
        }
      }, 30000);
    } catch (error) {
      console.error("[Chegada 131] Falha ao iniciar a proteção.", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
