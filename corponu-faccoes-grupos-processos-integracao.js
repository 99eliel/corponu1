(() => {
  "use strict";

  const VERSION = "2026-07-31-faccoes-grupos-processos-43";
  const FB = "10.12.5";
  const CONFIG_ID = "grupos-faccoes-processos";
  const FORM_ID = "formFaccao";

  if (window.__CORPONU_FACCOES_GRUPOS_INTEGRACAO__ === VERSION) return;
  window.__CORPONU_FACCOES_GRUPOS_INTEGRACAO__ = VERSION;

  let contextoPromise = null;
  let salvando = false;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  const canonico = valor => ({
    "ENCAPA BOJO": "ENCAPAR BOJO",
    "ENCAPAR BOJOS": "ENCAPAR BOJO",
    "ALCA": "ALÇA",
    "ALCAS": "ALÇA",
    "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
    "SUTIA COMPLETO": "SUTIÃ COMPLETO"
  })[normalizar(valor)] || normalizar(valor);

  const slug = valor => normalizar(valor)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "processo";

  const docIdSeguro = valor => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 180) || `faccao-${Date.now()}`;

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      const app = appMod.getApp();
      return { auth: authMod.getAuth(app), db: fs.getFirestore(app), fs };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  async function obterIdFaccao() {
    const idCampo = document.getElementById("faccaoId")?.value || "";
    if (idCampo) return idCampo;
    const nome = document.getElementById("faccaoNome")?.value || "";
    return nome ? docIdSeguro(nome) : "";
  }

  async function marcarFormularioPelosGrupos() {
    const form = document.getElementById(FORM_ID);
    const checkboxes = [...document.querySelectorAll("#gfp43FormGrupos [data-gfp43-processo]")];
    if (!form || !checkboxes.length) return;
    const id = await obterIdFaccao();
    if (!id) return;

    try {
      const { db, fs } = await contexto();
      const snap = await fs.getDoc(fs.doc(db, "configuracoes", CONFIG_ID));
      const grupos = snap.exists() && snap.data()?.grupos ? snap.data().grupos : {};
      checkboxes.forEach(input => {
        const processo = canonico(input.dataset.gfp43Processo);
        const grupo = grupos[slug(processo)];
        if (grupo?.configurado === true && Array.isArray(grupo.faccaoIds)) {
          input.checked = grupo.faccaoIds.includes(id);
        }
      });
      checkboxes[0]?.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (error) {
      console.warn("Não foi possível sincronizar o formulário com os grupos.", error);
    }
  }

  async function salvarVinculosExatos(snapshot) {
    if (salvando || !snapshot.id || !snapshot.processosDisponiveis.length) return;
    salvando = true;
    try {
      const { auth, db, fs } = await contexto();
      const usuario = auth.currentUser;
      if (!usuario) return;
      const perfilSnap = await fs.getDoc(fs.doc(db, "usuarios", usuario.uid));
      const perfil = perfilSnap.exists() ? perfilSnap.data() : {};
      if (normalizar(perfil.tipo) !== "ADMIN" || perfil.ativo === false) return;

      const configRef = fs.doc(db, "configuracoes", CONFIG_ID);
      const configSnap = await fs.getDoc(configRef);
      const config = configSnap.exists() ? configSnap.data() : {};
      const grupos = { ...(config.grupos || {}) };
      const selecionados = new Set(snapshot.selecionados.map(canonico));

      snapshot.processosDisponiveis.map(canonico).forEach(processo => {
        const chave = slug(processo);
        const atual = grupos[chave] || { processo, faccaoIds: [] };
        const ids = new Set(Array.isArray(atual.faccaoIds) ? atual.faccaoIds : []);
        if (selecionados.has(processo)) ids.add(snapshot.id); else ids.delete(snapshot.id);
        grupos[chave] = { processo, faccaoIds: [...ids], configurado: true };
      });

      await fs.setDoc(configRef, {
        grupos,
        atualizadoPor: usuario.uid,
        atualizadoEm: fs.serverTimestamp(),
        versao: VERSION
      }, { merge: true });
    } catch (error) {
      console.warn("Não foi possível concluir a sincronização exata dos grupos.", error);
    } finally {
      salvando = false;
    }
  }

  function instalar() {
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.closest("button[onclick*='editarFaccao']")) {
        [100, 300, 700].forEach(atraso => window.setTimeout(marcarFormularioPelosGrupos, atraso));
      }
    }, true);

    const form = document.getElementById(FORM_ID);
    if (form && !form.dataset.gfp43Integracao) {
      form.dataset.gfp43Integracao = "1";
      form.addEventListener("submit", () => {
        const nome = document.getElementById("faccaoNome")?.value || "";
        const id = document.getElementById("faccaoId")?.value || docIdSeguro(nome);
        const inputs = [...document.querySelectorAll("#gfp43FormGrupos [data-gfp43-processo]")];
        const snapshot = {
          id,
          processosDisponiveis: inputs.map(input => input.dataset.gfp43Processo).filter(Boolean),
          selecionados: inputs.filter(input => input.checked).map(input => input.dataset.gfp43Processo)
        };
        window.setTimeout(() => salvarVinculosExatos(snapshot), 500);
      }, true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", instalar, { once: true });
  else instalar();
})();