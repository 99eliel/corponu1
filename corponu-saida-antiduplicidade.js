(() => {
  "use strict";

  const VERSION = "2026-08-01-saida-idempotente-69";
  const FB = "10.12.5";
  const FORM_ID = "formMovimentacaoProducao";
  const LIBERADO = "sf69SaidaLiberada";
  const TTL_MS = 120000;
  const emCurso = new Set();
  let contextoPromise = null;

  if (window.__CORPONU_SAIDA_ANTIDUPLICIDADE__ === VERSION) return;
  window.__CORPONU_SAIDA_ANTIDUPLICIDADE__ = VERSION;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  const inteiro = valor => Math.max(0, Math.floor(Number(valor || 0)));
  const millis = valor => {
    if (!valor) return 0;
    if (typeof valor.toMillis === "function") return valor.toMillis();
    if (typeof valor.toDate === "function") return valor.toDate().getTime();
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? 0 : data.getTime();
  };

  function avisar(mensagem, erro = true) {
    const toast = document.getElementById("toast");
    if (!toast) {
      window.alert(mensagem);
      return;
    }
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = erro ? "#991b1b" : "#166534";
    window.clearTimeout(window.__sf69SaidaToast);
    window.__sf69SaidaToast = window.setTimeout(() => {
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
      return {
        auth: auth.getAuth(firebaseApp),
        db: fs.getFirestore(firebaseApp),
        fs
      };
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
    const processoSelect = texto(document.getElementById("movimentacaoProcessoSelect")?.value);
    const processoInput = texto(document.getElementById("movimentacaoProcesso")?.value);
    return {
      opId: texto(document.getElementById("movimentacaoOrdemId")?.value),
      tipoDestino: normalizar(document.getElementById("movimentacaoTipoDestino")?.value),
      processo: normalizar(processoSelect || processoInput),
      destino: normalizar(document.getElementById("movimentacaoDestino")?.value),
      quantidade: inteiro(document.getElementById("movimentacaoQuantidade")?.value),
      dataEnvio: texto(document.getElementById("movimentacaoDataEnvio")?.value)
    };
  }

  function chaveNegocio(dados) {
    return [
      "saida",
      dados.opId,
      dados.tipoDestino,
      dados.processo,
      dados.destino,
      dados.quantidade,
      dados.dataEnvio
    ].join("|");
  }

  function hash(textoBase) {
    let valor = 2166136261;
    for (const caractere of textoBase) {
      valor ^= caractere.charCodeAt(0);
      valor = Math.imul(valor, 16777619);
    }
    return (valor >>> 0).toString(36);
  }

  function idTrava(chave) {
    const prefixo = chave
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 130);
    return `saida-${prefixo}-${hash(chave)}`.slice(0, 190);
  }

  function movimentacaoAberta(item) {
    if (!item || item.excluido === true || item.cancelado === true) return false;
    const status = normalizar(item.status);
    if ([
      "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA",
      "FINALIZADO", "FINALIZADA", "ENCAMINHADO", "ENCAMINHADA",
      "RETORNOU", "RECEBIDO", "RECEBIDA"
    ].includes(status)) return false;
    return !texto(item.dataChegada);
  }

  function corresponde(item, dados) {
    return movimentacaoAberta(item) &&
      texto(item.opId) === dados.opId &&
      normalizar(item.tipoDestino) === dados.tipoDestino &&
      normalizar(item.processo) === dados.processo &&
      normalizar(item.destino) === dados.destino &&
      inteiro(item.quantidadeEnviada) === dados.quantidade &&
      texto(item.dataEnvio) === dados.dataEnvio;
  }

  async function buscarSaidaExistente(dados) {
    const { db, fs } = await contexto();
    const consulta = fs.query(
      fs.collection(db, "movimentacoesProducao"),
      fs.where("opId", "==", dados.opId)
    );
    const snap = await fs.getDocs(consulta);
    return snap.docs
      .map(documento => ({ id: documento.id, ...documento.data() }))
      .filter(item => corresponde(item, dados))
      .sort((a, b) => millis(b.criadoEm || b.atualizadoEm) - millis(a.criadoEm || a.atualizadoEm))[0] || null;
  }

  async function reservarSaida(dados, chave) {
    const { auth, db, fs } = await contexto();
    const usuario = await aguardarUsuario(auth);
    const travaRef = fs.doc(db, "travasOperacionais", idTrava(chave));
    const agora = Date.now();

    await fs.runTransaction(db, async transaction => {
      const travaSnap = await transaction.get(travaRef);
      const trava = travaSnap.exists() ? travaSnap.data() : null;
      const status = normalizar(trava?.status);
      const idade = agora - Number(trava?.atualizadoEmMs || trava?.iniciadoEmMs || 0);

      if (status === "PROCESSANDO" && idade < TTL_MS) {
        throw new Error("PROCESSANDO");
      }

      if (status === "CONCLUIDO" && trava?.movimentacaoId) {
        const movimentacaoRef = fs.doc(db, "movimentacoesProducao", trava.movimentacaoId);
        const movimentacaoSnap = await transaction.get(movimentacaoRef);
        if (movimentacaoSnap.exists() && corresponde({
          id: movimentacaoSnap.id,
          ...movimentacaoSnap.data()
        }, dados)) {
          throw new Error("CONCLUIDO");
        }
      }

      transaction.set(travaRef, {
        chave,
        tipo: "saida_producao",
        status: "processando",
        opId: dados.opId,
        tipoDestino: dados.tipoDestino,
        processo: dados.processo,
        destino: dados.destino,
        quantidade: dados.quantidade,
        dataEnvio: dados.dataEnvio,
        movimentacaoId: "",
        iniciadoEmMs: agora,
        atualizadoEmMs: agora,
        criadoPor: trava?.criadoPor || usuario.uid,
        atualizadoPor: usuario.uid,
        criadoEm: trava?.criadoEm || fs.serverTimestamp(),
        atualizadoEm: fs.serverTimestamp(),
        versao: VERSION
      }, { merge: true });
    });

    return travaRef;
  }

  async function finalizarTrava(travaRef, status, dados = {}) {
    const { auth, fs } = await contexto();
    const usuario = await aguardarUsuario(auth);
    await fs.setDoc(travaRef, {
      status,
      movimentacaoId: dados.movimentacaoId || "",
      observacao: dados.observacao || "",
      atualizadoEmMs: Date.now(),
      atualizadoPor: usuario.uid,
      atualizadoEm: fs.serverTimestamp(),
      concluidoEm: status === "concluido" ? fs.serverTimestamp() : null,
      versao: VERSION
    }, { merge: true });
  }

  function bloquearBotao(form) {
    const botao = form.querySelector('button[type="submit"]');
    if (!botao) return () => {};
    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Salvando saída com segurança...";
    return () => {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    };
  }

  function liberarParaSistema(form) {
    form.dataset[LIBERADO] = "1";
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }

  async function monitorarCriacao(dados, travaRef, chave, restaurar) {
    try {
      for (const espera of [400, 900, 1600, 2800, 4500, 7000]) {
        await new Promise(resolve => window.setTimeout(resolve, espera));
        const existente = await buscarSaidaExistente(dados);
        if (!existente) continue;
        await finalizarTrava(travaRef, "concluido", {
          movimentacaoId: existente.id,
          observacao: "Saída criada uma única vez."
        });
        return;
      }

      await finalizarTrava(travaRef, "falha_operacao", {
        observacao: "A saída não foi localizada após a liberação do formulário."
      });
      avisar("A saída não foi confirmada pelo servidor. Verifique a lista antes de tentar novamente.", true);
    } catch (error) {
      console.error("Erro ao monitorar criação da saída.", error);
      await finalizarTrava(travaRef, "falha_monitoramento", {
        observacao: error?.message || "Falha no monitoramento."
      }).catch(() => {});
    } finally {
      emCurso.delete(chave);
      restaurar();
    }
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== FORM_ID) return;

    if (form.dataset[LIBERADO] === "1") {
      delete form.dataset[LIBERADO];
      return;
    }

    const dados = dadosFormulario();
    if (!dados.opId || !dados.tipoDestino || !dados.destino || !dados.quantidade || !dados.dataEnvio) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const chave = chaveNegocio(dados);
    if (emCurso.has(chave)) {
      avisar("Esta saída já está sendo salva. Aguarde a conclusão.", true);
      return;
    }

    emCurso.add(chave);
    const restaurar = bloquearBotao(form);

    (async () => {
      const existenteAntes = await buscarSaidaExistente(dados);
      if (existenteAntes) {
        avisar(
          `Saída duplicada bloqueada. Já existe uma movimentação aberta com os mesmos dados para esta OP. Registro: ${existenteAntes.id}.`,
          true
        );
        return;
      }

      let travaRef;
      try {
        travaRef = await reservarSaida(dados, chave);
      } catch (error) {
        const mensagens = {
          PROCESSANDO: "Esta mesma saída já está sendo processada em outra aba ou por outro usuário.",
          CONCLUIDO: "Esta mesma saída já foi criada. Nenhuma nova movimentação foi adicionada."
        };
        avisar(mensagens[error?.message] || "Não foi possível reservar esta saída. Por segurança, nada foi salvo.", true);
        return;
      }

      const existenteDepoisDaTrava = await buscarSaidaExistente(dados);
      if (existenteDepoisDaTrava) {
        await finalizarTrava(travaRef, "concluido", {
          movimentacaoId: existenteDepoisDaTrava.id,
          observacao: "Movimentação já existia antes da gravação."
        });
        avisar("Esta saída já estava registrada. Nenhuma duplicata foi criada.", true);
        return;
      }

      liberarParaSistema(form);
      monitorarCriacao(dados, travaRef, chave, restaurar).catch(console.error);
      return "monitorando";
    })().then(resultado => {
      if (resultado === "monitorando") return;
      emCurso.delete(chave);
      restaurar();
    }).catch(error => {
      console.error("Erro na proteção da saída.", error);
      emCurso.delete(chave);
      restaurar();
      avisar("Não foi possível verificar a saída. Por segurança, ela não foi salva. Tente novamente.", true);
    });
  }, true);
})();
