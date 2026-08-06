(() => {
  "use strict";

  const VERSION = "2026-08-06-calcinha-identidade-136";
  const FIREBASE_VERSION = "10.12.5";
  const CALCINHA_PROCESSES = new Set(["CALCINHA MONTAGEM", "CALCINHA COMPLETA"]);

  if (window.__CORPONU_CALCINHA_IDENTIDADE_136__ === VERSION) return;
  window.__CORPONU_CALCINHA_IDENTIDADE_136__ = VERSION;

  let firebasePromise = null;
  let salvandoOrdem = false;
  const enviosEmReparo = new Set();

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const safeId = valor => normalizar(valor)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || `registro-${Date.now()}`;

  function hojeISO() {
    const agora = new Date();
    const offset = agora.getTimezoneOffset();
    return new Date(agora.getTime() - offset * 60000).toISOString().slice(0, 10);
  }

  function dataBR(iso) {
    const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
  }

  function ehCalcinha(dados) {
    const tipo = normalizar([
      dados?.tipoPeca,
      dados?.tipoPecaPadrao,
      dados?.tipoPecaLabel,
      dados?.setor,
      dados?.setorLabel
    ].join(" "));
    if (tipo.includes("CALCINHA")) return true;
    return normalizar(dados?.processoPlanejado || dados?.processo).startsWith("CALCINHA");
  }

  function formularioCalcinhaAtivo() {
    const aba = document.querySelector('.corponu-dual-tabs[data-page="ordens"] .corponu-dual-tab.active');
    const titulo = normalizar(document.querySelector("#formOrdem .panel-header h3")?.textContent);
    const planejamento = document.getElementById("ordemCalcinhaPlanejamento");
    const planejamentoVisivel = planejamento && getComputedStyle(planejamento).display !== "none";

    return document.body.dataset.corponuFormType === "calcinha"
      || aba?.dataset?.type === "calcinha"
      || titulo.includes("CALCINHA")
      || Boolean(planejamentoVisivel);
  }

  function setorCalcinhaAtivo() {
    const setor = document.querySelector(".manejo-setor-btn.active")?.dataset?.setor;
    return setor === "calcinha" || document.body.dataset.corponuManejoTipo === "calcinha";
  }

  function toast(mensagem, tipo = "info") {
    let elemento = document.getElementById("corponuCalcinhaIdentidadeToast136");
    if (!elemento) {
      elemento = document.createElement("div");
      elemento.id = "corponuCalcinhaIdentidadeToast136";
      Object.assign(elemento.style, {
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: "100200",
        maxWidth: "430px",
        padding: "13px 16px",
        borderRadius: "12px",
        color: "#fff",
        font: "800 13px/1.45 Arial, sans-serif",
        boxShadow: "0 16px 40px rgba(0,0,0,.25)",
        opacity: "0",
        transform: "translateY(14px)",
        transition: ".2s ease",
        pointerEvents: "none"
      });
      document.body.appendChild(elemento);
    }
    elemento.style.background = tipo === "error" ? "#991b1b" : tipo === "success" ? "#166534" : "#173c69";
    elemento.textContent = mensagem;
    elemento.style.opacity = "1";
    elemento.style.transform = "translateY(0)";
    clearTimeout(elemento._timer);
    elemento._timer = setTimeout(() => {
      elemento.style.opacity = "0";
      elemento.style.transform = "translateY(14px)";
    }, 5600);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModule, authModule, firestoreModule]) => {
      const app = appModule.getApps()[0] || appModule.getApp();
      return {
        ...firestoreModule,
        auth: authModule.getAuth(app),
        db: firestoreModule.getFirestore(app)
      };
    });
    return firebasePromise;
  }

  async function buscarProdutoCalcinha(referencia) {
    const fb = await firebase();
    const ids = [`calcinha-${safeId(referencia)}`];
    for (const id of ids) {
      const snap = await fb.getDoc(fb.doc(fb.db, "produtos", id));
      if (snap.exists() && ehCalcinha(snap.data())) return { id: snap.id, ...snap.data() };
    }

    const resultados = new Map();
    const valores = [String(referencia)];
    const numero = Number(referencia);
    if (Number.isFinite(numero)) valores.push(numero);

    for (const valor of valores) {
      const consulta = fb.query(fb.collection(fb.db, "produtos"), fb.where("referencia", "==", valor));
      const snapshot = await fb.getDocs(consulta);
      snapshot.forEach(item => resultados.set(item.id, { id: item.id, ...item.data() }));
    }
    return [...resultados.values()].find(ehCalcinha) || null;
  }

  async function buscarOrdensPorNumero(numeroOP) {
    const fb = await firebase();
    const resultados = new Map();
    const valores = [String(numeroOP)];
    const numero = Number(numeroOP);
    if (Number.isFinite(numero)) valores.push(numero);

    for (const campo of ["numeroOP", "numeroOPExterno"]) {
      for (const valor of valores) {
        const consulta = fb.query(fb.collection(fb.db, "ordensProducao"), fb.where(campo, "==", valor));
        const snapshot = await fb.getDocs(consulta);
        snapshot.forEach(item => resultados.set(item.id, { id: item.id, ...item.data() }));
      }
    }
    return [...resultados.values()];
  }

  async function registrarLog(acao, alvoId, detalhes) {
    try {
      const fb = await firebase();
      const usuario = fb.auth.currentUser;
      if (!usuario) return;
      await fb.addDoc(fb.collection(fb.db, "logsAlteracoes"), {
        acao,
        tipoAlvo: "ordemProducao",
        alvoId: String(alvoId || ""),
        detalhes: String(detalhes || ""),
        usuarioUid: usuario.uid,
        usuarioEmail: usuario.email || "",
        criadoEm: fb.serverTimestamp()
      });
    } catch (erro) {
      console.warn("[Calcinha 136] Log não salvo.", erro);
    }
  }

  async function salvarOrdemCalcinha(event) {
    const form = event.target;
    if (form?.id !== "formOrdem" || !formularioCalcinhaAtivo()) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (salvandoOrdem) return;
    salvandoOrdem = true;

    try {
      const fb = await firebase();
      const usuario = fb.auth.currentUser;
      if (!usuario) throw new Error("Sua sessão expirou. Entre novamente.");

      const currentId = String(document.getElementById("ordemId")?.value || "").trim();
      const numeroOP = normalizar(document.getElementById("ordemNumero")?.value);
      const referencia = normalizar(document.getElementById("ordemReferencia")?.value);
      const cor = normalizar(document.getElementById("ordemCor")?.value);
      const quantidade = Number(document.getElementById("ordemQuantidade")?.value || 0);
      const necessidadeInicio = document.getElementById("ordemCalcinhaNecessidadeInicio")?.value || "";
      const necessidadeFim = document.getElementById("ordemCalcinhaNecessidadeFim")?.value || "";
      const processo = normalizar(document.getElementById("ordemCalcinhaProcesso")?.value);
      const faccao = normalizar(document.getElementById("ordemCalcinhaFaccao")?.value);
      const observacoes = String(document.getElementById("ordemObs")?.value || "").trim();

      if (!numeroOP || !referencia || !cor || !Number.isFinite(quantidade) || quantidade <= 0) {
        throw new Error("Informe OP, referência, cor e quantidade válida.");
      }
      if (!necessidadeInicio || !necessidadeFim || necessidadeInicio > necessidadeFim) {
        throw new Error("Informe um intervalo de necessidade válido.");
      }
      if (processo && !CALCINHA_PROCESSES.has(processo)) {
        throw new Error("O serviço informado não pertence ao fluxo de calcinha.");
      }
      if (!processo && faccao) {
        throw new Error("Selecione o serviço antes de informar a facção.");
      }

      const produto = await buscarProdutoCalcinha(referencia);
      if (!produto) {
        throw new Error(`Cadastre a referência ${referencia} em Produtos → Calcinha antes de salvar a OP.`);
      }

      const encontradas = (await buscarOrdensPorNumero(numeroOP)).filter(item => item.id !== currentId);
      let documentId = currentId || `calcinha-${safeId(numeroOP)}`;
      let ordemAntiga = {};

      if (!currentId && encontradas.length) {
        const reparaveis = encontradas.filter(item =>
          !ehCalcinha(item)
          && normalizar(item.referencia) === referencia
          && (!item.cor || normalizar(item.cor) === cor)
        );
        if (encontradas.length === 1 && reparaveis.length === 1) {
          documentId = reparaveis[0].id;
          ordemAntiga = reparaveis[0];
        } else {
          throw new Error(`A OP ${numeroOP} já existe no sistema.`);
        }
      }

      if (!Object.keys(ordemAntiga).length) {
        const snapshot = await fb.getDoc(fb.doc(fb.db, "ordensProducao", documentId));
        if (snapshot.exists()) ordemAntiga = { id: snapshot.id, ...snapshot.data() };
      }

      const necessidadeTexto = `${dataBR(necessidadeInicio)} a ${dataBR(necessidadeFim)}`;
      const planejamentoCompleto = CALCINHA_PROCESSES.has(processo) && Boolean(faccao);
      const dados = {
        numeroOP: ordemAntiga.numeroOP || numeroOP,
        referencia,
        cor,
        produtoNome: produto.nome || `Calcinha Ref. ${referencia}`,
        quantidade,
        ano: Number(necessidadeInicio.slice(0, 4)) || new Date().getFullYear(),
        necessidadeInicio,
        necessidadeFim,
        necessidade: necessidadeTexto,
        necessidadeTexto,
        necessidadeManual: true,
        observacoes,
        tipoPeca: "calcinha",
        tipoPecaPadrao: "calcinha",
        tipoPecaLabel: "Calcinha",
        setor: "calcinha",
        linhaCalcinha: ordemAntiga.linhaCalcinha || "",
        processoPlanejado: processo,
        faccaoPlanejada: faccao,
        planejamentoCalcinhaPendente: !planejamentoCompleto,
        identidadeCalcinhaConfirmada: true,
        identidadeCalcinhaVersao: VERSION,
        possuiAlca: false,
        possuiBojo: false,
        possuiRenda: false,
        status: ordemAntiga.status || "aberta",
        atualizadoPor: usuario.uid,
        atualizadoEm: fb.serverTimestamp()
      };

      if (!ordemAntiga.criadoEm) {
        dados.criadoPor = usuario.uid;
        dados.criadoEm = fb.serverTimestamp();
      }

      await fb.setDoc(fb.doc(fb.db, "ordensProducao", documentId), dados, { merge: true });
      await registrarLog(
        ordemAntiga.id ? "ordem_calcinha_corrigida" : currentId ? "ordem_atualizada" : "ordem_criada",
        documentId,
        `Calcinha | OP ${numeroOP} | Ref. ${referencia} | ${processo || "SERVIÇO A DEFINIR"} | ${faccao || "FACÇÃO A DEFINIR"}`
      );

      form.reset();
      const idInput = document.getElementById("ordemId");
      const numeroInput = document.getElementById("ordemNumero");
      if (idInput) idInput.value = "";
      if (numeroInput) numeroInput.readOnly = false;
      document.body.dataset.corponuFormType = "calcinha";
      document.querySelector('.corponu-dual-tabs[data-page="ordens"] [data-type="calcinha"]')?.classList.add("active");

      toast(
        ordemAntiga.id
          ? `OP ${numeroOP} corrigida e salva como calcinha.`
          : `OP ${numeroOP} de calcinha salva corretamente.`,
        "success"
      );

      setTimeout(() => {
        document.getElementById("btnAtualizarServidor")?.click();
        setTimeout(() => document.querySelector('.corponu-dual-tabs[data-page="ordens"] [data-type="calcinha"]')?.click(), 350);
      }, 150);
    } catch (erro) {
      console.error("[Calcinha 136] Falha ao salvar OP.", erro);
      toast(erro?.message || "Não foi possível salvar a OP de calcinha.", "error");
    } finally {
      salvandoOrdem = false;
    }
  }

  function extrairIdEnvio(botao) {
    const codigo = String(botao?.getAttribute?.("onclick") || "");
    const match = codigo.match(/mandarParaFaccao\(['\"]([^'\"]+)['\"]\)/i);
    return match?.[1] || "";
  }

  async function repararAntesDoEnvio(event) {
    if (!setorCalcinhaAtivo()) return;
    const botao = event.target?.closest?.("button,a");
    const ordemId = extrairIdEnvio(botao);
    if (!ordemId || enviosEmReparo.has(ordemId)) return;

    const funcaoEnvio = window.mandarParaFaccao;
    if (typeof funcaoEnvio !== "function") return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    enviosEmReparo.add(ordemId);

    try {
      const fb = await firebase();
      const referenciaDocumento = fb.doc(fb.db, "ordensProducao", ordemId);
      const snapshot = await fb.getDoc(referenciaDocumento);
      if (!snapshot.exists()) throw new Error("A OP não foi encontrada no banco de dados.");

      const ordem = { id: snapshot.id, ...snapshot.data() };
      if (!ehCalcinha(ordem)) {
        const produto = await buscarProdutoCalcinha(ordem.referencia);
        if (!produto) {
          throw new Error(`A referência ${ordem.referencia || "-"} não está cadastrada em Produtos → Calcinha.`);
        }

        const usuario = fb.auth.currentUser;
        const processo = normalizar(ordem.processoPlanejado || ordem.processo);
        const faccao = normalizar(ordem.faccaoPlanejada || ordem.destino);
        await fb.setDoc(referenciaDocumento, {
          tipoPeca: "calcinha",
          tipoPecaPadrao: "calcinha",
          tipoPecaLabel: "Calcinha",
          setor: "calcinha",
          produtoNome: produto.nome || ordem.produtoNome || `Calcinha Ref. ${ordem.referencia || ""}`,
          processoPlanejado: CALCINHA_PROCESSES.has(processo) ? processo : "",
          faccaoPlanejada: CALCINHA_PROCESSES.has(processo) ? faccao : "",
          planejamentoCalcinhaPendente: !(CALCINHA_PROCESSES.has(processo) && Boolean(faccao)),
          identidadeCalcinhaConfirmada: true,
          identidadeCalcinhaVersao: VERSION,
          possuiAlca: false,
          possuiBojo: false,
          possuiRenda: false,
          atualizadoPor: usuario?.uid || "",
          atualizadoEm: fb.serverTimestamp()
        }, { merge: true });

        await registrarLog(
          "ordem_corrigida_calcinha_no_envio",
          ordemId,
          `OP ${ordem.numeroOP || ordemId} corrigida de Sutiã para Calcinha antes do envio para facção.`
        );
        toast(`OP ${ordem.numeroOP || ordemId} corrigida como calcinha. Abrindo o envio...`, "success");
      }

      await Promise.resolve(funcaoEnvio(ordemId));
    } catch (erro) {
      console.error("[Calcinha 136] Falha ao reparar a OP no envio.", erro);
      toast(erro?.message || "Não foi possível preparar a OP de calcinha para o envio.", "error");
    } finally {
      enviosEmReparo.delete(ordemId);
    }
  }

  window.addEventListener("submit", salvarOrdemCalcinha, true);
  window.addEventListener("click", repararAntesDoEnvio, true);

  // Mantém a aba de calcinha marcada após atualizações tardias da interface.
  document.addEventListener("click", event => {
    const aba = event.target?.closest?.('.corponu-dual-tabs[data-page="ordens"] [data-type="calcinha"]');
    if (aba) document.body.dataset.corponuFormType = "calcinha";
  }, true);
})();
