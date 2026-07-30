(() => {
  "use strict";

  const RELEASE = "2026-07-30-rastreamento-enviar-manejo-17";
  const FIREBASE_VERSION = "10.12.5";
  const FASE_DESTINO = "AGUARDANDO MOVIMENTAÇÃO";

  if (window.__CORPONU_RASTREAMENTO_ENVIAR_MANEJO__ === RELEASE) return;
  window.__CORPONU_RASTREAMENTO_ENVIAR_MANEJO__ = RELEASE;

  let contextoFirebasePromise = null;
  let observer = null;
  const enviosEmAndamento = new Set();

  function normalizar(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function escaparSeletor(valor) {
    if (window.CSS?.escape) return window.CSS.escape(String(valor || ""));
    return String(valor || "").replace(/["\\]/g, "\\$&");
  }

  function mostrarAviso(mensagem) {
    const toastPrincipal = document.getElementById("toast");
    if (toastPrincipal) {
      toastPrincipal.textContent = mensagem;
      toastPrincipal.classList.remove("hidden");
      clearTimeout(window.__corponuEnviarManejoToastTimer);
      window.__corponuEnviarManejoToastTimer = setTimeout(() => {
        toastPrincipal.classList.add("hidden");
      }, 6000);
      return;
    }

    let aviso = document.getElementById("toastEnviarManejoRastreamento");
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.id = "toastEnviarManejoRastreamento";
      Object.assign(aviso.style, {
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: "100002",
        maxWidth: "410px",
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
    aviso._timer = setTimeout(() => aviso.remove(), 6500);
  }

  function injetarEstilo() {
    if (document.getElementById("estiloEnviarManejoRastreamento")) return;
    const style = document.createElement("style");
    style.id = "estiloEnviarManejoRastreamento";
    style.textContent = `
      .btn-enviar-manejo-rastreamento {
        background: #0f766e !important;
        border-color: #0f766e !important;
        color: #ffffff !important;
        white-space: nowrap;
      }
      .btn-enviar-manejo-rastreamento:hover:not(:disabled) {
        background: #115e59 !important;
        border-color: #115e59 !important;
      }
      .btn-enviar-manejo-rastreamento:disabled {
        opacity: .65;
        cursor: wait;
      }
    `;
    document.head.appendChild(style);
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
        auth: firebaseAuth.getAuth(app),
        db: firestore.getFirestore(app),
        firestore
      };
    });

    return contextoFirebasePromise;
  }

  function identificarSetor(ordem) {
    const texto = normalizar([
      ordem?.tipoPeca,
      ordem?.tipoPecaLabel,
      ordem?.produtoNome,
      ordem?.nomeProduto,
      ordem?.observacoes,
      ordem?.pendencia
    ].join(" "));

    if (texto.includes("CALCINHA")) return "calcinha";
    return "sutia";
  }

  async function buscarOrdemPorNumero(ctx, numeroOP) {
    const texto = String(numeroOP || "").trim();
    if (!texto) return null;

    const candidatos = [texto];
    const numero = Number(texto.replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(numero)) candidatos.push(numero);

    for (const campo of ["numeroOP", "numeroOPExterno"]) {
      for (const valor of candidatos) {
        try {
          const consulta = ctx.firestore.query(
            ctx.firestore.collection(ctx.db, "ordensProducao"),
            ctx.firestore.where(campo, "==", valor),
            ctx.firestore.limit(1)
          );
          const resultado = await ctx.firestore.getDocs(consulta);
          if (!resultado.empty) {
            const documento = resultado.docs[0];
            return { id: documento.id, ...documento.data() };
          }
        } catch (error) {
          console.warn(`Falha ao localizar OP pelo campo ${campo}.`, error);
        }
      }
    }

    return null;
  }

  async function resolverOrdem(ctx, { opId, movimentacaoId, numeroOP }) {
    if (opId) {
      const referencia = ctx.firestore.doc(ctx.db, "ordensProducao", String(opId));
      const snap = await ctx.firestore.getDoc(referencia);
      if (snap.exists()) return { id: snap.id, ...snap.data() };
    }

    if (movimentacaoId) {
      const referenciaMov = ctx.firestore.doc(ctx.db, "movimentacoesProducao", String(movimentacaoId));
      const snapMov = await ctx.firestore.getDoc(referenciaMov);
      if (snapMov.exists()) {
        const movimento = { id: snapMov.id, ...snapMov.data() };
        if (movimento.opId) {
          const referenciaOrdem = ctx.firestore.doc(ctx.db, "ordensProducao", String(movimento.opId));
          const snapOrdem = await ctx.firestore.getDoc(referenciaOrdem);
          if (snapOrdem.exists()) return { id: snapOrdem.id, ...snapOrdem.data() };
        }
        numeroOP = movimento.numeroOP || numeroOP;
      }
    }

    return buscarOrdemPorNumero(ctx, numeroOP);
  }

  async function registrarLog(ctx, usuario, ordem, setor) {
    try {
      await ctx.firestore.addDoc(
        ctx.firestore.collection(ctx.db, "logsAlteracoes"),
        {
          acao: "op_enviada_manejo_pelo_rastreamento",
          tipoAlvo: "ordemProducao",
          alvoId: ordem.id,
          detalhes: `OP ${ordem.numeroOP || ordem.numeroOPExterno || ordem.id} | enviada ao Manejo ${setor === "calcinha" ? "Calcinha" : "Sutiã"} | fase ${FASE_DESTINO}`,
          usuarioUid: usuario?.uid || "",
          usuarioNome: usuario?.displayName || "",
          usuarioEmail: usuario?.email || "",
          criadoEm: ctx.firestore.serverTimestamp()
        }
      );
    } catch (error) {
      console.warn("Não foi possível registrar o log do envio ao Manejo.", error);
    }
  }

  async function enviarOrdemAoManejo(dados, botao) {
    const chave = String(dados.opId || dados.movimentacaoId || dados.numeroOP || "").trim();
    if (!chave || enviosEmAndamento.has(chave)) return;

    const textoOriginal = botao?.textContent || "Enviar para manejo";

    try {
      const ctx = await obterContextoFirebase();
      const usuario = ctx.auth.currentUser;
      if (!usuario) {
        mostrarAviso("Sua sessão expirou. Entre novamente para enviar a OP ao Manejo.");
        return;
      }

      const ordem = await resolverOrdem(ctx, dados);
      if (!ordem?.id) {
        mostrarAviso("Não foi possível localizar a OP desta movimentação.");
        return;
      }

      const numeroOP = ordem.numeroOP || ordem.numeroOPExterno || ordem.id;
      const confirmou = window.confirm(
        `Enviar a OP ${numeroOP} para o Manejo com a fase ${FASE_DESTINO}?\n\nO histórico atual será preservado.`
      );
      if (!confirmou) return;

      enviosEmAndamento.add(chave);
      if (botao) {
        botao.disabled = true;
        botao.textContent = "Enviando...";
      }

      const setor = identificarSetor(ordem);
      const manejoExistente = ordem?.manejosSetores?.[setor] || {};
      const agora = ctx.firestore.serverTimestamp();
      const manejoAtualizado = {
        ...manejoExistente,
        setor,
        setorLabel: setor === "calcinha" ? "Calcinha" : "Sutiã",
        fase: FASE_DESTINO,
        faccao: "",
        chegada: "",
        falta: 0,
        celu: "",
        status: "organizada",
        atualizadoPor: usuario.uid,
        atualizadoEm: agora
      };

      if (!manejoExistente?.criadoEm) {
        manejoAtualizado.criadoPor = usuario.uid;
        manejoAtualizado.criadoEm = agora;
      }

      const patch = {
        manejosSetores: {
          ...(ordem.manejosSetores || {}),
          [setor]: manejoAtualizado
        },
        manejoStatusSetores: {
          ...(ordem.manejoStatusSetores || {}),
          [setor]: "organizada"
        },
        bipadoSetores: {
          ...(ordem.bipadoSetores || {}),
          [setor]: false
        },
        ocultarDoManejo: false,
        localAtualMigracao: "MANEJO_AGUARDANDO_DESTINO",
        statusMigracaoLigia: "MANEJO_ABERTO_AGUARDANDO_DESTINO",
        relatorioMigracao: "Manejo / aguardando movimentação",
        ajusteManualMigracao: true,
        destinoAtualMigracao: "MANEJO",
        processoAtualMigracao: FASE_DESTINO,
        proximoDestinoMigracao: "",
        dataEnvioAtualMigracao: "",
        dataChegadaAtualMigracao: "",
        atualizadoPor: usuario.uid,
        atualizadoEm: agora
      };

      await ctx.firestore.setDoc(
        ctx.firestore.doc(ctx.db, "ordensProducao", ordem.id),
        patch,
        { merge: true }
      );

      await registrarLog(ctx, usuario, ordem, setor);

      if (botao?.isConnected) {
        botao.textContent = "Enviado ao manejo";
        botao.disabled = true;
      }

      mostrarAviso(`OP ${numeroOP} enviada ao Manejo com a fase ${FASE_DESTINO}.`);
    } catch (error) {
      console.error("Erro ao enviar OP do Rastreamento para o Manejo.", error);
      if (botao?.isConnected) {
        botao.disabled = false;
        botao.textContent = textoOriginal;
      }
      mostrarAviso(error?.code === "permission-denied"
        ? "Seu usuário não possui permissão para enviar esta OP ao Manejo."
        : "Erro ao enviar a OP para o Manejo. Nenhuma movimentação foi alterada.");
    } finally {
      enviosEmAndamento.delete(chave);
    }
  }

  function extrairMovimentacaoId(linha) {
    const atributoDireto = linha.dataset.movimentacaoId || linha.dataset.movId;
    if (atributoDireto) return atributoDireto;

    const botoes = [...linha.querySelectorAll("button[onclick]")];
    const prioridades = [
      "biparMovimentacao",
      "registrarChegadaMovimentacao",
      "excluirMovimentacao",
      "abrirHistorico"
    ];

    for (const nome of prioridades) {
      const botao = botoes.find(item => String(item.getAttribute("onclick") || "").includes(nome));
      if (!botao) continue;
      const match = String(botao.getAttribute("onclick") || "").match(/\(\s*['\"]([^'\"]+)['\"]/);
      if (match?.[1]) return match[1];
    }

    return "";
  }

  function extrairNumeroOP(linha) {
    return String(linha.querySelector(":scope > td")?.textContent || "").trim();
  }

  function inserirBotoes() {
    const tbody = document.getElementById("listaRastreamento");
    if (!tbody) return;

    tbody.querySelectorAll("tr").forEach(linha => {
      if (linha.classList.contains("rastreamento-historico-row")) return;

      const celulas = linha.querySelectorAll(":scope > td");
      if (!celulas.length) return;
      const acoes = celulas[celulas.length - 1];
      if (!acoes) return;

      if (acoes.querySelector("[data-enviar-manejo-direto]")) return;
      if (acoes.querySelector("[data-corponu-enviar-manejo-mov]")) return;

      const movimentacaoId = extrairMovimentacaoId(linha);
      if (!movimentacaoId) return;

      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "btn btn-sm btn-enviar-manejo-rastreamento";
      botao.textContent = "Enviar para manejo";
      botao.dataset.corponuEnviarManejoMov = movimentacaoId;
      botao.dataset.numeroOp = extrairNumeroOP(linha);
      botao.title = `Enviar esta OP ao Manejo com a fase ${FASE_DESTINO}`;

      const referencia = [...acoes.querySelectorAll("button")].find(item => {
        const texto = normalizar(item.textContent);
        return texto.includes("BIPAR") || texto.includes("EXCLUIR");
      });

      if (referencia) acoes.insertBefore(botao, referencia);
      else acoes.appendChild(botao);
    });
  }

  function instalarEventos() {
    if (document.documentElement.dataset.enviarManejoRastreamentoEventos === RELEASE) return;
    document.documentElement.dataset.enviarManejoRastreamentoEventos = RELEASE;

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      const botao = alvo?.closest(
        "[data-corponu-enviar-manejo-mov], [data-enviar-manejo-direto]"
      );
      if (!botao) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const dados = {
        movimentacaoId: botao.dataset.corponuEnviarManejoMov || "",
        opId: botao.dataset.enviarManejoDireto || "",
        numeroOP: botao.dataset.numeroOp || ""
      };
      enviarOrdemAoManejo(dados, botao);
    }, true);
  }

  function iniciar() {
    injetarEstilo();
    instalarEventos();
    inserirBotoes();

    const tbody = document.getElementById("listaRastreamento");
    if (!tbody) {
      setTimeout(iniciar, 300);
      return;
    }

    if (!observer) {
      observer = new MutationObserver(inserirBotoes);
      observer.observe(tbody, { childList: true, subtree: true });
    }

    setTimeout(inserirBotoes, 150);
    setTimeout(inserirBotoes, 700);
    setTimeout(inserirBotoes, 1600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
