(() => {
  "use strict";

  const VERSION = "2026-08-25-pagamentos-recuperacao-246";
  const GUARD = "__CORPONU_PAGAMENTOS_RECUPERACAO_246__";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  let firebasePromise = null;
  let executando = false;
  let concluido = false;

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function textoValido(valor) {
    return typeof valor === "string" && valor.trim().length > 0;
  }

  function normalizarTextoEstrutural(valor, fallback = "") {
    const convertido = texto(valor);
    return convertido || fallback;
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

  async function obterFaccaoDaMovimentacao(dados, db, fs) {
    const ids = [
      dados.movimentacaoId,
      dados.movimentacaoOrigemId,
      dados.movimentacaoRaizId
    ].map(texto).filter(Boolean);

    for (const id of ids) {
      try {
        const snap = await fs.getDoc(fs.doc(db, "movimentacoesProducao", id));
        if (!snap.exists()) continue;
        const mov = snap.data() || {};
        const nome = texto(mov.destino || mov.faccao || mov.destinoNome);
        if (nome) return nome;
      } catch (error) {
        console.warn(`[CorpoNu 246] Não foi possível consultar movimentação ${id}.`, error);
      }
    }

    return "";
  }

  async function repararDocumento(item, db, fs) {
    const dados = item.data() || {};
    const patch = {};

    let faccao = textoValido(dados.faccao) ? dados.faccao.trim() : "";
    if (!faccao) {
      faccao = texto(dados.destino || dados.faccaoNome || dados.destinoNome || dados.responsavelFaccao);
    }
    if (!faccao) {
      faccao = await obterFaccaoDaMovimentacao(dados, db, fs);
    }
    if (!faccao) faccao = "SEM FACÇÃO";

    if (!textoValido(dados.faccao) || dados.faccao !== faccao) {
      patch.faccao = faccao;
    }

    let processo = textoValido(dados.processo) ? dados.processo.trim() : "";
    if (!processo) {
      processo = texto(dados.servicoNome || dados.processoMovimentacao || dados.servico || dados.tipoProcesso);
    }
    if (!processo) processo = "SEM PROCESSO";

    if (!textoValido(dados.processo) || dados.processo !== processo) {
      patch.processo = processo;
    }
    if (!textoValido(dados.servicoNome)) {
      patch.servicoNome = processo;
    }

    if (dados.setor != null && typeof dados.setor !== "string") {
      patch.setor = normalizarTextoEstrutural(dados.setor, "sutia").toLowerCase();
    }

    if (dados.referencia != null && typeof dados.referencia !== "string") {
      patch.referencia = texto(dados.referencia);
    }
    if (dados.numeroOP != null && typeof dados.numeroOP !== "string") {
      patch.numeroOP = texto(dados.numeroOP);
    }

    if (!Object.keys(patch).length) return null;

    patch.recuperadoEstruturaPagamento246 = true;
    patch.recuperadoEstruturaPagamento246Em = fs.serverTimestamp();

    return patch;
  }

  async function executarRecuperacao() {
    if (executando || concluido) return;
    executando = true;

    try {
      const { auth, authMod, db, fs } = await obterFirebase();

      if (!auth.currentUser) {
        executando = false;
        const cancelar = authMod.onAuthStateChanged(auth, usuario => {
          if (!usuario) return;
          cancelar();
          setTimeout(executarRecuperacao, 250);
        });
        return;
      }

      // A 233 só mexeu neste grupo. Mantemos a recuperação estritamente nele.
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, "entregasPagamento"),
        fs.where("pagamentoComplementarRestante", "==", true)
      ));

      const correcoes = [];
      for (const item of snap.docs) {
        const patch = await repararDocumento(item, db, fs);
        if (patch) correcoes.push({ ref: item.ref, patch });
      }

      if (correcoes.length) {
        let batch = fs.writeBatch(db);
        let noBatch = 0;

        for (const item of correcoes) {
          batch.set(item.ref, item.patch, { merge: true });
          noBatch += 1;

          if (noBatch >= 300) {
            await batch.commit();
            batch = fs.writeBatch(db);
            noBatch = 0;
          }
        }

        if (noBatch > 0) await batch.commit();
      }

      concluido = true;
      console.info(`[CorpoNu 246] Recuperação estrutural concluída. ${correcoes.length} pagamento(s) ajustado(s).`);

      // Força uma nova leitura da tela atual depois que os documentos problemáticos foram normalizados.
      setTimeout(() => {
        if (document.getElementById("pagamentos")?.classList.contains("active")) {
          document.getElementById("btnAtualizarServidor")?.click();
        }
      }, 250);
    } catch (error) {
      console.error("[CorpoNu 246] Falha na recuperação estrutural de Pagamentos.", error);
    } finally {
      executando = false;
    }
  }

  window.CorpoNuPagamentosRecuperacao246 = {
    versao: VERSION,
    executar: executarRecuperacao
  };

  function iniciar() {
    setTimeout(executarRecuperacao, 350);
    console.info(`[CorpoNu] Recuperação estrutural de Pagamentos ativa: ${VERSION}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
