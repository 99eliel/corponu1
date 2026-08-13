(() => {
  "use strict";

  const VERSION = "2026-08-13-fase-calcinha-nao-reverter-194";
  const FIREBASE_VERSION = "10.12.5";

  if (window.__CORPONU_MANEJO_CALCINHA_SALVAR_FASE_194__ === VERSION) return;
  window.__CORPONU_MANEJO_CALCINHA_SALVAR_FASE_194__ = VERSION;

  let instalado = false;
  let contextoPromise = null;

  function calcinhaAtiva() {
    return document.querySelector("#manejo .manejo-setor-btn.active")?.dataset?.setor === "calcinha";
  }

  function localizarLinha(orderId) {
    const id = String(orderId || "");
    if (!id) return null;

    return [...document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")].find(row => {
      const botao = row.querySelector(".btn-save-manejo");
      const onclick = String(botao?.getAttribute("onclick") || "");
      return onclick.includes(`salvarManejoLinha('${id}')`) || onclick.includes(`salvarManejoLinha(\"${id}\")`);
    }) || null;
  }

  function faseDigitadaDaLinha(orderId) {
    const linha = localizarLinha(orderId);
    const campo = linha?.querySelector('input[id$="-fase"]');
    return String(campo?.value || "").trim().toUpperCase();
  }

  async function obterContexto() {
    if (contextoPromise) return contextoPromise;

    contextoPromise = (async () => {
      const [appModule, authModule, firestoreModule] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
      ]);

      const app = appModule.getApps()[0] || appModule.getApp();
      return {
        auth: authModule.getAuth(app),
        db: firestoreModule.getFirestore(app),
        firestore: firestoreModule
      };
    })();

    return contextoPromise;
  }

  function instalarProtecao() {
    if (instalado) return true;
    const atual = window.salvarManejoLinha;
    if (typeof atual !== "function") return false;
    if (atual.__corponuPreservaFaseCalcinha194) {
      instalado = true;
      return true;
    }

    const original = atual;

    async function salvarManejoLinhaPreservandoFaseCalcinha(orderId) {
      const ehCalcinha = calcinhaAtiva();
      const faseDigitada = ehCalcinha ? faseDigitadaDaLinha(orderId) : "";

      const retorno = await original.apply(this, arguments);

      if (!ehCalcinha || !faseDigitada) return retorno;

      try {
        const { auth, db, firestore } = await obterContexto();
        const user = auth.currentUser;
        if (!user) return retorno;

        // O módulo legado da Linha da Calcinha pode reenviar um snapshot antigo do manejo
        // depois do salvamento principal. Reafirmamos somente a FASE digitada, sem ler a OP
        // e sem tocar em Sutiã, Linha, Cor, Quantidade ou outros campos.
        await firestore.updateDoc(
          firestore.doc(db, "ordensProducao", String(orderId)),
          {
            "manejosSetores.calcinha.fase": faseDigitada,
            "manejosSetores.calcinha.atualizadoPor": user.uid,
            "manejosSetores.calcinha.atualizadoEm": firestore.serverTimestamp(),
            atualizadoPor: user.uid,
            atualizadoEm: firestore.serverTimestamp()
          }
        );
      } catch (error) {
        console.error("Não foi possível preservar a fase do Manejo Calcinha.", error);
      }

      return retorno;
    }

    salvarManejoLinhaPreservandoFaseCalcinha.__corponuPreservaFaseCalcinha194 = true;
    window.salvarManejoLinha = salvarManejoLinhaPreservandoFaseCalcinha;
    instalado = true;
    return true;
  }

  function iniciar() {
    // Aguarda os wrappers antigos de Manejo/Calcinha terminarem de ser instalados.
    // Assim esta proteção fica por fora deles e executa por último.
    window.setTimeout(instalarProtecao, 2200);
    window.setTimeout(() => {
      if (!instalado) instalarProtecao();
    }, 4200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
