(() => {
  "use strict";

  const VERSION = "2026-08-08-pagamentos-historico-seguro-159";
  const FIREBASE_VERSION = "10.12.5";
  const CONFIG_ID = "pagamentosHistoricosV1";
  const CONFIG_COLLECTION = "configuracoes";
  const MAX_BATCH = 400;
  const TTL_EXECUCAO = 10 * 60 * 1000;

  if (window.__CORPONU_PAGAMENTOS_HISTORICO_SEGURO__ === VERSION) return;
  window.__CORPONU_PAGAMENTOS_HISTORICO_SEGURO__ = VERSION;

  let contextoPromise = null;
  let usuarioAtual = null;
  let unsubscribeNovosPagamentos = null;
  let observerStatus = null;
  const verificandoDuplicidade = new Set();

  const texto = valor => String(valor ?? "").trim();

  function normalizar(valor) {
    return texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function inteiro(valor) {
    const numero = Number(valor || 0);
    return Number.isFinite(numero) ? Math.max(0, Math.floor(numero)) : 0;
  }

  function numero(valor) {
    const n = Number(valor || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function processoPagamento(item) {
    return normalizar(item?.processo || item?.servicoNome || item?.processoMovimentacao || "");
  }

  function faccaoPagamento(item) {
    return normalizar(item?.faccao || item?.destino || "");
  }

  function opPagamento(item) {
    return normalizar(item?.numeroOP || item?.numeroOp || item?.op || item?.opId || "");
  }

  function quantidadePagamento(item) {
    return inteiro(item?.quantidade ?? item?.quantidadeRecebida ?? item?.quantidadeEnviada ?? 0);
  }

  function dataPagamento(item) {
    return texto(item?.dataEntrega || item?.dataChegada || "").slice(0, 10);
  }

  function chaveServico(item) {
    const op = opPagamento(item);
    const processo = processoPagamento(item);
    const faccao = faccaoPagamento(item);
    const quantidade = quantidadePagamento(item);
    if (!op || !processo || !faccao || quantidade <= 0) return "";
    return `${op}|${processo}|${faccao}|${quantidade}`;
  }

  function chaveEntrega(item) {
    const base = chaveServico(item);
    const data = dataPagamento(item);
    return base && data ? `${base}|${data}` : "";
  }

  function ehControleInterno(item) {
    if (!item) return true;
    if (item.controleProcessoV2 === true || item.controle_processo_v2 === true || item.registroControle === true) return true;
    const assinatura = normalizar([
      item.tipoRegistro,
      item.origem,
      item.tipo,
      item.categoria,
      item.id
    ].filter(Boolean).join(" "));
    return assinatura.includes("CONTROLE PROCESSO") ||
      assinatura.includes("CONTROLE PAGAMENTO") ||
      assinatura.includes("REGISTRO CONTROLE");
  }

  function ehPagamentoReal(item) {
    if (!item || ehControleInterno(item)) return false;
    if (item.excluido === true) return false;
    const status = normalizar(item.statusPagamento || item.status || "");
    return !["EXCLUIDO", "EXCLUIDA", "CANCELADO", "CANCELADA", "ESTORNADO", "ESTORNADA"].includes(status);
  }

  function ehReenvioOuComplemento(item) {
    return item?.pagamentoReenvio === true ||
      item?.pagamentoComplementarRestante === true ||
      Boolean(texto(item?.movimentacaoOrigemId)) ||
      normalizar(item?.origem).includes("RESTANTE");
  }

  function millisTimestamp(valor) {
    try {
      if (valor?.toMillis) return valor.toMillis();
      if (valor?.seconds) return Number(valor.seconds) * 1000;
      if (valor instanceof Date) return valor.getTime();
      if (typeof valor === "number") return valor;
      const data = Date.parse(valor || "");
      return Number.isFinite(data) ? data : 0;
    } catch (error) {
      return 0;
    }
  }

  function avisar(mensagem, tipo = "normal") {
    const toast = document.getElementById("toast");
    if (!toast) {
      if (tipo === "erro") console.error(mensagem);
      else console.info(mensagem);
      return;
    }
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    const corAnterior = toast.style.background;
    if (tipo === "erro") toast.style.background = "#991b1b";
    if (tipo === "ok") toast.style.background = "#166534";
    window.clearTimeout(window.__corponuHistorico159Toast);
    window.__corponuHistorico159Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = corAnterior;
    }, 6000);
  }

  async function esperarFirebase() {
    const [appModulo, authModulo, firestore] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]);

    for (let tentativa = 0; tentativa < 60; tentativa += 1) {
      if (appModulo.getApps().length) {
        const app = appModulo.getApp();
        return {
          app,
          auth: authModulo.getAuth(app),
          db: firestore.getFirestore(app),
          authModulo,
          firestore
        };
      }
      await new Promise(resolve => window.setTimeout(resolve, 200));
    }

    throw new Error("Firebase não foi inicializado a tempo.");
  }

  function contextoFirebase() {
    if (!contextoPromise) {
      contextoPromise = esperarFirebase().catch(error => {
        contextoPromise = null;
        throw error;
      });
    }
    return contextoPromise;
  }

  async function carregarPerfil(uid) {
    const { db, firestore } = await contextoFirebase();
    const snap = await firestore.getDoc(firestore.doc(db, "usuarios", uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  async function carregarConfiguracao() {
    const { db, firestore } = await contextoFirebase();
    const ref = firestore.doc(db, CONFIG_COLLECTION, CONFIG_ID);
    const snap = await firestore.getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  function statusMigracaoConcluido(config) {
    return config?.status === "concluida" && Number(config?.corteEpoch || 0) > 0;
  }

  async function reivindicarMigracao(user) {
    const { db, firestore } = await contextoFirebase();
    const ref = firestore.doc(db, CONFIG_COLLECTION, CONFIG_ID);
    const agora = Date.now();

    return firestore.runTransaction(db, async transacao => {
      const snap = await transacao.get(ref);
      const atual = snap.exists() ? snap.data() : {};

      if (atual.status === "concluida" && Number(atual.corteEpoch || 0) > 0) {
        return { executar: false, config: atual };
      }

      const inicioAnterior = Number(atual.inicioEpoch || 0);
      const emExecucaoRecente = atual.status === "executando" &&
        inicioAnterior > 0 &&
        (agora - inicioAnterior) < TTL_EXECUCAO &&
        texto(atual.iniciadaPor) !== texto(user.uid);

      if (emExecucaoRecente) {
        return { executar: false, config: atual };
      }

      const corteEpoch = Number(atual.corteEpoch || 0) || agora;
      const patch = {
        status: "executando",
        versao: VERSION,
        corteEpoch,
        inicioEpoch: agora,
        iniciadaPor: user.uid,
        iniciadaPorEmail: user.email || "",
        iniciadaEm: firestore.serverTimestamp(),
        ultimaTentativaEm: firestore.serverTimestamp()
      };

      transacao.set(ref, patch, { merge: true });
      return { executar: true, corteEpoch, config: { ...atual, ...patch } };
    });
  }

  async function gravarLogMigracao(user, detalhes) {
    try {
      const { db, firestore } = await contextoFirebase();
      await firestore.addDoc(firestore.collection(db, "logsAlteracoes"), {
        acao: "migracao_pagamentos_historicos",
        entidade: "entregasPagamento",
        entidadeId: CONFIG_ID,
        detalhes,
        usuarioId: user.uid,
        usuarioEmail: user.email || "",
        criadoEm: firestore.serverTimestamp(),
        versao: VERSION
      });
    } catch (error) {
      console.warn("[Pagamentos histórico 159] Não foi possível registrar o log da migração.", error);
    }
  }

  async function executarMigracao(user) {
    const perfil = await carregarPerfil(user.uid).catch(() => null);
    if (!perfil || perfil.ativo === false || perfil.tipo !== "admin") {
      return carregarConfiguracao().catch(() => null);
    }

    const reivindicacao = await reivindicarMigracao(user);
    if (!reivindicacao.executar) return reivindicacao.config || carregarConfiguracao().catch(() => null);

    const { db, firestore } = await contextoFirebase();
    const configRef = firestore.doc(db, CONFIG_COLLECTION, CONFIG_ID);
    const corteEpoch = Number(reivindicacao.corteEpoch || Date.now());

    let totalAnalisados = 0;
    let totalMarcados = 0;
    let totalIgnorados = 0;
    let totalPosCorte = 0;

    try {
      avisar("Protegendo os pagamentos que já existiam. Valores e status serão preservados.");

      const snapshot = await firestore.getDocs(firestore.collection(db, "entregasPagamento"));
      totalAnalisados = snapshot.size;

      let batch = firestore.writeBatch(db);
      let operacoes = 0;

      const commitSeNecessario = async (forcar = false) => {
        if (!operacoes || (!forcar && operacoes < MAX_BATCH)) return;
        await batch.commit();
        batch = firestore.writeBatch(db);
        operacoes = 0;
      };

      for (const documento of snapshot.docs) {
        const item = { id: documento.id, ...documento.data() };

        if (!ehPagamentoReal(item)) {
          totalIgnorados += 1;
          continue;
        }

        if (item.pagamentoHistorico === true && item.historicoProtegido === true) {
          totalIgnorados += 1;
          continue;
        }

        const criadoEmMillis = millisTimestamp(item.criadoEm);
        if (criadoEmMillis > corteEpoch) {
          totalPosCorte += 1;
          continue;
        }

        const servico = chaveServico(item);
        const entrega = chaveEntrega(item);
        const statusOriginal = texto(item.statusPagamento || "pendente") || "pendente";
        const valorOriginal = numero(item.total ?? item.subtotal ?? 0);

        batch.set(documento.ref, {
          pagamentoHistorico: true,
          historicoProtegido: true,
          origemFinanceira: "historico",
          tipoOrigemPagamento: "historico",
          chaveHistoricaServico: servico,
          chaveHistoricaEntrega: entrega,
          statusHistoricoOriginal: statusOriginal,
          valorHistoricoPreservado: valorOriginal,
          migracaoHistoricaVersao: VERSION,
          migradoHistoricoPor: user.uid,
          migradoHistoricoEm: firestore.serverTimestamp()
        }, { merge: true });

        totalMarcados += 1;
        operacoes += 1;
        await commitSeNecessario(false);
      }

      await commitSeNecessario(true);

      await firestore.setDoc(configRef, {
        status: "concluida",
        versao: VERSION,
        corteEpoch,
        concluidaPor: user.uid,
        concluidaPorEmail: user.email || "",
        concluidaEm: firestore.serverTimestamp(),
        totalAnalisados,
        totalMarcados,
        totalIgnorados,
        totalPosCorte,
        regra: "Preserva valor e status originais; novos pagamentos iguais ao histórico são bloqueados sem apagar o registro antigo."
      }, { merge: true });

      await gravarLogMigracao(
        user,
        `Histórico protegido: ${totalMarcados} | analisados: ${totalAnalisados} | ignorados: ${totalIgnorados} | pós-corte: ${totalPosCorte}. Nenhum valor ou status original foi recalculado.`
      );

      avisar(`Histórico financeiro protegido: ${totalMarcados.toLocaleString("pt-BR")} pagamento(s) preservado(s).`, "ok");
      return carregarConfiguracao();
    } catch (error) {
      console.error("[Pagamentos histórico 159] Erro na migração segura.", error);
      try {
        await firestore.setDoc(configRef, {
          status: "erro",
          versao: VERSION,
          corteEpoch,
          erroMensagem: texto(error?.message || error),
          erroEm: firestore.serverTimestamp(),
          ultimaTentativaPor: user.uid
        }, { merge: true });
      } catch (erroConfig) {
        console.warn("[Pagamentos histórico 159] Não foi possível salvar o estado de erro.", erroConfig);
      }
      avisar("Não foi possível concluir a proteção dos pagamentos antigos. Nenhum valor foi apagado ou recalculado.", "erro");
      return null;
    }
  }

  async function buscarHistorico(campo, chave) {
    if (!chave) return [];
    const { db, firestore } = await contextoFirebase();
    const consulta = firestore.query(
      firestore.collection(db, "entregasPagamento"),
      firestore.where(campo, "==", chave),
      firestore.limit(5)
    );
    const snapshot = await firestore.getDocs(consulta);
    return snapshot.docs
      .map(documento => ({ id: documento.id, ...documento.data() }))
      .filter(item => item.pagamentoHistorico === true && item.historicoProtegido === true && ehPagamentoReal(item));
  }

  async function registrarBloqueioDuplicidade(user, novo, historico) {
    try {
      const { db, firestore } = await contextoFirebase();
      await firestore.addDoc(firestore.collection(db, "logsAlteracoes"), {
        acao: "pagamento_duplicado_historico_bloqueado",
        entidade: "entregasPagamento",
        entidadeId: novo.id,
        detalhes: `Novo ${novo.id} bloqueado por duplicar histórico ${historico.id} | OP ${novo.numeroOP || novo.opId || "-"} | ${novo.faccao || "-"} | ${novo.processo || novo.servicoNome || "-"} | ${quantidadePagamento(novo)} peça(s).`,
        usuarioId: user.uid,
        usuarioEmail: user.email || "",
        criadoEm: firestore.serverTimestamp(),
        versao: VERSION
      });
    } catch (error) {
      console.warn("[Pagamentos histórico 159] Não foi possível registrar log da duplicidade.", error);
    }
  }

  async function verificarNovoPagamento(documento) {
    const item = { id: documento.id, ...documento.data() };
    if (!usuarioAtual || !ehPagamentoReal(item)) return;
    if (item.pagamentoHistorico === true || item.historicoProtegido === true) return;
    if (item.bloqueadoDuplicidadeHistorica === true) return;
    if (verificandoDuplicidade.has(item.id)) return;

    const reenvio = ehReenvioOuComplemento(item);
    const campo = reenvio ? "chaveHistoricaEntrega" : "chaveHistoricaServico";
    const chave = reenvio ? chaveEntrega(item) : chaveServico(item);
    if (!chave) return;

    verificandoDuplicidade.add(item.id);
    try {
      const historicos = await buscarHistorico(campo, chave);
      const historico = historicos.find(registro => registro.id !== item.id);
      if (!historico) return;

      const statusAtual = normalizar(item.statusPagamento || "pendente");
      if (statusAtual === "PAGO") {
        console.warn("[Pagamentos histórico 159] Duplicidade histórica encontrada em registro já pago; nenhum status foi alterado.", item.id);
        return;
      }

      const { firestore } = await contextoFirebase();
      await firestore.setDoc(documento.ref, {
        excluido: true,
        statusPagamento: "excluido",
        bloqueadoDuplicidadeHistorica: true,
        naoSomarPagamento: true,
        duplicadoHistoricoDe: historico.id,
        motivoExclusao: "duplicidade_pagamento_historico",
        excluidoPorSistema: true,
        excluidoPor: usuarioAtual.uid,
        excluidoEm: firestore.serverTimestamp(),
        atualizadoPor: usuarioAtual.uid,
        atualizadoEm: firestore.serverTimestamp(),
        versaoProtecaoHistorica: VERSION
      }, { merge: true });

      await registrarBloqueioDuplicidade(usuarioAtual, item, historico);
      avisar(`Pagamento novo da OP ${item.numeroOP || item.opId || "-"} foi bloqueado porque o mesmo serviço já existe no histórico. O registro antigo foi preservado.`, "erro");
    } catch (error) {
      const codigo = texto(error?.code || "");
      if (codigo.includes("permission-denied")) {
        console.warn("[Pagamentos histórico 159] Usuário sem permissão para bloquear duplicidade de outro criador.", item.id);
      } else {
        console.error("[Pagamentos histórico 159] Falha ao conferir duplicidade histórica.", error);
      }
    } finally {
      verificandoDuplicidade.delete(item.id);
    }
  }

  function pararMonitor() {
    if (typeof unsubscribeNovosPagamentos === "function") unsubscribeNovosPagamentos();
    unsubscribeNovosPagamentos = null;
  }

  async function iniciarMonitorNovos(config) {
    pararMonitor();
    if (!usuarioAtual || !statusMigracaoConcluido(config)) return;

    const { db, firestore } = await contextoFirebase();
    const corteEpoch = Number(config.corteEpoch || 0);
    const limite = firestore.Timestamp.fromMillis(Math.max(1, corteEpoch));
    const consulta = firestore.query(
      firestore.collection(db, "entregasPagamento"),
      firestore.where("criadoEm", ">=", limite)
    );

    unsubscribeNovosPagamentos = firestore.onSnapshot(consulta, snapshot => {
      snapshot.docChanges().forEach(alteracao => {
        if (!["added", "modified"].includes(alteracao.type)) return;
        verificarNovoPagamento(alteracao.doc);
      });
    }, error => {
      console.error("[Pagamentos histórico 159] Monitor de novos pagamentos falhou.", error);
    });
  }

  function textoStatus(config) {
    if (!config) return "Histórico financeiro: aguardando proteção";
    if (config.status === "executando") return "Histórico financeiro: protegendo registros existentes...";
    if (config.status === "erro") return "Histórico financeiro: proteção pendente";
    if (statusMigracaoConcluido(config)) {
      const total = Number(config.totalMarcados || 0);
      return `Histórico protegido: ${total.toLocaleString("pt-BR")} pagamento(s)`;
    }
    return "Histórico financeiro: aguardando proteção";
  }

  function aplicarStatusVisual(config) {
    const pagina = document.getElementById("pagamentos");
    if (!pagina) return false;

    let badge = document.getElementById("statusPagamentosHistoricos159");
    if (!badge) {
      const cabecalho = pagina.querySelector(".pagamentos-relatorio-panel > .panel-header:first-child") || pagina.querySelector(".panel-header");
      if (!cabecalho) return false;
      badge = document.createElement("span");
      badge.id = "statusPagamentosHistoricos159";
      badge.style.cssText = [
        "display:inline-flex",
        "align-items:center",
        "gap:6px",
        "padding:6px 10px",
        "border-radius:999px",
        "font-size:11px",
        "font-weight:900",
        "background:#ecfdf5",
        "color:#166534",
        "border:1px solid #bbf7d0",
        "white-space:nowrap"
      ].join(";");
      const actions = cabecalho.querySelector(".actions");
      if (actions) actions.prepend(badge);
      else cabecalho.appendChild(badge);
    }

    badge.textContent = textoStatus(config);
    badge.title = "Pagamentos existentes antes da migração mantêm exatamente os valores e status originais. Novos duplicados são bloqueados sem apagar o histórico.";
    return true;
  }

  function manterStatusVisual(config) {
    aplicarStatusVisual(config);
    if (observerStatus) observerStatus.disconnect();
    observerStatus = new MutationObserver(() => aplicarStatusVisual(config));
    observerStatus.observe(document.documentElement, { childList: true, subtree: true });
  }

  async function configurarUsuario(user) {
    usuarioAtual = user || null;
    pararMonitor();
    if (!usuarioAtual) return;

    let config = await carregarConfiguracao().catch(() => null);
    if (!statusMigracaoConcluido(config)) {
      config = await executarMigracao(usuarioAtual);
    }

    if (!config) config = await carregarConfiguracao().catch(() => null);
    manterStatusVisual(config);
    await iniciarMonitorNovos(config);
  }

  async function iniciar() {
    try {
      const { auth, authModulo } = await contextoFirebase();
      authModulo.onAuthStateChanged(auth, user => {
        configurarUsuario(user).catch(error => {
          console.error("[Pagamentos histórico 159] Erro ao configurar proteção histórica.", error);
        });
      });
    } catch (error) {
      console.error("[Pagamentos histórico 159] Não foi possível iniciar o módulo.", error);
    }
  }

  iniciar();
})();
