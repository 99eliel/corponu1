(() => {
  "use strict";

  const VERSION = "2026-08-01-antiduplicidade-isolada-84";
  const FIREBASE_VERSION = "10.12.5";
  const TTL_PROCESSAMENTO = 45000;

  if (window.__CORPONU_ANTIDUPLICIDADE_ISOLADA__ === VERSION) return;
  window.__CORPONU_ANTIDUPLICIDADE_ISOLADA__ = VERSION;

  let contextoPromise = null;
  const verificacoesEmCurso = new Set();

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function inteiro(valor) {
    const numero = Number(valor || 0);
    return Number.isFinite(numero) ? Math.max(0, Math.floor(numero)) : 0;
  }

  function hash(valor) {
    let resultado = 2166136261;
    for (const caractere of String(valor || "")) {
      resultado ^= caractere.charCodeAt(0);
      resultado = Math.imul(resultado, 16777619);
    }
    return (resultado >>> 0).toString(36);
  }

  function pagamentoAtivo(dados) {
    const status = normalizar(dados?.statusPagamento || dados?.status || "pendente");
    return dados?.excluido !== true && ![
      "CANCELADO",
      "CANCELADA",
      "ESTORNADO",
      "ESTORNADA",
      "EXCLUIDO",
      "EXCLUIDA"
    ].includes(status);
  }

  function avisar(mensagem, erro = false) {
    const toast = document.getElementById("toast");
    if (!toast) {
      window.alert(mensagem);
      return;
    }

    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = erro ? "#991b1b" : "";
    window.clearTimeout(window.__corponuAntidupToast84);
    window.__corponuAntidupToast84 = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 5500);
  }

  async function contextoFirebase() {
    if (contextoPromise) return contextoPromise;

    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModulo, authModulo, firestore]) => {
      if (!appModulo.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appModulo.getApp();
      return {
        auth: authModulo.getAuth(app),
        db: firestore.getFirestore(app),
        firestore
      };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });

    return contextoPromise;
  }

  async function pagamentosPorMovimentacao(movimentacaoId) {
    const { db, firestore } = await contextoFirebase();
    const consulta = firestore.query(
      firestore.collection(db, "entregasPagamento"),
      firestore.where("movimentacaoId", "==", movimentacaoId)
    );
    const snapshot = await firestore.getDocs(consulta);
    return snapshot.docs
      .map(documento => ({ id: documento.id, ...documento.data() }))
      .filter(pagamentoAtivo);
  }

  async function pagamentosPorNumeroOP(numeroOP) {
    const op = texto(numeroOP);
    if (!op) return [];

    const { db, firestore } = await contextoFirebase();
    const consulta = firestore.query(
      firestore.collection(db, "entregasPagamento"),
      firestore.where("numeroOP", "==", op)
    );
    const snapshot = await firestore.getDocs(consulta);
    return snapshot.docs
      .map(documento => ({ id: documento.id, ...documento.data() }))
      .filter(pagamentoAtivo);
  }

  function bloquearBotao(form, mensagem = "Verificando duplicidade...") {
    const botao = form.querySelector('button[type="submit"]');
    if (!botao) return () => {};

    const textoOriginal = botao.textContent;
    const desabilitadoOriginal = botao.disabled;
    botao.disabled = true;
    botao.textContent = mensagem;

    return () => {
      botao.disabled = desabilitadoOriginal;
      botao.textContent = textoOriginal;
    };
  }

  function liberarFormulario(form, marcador) {
    form.dataset[marcador] = "1";
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  }

  function criarReservaLocal(chave) {
    const nome = `corponu_antidup_${hash(chave)}`;
    const agora = Date.now();

    try {
      const anterior = Number(localStorage.getItem(nome) || 0);
      if (agora - anterior < TTL_PROCESSAMENTO) return false;
      localStorage.setItem(nome, String(agora));
      window.setTimeout(() => {
        try {
          const atual = Number(localStorage.getItem(nome) || 0);
          if (atual === agora) localStorage.removeItem(nome);
        } catch (error) {}
      }, TTL_PROCESSAMENTO + 1000);
    } catch (error) {}

    return true;
  }

  async function reservarMovimentacao(movimentacaoId) {
    const { auth, db, firestore } = await contextoFirebase();
    const referencia = firestore.doc(db, "movimentacoesProducao", movimentacaoId);
    const agora = Date.now();

    await firestore.runTransaction(db, async transacao => {
      const snapshot = await transacao.get(referencia);
      if (!snapshot.exists()) throw new Error("MOVIMENTACAO_NAO_ENCONTRADA");

      const dados = snapshot.data() || {};
      const inicioAnterior = Number(dados.antiduplicidadePagamentoEmMs || 0);
      const processando = dados.antiduplicidadePagamentoProcessando === true &&
        agora - inicioAnterior < TTL_PROCESSAMENTO;

      if (processando) throw new Error("PAGAMENTO_PROCESSANDO");

      transacao.set(referencia, {
        antiduplicidadePagamentoProcessando: true,
        antiduplicidadePagamentoEmMs: agora,
        antiduplicidadePagamentoVersao: VERSION,
        antiduplicidadePagamentoPor: auth.currentUser?.uid || "",
        atualizadoEm: firestore.serverTimestamp()
      }, { merge: true });
    });
  }

  async function finalizarReservaMovimentacao(movimentacaoId, pagamento = null) {
    try {
      const { auth, db, firestore } = await contextoFirebase();
      const dados = {
        antiduplicidadePagamentoProcessando: false,
        antiduplicidadePagamentoFinalizadaEmMs: Date.now(),
        antiduplicidadePagamentoVersao: VERSION,
        antiduplicidadePagamentoPor: auth.currentUser?.uid || "",
        atualizadoEm: firestore.serverTimestamp()
      };

      if (pagamento) {
        dados.pagamentoGerado = true;
        dados.pagamentoId = pagamento.id;
        dados.pagamentoGeradoEm = firestore.serverTimestamp();
      }

      await firestore.setDoc(
        firestore.doc(db, "movimentacoesProducao", movimentacaoId),
        dados,
        { merge: true }
      );
    } catch (error) {
      console.warn("Não foi possível finalizar a reserva de pagamento.", error);
    }
  }

  async function monitorarPagamentoDaMovimentacao(movimentacaoId) {
    for (const espera of [500, 900, 1500, 2500, 4000]) {
      await new Promise(resolve => window.setTimeout(resolve, espera));
      const pagamentos = await pagamentosPorMovimentacao(movimentacaoId);

      if (pagamentos.length) {
        await finalizarReservaMovimentacao(movimentacaoId, pagamentos[0]);
        return;
      }
    }

    await finalizarReservaMovimentacao(movimentacaoId, null);
  }

  async function protegerChegadaNormal(form) {
    const movimentacaoId = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    if (!movimentacaoId) {
      liberarFormulario(form, "antidup84Liberado");
      return;
    }

    const chave = `chegada:${movimentacaoId}`;
    if (verificacoesEmCurso.has(chave)) {
      avisar("Esta chegada já está sendo verificada.");
      return;
    }

    verificacoesEmCurso.add(chave);
    const restaurar = bloquearBotao(form);

    try {
      const pagamentosExistentes = await pagamentosPorMovimentacao(movimentacaoId);

      if (pagamentosExistentes.length > 1) {
        avisar("Foram encontrados pagamentos duplicados nesta movimentação. Nenhum novo pagamento foi criado.", true);
        return;
      }

      if (pagamentosExistentes.length === 1) {
        avisar("Esta movimentação já possui pagamento. A chegada não foi duplicada.");
        return;
      }

      await reservarMovimentacao(movimentacaoId);
      liberarFormulario(form, "antidup84Liberado");

      monitorarPagamentoDaMovimentacao(movimentacaoId).catch(async error => {
        console.error("Erro ao acompanhar a geração do pagamento.", error);
        await finalizarReservaMovimentacao(movimentacaoId, null);
      });
    } catch (error) {
      console.error("Erro na verificação de duplicidade da chegada.", error);
      const mensagem = error?.message === "PAGAMENTO_PROCESSANDO"
        ? "Esta chegada já está sendo processada em outra aba ou por outro usuário."
        : error?.message === "MOVIMENTACAO_NAO_ENCONTRADA"
          ? "A movimentação não foi encontrada."
          : "Não foi possível verificar a duplicidade. A operação não foi realizada.";
      avisar(mensagem, true);
    } finally {
      window.setTimeout(restaurar, 1200);
      verificacoesEmCurso.delete(chave);
    }
  }

  function extrairNumeroOP(valor) {
    const bruto = texto(valor);
    if (!bruto) return "";
    return texto(bruto.split(" - ")[0]).replace(/^OP\s*/i, "");
  }

  async function protegerChegadaManual(form) {
    const numeroOP = texto(document.getElementById("chegadaManualOP")?.value);
    const processo = normalizar(document.getElementById("chegadaManualProcesso")?.value);
    const faccao = normalizar(document.getElementById("chegadaManualFaccao")?.value);
    const data = texto(document.getElementById("chegadaManualDataChegada")?.value);
    const quantidade = inteiro(document.getElementById("chegadaManualQuantidade")?.value);

    if (!numeroOP || !processo || !faccao || !data || !quantidade) {
      liberarFormulario(form, "antidup84Liberado");
      return;
    }

    const chave = `chegada-manual:${numeroOP}:${processo}:${faccao}:${data}:${quantidade}`;
    if (verificacoesEmCurso.has(chave) || !criarReservaLocal(chave)) {
      avisar("Este lançamento manual já está sendo processado.");
      return;
    }

    verificacoesEmCurso.add(chave);
    const restaurar = bloquearBotao(form);

    try {
      const pagamentos = await pagamentosPorNumeroOP(numeroOP);
      const duplicado = pagamentos.find(item =>
        normalizar(item.processo || item.servicoNome) === processo &&
        normalizar(item.faccao) === faccao &&
        texto(item.dataEntrega) === data &&
        inteiro(item.quantidade) === quantidade
      );

      if (duplicado) {
        avisar("Já existe um pagamento com a mesma OP, processo, facção, data e quantidade. O lançamento foi bloqueado.", true);
        return;
      }

      liberarFormulario(form, "antidup84Liberado");
    } catch (error) {
      console.error("Erro na verificação da chegada manual.", error);
      avisar("Não foi possível verificar a duplicidade. O lançamento não foi realizado.", true);
    } finally {
      window.setTimeout(restaurar, 1200);
      verificacoesEmCurso.delete(chave);
    }
  }

  async function protegerPagamentoManual(form) {
    const idAtual = texto(document.getElementById("entregaPagamentoId")?.value);
    if (idAtual) {
      liberarFormulario(form, "antidup84Liberado");
      return;
    }

    const numeroOP = extrairNumeroOP(document.getElementById("entregaOP")?.value);
    const precoId = texto(document.getElementById("entregaPreco")?.value);
    const faccao = normalizar(document.getElementById("entregaFaccao")?.value);
    const data = texto(document.getElementById("entregaData")?.value);
    const quantidade = inteiro(document.getElementById("entregaQuantidade")?.value);

    if (!numeroOP || !precoId || !faccao || !data || !quantidade) {
      liberarFormulario(form, "antidup84Liberado");
      return;
    }

    const chave = `pagamento-manual:${numeroOP}:${precoId}:${faccao}:${data}:${quantidade}`;
    if (verificacoesEmCurso.has(chave) || !criarReservaLocal(chave)) {
      avisar("Este pagamento já está sendo processado.");
      return;
    }

    verificacoesEmCurso.add(chave);
    const restaurar = bloquearBotao(form);

    try {
      const pagamentos = await pagamentosPorNumeroOP(numeroOP);
      const duplicado = pagamentos.find(item =>
        texto(item.precoReferenciaId || item.servicoId) === precoId &&
        normalizar(item.faccao) === faccao &&
        texto(item.dataEntrega) === data &&
        inteiro(item.quantidade) === quantidade
      );

      if (duplicado) {
        avisar("Já existe um pagamento igual para esta OP. O novo lançamento foi bloqueado.", true);
        return;
      }

      liberarFormulario(form, "antidup84Liberado");
    } catch (error) {
      console.error("Erro na verificação do pagamento manual.", error);
      avisar("Não foi possível verificar a duplicidade. O pagamento não foi criado.", true);
    } finally {
      window.setTimeout(restaurar, 1200);
      verificacoesEmCurso.delete(chave);
    }
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    const formulariosProtegidos = new Set([
      "formChegadaMovimentacao",
      "formChegadaManualFaccao",
      "formEntregaPagamento"
    ]);

    if (!formulariosProtegidos.has(form.id)) return;

    if (form.dataset.antidup84Liberado === "1") {
      delete form.dataset.antidup84Liberado;
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (form.id === "formChegadaMovimentacao") {
      protegerChegadaNormal(form);
      return;
    }

    if (form.id === "formChegadaManualFaccao") {
      protegerChegadaManual(form);
      return;
    }

    protegerPagamentoManual(form);
  }, true);
})();
