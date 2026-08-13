(() => {
  "use strict";

  const VERSION = "2026-08-13-fase-calcinha-restrita-198";
  const FIREBASE_VERSION = "10.12.5";
  const DATALIST_FASES_CALCINHA = "manejoFasesListCalcinha";

  if (window.__CORPONU_MANEJO_CALCINHA_SALVAR_FASE_198__ === VERSION) return;
  window.__CORPONU_MANEJO_CALCINHA_SALVAR_FASE_198__ = VERSION;

  let instalado = false;
  let contextoPromise = null;

  function calcinhaAtiva() {
    return document.querySelector("#manejo .manejo-setor-btn.active")?.dataset?.setor === "calcinha";
  }

  function normalizarComparacao(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
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

  function campoFaseDaLinha(orderId) {
    return localizarLinha(orderId)?.querySelector('input[id$="-fase"]') || null;
  }

  function fasesPermitidasCalcinha() {
    const datalist = document.getElementById(DATALIST_FASES_CALCINHA);
    if (!datalist) return [];

    const mapa = new Map();
    datalist.querySelectorAll("option").forEach(option => {
      const fase = String(option.value || option.textContent || "").trim().toUpperCase();
      const chave = normalizarComparacao(fase);
      if (fase && chave && !mapa.has(chave)) mapa.set(chave, fase);
    });
    return [...mapa.entries()].map(([chave, fase]) => ({ chave, fase }));
  }

  function faseOficialDaLinha(orderId) {
    const campo = campoFaseDaLinha(orderId);
    const digitada = String(campo?.value || "").trim();
    if (!digitada) return { campo, digitada: "", oficial: "", listaCarregada: fasesPermitidasCalcinha().length > 0 };

    const permitidas = fasesPermitidasCalcinha();
    const chaveDigitada = normalizarComparacao(digitada);
    const encontrada = permitidas.find(item => item.chave === chaveDigitada);

    return {
      campo,
      digitada,
      oficial: encontrada?.fase || "",
      listaCarregada: permitidas.length > 0
    };
  }

  function mostrarAviso(mensagem) {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = mensagem;
      toast.classList.remove("hidden");
      window.clearTimeout(window.__faseCalcinha198Toast);
      window.__faseCalcinha198Toast = window.setTimeout(() => toast.classList.add("hidden"), 6500);
      return;
    }
    window.alert(mensagem);
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
    if (atual.__corponuFaseCalcinhaRestrita198) {
      instalado = true;
      return true;
    }

    const original = atual;

    async function salvarManejoLinhaComFaseCalcinhaValidada(orderId) {
      const ehCalcinha = calcinhaAtiva();
      let faseOficial = "";

      if (ehCalcinha) {
        const validacao = faseOficialDaLinha(orderId);

        if (!validacao.listaCarregada) {
          mostrarAviso("As fases permitidas da Calcinha ainda estão carregando. Aguarde um instante e tente salvar novamente.");
          validacao.campo?.focus();
          return false;
        }

        if (!validacao.digitada) {
          mostrarAviso("Selecione uma fase permitida pelo administrador antes de salvar.");
          validacao.campo?.focus();
          return false;
        }

        if (!validacao.oficial) {
          mostrarAviso(`A fase \"${String(validacao.digitada).toUpperCase()}\" não está autorizada. Escolha uma das fases liberadas pelo administrador.`);
          validacao.campo?.focus();
          validacao.campo?.select?.();
          return false;
        }

        faseOficial = validacao.oficial;
        if (validacao.campo) validacao.campo.value = faseOficial;
      }

      const retorno = await original.apply(this, arguments);

      if (!ehCalcinha || !faseOficial) return retorno;

      try {
        const { auth, db, firestore } = await obterContexto();
        const user = auth.currentUser;
        if (!user) return retorno;

        // O módulo legado da Linha da Calcinha pode reenviar um snapshot antigo do manejo
        // depois do salvamento principal. Reafirmamos somente a FASE já validada contra
        // a lista oficial do administrador, sem ler a OP e sem tocar em Sutiã ou outros campos.
        await firestore.updateDoc(
          firestore.doc(db, "ordensProducao", String(orderId)),
          {
            "manejosSetores.calcinha.fase": faseOficial,
            "manejosSetores.calcinha.atualizadoPor": user.uid,
            "manejosSetores.calcinha.atualizadoEm": firestore.serverTimestamp(),
            atualizadoPor: user.uid,
            atualizadoEm: firestore.serverTimestamp()
          }
        );
      } catch (error) {
        console.error("Não foi possível preservar a fase validada do Manejo Calcinha.", error);
      }

      return retorno;
    }

    salvarManejoLinhaComFaseCalcinhaValidada.__corponuFaseCalcinhaRestrita198 = true;
    window.salvarManejoLinha = salvarManejoLinhaComFaseCalcinhaValidada;
    instalado = true;
    return true;
  }

  function iniciar() {
    // Aguarda os wrappers antigos de Manejo/Calcinha terminarem de ser instalados.
    // Assim esta proteção fica por fora deles, valida antes e executa por último.
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
