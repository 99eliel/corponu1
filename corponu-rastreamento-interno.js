(() => {
  "use strict";

  const RELEASE = "2026-07-30-rastreamento-interno-sem-faccao-4";
  const FIREBASE_VERSION = "10.12.5";
  const OPTION_FACCAO = "EM_FACCAO";
  const DATASET_APLICADO = "corponuRastreamentoInterno";
  const ID_AVISO_FACCAO = "avisoRastreamentoFaccaoSeparada";

  if (document.documentElement.dataset[DATASET_APLICADO] === RELEASE) return;
  document.documentElement.dataset[DATASET_APLICADO] = RELEASE;

  let contextoFirebasePromise = null;
  let bipando = false;
  let observador = null;
  let funcaoOriginalBipar = null;
  let funcaoOriginalAbrirAjuste = null;

  function normalizar(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function mostrarAviso(mensagem) {
    const toastPrincipal = document.getElementById("toast");
    if (toastPrincipal) {
      toastPrincipal.textContent = mensagem;
      toastPrincipal.classList.remove("hidden");
      clearTimeout(window.__corponuRastreamentoToastTimer);
      window.__corponuRastreamentoToastTimer = setTimeout(() => {
        toastPrincipal.classList.add("hidden");
      }, 5000);
      return;
    }

    let aviso = document.getElementById("toastRastreamentoInterno");
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.id = "toastRastreamentoInterno";
      Object.assign(aviso.style, {
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: "100001",
        maxWidth: "390px",
        padding: "12px 14px",
        borderRadius: "13px",
        background: "#111827",
        color: "#fff",
        boxShadow: "0 12px 30px rgba(15,23,42,.28)",
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontWeight: "800",
        lineHeight: "1.4"
      });
      document.body.appendChild(aviso);
    }
    aviso.textContent = mensagem;
    clearTimeout(aviso._timer);
    aviso._timer = setTimeout(() => aviso.remove(), 6000);
  }

  async function obterContextoFirebase() {
    if (contextoFirebasePromise) return contextoFirebasePromise;

    contextoFirebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([firebaseApp, firebaseAuth, firestore]) => {
      const apps = firebaseApp.getApps();
      if (!apps.length) throw new Error("Firebase ainda não foi inicializado.");
      const app = firebaseApp.getApp();
      return {
        app,
        auth: firebaseAuth.getAuth(app),
        db: firestore.getFirestore(app),
        firestore
      };
    });

    return contextoFirebasePromise;
  }

  async function registrarLogSeguro(ctx, usuario, movimentacao, id) {
    try {
      let perfil = {};
      if (usuario?.uid) {
        const perfilSnap = await ctx.firestore.getDoc(
          ctx.firestore.doc(ctx.db, "usuarios", usuario.uid)
        );
        if (perfilSnap.exists()) perfil = perfilSnap.data() || {};
      }

      await ctx.firestore.addDoc(
        ctx.firestore.collection(ctx.db, "logsAlteracoes"),
        {
          acao: "movimentacao_bipada_internamente",
          tipoAlvo: "movimentacaoProducao",
          alvoId: String(id || ""),
          detalhes: `OP ${movimentacao.numeroOP || "-"} | ${movimentacao.destino || "-"} | bipado pelo Rastreamento sem exigir chegada`,
          usuarioUid: usuario?.uid || "",
          usuarioNome: perfil.nome || usuario?.displayName || "",
          usuarioEmail: perfil.email || usuario?.email || "",
          usuarioTipo: perfil.tipo || "",
          criadoEm: ctx.firestore.serverTimestamp()
        }
      );
    } catch (error) {
      console.warn("Não foi possível registrar o log do bipado interno.", error);
    }
  }

  async function biparMovimentacaoInterna(id) {
    if (bipando) return;
    bipando = true;

    try {
      const ctx = await obterContextoFirebase();
      const usuario = ctx.auth.currentUser;
      if (!usuario) {
        mostrarAviso("Sua sessão expirou. Entre novamente para bipar.");
        return;
      }

      const referencia = ctx.firestore.doc(ctx.db, "movimentacoesProducao", String(id));
      const snap = await ctx.firestore.getDoc(referencia);
      if (!snap.exists()) {
        mostrarAviso("Movimentação não encontrada.");
        return;
      }

      const movimentacao = { id: snap.id, ...snap.data() };
      const status = normalizar(movimentacao.status);
      const tipoDestino = normalizar(movimentacao.tipoDestino || movimentacao.tipoDestinoLabel);

      if (status === "FINALIZADO") {
        mostrarAviso("Essa movimentação já está bipada.");
        return;
      }
      if (status === "ENCAMINHADO") {
        mostrarAviso("Essa etapa já foi encaminhada para outra fase.");
        return;
      }
      if (tipoDestino.includes("FACCAO")) {
        mostrarAviso("Movimentações de facção são concluídas somente na aba Facções.");
        return;
      }

      await ctx.firestore.setDoc(referencia, {
        status: "finalizado",
        bipado: true,
        bipadoInternamente: true,
        origemBipado: "rastreamento_interno",
        bipadoPor: usuario.uid,
        bipadoEm: ctx.firestore.serverTimestamp(),
        atualizadoPor: usuario.uid,
        atualizadoEm: ctx.firestore.serverTimestamp()
      }, { merge: true });

      await registrarLogSeguro(ctx, usuario, movimentacao, id);
      mostrarAviso("Movimentação interna bipada com sucesso.");
    } catch (error) {
      console.error("Erro ao bipar movimentação interna.", error);
      mostrarAviso(error?.code === "permission-denied"
        ? "Seu usuário não possui permissão para bipar esta movimentação."
        : "Erro ao bipar a movimentação interna.");
    } finally {
      bipando = false;
    }
  }

  function ehLinhaFaccao(linha) {
    const celulas = linha?.querySelectorAll(":scope > td") || [];
    const tipo = celulas[3]?.textContent || "";
    return normalizar(tipo).includes("FACCAO");
  }

  function organizarAcoesRastreamento() {
    const tbody = document.getElementById("listaRastreamento");
    if (!tbody) return;

    tbody.querySelectorAll("tr").forEach(linha => {
      if (linha.classList.contains("rastreamento-historico-row")) return;
      const celulas = linha.querySelectorAll(":scope > td");
      if (!celulas.length) return;
      const acoes = celulas[celulas.length - 1];
      if (!acoes) return;

      [...acoes.querySelectorAll("button")].forEach(botao => {
        const texto = normalizar(botao.textContent);
        const onclick = String(botao.getAttribute("onclick") || "");
        if (texto === "CHEGADA" || onclick.includes("registrarChegadaMovimentacao")) {
          botao.remove();
        }
      });

      const linhaFaccao = ehLinhaFaccao(linha);
      if (linhaFaccao) {
        [...acoes.querySelectorAll("button")].forEach(botao => {
          const texto = normalizar(botao.textContent);
          const onclick = String(botao.getAttribute("onclick") || "");
          if (texto.includes("BIPAR") || onclick.includes("biparMovimentacao")) {
            botao.remove();
          }
        });

        if (!acoes.querySelector(".badge-rastreamento-faccao-separada")) {
          const aviso = document.createElement("span");
          aviso.className = "badge info badge-rastreamento-faccao-separada";
          aviso.textContent = "Gerenciar em Facções";
          aviso.title = "Chegada, pagamento e finalização de facção são feitos somente na aba Facções.";
          acoes.prepend(aviso);
        }
      } else {
        acoes.querySelectorAll("button").forEach(botao => {
          const onclick = String(botao.getAttribute("onclick") || "");
          if (onclick.includes("biparMovimentacao")) {
            botao.title = "Finalizar movimentação interna sem exigir marcação de chegada";
          }
        });
      }
    });
  }

  function removerOpcaoFaccaoDoAjuste() {
    const select = document.getElementById("ajusteMigracaoLocal");
    if (!select) return;

    const opcao = [...select.options].find(item => item.value === OPTION_FACCAO);
    if (opcao) opcao.remove();

    if (select.value === OPTION_FACCAO || !select.value) {
      select.value = "MANEJO_AGUARDANDO_DESTINO";
    }

    const destino = document.getElementById("ajusteMigracaoDestino");
    if (destino && destino.placeholder !== "Célula, setor ou local interno") {
      destino.placeholder = "Célula, setor ou local interno";
    }

    const resumo = document.getElementById("ajusteMigracaoResumo");
    const textoResumo = "Movimente a OP apenas entre locais internos. Envio e chegada de facção são exclusivos da aba Facções.";
    if (resumo && resumo.textContent !== textoResumo) {
      resumo.textContent = textoResumo;
    }

    const info = document.getElementById(ID_AVISO_FACCAO);
    if (!info) {
      const caixa = document.getElementById("ajusteMigracaoInfo");
      if (caixa) {
        const aviso = document.createElement("div");
        aviso.id = ID_AVISO_FACCAO;
        aviso.className = "notice small";
        aviso.style.marginTop = "10px";
        aviso.innerHTML = "<strong>Fluxo separado:</strong> o Rastreamento movimenta a peça internamente. Facções são controladas somente na aba Facções.";
        caixa.insertAdjacentElement("afterend", aviso);
      }
    }
  }

  function protegerFormularioAjuste() {
    const form = document.getElementById("formAjusteMigracao");
    if (!form || form.dataset.rastreamentoInternoProtegido === RELEASE) return;
    form.dataset.rastreamentoInternoProtegido = RELEASE;

    form.addEventListener("submit", event => {
      const local = document.getElementById("ajusteMigracaoLocal")?.value || "";
      if (local !== OPTION_FACCAO) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      mostrarAviso("Para enviar ou registrar chegada de facção, use exclusivamente a aba Facções.");
    }, true);
  }

  function instalarSobrescritas() {
    if (typeof window.biparMovimentacao === "function" && window.biparMovimentacao !== biparMovimentacaoInterna) {
      if (!funcaoOriginalBipar) funcaoOriginalBipar = window.biparMovimentacao;
      window.biparMovimentacao = biparMovimentacaoInterna;
      window.finalizarMovimentacao = biparMovimentacaoInterna;
    }

    if (typeof window.abrirModalAjusteMigracao === "function" && !window.abrirModalAjusteMigracao.__rastreamentoInterno) {
      funcaoOriginalAbrirAjuste = window.abrirModalAjusteMigracao;
      const wrapper = function(...args) {
        const retorno = funcaoOriginalAbrirAjuste.apply(this, args);
        setTimeout(removerOpcaoFaccaoDoAjuste, 0);
        setTimeout(removerOpcaoFaccaoDoAjuste, 80);
        return retorno;
      };
      wrapper.__rastreamentoInterno = true;
      window.abrirModalAjusteMigracao = wrapper;
    }
  }

  function aplicarTudo() {
    instalarSobrescritas();
    removerOpcaoFaccaoDoAjuste();
    protegerFormularioAjuste();
    organizarAcoesRastreamento();
  }

  function iniciar() {
    aplicarTudo();
    if (!observador && document.body) {
      observador = new MutationObserver(() => aplicarTudo());
      observador.observe(document.body, { childList: true, subtree: true });
    }

    setTimeout(aplicarTudo, 150);
    setTimeout(aplicarTudo, 700);
    setTimeout(aplicarTudo, 1800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
