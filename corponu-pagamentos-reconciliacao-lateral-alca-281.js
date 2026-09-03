(() => {
  "use strict";

  const VERSION = "2026-09-03-alca-cortagem-montagem-x2-281";
  const FB = "10.12.5";
  const VALOR_BASE = 0.0540;
  const MULTIPLICADOR = 2;
  const VALOR_CORRETO = 0.1080;
  const PROCESSOS = ["CORTAGEM E MONTAGEM", "CORTAGEM MONTAGEM", "CORTE E MONTAGEM"];

  if (window.__CORPONU_RECONCILIACAO_LATERAL_ALCA_281__ === VERSION) return;
  window.__CORPONU_RECONCILIACAO_LATERAL_ALCA_281__ = VERSION;

  let contextoPromise = null;
  let executando = false;

  const norm = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  const num = (valor, fallback = 0) => {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : fallback;
    const texto = String(valor ?? "").trim();
    if (!texto) return fallback;
    const parsed = Number(texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const arred2 = valor => Math.round((num(valor) + Number.EPSILON) * 100) / 100;
  const arred4 = valor => Math.round((num(valor) + Number.EPSILON) * 10000) / 10000;

  function toast(mensagem) {
    const alvo = document.getElementById("toast");
    if (!alvo) {
      console.info(mensagem);
      return;
    }
    alvo.textContent = mensagem;
    alvo.classList.remove("hidden");
    clearTimeout(window.__reconciliacaoLA281Toast);
    window.__reconciliacaoLA281Toast = setTimeout(() => alvo.classList.add("hidden"), 6500);
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      return { auth: authMod.getAuth(app), db: fs.getFirestore(app), onAuth: authMod.onAuthStateChanged, fs };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  async function aguardarUsuario() {
    const c = await contexto();
    if (c.auth.currentUser) return c.auth.currentUser;
    return new Promise((resolve, reject) => {
      const unsubscribe = c.onAuth(c.auth, atual => {
        if (!atual) return;
        unsubscribe();
        resolve(atual);
      }, reject);
    });
  }

  async function carregarPerfil(usuario) {
    const c = await contexto();
    const snap = await c.fs.getDoc(c.fs.doc(c.db, "usuarios", usuario.uid));
    return snap.exists() ? snap.data() : {};
  }

  function pagamentoAlvo(item) {
    if (!item || item.cancelado === true || norm(item.statusPagamento) === "CANCELADO") return false;
    if (!PROCESSOS.includes(norm(item.processo))) return false;
    if (Math.abs(arred4(item.valorUnitario) - VALOR_BASE) > 0.00001) return false;
    if (item.correcaoCortagemMontagemX2 === true) return false;

    const fonte = norm(item.fonteValor);
    const origemFluxo = norm(item.origemFluxo);
    const fluxo = norm(item.fluxoFaccoes);
    return fonte === "FIXO_CORTAGEM_MONTAGEM" ||
      origemFluxo === "FACCOES_LATERAL_ALCA_V2" ||
      fluxo === "LATERAL_ALCA";
  }

  async function reconciliar() {
    if (executando) return { corrigidos: 0, ignorados: 0, executando: true };
    executando = true;
    try {
      const c = await contexto();
      const usuario = await aguardarUsuario();
      const perfil = await carregarPerfil(usuario);
      if (norm(perfil?.tipo) !== "ADMIN" || perfil?.ativo === false) {
        return { corrigidos: 0, ignorados: 0, admin: false };
      }

      const chaveSessao = `corponu_reconciliacao_cortagem_montagem_x2_281_${usuario.uid}`;
      if (sessionStorage.getItem(chaveSessao) === "ok") {
        return { corrigidos: 0, ignorados: 0, sessaoConcluida: true };
      }

      const consulta = c.fs.query(
        c.fs.collection(c.db, "entregasPagamento"),
        c.fs.where("processo", "in", PROCESSOS)
      );
      const snap = await c.fs.getDocs(consulta);
      const candidatos = snap.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .filter(pagamentoAlvo);

      let corrigidos = 0;
      let ignorados = 0;
      for (let inicio = 0; inicio < candidatos.length; inicio += 200) {
        const lote = candidatos.slice(inicio, inicio + 200);
        const batch = c.fs.writeBatch(c.db);
        let operacoes = 0;

        lote.forEach(item => {
          const quantidade = Math.max(0, num(item.quantidade ?? item.quantidadeRecebida ?? item.qtd));
          if (quantidade <= 0) {
            ignorados += 1;
            return;
          }

          const descontoDefeito = Math.max(0, num(item.descontoDefeito ?? item.defeito));
          const subtotal = arred2(quantidade * VALOR_CORRETO);
          const total = arred2(Math.max(subtotal - descontoDefeito, 0));
          const pago = norm(item.statusPagamento) === "PAGO";
          const agora = c.fs.serverTimestamp();

          batch.set(c.fs.doc(c.db, "entregasPagamento", item.id), {
            valorUnitarioAntesCorrecao: arred4(item.valorUnitario),
            subtotalAntesCorrecao: arred2(item.subtotal ?? (quantidade * VALOR_BASE)),
            totalAntesCorrecao: arred2(item.total),
            valorBaseUnitario: VALOR_BASE,
            multiplicadorValor: MULTIPLICADOR,
            regraValor: "2_alcas_por_peca",
            valorUnitario: VALOR_CORRETO,
            subtotal,
            total,
            fonteValor: "fixo_cortagem_montagem-x2",
            correcaoCortagemMontagemX2: true,
            correcaoCortagemMontagemVersao: VERSION,
            correcaoCortagemMontagemMotivo: "Valor de R$ 0,0540 é por alça; processo usa 2 alças por peça.",
            correcaoAposPagamento: pago,
            corrigidoPor: usuario.uid,
            corrigidoEm: agora,
            atualizadoPor: usuario.uid,
            atualizadoEm: agora
          }, { merge: true });
          operacoes += 1;

          const logRef = c.fs.doc(c.fs.collection(c.db, "logsAlteracoes"));
          batch.set(logRef, {
            acao: "pagamento_cortagem_montagem_corrigido_x2",
            entidade: "entregaPagamento",
            entidadeId: item.id,
            tipoAlvo: "entregaPagamento",
            alvoId: item.id,
            detalhes: `OP ${item.numeroOP || "-"} | CORTAGEM E MONTAGEM | unitário 0,0540 -> 0,1080 | total ${arred2(item.total)} -> ${total}`,
            usuarioId: usuario.uid,
            usuarioUid: usuario.uid,
            usuarioEmail: usuario.email || "",
            criadoPor: usuario.uid,
            criadoEm: agora,
            versao: VERSION
          });
          operacoes += 1;
          corrigidos += 1;
        });

        if (operacoes) await batch.commit();
      }

      sessionStorage.setItem(chaveSessao, "ok");
      window.dispatchEvent(new CustomEvent("corponu:pagamentos-reconciliados", {
        detail: { versao: VERSION, corrigidos, ignorados }
      }));
      if (corrigidos) toast(`${corrigidos} pagamento(s) de Cortagem e montagem corrigido(s) para R$ 0,1080 por peça.`);
      return { corrigidos, ignorados, admin: true };
    } catch (error) {
      console.error("Falha ao reconciliar pagamentos de Cortagem e montagem.", error);
      throw error;
    } finally {
      executando = false;
    }
  }

  function iniciar() {
    contexto().then(c => {
      c.onAuth(c.auth, atual => {
        if (!atual) return;
        window.setTimeout(() => reconciliar().catch(() => {}), 250);
      });
    }).catch(error => console.warn("Reconciliação de Lateral e Alça aguardando Firebase.", error));
  }

  window.CorpoNuPagamentosReconciliacaoLateralAlca = Object.freeze({
    versao: VERSION,
    reconciliar,
    valorBase: VALOR_BASE,
    multiplicador: MULTIPLICADOR,
    valorCorreto: VALOR_CORRETO
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
