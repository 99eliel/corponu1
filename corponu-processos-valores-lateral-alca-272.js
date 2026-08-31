(() => {
  "use strict";

  const VERSION = "2026-08-31-faccoes-processos-estavel-272";
  const FB = "10.12.5";
  const AREA = "corte";
  const VALOR_FIXO_CORTAGEM_MONTAGEM = 0.0540;
  const PAINEL_ID = "processosValoresLateralAlca";
  const STYLE_ID = "processosValoresLateralAlcaStyle272";

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

  function injetarEstilo() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PAINEL_ID}{display:grid;gap:14px;margin-bottom:16px}
      #${PAINEL_ID}.hidden{display:none!important}
      #${PAINEL_ID} .processos-la-valores-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      #${PAINEL_ID} .processos-la-valor-card{display:grid;gap:9px;padding:14px;border:1px solid #e2e8f0;border-radius:14px;background:#fff}
      #${PAINEL_ID} .processos-la-valor-card h4{margin:0}
      #${PAINEL_ID} .processos-la-valor-card p{margin:0;color:#64748b;font-size:12px;line-height:1.45}
      #${PAINEL_ID} .processos-la-valor-card label{display:grid;gap:6px;font-weight:800}
      #${PAINEL_ID} .processos-la-valor-card input{width:100%}
      #${PAINEL_ID} .processos-la-valor-fixo{font-size:22px;color:#166534}
      @media(max-width:1100px){#${PAINEL_ID} .processos-la-valores-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function garantirEstrutura() {
    const pagina = document.getElementById("processos");
    if (!pagina) return null;

    let painel = document.getElementById(PAINEL_ID);
    if (!painel) {
      painel = document.createElement("div");
      painel.id = PAINEL_ID;
      painel.className = "panel processos-valores-lateral-alca hidden";
      painel.setAttribute("aria-labelledby", "processosValoresLateralAlcaTitulo");
      painel.innerHTML = `
        <div class="panel-header">
          <div>
            <h3 id="processosValoresLateralAlcaTitulo">Valores de Lateral e Alça</h3>
            <p>Configuração financeira dos processos de Lateral e Alça.</p>
          </div>
        </div>
        <div class="processos-la-valores-grid">
          <form id="formProcessosValorLateral" class="processos-la-valor-card">
            <h4>Lateral por referência</h4>
            <label>Referência<input id="processosValorLateralRef" required /></label>
            <label>Valor por peça<input id="processosValorLateralValor" type="number" min="0.0001" step="0.0001" required /></label>
            <button class="btn btn-primary" type="submit">Salvar valor</button>
          </form>
          <form id="formProcessosValorAlca" class="processos-la-valor-card">
            <h4>Alça — valor global</h4>
            <p>O valor cadastrado é por alça; o pagamento mantém a regra atual de 2 alças por peça.</p>
            <label>Valor por alça<input id="processosValorAlcaValor" type="number" min="0.0001" step="0.0001" required /></label>
            <button class="btn btn-primary" type="submit">Salvar valor</button>
          </form>
          <div class="processos-la-valor-card">
            <h4>Alça • Cortagem e montagem</h4>
            <p>Valor único e fixo por peça.</p>
            <strong class="processos-la-valor-fixo">R$ 0,0540</strong>
          </div>
        </div>
      `;

      const referencia = document.getElementById("configSutiaCompleto51");
      if (referencia) referencia.insertAdjacentElement("afterend", painel);
      else pagina.appendChild(painel);
    }

    injetarEstilo();
    return painel;
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
    garantirEstrutura()?.classList.toggle("hidden", !ehAdmin());
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
    const valor = arred4(document.getElementById("processosValorAlcaValor")?.value);
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
    const painel = garantirEstrutura();
    if (!painel || painel.dataset.valoresLateralAlcaEventos === VERSION) return false;
    painel.dataset.valoresLateralAlcaEventos = VERSION;
    document.getElementById("formProcessosValorLateral")?.addEventListener("submit", salvarValorLateral);
    document.getElementById("formProcessosValorAlca")?.addEventListener("submit", salvarValorAlca);
    return true;
  }

  async function iniciar() {
    const painel = garantirEstrutura();
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
    garantirEstrutura,
    valorFixoCortagemMontagem: VALOR_FIXO_CORTAGEM_MONTAGEM
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
