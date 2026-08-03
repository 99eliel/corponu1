(() => {
  "use strict";

  const VERSION = "2026-08-03-antiduplicidade-rapida-101";
  const FIREBASE_VERSION = "10.12.5";
  const TTL_PROCESSAMENTO = 60000;
  const AUTORIZACAO_MS = 30000;

  if (window.__CORPONU_ANTIDUPLICIDADE_ISOLADA__ === VERSION) return;
  window.__CORPONU_ANTIDUPLICIDADE_ISOLADA__ = VERSION;

  let contextoPromise = null;
  const verificacoesEmCurso = new Set();
  const bloqueios = new WeakMap();
  const formulariosProtegidos = new Set([
    "formChegadaMovimentacao",
    "formChegadaManualFaccao",
    "formEntregaPagamento"
  ]);

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
    window.clearTimeout(window.__corponuAntidupToast101);
    window.__corponuAntidupToast101 = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 5500);
  }

  async function contextoFirebase() {
    if (contextoPromise) return contextoPromise;

    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModulo, firestore]) => {
      if (!appModulo.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appModulo.getApp();
      return {
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
    const valores = [op];
    const numerico = Number(op);
    if (Number.isFinite(numerico)) valores.push(numerico);

    const resultados = await Promise.all(valores.map(valor => {
      const consulta = firestore.query(
        firestore.collection(db, "entregasPagamento"),
        firestore.where("numeroOP", "==", valor)
      );
      return firestore.getDocs(consulta).catch(() => null);
    }));

    const unicos = new Map();
    resultados.forEach(snapshot => {
      snapshot?.docs?.forEach(documento => {
        const item = { id: documento.id, ...documento.data() };
        if (pagamentoAtivo(item)) unicos.set(item.id, item);
      });
    });
    return [...unicos.values()];
  }

  function bloquearBotao(form, mensagem) {
    const anterior = bloqueios.get(form);
    if (anterior) {
      if (anterior.botao && mensagem) anterior.botao.textContent = mensagem;
      return;
    }

    const botao = form.querySelector('button[type="submit"]');
    if (!botao) return;

    bloqueios.set(form, {
      botao,
      textoOriginal: botao.textContent,
      desabilitadoOriginal: botao.disabled
    });
    botao.disabled = true;
    botao.textContent = mensagem || "Salvando...";
  }

  function restaurarBotao(form) {
    const anterior = bloqueios.get(form);
    if (!anterior) return;
    anterior.botao.disabled = anterior.desabilitadoOriginal;
    anterior.botao.textContent = anterior.textoOriginal;
    bloqueios.delete(form);
  }

  function nomeReserva(chave) {
    return `corponu_antidup_${hash(chave)}`;
  }

  function criarReservaLocal(chave) {
    const nome = nomeReserva(chave);
    const agora = Date.now();

    try {
      const anterior = Number(localStorage.getItem(nome) || 0);
      if (agora - anterior < TTL_PROCESSAMENTO) return null;
      localStorage.setItem(nome, String(agora));
    } catch (error) {}

    return { nome, momento: agora };
  }

  function removerReservaLocal(reserva) {
    if (!reserva) return;
    try {
      const atual = Number(localStorage.getItem(reserva.nome) || 0);
      if (!atual || atual === reserva.momento) localStorage.removeItem(reserva.nome);
    } catch (error) {}
  }

  function autorizar(form, assinatura, reserva) {
    form.dataset.antidup101Assinatura = assinatura;
    form.dataset.antidup101Expira = String(Date.now() + AUTORIZACAO_MS);
    form.dataset.antidup101Processando = "1";
    form.__corponuAntidup101Reserva = reserva || null;
  }

  function assinaturaAutorizada(form, assinatura) {
    return form.dataset.antidup101Assinatura === assinatura &&
      Number(form.dataset.antidup101Expira || 0) > Date.now();
  }

  function limparAutorizacao(form) {
    removerReservaLocal(form.__corponuAntidup101Reserva);
    form.__corponuAntidup101Reserva = null;
    delete form.dataset.antidup101Assinatura;
    delete form.dataset.antidup101Expira;
    delete form.dataset.antidup101Processando;
    restaurarBotao(form);
  }

  function modalDoFormulario(form) {
    const ids = {
      formChegadaMovimentacao: "modalChegadaMovimentacao",
      formChegadaManualFaccao: "modalChegadaManualFaccao"
    };
    return document.getElementById(ids[form.id] || "");
  }

  function acompanharConclusao(form) {
    window.clearInterval(form.__corponuAntidup101Intervalo);
    window.clearTimeout(form.__corponuAntidup101Timeout);

    const modal = modalDoFormulario(form);
    const iniciouVisivel = modal ? !modal.classList.contains("hidden") : false;

    form.__corponuAntidup101Intervalo = window.setInterval(() => {
      const expirou = Number(form.dataset.antidup101Expira || 0) <= Date.now();
      const modalFechou = modal && iniciouVisivel && modal.classList.contains("hidden");
      const formularioResetou = form.id === "formEntregaPagamento" &&
        !texto(document.getElementById("entregaOP")?.value) &&
        !texto(document.getElementById("entregaQuantidade")?.value);

      if (expirou || modalFechou || formularioResetou) {
        window.clearInterval(form.__corponuAntidup101Intervalo);
        limparAutorizacao(form);
      }
    }, 250);

    form.__corponuAntidup101Timeout = window.setTimeout(() => {
      window.clearInterval(form.__corponuAntidup101Intervalo);
      limparAutorizacao(form);
    }, AUTORIZACAO_MS + 1000);
  }

  function liberarFormulario(form) {
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  }

  function extrairNumeroOP(valor) {
    const bruto = texto(valor);
    if (!bruto) return "";
    return texto(bruto.split(" - ")[0]).replace(/^OP\s*/i, "");
  }

  function assinaturaChegadaNormal() {
    const movimentacaoId = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    return movimentacaoId ? `chegada:${movimentacaoId}` : "chegada:sem-id";
  }

  function assinaturaChegadaManual() {
    const numeroOP = texto(document.getElementById("chegadaManualOP")?.value);
    const processo = normalizar(document.getElementById("chegadaManualProcesso")?.value);
    const faccao = normalizar(document.getElementById("chegadaManualFaccao")?.value);
    const data = texto(document.getElementById("chegadaManualDataChegada")?.value);
    const quantidade = inteiro(document.getElementById("chegadaManualQuantidade")?.value);
    return `chegada-manual:${numeroOP}:${processo}:${faccao}:${data}:${quantidade}`;
  }

  function assinaturaPagamentoManual() {
    const idAtual = texto(document.getElementById("entregaPagamentoId")?.value);
    if (idAtual) return `pagamento-edicao:${idAtual}`;
    const numeroOP = extrairNumeroOP(document.getElementById("entregaOP")?.value);
    const precoId = texto(document.getElementById("entregaPreco")?.value);
    const faccao = normalizar(document.getElementById("entregaFaccao")?.value);
    const data = texto(document.getElementById("entregaData")?.value);
    const quantidade = inteiro(document.getElementById("entregaQuantidade")?.value);
    return `pagamento-manual:${numeroOP}:${precoId}:${faccao}:${data}:${quantidade}`;
  }

  function assinaturaFormulario(form) {
    if (form.id === "formChegadaMovimentacao") return assinaturaChegadaNormal();
    if (form.id === "formChegadaManualFaccao") return assinaturaChegadaManual();
    return assinaturaPagamentoManual();
  }

  async function protegerChegadaNormal(form, assinatura) {
    const movimentacaoId = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    const reserva = criarReservaLocal(assinatura);
    if (!reserva) {
      avisar("Esta chegada já está sendo processada nesta máquina.");
      return;
    }

    verificacoesEmCurso.add(assinatura);
    bloquearBotao(form, "Verificando...");

    try {
      if (movimentacaoId) {
        const pagamentosExistentes = await pagamentosPorMovimentacao(movimentacaoId);
        if (pagamentosExistentes.length > 1) {
          avisar("Foram encontrados pagamentos duplicados nesta movimentação. Nenhum novo pagamento foi criado.", true);
          removerReservaLocal(reserva);
          restaurarBotao(form);
          return;
        }
        if (pagamentosExistentes.length === 1) {
          avisar("Esta movimentação já possui pagamento. A chegada não foi duplicada.");
          removerReservaLocal(reserva);
          restaurarBotao(form);
          return;
        }
      }

      autorizar(form, assinatura, reserva);
      bloquearBotao(form, "Salvando...");
      acompanharConclusao(form);
      liberarFormulario(form);
    } catch (error) {
      console.error("Erro na verificação rápida da chegada.", error);
      removerReservaLocal(reserva);
      restaurarBotao(form);
      avisar("Não foi possível verificar a duplicidade. A operação não foi realizada.", true);
    } finally {
      verificacoesEmCurso.delete(assinatura);
    }
  }

  async function protegerChegadaManual(form, assinatura) {
    const numeroOP = texto(document.getElementById("chegadaManualOP")?.value);
    const processo = normalizar(document.getElementById("chegadaManualProcesso")?.value);
    const faccao = normalizar(document.getElementById("chegadaManualFaccao")?.value);
    const data = texto(document.getElementById("chegadaManualDataChegada")?.value);
    const quantidade = inteiro(document.getElementById("chegadaManualQuantidade")?.value);

    const reserva = criarReservaLocal(assinatura);
    if (!reserva) {
      avisar("Este lançamento manual já está sendo processado.");
      return;
    }

    verificacoesEmCurso.add(assinatura);
    bloquearBotao(form, "Verificando...");

    try {
      if (numeroOP && processo && faccao && data && quantidade) {
        const pagamentos = await pagamentosPorNumeroOP(numeroOP);
        const duplicado = pagamentos.find(item =>
          normalizar(item.processo || item.servicoNome) === processo &&
          normalizar(item.faccao) === faccao &&
          texto(item.dataEntrega) === data &&
          inteiro(item.quantidade) === quantidade
        );

        if (duplicado) {
          avisar("Já existe um pagamento com a mesma OP, processo, facção, data e quantidade. O lançamento foi bloqueado.", true);
          removerReservaLocal(reserva);
          restaurarBotao(form);
          return;
        }
      }

      autorizar(form, assinatura, reserva);
      bloquearBotao(form, "Salvando...");
      acompanharConclusao(form);
      liberarFormulario(form);
    } catch (error) {
      console.error("Erro na verificação da chegada manual.", error);
      removerReservaLocal(reserva);
      restaurarBotao(form);
      avisar("Não foi possível verificar a duplicidade. O lançamento não foi realizado.", true);
    } finally {
      verificacoesEmCurso.delete(assinatura);
    }
  }

  async function protegerPagamentoManual(form, assinatura) {
    const idAtual = texto(document.getElementById("entregaPagamentoId")?.value);
    const reserva = criarReservaLocal(assinatura);
    if (!reserva) {
      avisar("Este pagamento já está sendo processado.");
      return;
    }

    verificacoesEmCurso.add(assinatura);
    bloquearBotao(form, idAtual ? "Salvando..." : "Verificando...");

    try {
      if (!idAtual) {
        const numeroOP = extrairNumeroOP(document.getElementById("entregaOP")?.value);
        const precoId = texto(document.getElementById("entregaPreco")?.value);
        const faccao = normalizar(document.getElementById("entregaFaccao")?.value);
        const data = texto(document.getElementById("entregaData")?.value);
        const quantidade = inteiro(document.getElementById("entregaQuantidade")?.value);

        if (numeroOP && precoId && faccao && data && quantidade) {
          const pagamentos = await pagamentosPorNumeroOP(numeroOP);
          const duplicado = pagamentos.find(item =>
            texto(item.precoReferenciaId || item.servicoId) === precoId &&
            normalizar(item.faccao) === faccao &&
            texto(item.dataEntrega) === data &&
            inteiro(item.quantidade) === quantidade
          );

          if (duplicado) {
            avisar("Já existe um pagamento igual para esta OP. O novo lançamento foi bloqueado.", true);
            removerReservaLocal(reserva);
            restaurarBotao(form);
            return;
          }
        }
      }

      autorizar(form, assinatura, reserva);
      bloquearBotao(form, "Salvando...");
      acompanharConclusao(form);
      liberarFormulario(form);
    } catch (error) {
      console.error("Erro na verificação do pagamento manual.", error);
      removerReservaLocal(reserva);
      restaurarBotao(form);
      avisar("Não foi possível verificar a duplicidade. O pagamento não foi criado.", true);
    } finally {
      verificacoesEmCurso.delete(assinatura);
    }
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !formulariosProtegidos.has(form.id)) return;

    const assinatura = assinaturaFormulario(form);
    if (assinaturaAutorizada(form, assinatura)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (verificacoesEmCurso.has(assinatura)) {
      avisar("Este registro já está sendo verificado.");
      return;
    }

    if (form.id === "formChegadaMovimentacao") {
      protegerChegadaNormal(form, assinatura);
      return;
    }
    if (form.id === "formChegadaManualFaccao") {
      protegerChegadaManual(form, assinatura);
      return;
    }
    protegerPagamentoManual(form, assinatura);
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target.closest('button[type="submit"]') : null;
    const form = alvo?.form;
    if (!(form instanceof HTMLFormElement) || !formulariosProtegidos.has(form.id)) return;
    if (form.dataset.antidup101Processando !== "1") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    avisar("Este registro já está sendo processado. Aguarde.");
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    const alvo = event.target instanceof Element ? event.target : null;
    const form = alvo?.closest("form");
    if (!(form instanceof HTMLFormElement) || !formulariosProtegidos.has(form.id)) return;
    if (form.dataset.antidup101Processando !== "1") return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.setTimeout(() => contextoFirebase().catch(() => {}), 0);
})();
