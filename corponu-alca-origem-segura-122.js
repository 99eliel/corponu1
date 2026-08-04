(() => {
  "use strict";

  const VERSION = "2026-08-04-alca-origem-segura-122";
  const FIREBASE_VERSION = "10.12.5";
  const VALOR_ALCA = 0.05;
  const ALCAS_POR_SUTIA = 2;
  const VALOR_POR_SUTIA = VALOR_ALCA * ALCAS_POR_SUTIA;
  const PRECO_ID = "valor-padrao-alca";
  const ALIASES_ALCA = ["ALÇA", "ALCA", "ALÇAS", "ALCAS"];

  if (window.__CORPONU_ALCA_ORIGEM_SEGURA_122__ === VERSION) return;
  window.__CORPONU_ALCA_ORIGEM_SEGURA_122__ = VERSION;

  let contextoPromise = null;
  let corrigindoPendencias = false;
  const agendamentos = new Map();

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

  function ehAlca(itemOuProcesso) {
    const processo = typeof itemOuProcesso === "object"
      ? (itemOuProcesso?.processo || itemOuProcesso?.servicoNome || itemOuProcesso?.processoMovimentacao || "")
      : itemOuProcesso;
    const chave = normalizar(processo);
    return chave === "ALCA" || chave === "ALCAS";
  }

  function statusBloqueado(item) {
    const status = normalizar(item?.statusPagamento || item?.statusFinanceiro || item?.status || "");
    return item?.pago === true || item?.quitado === true || item?.cancelado === true ||
      item?.excluido === true || [
        "PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA",
        "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
      ].includes(status);
  }

  function pagamentoSemValor(item) {
    if (!ehAlca(item) || statusBloqueado(item)) return false;
    const status = normalizar(item?.statusPagamento || "");
    return item?.valorPendente === true ||
      item?.valorManualFinanceiroPendente === true ||
      status === "SEM VALOR" ||
      status === "AGUARDANDO VALOR" ||
      !(numero(item?.valorUnitario) > 0) ||
      !(numero(item?.total ?? item?.valorTotal) > 0);
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

  async function aguardarUsuario(auth) {
    for (let tentativa = 0; tentativa < 30 && !auth.currentUser; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 150));
    }
    if (!auth.currentUser) throw new Error("Usuário ainda não autenticado.");
    return auth.currentUser;
  }

  function toast(mensagem, erro = false) {
    const principal = document.getElementById("toast");
    if (principal) {
      principal.textContent = mensagem;
      principal.classList.remove("hidden");
      principal.style.background = erro ? "#991b1b" : "#166534";
      window.clearTimeout(window.__corponuAlca122Toast);
      window.__corponuAlca122Toast = window.setTimeout(() => {
        principal.classList.add("hidden");
        principal.style.removeProperty("background");
      }, erro ? 8000 : 6000);
      return;
    }

    const aviso = document.createElement("div");
    aviso.textContent = mensagem;
    aviso.style.cssText = [
      "position:fixed", "right:18px", "bottom:18px", "z-index:1000005",
      "max-width:min(500px,calc(100vw - 32px))", "padding:14px 16px",
      "border-radius:13px", "box-shadow:0 18px 48px rgba(15,23,42,.28)",
      `background:${erro ? "#991b1b" : "#166534"}`, "color:#fff",
      "font:800 13px/1.45 Arial,sans-serif"
    ].join(";");
    document.body.appendChild(aviso);
    window.setTimeout(() => aviso.remove(), erro ? 8000 : 6000);
  }

  function quantidadeDoPagamento(pagamento, movimentacao) {
    const quantidadePagamento = numero(pagamento?.quantidade);
    if (quantidadePagamento > 0) return quantidadePagamento;
    const enviada = numero(movimentacao?.quantidadeEnviada ?? movimentacao?.quantidade);
    const falta = Math.max(0, numero(movimentacao?.falta));
    return Math.max(enviada - falta, 0);
  }

  function descontoDoPagamento(pagamento, movimentacao) {
    return Math.max(0, numero(
      pagamento?.descontoDefeito ?? pagamento?.descontoPorDefeito ??
      movimentacao?.descontoDefeito ?? movimentacao?.descontoPorDefeito ?? 0
    ));
  }

  function dadosCorrecao(pagamento, movimentacao, usuarioUid, agora) {
    const quantidade = quantidadeDoPagamento(pagamento, movimentacao);
    const quantidadeAlcas = quantidade * ALCAS_POR_SUTIA;
    const descontoDefeito = descontoDoPagamento(pagamento, movimentacao);
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
      valorPendente: false,
      valorManualFinanceiroPendente: false,
      formaValorPagamento: "valor_global_alca",
      motivoValorPendente: "",
      avisoPagamento: "",
      calculoAlca: "quantidade_sutias_x_2_x_0_05",
      atualizadoPor: usuarioUid || "",
      atualizadoEm: agora,
      versaoCorrecaoAlca: VERSION
    };
  }

  async function buscarPagamentosDaMovimentacao(firestore, db, movimentacaoId) {
    const consulta = firestore.query(
      firestore.collection(db, "entregasPagamento"),
      firestore.where("movimentacaoId", "==", movimentacaoId)
    );
    const snapshot = await firestore.getDocs(consulta);
    return snapshot.docs.map(documento => ({
      id: documento.id,
      referenciaDocumento: documento.ref,
      dados: documento.data()
    }));
  }

  async function corrigirMovimentacaoAlca(movimentacaoId, { silencioso = true } = {}) {
    if (!movimentacaoId) return { corrigidos: 0, encontrado: false };

    const { firestore, db, auth } = await contexto();
    const usuario = await aguardarUsuario(auth);
    const referenciaMovimento = firestore.doc(db, "movimentacoesProducao", movimentacaoId);
    const snapshotMovimento = await firestore.getDoc(referenciaMovimento);
    if (!snapshotMovimento.exists()) return { corrigidos: 0, encontrado: false };

    const movimentacao = { id: snapshotMovimento.id, ...snapshotMovimento.data() };
    if (!ehAlca(movimentacao) || movimentacao.tipoDestino !== "faccao" || !movimentacao.dataChegada) {
      return { corrigidos: 0, encontrado: true };
    }

    const pagamentos = await buscarPagamentosDaMovimentacao(firestore, db, movimentacaoId);
    if (!pagamentos.length) return { corrigidos: 0, encontrado: false };

    const candidatos = pagamentos.filter(item => pagamentoSemValor(item.dados));
    if (!candidatos.length) return { corrigidos: 0, encontrado: true };

    const lote = firestore.writeBatch(db);
    const agora = firestore.serverTimestamp();
    candidatos.forEach(item => {
      lote.set(
        item.referenciaDocumento,
        dadosCorrecao(item.dados, movimentacao, usuario.uid, agora),
        { merge: true }
      );
    });
    await lote.commit();

    if (!silencioso) {
      toast(`${candidatos.length} pagamento(s) de ALÇA corrigido(s) no próprio lançamento, sem criar duplicidade.`);
    }
    return { corrigidos: candidatos.length, encontrado: true };
  }

  function agendarCorrecaoMovimentacao(movimentacaoId) {
    if (!movimentacaoId) return;
    const chave = `mov:${movimentacaoId}`;
    if (agendamentos.has(chave)) return;

    const tarefa = (async () => {
      for (let tentativa = 0; tentativa < 12; tentativa += 1) {
        await new Promise(resolve => window.setTimeout(resolve, tentativa === 0 ? 650 : 450));
        try {
          const resultado = await corrigirMovimentacaoAlca(movimentacaoId);
          if (resultado.corrigidos > 0) {
            await new Promise(resolve => window.setTimeout(resolve, 900));
            await corrigirMovimentacaoAlca(movimentacaoId);
            return;
          }
          if (resultado.encontrado && tentativa >= 4) return;
        } catch (error) {
          if (tentativa === 11) console.error("Falha ao corrigir a chegada de ALÇA.", error);
        }
      }
    })().finally(() => agendamentos.delete(chave));

    agendamentos.set(chave, tarefa);
  }

  function timestampMovimentacao(item) {
    const valor = item?.criadoEm || item?.atualizadoEm;
    if (valor?.toMillis) return valor.toMillis();
    if (valor?.seconds) return valor.seconds * 1000;
    return 0;
  }

  async function localizarMovimentacaoManual(dadosFormulario) {
    const { firestore, db } = await contexto();
    const consulta = firestore.query(
      firestore.collection(db, "movimentacoesProducao"),
      firestore.where("numeroOP", "==", dadosFormulario.numeroOP)
    );
    const snapshot = await firestore.getDocs(consulta);
    const candidatos = snapshot.docs
      .map(documento => ({ id: documento.id, ...documento.data() }))
      .filter(item => {
        if (!ehAlca(item) || item.tipoDestino !== "faccao" || !item.dataChegada) return false;
        if (dadosFormulario.referencia && normalizar(item.referencia) !== normalizar(dadosFormulario.referencia)) return false;
        if (dadosFormulario.faccao && normalizar(item.destinoNome) !== normalizar(dadosFormulario.faccao)) return false;
        if (dadosFormulario.dataChegada && texto(item.dataChegada) !== dadosFormulario.dataChegada) return false;
        return true;
      })
      .sort((a, b) => timestampMovimentacao(b) - timestampMovimentacao(a));

    return candidatos[0] || null;
  }

  function agendarCorrecaoChegadaManual(dadosFormulario) {
    const chave = `manual:${dadosFormulario.numeroOP}:${dadosFormulario.referencia}:${dadosFormulario.dataChegada}:${dadosFormulario.faccao}`;
    if (agendamentos.has(chave)) return;

    const tarefa = (async () => {
      for (let tentativa = 0; tentativa < 12; tentativa += 1) {
        await new Promise(resolve => window.setTimeout(resolve, tentativa === 0 ? 750 : 500));
        try {
          const movimentacao = await localizarMovimentacaoManual(dadosFormulario);
          if (!movimentacao) continue;
          agendarCorrecaoMovimentacao(movimentacao.id);
          return;
        } catch (error) {
          if (tentativa === 11) console.error("Falha ao localizar a chegada manual de ALÇA.", error);
        }
      }
    })().finally(() => agendamentos.delete(chave));

    agendamentos.set(chave, tarefa);
  }

  function capturarSubmissoes(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.id === "formChegadaMovimentacao") {
      const movimentacaoId = texto(document.getElementById("chegadaMovimentacaoId")?.value);
      if (movimentacaoId) agendarCorrecaoMovimentacao(movimentacaoId);
      return;
    }

    if (form.id !== "formChegadaManualFaccao") return;
    const processo = document.getElementById("chegadaManualProcesso")?.value || "";
    if (!ehAlca(processo)) return;

    agendarCorrecaoChegadaManual({
      numeroOP: texto(document.getElementById("chegadaManualOP")?.value),
      referencia: texto(document.getElementById("chegadaManualRef")?.value),
      faccao: texto(document.getElementById("chegadaManualFaccao")?.value),
      dataChegada: texto(document.getElementById("chegadaManualDataChegada")?.value)
    });
  }

  async function consultarPendenciasAlca() {
    const { firestore, db } = await contexto();
    const encontrados = new Map();
    const colecao = firestore.collection(db, "entregasPagamento");
    const consultas = [
      firestore.query(colecao, firestore.where("processo", "in", ALIASES_ALCA)),
      firestore.query(colecao, firestore.where("setor", "==", "alca"))
    ];

    for (const consulta of consultas) {
      try {
        const snapshot = await firestore.getDocs(consulta);
        snapshot.docs.forEach(documento => {
          const dados = documento.data();
          if (ehAlca(dados) && pagamentoSemValor(dados)) {
            encontrados.set(documento.id, {
              id: documento.id,
              referenciaDocumento: documento.ref,
              dados
            });
          }
        });
      } catch (error) {
        console.warn("Uma consulta específica de ALÇA não pôde ser concluída.", error);
      }
    }
    return [...encontrados.values()];
  }

  async function corrigirPendenciasAlcaExistentes(botao) {
    if (corrigindoPendencias) return;
    if (!window.confirm(
      "Aplicar a regra fixa da ALÇA nos lançamentos que ainda estão em Aguardando valor?\n\n" +
      "Cálculo: quantidade de sutiãs × 2 alças × R$ 0,05.\n" +
      "Os documentos serão corrigidos no próprio ID; nenhum lançamento será apagado ou duplicado."
    )) return;

    corrigindoPendencias = true;
    const textoOriginal = botao?.textContent || "Corrigir pendências de ALÇA";
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Corrigindo somente ALÇA...";
    }

    try {
      const { firestore, db, auth } = await contexto();
      const usuario = await aguardarUsuario(auth);
      const pendencias = await consultarPendenciasAlca();
      if (!pendencias.length) {
        toast("Não há pagamentos de ALÇA aguardando valor.");
        return;
      }

      let corrigidos = 0;
      for (let inicio = 0; inicio < pendencias.length; inicio += 350) {
        const grupo = pendencias.slice(inicio, inicio + 350);
        const lote = firestore.writeBatch(db);
        const agora = firestore.serverTimestamp();

        for (const item of grupo) {
          let movimentacao = null;
          if (item.dados?.movimentacaoId) {
            const movSnapshot = await firestore.getDoc(
              firestore.doc(db, "movimentacoesProducao", item.dados.movimentacaoId)
            );
            if (movSnapshot.exists()) movimentacao = movSnapshot.data();
          }

          lote.set(
            item.referenciaDocumento,
            dadosCorrecao(item.dados, movimentacao, usuario.uid, agora),
            { merge: true }
          );
          corrigidos += 1;
        }
        await lote.commit();
      }

      toast(`${corrigidos} pagamento(s) de ALÇA corrigido(s). Os lançamentos foram preservados e passaram para pagamento pendente normal.`);
    } catch (error) {
      console.error("Não foi possível corrigir as pendências de ALÇA.", error);
      toast(error?.message || "Não foi possível corrigir as pendências de ALÇA.", true);
    } finally {
      corrigindoPendencias = false;
      if (botao) {
        botao.disabled = false;
        botao.textContent = textoOriginal;
      }
    }
  }

  function instalarBotaoCorrecao() {
    if (document.getElementById("btnCorrigirPendenciasAlca122")) return;
    const form = document.getElementById("formValorPadraoAlca");
    if (!form) return;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.id = "btnCorrigirPendenciasAlca122";
    botao.textContent = "Corrigir pendências de ALÇA (R$ 0,05)";
    botao.style.cssText = [
      "margin-top:10px", "width:100%", "min-height:42px", "border-radius:10px",
      "border:1px solid #16a34a", "background:#ecfdf5", "color:#166534",
      "font-weight:900", "cursor:pointer"
    ].join(";");
    botao.addEventListener("click", () => corrigirPendenciasAlcaExistentes(botao));
    form.appendChild(botao);
  }

  function programarInstalacaoBotao() {
    [100, 500, 1200, 2500].forEach(atraso => window.setTimeout(instalarBotaoCorrecao, atraso));
  }

  document.addEventListener("submit", capturarSubmissoes, true);
  document.addEventListener("click", event => {
    if (event.target?.closest?.('[data-page="pagamentos"], .nav-btn[data-page="pagamentos"], #btnGerenciarValores')) {
      programarInstalacaoBotao();
    }
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", programarInstalacaoBotao, { once: true });
  } else {
    programarInstalacaoBotao();
  }
})();
