(() => {
  "use strict";

  const VERSION = "2026-08-24-manejo-calcinha-fase-rapida-226";
  const FIREBASE_VERSION = "10.12.5";
  const DATALIST_ID = "manejoFasesListCalcinha";
  const GUARD = "__CORPONU_MANEJO_CALCINHA_FASE_RAPIDA_226__";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  const faseAlterada = new Map();
  const outrosCamposAlterados = new Set();
  let firebasePromise = null;

  function normalizar(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function calcinhaAtiva() {
    return document.querySelector(".page.active")?.id === "manejo" &&
      Boolean(document.querySelector('#manejo .manejo-setor-btn.active[data-setor="calcinha"]'));
  }

  function orderIdDaLinha(row) {
    if (!(row instanceof Element)) return "";

    const linhaSelect = row.querySelector(".corponu-manejo-line-select[data-order-id]");
    if (linhaSelect?.dataset?.orderId) return String(linhaSelect.dataset.orderId);

    const botao = row.querySelector(".btn-save-manejo");
    const onclick = String(botao?.getAttribute("onclick") || "");
    const match = onclick.match(/salvarManejoLinha\((?:'|\")([^'\"]+)(?:'|\")\)/);
    return match?.[1] || "";
  }

  function localizarLinha(orderId) {
    const id = String(orderId || "");
    if (!id) return null;
    return [...document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")]
      .find(row => orderIdDaLinha(row) === id) || null;
  }

  function seletorFase(row) {
    return row?.querySelector(
      ".corponu-fase-calcinha-select-223, .corponu-fase-calcinha-select-222, .corponu-fase-select-221, .corponu-fase-select-220"
    ) || null;
  }

  function inputFase(row) {
    return row?.querySelector('input[id$="-fase"]') || null;
  }

  function faseOficial(valor) {
    const datalist = document.getElementById(DATALIST_ID);
    if (!datalist) return "";
    const alvo = normalizar(valor);
    if (!alvo) return "";

    for (const option of datalist.querySelectorAll("option")) {
      const fase = String(option.value || option.textContent || "").trim();
      if (normalizar(fase) === alvo) return fase;
    }
    return "";
  }

  function sincronizarEstadoDual(orderId, fase) {
    const mapa = window.corponuDualMode?.state?.maps?.ordens;
    if (!(mapa instanceof Map)) return;

    const id = String(orderId || "");
    const atual = mapa.get(id);
    if (!atual) return;

    const manejoAtual = atual?.manejosSetores?.calcinha || {};
    mapa.set(id, {
      ...atual,
      manejosSetores: {
        ...(atual.manejosSetores || {}),
        calcinha: {
          ...manejoAtual,
          fase: normalizar(fase),
          setor: "calcinha",
          setorLabel: "Calcinha",
          status: "organizada"
        }
      },
      manejoStatusSetores: {
        ...(atual.manejoStatusSetores || {}),
        calcinha: "organizada"
      }
    });
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = (async () => {
      const [appModule, authModule, firestore] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
      ]);
      const app = appModule.getApps()[0] || appModule.getApp();
      return {
        auth: authModule.getAuth(app),
        db: firestore.getFirestore(app),
        firestore
      };
    })().catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function persistirFase(orderId, fase) {
    const oficial = faseOficial(fase);
    if (!oficial) throw new Error("Selecione uma fase oficial da Calcinha.");

    const { auth, db, firestore } = await firebase();
    const user = auth.currentUser;
    if (!user) throw new Error("Sua sessão expirou. Entre novamente.");

    await firestore.updateDoc(
      firestore.doc(db, "ordensProducao", String(orderId)),
      {
        "manejosSetores.calcinha.fase": oficial,
        "manejosSetores.calcinha.setor": "calcinha",
        "manejosSetores.calcinha.setorLabel": "Calcinha",
        "manejosSetores.calcinha.status": "organizada",
        "manejosSetores.calcinha.atualizadoPor": user.uid,
        "manejosSetores.calcinha.atualizadoEm": firestore.serverTimestamp(),
        "manejoStatusSetores.calcinha": "organizada",
        atualizadoPor: user.uid,
        atualizadoEm: firestore.serverTimestamp()
      }
    );

    return oficial;
  }

  function finalizarVisual(orderId, fase) {
    const row = localizarLinha(orderId);
    if (!row) return;

    row.classList.remove("manejo-row-dirty", "manejo-row-pending");
    row.classList.add("manejo-row-saved");

    const input = inputFase(row);
    if (input) {
      input.value = fase;
      input.setAttribute("list", DATALIST_ID);
    }

    const select = seletorFase(row);
    if (select instanceof HTMLSelectElement) select.value = fase;

    const botao = row.querySelector(".btn-save-manejo");
    if (botao instanceof HTMLButtonElement) {
      botao.disabled = false;
      botao.removeAttribute("data-salvando-manejo");
      botao.removeAttribute("data-corponu-salvando");
      botao.textContent = "✓";
      botao.title = "Concluir alterações desta linha";
      botao.setAttribute("aria-label", "Concluir alterações desta linha");
    }
  }

  function avisar(mensagem) {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = mensagem;
      toast.classList.remove("hidden");
      clearTimeout(window.__corponuFaseRapida226Toast);
      window.__corponuFaseRapida226Toast = setTimeout(() => toast.classList.add("hidden"), 5000);
      return;
    }
    console.warn(`[CorpoNu] ${mensagem}`);
  }

  function capturarAlteracoes(event) {
    if (!calcinhaAtiva() || event.isTrusted !== true) return;
    const alvo = event.target;
    if (!(alvo instanceof Element)) return;

    const row = alvo.closest("#listaManejoInline tr[data-manejo-row='1']");
    if (!row) return;
    const orderId = orderIdDaLinha(row);
    if (!orderId) return;

    const select = seletorFase(row);
    const input = inputFase(row);

    if (alvo === select) {
      const valor = String(select?.value || "").trim();
      faseAlterada.set(orderId, { valor, alteradoEm: Date.now() });
      if (input) input.value = valor;
      sincronizarEstadoDual(orderId, valor);
      return;
    }

    // O input legado da Fase fica escondido e é sincronizado pelos módulos atuais.
    // Não deve transformar uma alteração apenas de Fase em alteração geral da linha.
    if (alvo === input) return;

    if (alvo.matches("input, select, textarea")) {
      outrosCamposAlterados.add(orderId);
    }
  }

  function instalarWrapper() {
    const atual = window.salvarManejoLinha;
    if (typeof atual !== "function") return false;
    if (atual.__corponuFaseCalcinhaRapida226 === true) return true;

    const original = atual;

    const wrapper = async function corponuSalvarManejoCalcinhaRapida226(...args) {
      if (!calcinhaAtiva()) return original.apply(this, args);

      const orderId = String(args[0] || "");
      const alteracaoFase = faseAlterada.get(orderId);
      const somenteFase = Boolean(alteracaoFase) && !outrosCamposAlterados.has(orderId);

      if (!somenteFase) {
        try {
          return await original.apply(this, args);
        } finally {
          faseAlterada.delete(orderId);
          outrosCamposAlterados.delete(orderId);
        }
      }

      const row = localizarLinha(orderId);
      const botao = row?.querySelector(".btn-save-manejo");
      const fase = String(alteracaoFase?.valor || seletorFase(row)?.value || inputFase(row)?.value || "").trim();
      const oficial = faseOficial(fase);

      if (!oficial) {
        avisar("Selecione uma fase oficial da Calcinha antes de confirmar.");
        return false;
      }

      if (botao instanceof HTMLButtonElement) {
        botao.disabled = true;
        botao.dataset.corponuSalvando = "226";
        botao.textContent = "…";
      }

      try {
        // Caminho rápido: quando SOMENTE a Fase mudou, não executamos o salvamento
        // geral da linha e todas as camadas antigas. A gravação abaixo é a mesma
        // confirmação autoritativa que já preservava a Fase na versão 223.
        const salva = await persistirFase(orderId, oficial);
        sincronizarEstadoDual(orderId, salva);
        faseAlterada.delete(orderId);
        outrosCamposAlterados.delete(orderId);
        finalizarVisual(orderId, salva);
        return true;
      } catch (error) {
        console.error("[Calcinha 226] Falha no salvamento rápido da Fase.", error);
        if (botao instanceof HTMLButtonElement) {
          botao.disabled = false;
          botao.textContent = "✓";
          botao.removeAttribute("data-corponu-salvando");
        }
        avisar(`A Fase não foi salva: ${error?.message || "erro no Firestore"}`);
        return false;
      }
    };

    // O módulo 223 verifica esta marca antes de tentar se recolocar por fora.
    // Como este wrapper já contém o 223 em `original`, a marca evita empilhamento
    // repetido, mantendo o caminho rápido como camada externa estável.
    Object.defineProperty(wrapper, "__corponuFaseCalcinhaSemPiscar223", {
      value: true,
      configurable: false,
      enumerable: false
    });
    Object.defineProperty(wrapper, "__corponuFaseCalcinhaRapida226", {
      value: true,
      configurable: false,
      enumerable: false
    });

    window.salvarManejoLinha = wrapper;
    return true;
  }

  function iniciar() {
    window.addEventListener("input", capturarAlteracoes, true);
    window.addEventListener("change", capturarAlteracoes, true);

    window.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (alvo?.closest("#listaManejoInline .btn-save-manejo") && calcinhaAtiva()) {
        instalarWrapper();
      }
    }, true);

    // Espera os wrappers antigos terminarem de instalar e então fica por fora.
    [6500, 8500, 11000].forEach(delay => setTimeout(instalarWrapper, delay));

    // Pré-aquece os módulos Firebase; isso retira o custo de importação do primeiro ✓.
    setTimeout(() => firebase().catch(() => {}), 1200);

    console.info(`[CorpoNu] Salvamento rápido da Fase Calcinha ativo: ${VERSION}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();