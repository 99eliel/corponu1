(() => {
  "use strict";

  const VERSION = "2026-08-31-lateral-alca-processos-271";
  const FB = "10.12.5";
  const AREA = "corte";
  const VALOR_FIXO_CORTAGEM_MONTAGEM = 0.0540;

  if (window.__CORPONU_PROCESSOS_VALORES_LATERAL_ALCA__ === VERSION) return;
  window.__CORPONU_PROCESSOS_VALORES_LATERAL_ALCA__ = VERSION;

  let contextoPromise = null;
  let usuario = null;
  let perfil = null;

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

  const arred4 = valor => Math.round((num(valor) + Number.EPSILON) * 10000) / 10000;
  const slug = valor => norm(valor).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
  const dinheiro4 = valor => `R$ ${num(valor).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
  const ehAdmin = () => norm(perfil?.tipo) === "ADMIN" && perfil?.ativo !== false;

  function toast(mensagem) {
    const principal = document.getElementById("toast");
    if (principal) {
      principal.textContent = mensagem;
      principal.classList.remove("hidden");
      clearTimeout(window.__processosValorLAToast);
      window.__processosValorLAToast = setTimeout(() => principal.classList.add("hidden"), 5000);
      return;
    }
    console.info(mensagem);
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      const app = appMod.getApps()[0] || appMod.getApp();
      return {
        auth: authMod.getAuth(app),
        db: fs.getFirestore(app),
        onAuthStateChanged: authMod.onAuthStateChanged,
        fs
      };
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
      const unsubscribe = c.onAuthStateChanged(c.auth, atual => {
        if (!atual) return;
        unsubscribe();
        resolve(atual);
      }, reject);
    });
  }

  async function carregarPerfil() {
    const c = await contexto();
    usuario = await aguardarUsuario();
    const snap = await c.fs.getDoc(c.fs.doc(c.db, "usuarios", usuario.uid));
    perfil = snap.exists() ? snap.data() : {};
    const painel = document.getElementById("processosValoresLateralAlca");
    painel?.classList.toggle("hidden", !ehAdmin());
    return perfil;
  }

  async function registrarLog(acao, entidadeId, detalhes) {
    try {
      const c = await contexto();
      usuario = usuario || await aguardarUsuario();
      await c.fs.addDoc(c.fs.collection(c.db, "logsAlteracoes"), {
        acao,
        entidade: "precoReferencia",
        entidadeId,
        tipoAlvo: "precoReferencia",
        alvoId: entidadeId,
        detalhes,
        usuarioId: usuario.uid,
        usuarioUid: usuario.uid,
        usuarioEmail: usuario.email || "",
        criadoPor: usuario.uid,
        criadoEm: c.fs.serverTimestamp(),
        versao: VERSION
      });
    } catch (error) {
      console.warn("Log de valores de Lateral e Alça não criado.", error);
    }
  }

  async function carregarValorGlobalAlca() {
    if (!ehAdmin()) return;
    const c = await contexto();
    const snap = await c.fs.getDoc(c.fs.doc(c.db, "precosReferencia", "valor-padrao-alca"));
    const input = document.getElementById("processosValorAlcaValor");
    if (input) input.value = snap.exists() ? (num(snap.data().valor ?? snap.data().valorUnitario ?? snap.data().preco) || "") : "";
  }

  async function salvarValorAlca(event) {
    event.preventDefault();
    if (!ehAdmin()) return;
    const input = document.getElementById("processosValorAlcaValor");
    const valor = arred4(input?.value);
    if (valor <= 0) return toast("Informe um valor válido para Alça.");

    const botao = event.submitter;
    if (botao) botao.disabled = true;
    try {
      const c = await contexto();
      usuario = usuario || await aguardarUsuario();
      await c.fs.setDoc(c.fs.doc(c.db, "precosReferencia", "valor-padrao-alca"), {
        referencia: "PADRAO",
        processo: "ALÇA",
        setor: AREA,
        setorLabel: "Lateral e Alça",
        valor,
        ativo: true,
        atualizadoPor: usuario.uid,
        atualizadoEm: c.fs.serverTimestamp(),
        versaoLateralAlca: VERSION
      }, { merge: true });
      registrarLog("lateral_alca_valor_global_alca", "valor-padrao-alca", `ALÇA ${dinheiro4(valor)} por alça`).catch(() => {});
      toast("Valor global da Alça salvo.");
    } catch (error) {
      console.error(error);
      toast("Erro ao salvar valor da Alça.");
    } finally {
      if (botao) botao.disabled = false;
    }
  }

  async function salvarValorLateral(event) {
    event.preventDefault();
    if (!ehAdmin()) return;
    const referencia = norm(document.getElementById("processosValorLateralRef")?.value || "");
    const valor = arred4(document.getElementById("processosValorLateralValor")?.value);
    if (!referencia || valor <= 0) return toast("Informe referência e valor válidos.");

    const id = `corte-${slug(referencia)}-lateral`;
    const botao = event.submitter;
    if (botao) botao.disabled = true;
    try {
      const c = await contexto();
      usuario = usuario || await aguardarUsuario();
      await c.fs.setDoc(c.fs.doc(c.db, "precosReferencia", id), {
        referencia,
        processo: "LATERAL",
        processoCorteId: "lateral",
        setor: AREA,
        setorLabel: "Lateral e Alça",
        area: AREA,
        areaLabel: "Lateral e Alça",
        valor,
        ativo: true,
        atualizadoPor: usuario.uid,
        atualizadoEm: c.fs.serverTimestamp(),
        versaoLateralAlca: VERSION
      }, { merge: true });
      registrarLog("lateral_alca_valor_lateral", id, `${referencia} | LATERAL | ${dinheiro4(valor)}`).catch(() => {});
      event.currentTarget.reset();
      toast("Valor de Lateral salvo.");
    } catch (error) {
      console.error(error);
      toast("Erro ao salvar valor de Lateral.");
    } finally {
      if (botao) botao.disabled = false;
    }
  }

  function ligarEventos() {
    const painel = document.getElementById("processosValoresLateralAlca");
    if (!painel || painel.dataset.valoresLateralAlcaEventos === VERSION) return false;
    painel.dataset.valoresLateralAlcaEventos = VERSION;
    document.getElementById("formProcessosValorLateral")?.addEventListener("submit", salvarValorLateral);
    document.getElementById("formProcessosValorAlca")?.addEventListener("submit", salvarValorAlca);
    return true;
  }

  async function iniciar() {
    const painel = document.getElementById("processosValoresLateralAlca");
    if (!painel) return;
    ligarEventos();
    try {
      await carregarPerfil();
      if (ehAdmin()) await carregarValorGlobalAlca();
    } catch (error) {
      console.error("Não foi possível carregar os valores de Lateral e Alça em Processos.", error);
    }
  }

  window.CorpoNuProcessosValoresLateralAlca = Object.freeze({
    versao: VERSION,
    carregar: iniciar,
    valorFixoCortagemMontagem: VALOR_FIXO_CORTAGEM_MONTAGEM
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
