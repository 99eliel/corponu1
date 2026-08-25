(() => {
  "use strict";

  const VERSION = "2026-08-25-pagamentos-core-estavel-247";
  const GUARD = "__CORPONU_PAGAMENTOS_ESTRUTURA_247__";
  const SESSION_KEY = "corponu_pagamentos_estrutura_247_concluida";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  let firebasePromise = null;
  let executando = false;

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function textoValido(valor) {
    return typeof valor === "string" && valor.trim().length > 0;
  }

  async function obterFirebase() {
    if (!firebasePromise) {
      firebasePromise = Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
      ]).then(([appMod, authMod, fs]) => {
        if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado");
        const app = appMod.getApp();
        return {
          auth: authMod.getAuth(app),
          authMod,
          db: fs.getFirestore(app),
          fs
        };
      }).catch(error => {
        firebasePromise = null;
        throw error;
      });
    }
    return firebasePromise;
  }

  function montarPatchEstrutural(dados) {
    const patch = {};

    let faccao = textoValido(dados?.faccao) ? dados.faccao.trim() : "";
    if (!faccao) {
      faccao = texto(
        dados?.destino ||
        dados?.faccaoNome ||
        dados?.destinoNome ||
        dados?.responsavelFaccao ||
        dados?.responsavel ||
        ""
      );
    }
    if (!faccao) faccao = "SEM FACÇÃO";

    if (!textoValido(dados?.faccao) || dados.faccao !== faccao) {
      patch.faccao = faccao;
    }

    let processo = textoValido(dados?.processo) ? dados.processo.trim() : "";
    if (!processo) {
      processo = texto(
        dados?.servicoNome ||
        dados?.processoMovimentacao ||
        dados?.servico ||
        dados?.tipoProcesso ||
        ""
      );
    }
    if (!processo) processo = "SEM PROCESSO";

    if (!textoValido(dados?.processo) || dados.processo !== processo) {
      patch.processo = processo;
    }
    if (!textoValido(dados?.servicoNome)) {
      patch.servicoNome = processo;
    }

    if (dados?.referencia != null && typeof dados.referencia !== "string") {
      patch.referencia = texto(dados.referencia);
    }
    if (dados?.numeroOP != null && typeof dados.numeroOP !== "string") {
      patch.numeroOP = texto(dados.numeroOP);
    }
    if (dados?.setor != null && typeof dados.setor !== "string") {
      patch.setor = texto(dados.setor).toLowerCase() || "sutia";
    }

    return patch;
  }

  async function executar() {
    if (executando) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === VERSION) return;
    } catch (error) {}

    executando = true;

    try {
      const { auth, authMod, db, fs } = await obterFirebase();

      if (!auth.currentUser) {
        executando = false;
        const cancelar = authMod.onAuthStateChanged(auth, usuario => {
          if (!usuario) return;
          cancelar();
          window.setTimeout(executar, 120);
        });
        return;
      }

      // Leitura única, sem orderBy e sem listener: serve apenas para reparar tipos estruturais.
      const snap = await fs.getDocs(fs.collection(db, "entregasPagamento"));
      const correcoes = [];

      for (const item of snap.docs) {
        const dados = item.data() || {};
        const patch = montarPatchEstrutural(dados);
        if (!Object.keys(patch).length) continue;

        patch.recuperadoEstruturaPagamento247 = true;
        patch.recuperadoEstruturaPagamento247Em = fs.serverTimestamp();
        correcoes.push({ ref: item.ref, patch });
      }

      let lote = fs.writeBatch(db);
      let itensNoLote = 0;
      let corrigidos = 0;

      for (const item of correcoes) {
        lote.set(item.ref, item.patch, { merge: true });
        itensNoLote += 1;
        corrigidos += 1;

        if (itensNoLote >= 300) {
          await lote.commit();
          lote = fs.writeBatch(db);
          itensNoLote = 0;
        }
      }

      if (itensNoLote > 0) await lote.commit();

      try {
        sessionStorage.setItem(SESSION_KEY, VERSION);
      } catch (error) {}

      console.info(`[CorpoNu 247] Estrutura de Pagamentos conferida. ${snap.size} registro(s), ${corrigidos} corrigido(s).`);

      // O onSnapshot nativo recebe os patches automaticamente. Caso nada tenha sido alterado,
      // o botão Atualizar reinicia somente os listeners da tela atual.
      window.setTimeout(() => {
        if (document.getElementById("pagamentos")?.classList.contains("active")) {
          document.getElementById("btnAtualizarServidor")?.click();
        }
      }, corrigidos ? 450 : 150);
    } catch (error) {
      console.error("[CorpoNu 247] Falha ao conferir estrutura de Pagamentos.", error);
    } finally {
      executando = false;
    }
  }

  window.CorpoNuPagamentosEstrutura247 = { versao: VERSION, executar };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.setTimeout(executar, 250), { once: true });
  } else {
    window.setTimeout(executar, 250);
  }
})();
