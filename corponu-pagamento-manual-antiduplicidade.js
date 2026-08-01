(() => {
  "use strict";

  const VERSION = "2026-08-01-antiduplicidade-cruzada-68";
  const FB = "10.12.5";
  const FORM_ID = "formPagamentoManualFinanceiro";
  const LIBERADO = "sf68AntiduplicidadeLiberado";
  const emAnalise = new Set();
  let contextoPromise = null;

  if (window.__CORPONU_PAGAMENTO_MANUAL_ANTIDUPLICIDADE__ === VERSION) return;
  window.__CORPONU_PAGAMENTO_MANUAL_ANTIDUPLICIDADE__ = VERSION;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  const inteiro = valor => Math.max(0, Math.floor(Number(valor || 0)));
  const ativo = item => item?.excluido !== true && ![
    "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
  ].includes(normalizar(item?.statusPagamento || item?.status));

  function avisar(mensagem, erro = true) {
    const toast = document.getElementById("toast");
    if (!toast) return window.alert(mensagem);
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = erro ? "#991b1b" : "#166534";
    window.clearTimeout(window.__sf68Toast);
    window.__sf68Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 7500);
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([app, auth, fs]) => {
      if (!app.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const firebaseApp = app.getApp();
      return { auth: auth.getAuth(firebaseApp), db: fs.getFirestore(firebaseApp), fs };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  async function aguardarUsuario(auth) {
    for (let tentativa = 0; tentativa < 40 && !auth.currentUser; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 150));
    }
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    return auth.currentUser;
  }

  function dadosFormulario() {
    return {
      numeroOP: texto(document.getElementById("pagManualNumeroOP")?.value),
      processo: texto(document.getElementById("pagManualProcesso")?.value),
      faccao: texto(document.getElementById("pagManualFaccao")?.value),
      dataChegada: texto(document.getElementById("pagManualDataChegada")?.value),
      quantidade: inteiro(document.getElementById("pagManualQuantidadeRecebida")?.value)
    };
  }

  function chaveDados(dados) {
    return [
      normalizar(dados.numeroOP),
      normalizar(dados.processo),
      normalizar(dados.faccao),
      dados.dataChegada,
      dados.quantidade
    ].join("|");
  }

  function processoDo(item) {
    return normalizar(item?.processo || item?.processoMovimentacao || item?.servicoNome);
  }

  function faccaoDo(item) {
    return normalizar(item?.destino || item?.faccao || item?.faccaoNome || item?.responsavel);
  }

  function dataDo(item) {
    return texto(item?.dataChegada || item?.dataEntrega || item?.dataRetorno).slice(0, 10);
  }

  function quantidadeDo(item) {
    const recebida = inteiro(item?.quantidadeRecebida || item?.quantidade);
    if (recebida > 0) return recebida;
    return Math.max(0, inteiro(item?.quantidadeEnviada) - inteiro(item?.falta));
  }

  function movimentoRecebido(item) {
    if (!ativo(item)) return false;
    if (dataDo(item)) return true;
    return [
      "RETORNOU", "RETORNOU PARCIAL", "RECEBIDO", "RECEBIDA",
      "CONCLUIDO", "CONCLUIDA", "FINALIZADO", "FINALIZADA"
    ].includes(normalizar(item?.status));
  }

  async function consultasPorCampo(fs, db, colecao, campo, valor) {
    const resultados = [];
    const usados = new Set();
    const valores = [valor];
    const numerico = Number(valor);
    if (Number.isFinite(numerico) && String(numerico) !== valor) valores.push(numerico);

    for (const item of valores) {
      try {
        const snap = await fs.getDocs(fs.query(
          fs.collection(db, colecao),
          fs.where(campo, "==", item)
        ));
        snap.docs.forEach(docSnap => {
          if (usados.has(docSnap.id)) return;
          usados.add(docSnap.id);
          resultados.push({ id: docSnap.id, ...docSnap.data() });
        });
      } catch (error) {
        console.warn(`Consulta ${colecao}.${campo} não disponível.`, error);
      }
    }
    return resultados;
  }

  async function localizarOpIds(fs, db, numeroOP) {
    const ids = new Set();
    for (const campo of ["numeroOP", "numeroOPExterno", "op"]) {
      const encontrados = await consultasPorCampo(fs, db, "ordensProducao", campo, numeroOP);
      encontrados.forEach(item => ids.add(item.id));
    }
    return [...ids];
  }

  async function carregarMovimentacoesRelacionadas(fs, db, dados) {
    const mapa = new Map();
    const porNumero = await consultasPorCampo(fs, db, "movimentacoesProducao", "numeroOP", dados.numeroOP);
    porNumero.forEach(item => mapa.set(item.id, item));

    const opIds = await localizarOpIds(fs, db, dados.numeroOP);
    for (const opId of opIds) {
      try {
        const snap = await fs.getDocs(fs.query(
          fs.collection(db, "movimentacoesProducao"),
          fs.where("opId", "==", opId)
        ));
        snap.docs.forEach(docSnap => mapa.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
      } catch (error) {
        console.warn("Não foi possível consultar movimentações por opId.", error);
      }
    }
    return [...mapa.values()];
  }

  async function carregarPagamentosRelacionados(fs, db, dados) {
    const mapa = new Map();
    for (const campo of ["numeroOP", "opNumero"]) {
      const encontrados = await consultasPorCampo(fs, db, "entregasPagamento", campo, dados.numeroOP);
      encontrados.forEach(item => mapa.set(item.id, item));
    }
    return [...mapa.values()];
  }

  function mesmoServico(item, dados) {
    return processoDo(item) === normalizar(dados.processo) &&
      faccaoDo(item) === normalizar(dados.faccao);
  }

  function conflitoMovimentacao(item, dados) {
    if (!movimentoRecebido(item) || !mesmoServico(item, dados)) return false;
    const mesmaData = dataDo(item) === dados.dataChegada;
    const mesmaQuantidade = quantidadeDo(item) === dados.quantidade;
    return mesmaData && mesmaQuantidade;
  }

  function conflitoPagamento(item, dados) {
    if (!ativo(item) || !mesmoServico(item, dados)) return false;
    const mesmaData = dataDo(item) === dados.dataChegada;
    const mesmaQuantidade = quantidadeDo(item) === dados.quantidade;
    return mesmaData && mesmaQuantidade;
  }

  async function verificarConflito(dados) {
    const { auth, db, fs } = await contexto();
    await aguardarUsuario(auth);

    const [movimentacoes, pagamentos] = await Promise.all([
      carregarMovimentacoesRelacionadas(fs, db, dados),
      carregarPagamentosRelacionados(fs, db, dados)
    ]);

    const movimento = movimentacoes.find(item => conflitoMovimentacao(item, dados));
    if (movimento) {
      return {
        tipo: "movimentacao",
        id: movimento.id,
        origem: movimento.origemManualPagamentos === true || movimento.origemManual === true
          ? "lançamento manual"
          : "saída/chegada normal"
      };
    }

    const pagamento = pagamentos.find(item => conflitoPagamento(item, dados));
    if (pagamento) {
      return {
        tipo: "pagamento",
        id: pagamento.id,
        origem: texto(pagamento.origemPagamento || pagamento.origem || "pagamento existente")
      };
    }

    return null;
  }

  function bloquearBotao(form) {
    const botao = form.querySelector('button[type="submit"]');
    if (!botao) return () => {};
    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Verificando duplicidade...";
    return () => {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    };
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== FORM_ID) return;

    if (form.dataset[LIBERADO] === "1") {
      delete form.dataset[LIBERADO];
      return;
    }

    // O módulo do cálculo do Sutiã Completo usa esta marcação para o último
    // reenvio interno. Nesse ponto a verificação já foi executada.
    if (form.dataset.sf65ManualLiberado === "1") return;

    const dados = dadosFormulario();
    if (!dados.numeroOP || !dados.processo || !dados.faccao || !dados.dataChegada || !dados.quantidade) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const chave = chaveDados(dados);
    if (emAnalise.has(chave)) {
      avisar("Este lançamento já está sendo verificado. Aguarde a conclusão.");
      return;
    }

    emAnalise.add(chave);
    const restaurar = bloquearBotao(form);

    (async () => {
      const conflito = await verificarConflito(dados);
      if (conflito) {
        avisar(
          `Lançamento bloqueado: já existe ${conflito.origem} para esta OP, facção, processo, data e quantidade. Registro: ${conflito.id}. Use o registro existente em vez de criar outro.`,
          true
        );
        return;
      }

      form.dataset[LIBERADO] = "1";
      restaurar();
      form.requestSubmit();
    })().catch(error => {
      console.error("Erro ao verificar duplicidade cruzada.", error);
      avisar("Não foi possível verificar duplicidade. Por segurança, o lançamento não foi salvo. Tente novamente.", true);
    }).finally(() => {
      emAnalise.delete(chave);
      restaurar();
    });
  }, true);
})();
