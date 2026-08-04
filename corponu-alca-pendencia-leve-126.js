(() => {
  "use strict";

  const VERSION = "2026-08-04-alca-origem-leve-126";
  const FIREBASE_VERSION = "10.12.5";
  const PRECO_ID = "valor-padrao-alca";
  const VALOR_ALCA = 0.05;
  const ALCAS_POR_SUTIA = 2;
  const VALOR_POR_SUTIA = VALOR_ALCA * ALCAS_POR_SUTIA;
  const ALIASES_ALCA = ["ALÇA", "ALCA", "ALÇAS", "ALCAS"];
  const MODAL_ID = "modalPendenciasValoresFinanceiro";

  if (window.__CORPONU_ALCA_PENDENCIA_LEVE_126__ === VERSION) return;
  window.__CORPONU_ALCA_PENDENCIA_LEVE_126__ = VERSION;

  let contextoPromise = null;
  let aplicando = false;

  const texto = valor => String(valor ?? "").trim();

  function normalizar(valor) {
    return texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function numero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    const bruto = texto(valor).replace(/R\$/gi, "").replace(/\s+/g, "");
    if (!bruto) return 0;
    const ajustado = bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto;
    const resultado = Number(ajustado.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(resultado) ? resultado : 0;
  }

  const arredondar2 = valor => Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;
  const arredondar4 = valor => Math.round((Number(valor || 0) + Number.EPSILON) * 10000) / 10000;

  function ehAlca(item) {
    const processo = normalizar(
      typeof item === "object"
        ? item?.processo || item?.servicoNome || item?.processoMovimentacao || ""
        : item
    );
    return processo === "ALCA" || processo === "ALCAS";
  }

  function statusFinal(item) {
    const status = normalizar(item?.statusPagamento || item?.statusFinanceiro || item?.status || "");
    return item?.pago === true || item?.quitado === true || item?.cancelado === true ||
      item?.excluido === true || [
        "PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA",
        "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
      ].includes(status);
  }

  function realmenteSemValor(item) {
    if (!ehAlca(item) || statusFinal(item)) return false;
    const status = normalizar(item?.statusPagamento || item?.statusFinanceiro || "");
    return item?.valorPendente === true ||
      item?.valorManualFinanceiroPendente === true ||
      status === "SEM VALOR" ||
      status === "AGUARDANDO VALOR" ||
      !(numero(item?.valorUnitario) > 0);
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModulo, authModulo, firestore]) => {
      if (!appModulo.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appModulo.getApp();
      return {
        firestore,
        db: firestore.getFirestore(app),
        auth: authModulo.getAuth(app)
      };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  async function usuarioAtual(auth) {
    for (let tentativa = 0; tentativa < 30 && !auth.currentUser; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    return auth.currentUser;
  }

  function toast(mensagem, erro = false) {
    const principal = document.getElementById("toast");
    if (principal) {
      principal.textContent = mensagem;
      principal.classList.remove("hidden");
      principal.style.background = erro ? "#991b1b" : "#166534";
      window.clearTimeout(window.__corponuAlca126Toast);
      window.__corponuAlca126Toast = window.setTimeout(() => {
        principal.classList.add("hidden");
        principal.style.removeProperty("background");
      }, erro ? 8000 : 1800);
      return;
    }

    const aviso = document.createElement("div");
    aviso.textContent = mensagem;
    aviso.style.cssText = [
      "position:fixed", "right:18px", "bottom:18px", "z-index:1000030",
      "max-width:min(520px,calc(100vw - 32px))", "padding:14px 16px",
      "border-radius:13px", "box-shadow:0 18px 48px rgba(15,23,42,.28)",
      `background:${erro ? "#991b1b" : "#166534"}`, "color:#fff",
      "font:800 13px/1.45 Arial,sans-serif"
    ].join(";");
    document.body.appendChild(aviso);
    window.setTimeout(() => aviso.remove(), erro ? 8000 : 1800);
  }

  async function consultarPendenciasAlca(firestore, db) {
    const encontrados = new Map();
    const colecao = firestore.collection(db, "entregasPagamento");
    const consultas = [
      firestore.query(colecao, firestore.where("processo", "in", ALIASES_ALCA)),
      firestore.query(colecao, firestore.where("servicoNome", "in", ALIASES_ALCA)),
      firestore.query(colecao, firestore.where("processoMovimentacao", "in", ALIASES_ALCA)),
      firestore.query(colecao, firestore.where("setor", "==", "alca"))
    ];

    for (const consulta of consultas) {
      try {
        const snapshot = await firestore.getDocs(consulta);
        snapshot.docs.forEach(documento => {
          const dados = documento.data() || {};
          if (realmenteSemValor(dados)) {
            encontrados.set(documento.id, {
              id: documento.id,
              ref: documento.ref,
              dados
            });
          }
        });
      } catch (error) {
        console.warn("Uma consulta específica das pendências de ALÇA não foi concluída.", error);
      }
    }

    return [...encontrados.values()];
  }

  function quantidadePagamento(item) {
    return Math.max(0, numero(item?.quantidade ?? item?.quantidadeRecebida ?? item?.quantidadeEnviada));
  }

  function descontoPagamento(item) {
    return Math.max(0, numero(item?.descontoDefeito ?? item?.descontoPorDefeito ?? item?.defeito));
  }

  function dadosPagamento(item, usuarioUid, agora) {
    const quantidade = quantidadePagamento(item);
    const quantidadeAlcas = quantidade * ALCAS_POR_SUTIA;
    const descontoDefeito = descontoPagamento(item);
    const subtotal = arredondar2(quantidade * VALOR_POR_SUTIA);
    const total = arredondar2(Math.max(subtotal - descontoDefeito, 0));

    return {
      precoReferenciaId: PRECO_ID,
      servicoId: PRECO_ID,
      processo: "ALÇA",
      processoMovimentacao: "ALÇA",
      servicoNome: "ALÇA",
      setor: "alca",
      setorLabel: "Alça",
      quantidade,
      quantidadeAlcas,
      multiplicadorAlcas: ALCAS_POR_SUTIA,
      valorUnitarioAlca: arredondar4(VALOR_ALCA),
      valorUnitario: arredondar4(VALOR_POR_SUTIA),
      subtotal,
      descontoDefeito,
      total,
      statusPagamento: "pendente",
      statusFinanceiro: "pendente",
      valorPendente: false,
      valorManualFinanceiroPendente: false,
      formaValorPagamento: "valor_global_alca",
      motivoValorPendente: "",
      avisoPagamento: "",
      calculoAlca: "quantidade_sutias_x_2_x_0_05",
      atualizadoPor: usuarioUid,
      atualizadoEm: agora,
      versaoValorAlca: VERSION
    };
  }

  async function aplicarValorAlca(botao) {
    if (aplicando) return;
    aplicando = true;

    const textoOriginal = botao?.textContent || "Aplicar R$ 0,05";
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Corrigindo somente ALÇA...";
    }

    try {
      const { firestore, db, auth } = await contexto();
      const usuario = await usuarioAtual(auth);
      const pendencias = await consultarPendenciasAlca(firestore, db);
      const agora = firestore.serverTimestamp();

      await firestore.setDoc(firestore.doc(db, "precosReferencia", PRECO_ID), {
        referencia: "TODAS",
        processo: "ALÇA",
        setor: "alca",
        setorLabel: "Alça",
        valor: arredondar4(VALOR_ALCA),
        valorUnitario: arredondar4(VALOR_ALCA),
        preco: arredondar4(VALOR_ALCA),
        ativo: true,
        tipoValor: "padrao_global_alca",
        valorPadraoGlobalAlca: true,
        multiplicadorQuantidade: ALCAS_POR_SUTIA,
        atualizadoPor: usuario.uid,
        atualizadoEm: agora,
        versaoValorAlca: VERSION
      }, { merge: true });

      let corrigidos = 0;
      for (let inicio = 0; inicio < pendencias.length; inicio += 400) {
        const lote = firestore.writeBatch(db);
        const grupo = pendencias.slice(inicio, inicio + 400);
        let gravacoes = 0;

        grupo.forEach(item => {
          if (!(quantidadePagamento(item.dados) > 0)) return;
          lote.set(item.ref, dadosPagamento(item.dados, usuario.uid, agora), { merge: true });
          gravacoes += 1;
          corrigidos += 1;
        });

        if (gravacoes) await lote.commit();
      }

      document.getElementById(MODAL_ID)?.classList.add("hidden");
      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");

      toast(
        corrigidos
          ? `${corrigidos} pagamento(s) de ALÇA corrigido(s). Atualizando a tela...`
          : "Valor da ALÇA confirmado. Não havia pendência sem valor para corrigir."
      );

      window.setTimeout(() => window.location.reload(), 650);
    } catch (error) {
      console.error("Não foi possível aplicar o valor leve da ALÇA.", error);
      toast(error?.message || "Não foi possível aplicar o valor da ALÇA.", true);
      if (botao && document.contains(botao)) {
        botao.disabled = false;
        botao.textContent = textoOriginal;
      }
    } finally {
      aplicando = false;
    }
  }

  function prepararInterface() {
    document.getElementById("btnCorrigirPendenciasAlca122")?.remove();

    const input = document.getElementById("inputValorPadraoAlca");
    if (input instanceof HTMLInputElement) {
      input.value = "0,05";
      input.readOnly = true;
      input.title = "Valor fixo de R$ 0,05 por alça";
    }

    const botao = document.getElementById("btnSalvarValorPadraoAlca");
    if (botao instanceof HTMLButtonElement) {
      botao.type = "button";
      botao.textContent = "Aplicar R$ 0,05 na ALÇA";
      botao.dataset.alcaLeve126 = "1";
    }

    const status = document.getElementById("statusValorPadraoAlca");
    if (status) {
      status.textContent = "Valor fixo: R$ 0,05 por alça. Cada sutiã recebe 2 alças, totalizando R$ 0,10 por sutiã.";
    }

    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      [...modal.querySelectorAll("input")].forEach(campo => {
        const rotulo = normalizar(campo.closest("label")?.textContent || "");
        if (rotulo.includes("VALOR DE UMA ALCA")) {
          campo.value = "0,05";
          campo.readOnly = true;
        }
      });

      [...modal.querySelectorAll("button")].forEach(item => {
        const rotulo = normalizar(item.textContent);
        if (
          rotulo.includes("SALVAR E RECALCULAR") ||
          rotulo.includes("APLICAR R 0 05") ||
          item.dataset.alcaLeve126 === "1"
        ) {
          item.type = "button";
          item.textContent = "Aplicar R$ 0,05";
          item.dataset.alcaLeve126 = "1";
        }
      });
    }
  }

  function botaoAlcaDoEvento(event) {
    const alvo = event.target instanceof Element ? event.target.closest("button") : null;
    if (!alvo) return null;
    if (alvo.id === "btnSalvarValorPadraoAlca" || alvo.dataset.alcaLeve126 === "1") return alvo;
    const rotulo = normalizar(alvo.textContent);
    if (alvo.closest(`#${MODAL_ID}`) && (
      rotulo.includes("SALVAR E RECALCULAR") || rotulo.includes("APLICAR R 0 05")
    )) return alvo;
    return null;
  }

  window.addEventListener("click", event => {
    const botao = botaoAlcaDoEvento(event);
    if (!botao) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    aplicarValorAlca(botao);
  }, true);

  window.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "formValorPadraoAlca") return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    aplicarValorAlca(document.getElementById("btnSalvarValorPadraoAlca"));
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;
    if (alvo.closest("#btnToggleGerenciarValores, #btnAtualizarConferenciaPagamentoFinal, .nav-btn[data-page='pagamentos']")) {
      [0, 100, 350, 800].forEach(atraso => window.setTimeout(prepararInterface, atraso));
    }
  }, true);

  function iniciar() {
    prepararInterface();
    [100, 400, 1000, 2200].forEach(atraso => window.setTimeout(prepararInterface, atraso));
  }

  window.CorpoNuAlcaPendenciaLeve = {
    versao: VERSION,
    aplicar: () => aplicarValorAlca(document.getElementById("btnSalvarValorPadraoAlca"))
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
