(() => {
  "use strict";

  const VERSION = "2026-08-04-alca-botao-direto-124";
  const FIREBASE_VERSION = "10.12.5";
  const PRECO_ID = "valor-padrao-alca";
  const VALOR_ALCA = 0.05;
  const ALCAS_POR_SUTIA = 2;
  const VALOR_POR_SUTIA = VALOR_ALCA * ALCAS_POR_SUTIA;
  const ALIASES = ["ALÇA", "ALCA", "ALÇAS", "ALCAS"];

  if (window.__CORPONU_ALCA_BOTAO_DIRETO_124__ === VERSION) return;
  window.__CORPONU_ALCA_BOTAO_DIRETO_124__ = VERSION;

  let contextoPromise = null;
  let salvando = false;
  const reparosAgendados = new Map();

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

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

  function ehAlca(itemOuTexto) {
    const processo = typeof itemOuTexto === "object"
      ? (itemOuTexto?.processo || itemOuTexto?.servicoNome || itemOuTexto?.processoMovimentacao || "")
      : itemOuTexto;
    const chave = normalizar(processo);
    return chave === "ALCA" || chave === "ALCAS";
  }

  function statusFinal(item) {
    const status = normalizar(item?.statusPagamento || item?.statusFinanceiro || item?.status || "");
    return item?.pago === true || item?.quitado === true || item?.cancelado === true || item?.excluido === true || [
      "PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA",
      "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
    ].includes(status);
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModulo, authModulo, firestore]) => {
      if (!appModulo.getApps().length) throw new Error("Firebase ainda não foi inicializado.");
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
    const existente = document.getElementById("toast");
    if (existente) {
      existente.textContent = mensagem;
      existente.classList.remove("hidden");
      existente.style.background = erro ? "#991b1b" : "#166534";
      window.clearTimeout(window.__corponuAlca124Toast);
      window.__corponuAlca124Toast = window.setTimeout(() => {
        existente.classList.add("hidden");
        existente.style.removeProperty("background");
      }, erro ? 8500 : 6500);
      return;
    }

    const aviso = document.createElement("div");
    aviso.textContent = mensagem;
    aviso.style.cssText = [
      "position:fixed", "right:18px", "bottom:18px", "z-index:1000008",
      "max-width:min(520px,calc(100vw - 32px))", "padding:14px 16px",
      "border-radius:13px", "box-shadow:0 18px 48px rgba(15,23,42,.28)",
      `background:${erro ? "#991b1b" : "#166534"}`, "color:#fff",
      "font:800 13px/1.45 Arial,sans-serif"
    ].join(";");
    document.body.appendChild(aviso);
    window.setTimeout(() => aviso.remove(), erro ? 8500 : 6500);
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  async function consultarPagamentosAlca(firestore, db) {
    const encontrados = new Map();
    const colecao = firestore.collection(db, "entregasPagamento");
    const consultas = [
      firestore.query(colecao, firestore.where("processo", "in", ALIASES)),
      firestore.query(colecao, firestore.where("servicoNome", "in", ALIASES)),
      firestore.query(colecao, firestore.where("processoMovimentacao", "in", ALIASES)),
      firestore.query(colecao, firestore.where("setor", "==", "alca"))
    ];

    for (const consulta of consultas) {
      try {
        const snapshot = await firestore.getDocs(consulta);
        snapshot.docs.forEach(documento => {
          const dados = documento.data() || {};
          if (ehAlca(dados) || normalizar(dados.setor) === "ALCA") {
            encontrados.set(documento.id, { id: documento.id, ref: documento.ref, dados });
          }
        });
      } catch (error) {
        console.warn("Uma consulta específica de ALÇA não pôde ser executada.", error);
      }
    }

    return [...encontrados.values()].filter(item => !statusFinal(item.dados));
  }

  async function quantidadeDoPagamento(item, firestore, db) {
    const direta = Math.max(0, numero(
      item?.quantidadeRecebida ?? item?.quantidade ?? item?.quantidadeEnviada ?? 0
    ));
    if (direta > 0 || !item?.movimentacaoId) return direta;

    try {
      const snapshot = await firestore.getDoc(
        firestore.doc(db, "movimentacoesProducao", item.movimentacaoId)
      );
      if (!snapshot.exists()) return 0;
      const movimento = snapshot.data() || {};
      const enviada = Math.max(0, numero(movimento.quantidadeEnviada ?? movimento.quantidade));
      const falta = Math.max(0, numero(movimento.falta));
      return Math.max(enviada - falta, 0);
    } catch (error) {
      console.warn("Não foi possível recuperar a quantidade da movimentação de ALÇA.", error);
      return 0;
    }
  }

  function descontoDoPagamento(item) {
    return Math.max(0, numero(
      item?.descontoDefeito ?? item?.descontoPorDefeito ?? item?.defeito ?? 0
    ));
  }

  function dadosPagamento(quantidade, desconto, usuarioUid, agora) {
    const quantidadeAlcas = quantidade * ALCAS_POR_SUTIA;
    const subtotal = arredondar2(quantidade * VALOR_POR_SUTIA);
    const total = arredondar2(Math.max(subtotal - desconto, 0));

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
      descontoDefeito: desconto,
      total,
      statusPagamento: "pendente",
      valorPendente: false,
      valorManualFinanceiroPendente: false,
      formaValorPagamento: "valor_global_alca",
      motivoValorPendente: "",
      avisoPagamento: "",
      calculoAlca: "quantidade_sutias_x_2_x_0_05",
      atualizadoPor: usuarioUid || "",
      atualizadoEm: agora,
      versaoValorAlca: VERSION
    };
  }

  async function salvarPrecoEAplicar() {
    if (salvando) return;
    salvando = true;

    const botoes = [...document.querySelectorAll("#btnSalvarValorPadraoAlca")];
    const textosOriginais = botoes.map(botao => botao.textContent);
    botoes.forEach(botao => {
      botao.disabled = true;
      botao.textContent = "Aplicando R$ 0,05...";
    });

    try {
      const { firestore, db, auth } = await contexto();
      const usuario = await usuarioAtual(auth);
      const pagamentos = await consultarPagamentosAlca(firestore, db);
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
      for (let inicio = 0; inicio < pagamentos.length; inicio += 300) {
        const grupo = pagamentos.slice(inicio, inicio + 300);
        const lote = firestore.writeBatch(db);
        let gravacoes = 0;

        for (const pagamento of grupo) {
          const quantidade = await quantidadeDoPagamento(pagamento.dados, firestore, db);
          if (!(quantidade > 0)) continue;
          const desconto = descontoDoPagamento(pagamento.dados);
          lote.set(
            pagamento.ref,
            dadosPagamento(quantidade, desconto, usuario.uid, agora),
            { merge: true }
          );
          gravacoes += 1;
          corrigidos += 1;
        }

        if (gravacoes > 0) await lote.commit();
      }

      document.querySelectorAll("#inputValorPadraoAlca").forEach(input => {
        input.value = "0,05";
      });
      document.querySelectorAll("#statusValorPadraoAlca").forEach(status => {
        const mensagem = "Valor fixo: R$ 0,05 por alça. Cada sutiã recebe 2 alças, totalizando R$ 0,10 por sutiã.";
        if (status.textContent !== mensagem) status.textContent = mensagem;
      });

      const modal = document.getElementById("modalPendenciasValoresFinanceiro");
      if (modal && !modal.classList.contains("hidden")) {
        modal.classList.add("hidden");
        document.body.style.removeProperty("overflow");
      }

      toast(
        corrigidos > 0
          ? `${corrigidos} pagamento(s) de ALÇA corrigido(s). Regra aplicada: 2 alças de R$ 0,05 por sutiã.`
          : "Valor da ALÇA confirmado em R$ 0,05. Não havia lançamento aberto para corrigir."
      );
    } catch (error) {
      console.error("Falha ao aplicar o valor fixo da ALÇA.", error);
      toast(error?.message || "Não foi possível aplicar o valor da ALÇA.", true);
    } finally {
      salvando = false;
      botoes.forEach((botao, indice) => {
        botao.disabled = false;
        botao.textContent = textosOriginais[indice] || "Aplicar R$ 0,05 na ALÇA";
      });
      instalarInterface();
    }
  }

  async function corrigirMovimentacao(movimentacaoId) {
    if (!movimentacaoId) return 0;
    const { firestore, db, auth } = await contexto();
    const usuario = await usuarioAtual(auth);
    const consulta = firestore.query(
      firestore.collection(db, "entregasPagamento"),
      firestore.where("movimentacaoId", "==", movimentacaoId)
    );
    const snapshot = await firestore.getDocs(consulta);
    const candidatos = snapshot.docs
      .map(documento => ({ id: documento.id, ref: documento.ref, dados: documento.data() || {} }))
      .filter(item => !statusFinal(item.dados) && (ehAlca(item.dados) || normalizar(item.dados.setor) === "ALCA"));
    if (!candidatos.length) return 0;

    const lote = firestore.writeBatch(db);
    const agora = firestore.serverTimestamp();
    let corrigidos = 0;
    for (const pagamento of candidatos) {
      const quantidade = await quantidadeDoPagamento(pagamento.dados, firestore, db);
      if (!(quantidade > 0)) continue;
      lote.set(
        pagamento.ref,
        dadosPagamento(quantidade, descontoDoPagamento(pagamento.dados), usuario.uid, agora),
        { merge: true }
      );
      corrigidos += 1;
    }
    if (corrigidos > 0) await lote.commit();
    return corrigidos;
  }

  function agendarReparoChegada(movimentacaoId) {
    if (!movimentacaoId || reparosAgendados.has(movimentacaoId)) return;
    const tarefa = (async () => {
      for (let tentativa = 0; tentativa < 10; tentativa += 1) {
        await new Promise(resolve => window.setTimeout(resolve, tentativa === 0 ? 700 : 500));
        try {
          const corrigidos = await corrigirMovimentacao(movimentacaoId);
          if (corrigidos > 0) {
            toast(`Pagamento de ALÇA corrigido automaticamente: 2 × ${formatarMoeda(VALOR_ALCA)} por sutiã.`);
            return;
          }
        } catch (error) {
          if (tentativa === 9) console.error("Falha ao reparar a chegada de ALÇA.", error);
        }
      }
    })().finally(() => reparosAgendados.delete(movimentacaoId));
    reparosAgendados.set(movimentacaoId, tarefa);
  }

  function prepararCampoCentral() {
    const modal = document.getElementById("modalPendenciasValoresFinanceiro");
    if (!modal) return;
    const label = [...modal.querySelectorAll("label")].find(item =>
      normalizar(item.textContent).includes("VALOR DE UMA ALCA")
    );
    const input = label?.querySelector("input");
    if (input) {
      if (input.value !== "0,05") input.value = "0,05";
      input.readOnly = true;
      input.title = "Valor fixo: R$ 0,05 por alça";
    }

    [...modal.querySelectorAll("button")].forEach(botao => {
      const titulo = normalizar(botao.textContent);
      if (titulo.includes("SALVAR E RECALCULAR") || titulo.includes("SALVANDO E RECALCULANDO") || botao.dataset.alcaDireta124 === "1") {
        botao.type = "button";
        botao.dataset.alcaDireta124 = "1";
        if (botao.textContent !== "Aplicar R$ 0,05") botao.textContent = "Aplicar R$ 0,05";
      }
    });
  }

  function instalarInterface() {
    const input = document.getElementById("inputValorPadraoAlca");
    const botao = document.getElementById("btnSalvarValorPadraoAlca");
    const status = document.getElementById("statusValorPadraoAlca");

    if (input) {
      if (input.value !== "0,05") input.value = "0,05";
      input.readOnly = true;
      input.title = "Valor fixo definido para a ALÇA";
    }
    if (botao) {
      botao.type = "button";
      if (botao.textContent !== "Aplicar R$ 0,05 na ALÇA") botao.textContent = "Aplicar R$ 0,05 na ALÇA";
      botao.dataset.alcaDireta124 = "1";
    }
    if (status) {
      const mensagem = "Valor fixo: R$ 0,05 por alça. Cada sutiã recebe 2 alças, totalizando R$ 0,10 por sutiã.";
      if (status.textContent !== mensagem) status.textContent = mensagem;
    }
    prepararCampoCentral();
  }

  window.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;
    const botao = alvo.closest("#btnSalvarValorPadraoAlca, button[data-alca-direta-124='1']");
    if (!botao) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    salvarPrecoEAplicar();
  }, true);

  window.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.id === "formValorPadraoAlca") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      salvarPrecoEAplicar();
      return;
    }

    if (form.id !== "formChegadaMovimentacao") return;
    const info = normalizar(document.getElementById("chegadaMovimentacaoInfo")?.textContent || "");
    if (!/(^| )ALCA(S)?( |$)/.test(info)) return;
    const movimentacaoId = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    if (movimentacaoId) agendarReparoChegada(movimentacaoId);
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;
    if (alvo.closest("#btnToggleGerenciarValores, #btnAtualizarConferenciaPagamentoFinal")) {
      [0, 80, 250, 600].forEach(atraso => window.setTimeout(instalarInterface, atraso));
    }
  }, true);

  const observer = new MutationObserver(() => {
    window.clearTimeout(window.__corponuAlca124Instalar);
    window.__corponuAlca124Instalar = window.setTimeout(instalarInterface, 40);
  });

  function iniciar() {
    instalarInterface();
    observer.observe(document.body, { childList: true, subtree: true });
    [100, 400, 1000, 2000].forEach(atraso => window.setTimeout(instalarInterface, atraso));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
