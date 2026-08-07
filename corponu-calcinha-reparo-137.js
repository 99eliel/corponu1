(() => {
  "use strict";

  const VERSION = "2026-08-06-calcinha-reparo-137";
  const FIREBASE_VERSION = "10.12.5";
  const OP_REPARO_IMEDIATO = "57864";
  const PROCESSOS_CALCINHA = new Set(["CALCINHA MONTAGEM", "CALCINHA COMPLETA"]);

  if (window.__CORPONU_CALCINHA_REPARO_137__ === VERSION) return;
  window.__CORPONU_CALCINHA_REPARO_137__ = VERSION;

  let firebasePromise = null;
  let salvando = false;
  let reparo57864Executado = false;

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
    const inicio = document.getElementById("ordemCalcinhaNecessidadeInicio")?.value || "";
    const fim = document.getElementById("ordemCalcinhaNecessidadeFim")?.value || "";
    let planejamentoVisivel = false;
    try {
      planejamentoVisivel = Boolean(planejamento && getComputedStyle(planejamento).display !== "none");
    } catch (_) {}

    return document.body.dataset.corponuFormType === "calcinha"
      || aba?.dataset?.type === "calcinha"
      || titulo.includes("CALCINHA")
      || planejamentoVisivel
      || Boolean(inicio || fim);
  }

  function toast(mensagem, tipo = "info") {
    let elemento = document.getElementById("corponuCalcinhaReparoToast137");
    if (!elemento) {
      elemento = document.createElement("div");
      elemento.id = "corponuCalcinhaReparoToast137";
      Object.assign(elemento.style, {
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: "100250",
        maxWidth: "460px",
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
    }, 6500);
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
        onAuthStateChanged: authModule.onAuthStateChanged,
        db: firestoreModule.getFirestore(app)
      };
    });
    return firebasePromise;
  }

  async function buscarPorIds(candidatos) {
    const fb = await firebase();
    const encontrados = new Map();
    for (const id of candidatos) {
      try {
        const snap = await fb.getDoc(fb.doc(fb.db, "ordensProducao", id));
        if (snap.exists()) encontrados.set(snap.id, { id: snap.id, ...snap.data() });
      } catch (_) {}
    }
    return encontrados;
  }

  async function buscarOrdensPorNumero(numeroOP) {
    const fb = await firebase();
    const numeroTexto = normalizar(numeroOP);
    const ids = [
      safeId(numeroTexto),
      `calcinha-${safeId(numeroTexto)}`,
      `op-${safeId(numeroTexto)}`
    ];
    const encontrados = await buscarPorIds(ids);
    const valores = [numeroTexto];
    const numero = Number(numeroTexto);
    if (Number.isFinite(numero)) valores.push(numero);

    for (const campo of ["numeroOP", "numeroOPExterno"]) {
      for (const valor of valores) {
        try {
          const consulta = fb.query(fb.collection(fb.db, "ordensProducao"), fb.where(campo, "==", valor));
          const snapshot = await fb.getDocs(consulta);
          snapshot.forEach(item => encontrados.set(item.id, { id: item.id, ...item.data() }));
        } catch (_) {}
      }
    }

    return [...encontrados.values()].filter(item =>
      normalizar(item.numeroOP || item.numeroOPExterno || item.id.replace(/^calcinha-|^op-/i, "")) === numeroTexto
    );
  }

  async function buscarProdutoCalcinha(referencia) {
    const fb = await firebase();
    const encontrados = new Map();
    const idDireto = `calcinha-${safeId(referencia)}`;
    try {
      const direto = await fb.getDoc(fb.doc(fb.db, "produtos", idDireto));
      if (direto.exists()) encontrados.set(direto.id, { id: direto.id, ...direto.data() });
    } catch (_) {}

    const valores = [String(referencia || "").trim()];
    const numero = Number(referencia);
    if (Number.isFinite(numero)) valores.push(numero);
    for (const valor of valores) {
      if (valor === "") continue;
      try {
        const consulta = fb.query(fb.collection(fb.db, "produtos"), fb.where("referencia", "==", valor));
        const snapshot = await fb.getDocs(consulta);
        snapshot.forEach(item => encontrados.set(item.id, { id: item.id, ...item.data() }));
      } catch (_) {}
    }
    return [...encontrados.values()].find(ehCalcinha) || null;
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
      console.warn("[Calcinha 137] Log não salvo.", erro);
    }
  }

  async function aplicarIdentidadeCalcinha(ordem, extras = {}) {
    const fb = await firebase();
    const usuario = fb.auth.currentUser;
    const processoInformado = normalizar(extras.processoPlanejado ?? ordem?.processoPlanejado ?? ordem?.processo ?? "");
    const processo = PROCESSOS_CALCINHA.has(processoInformado) ? processoInformado : "";
    const faccao = processo ? normalizar(extras.faccaoPlanejada ?? ordem?.faccaoPlanejada ?? "") : "";

    const dados = {
      tipoPeca: "calcinha",
      tipoPecaPadrao: "calcinha",
      tipoPecaLabel: "Calcinha",
      setor: "calcinha",
      processoPlanejado: processo,
      faccaoPlanejada: faccao,
      planejamentoCalcinhaPendente: !(processo && faccao),
      possuiAlca: false,
      possuiBojo: false,
      possuiRenda: false,
      identidadeCalcinhaConfirmada: true,
      identidadeCalcinhaVersao: VERSION,
      reparoCalcinha137: true,
      atualizadoPor: usuario?.uid || "",
      atualizadoEm: fb.serverTimestamp(),
      ...extras
    };

    // Nunca deixa processo de sutiã reaparecer depois do merge de extras.
    const processoFinal = normalizar(dados.processoPlanejado);
    if (!PROCESSOS_CALCINHA.has(processoFinal)) {
      dados.processoPlanejado = "";
      dados.faccaoPlanejada = "";
      dados.planejamentoCalcinhaPendente = true;
    }

    await fb.setDoc(fb.doc(fb.db, "ordensProducao", ordem.id), dados, { merge: true });
    return { ...ordem, ...dados };
  }

  function atualizarTelaDepoisDoReparo() {
    setTimeout(() => {
      document.getElementById("btnAtualizarServidor")?.click();
      setTimeout(() => {
        document.querySelector('.corponu-dual-tabs[data-page="ordens"] [data-type="calcinha"]')?.click();
      }, 500);
    }, 250);
  }

  async function repararOP57864() {
    if (reparo57864Executado) return;
    reparo57864Executado = true;
    try {
      const ordens = await buscarOrdensPorNumero(OP_REPARO_IMEDIATO);
      if (!ordens.length) return;
      const jaCalcinha = ordens.find(ehCalcinha);
      if (jaCalcinha) return;
      if (ordens.length !== 1) {
        console.warn(`[Calcinha 137] OP ${OP_REPARO_IMEDIATO}: mais de um documento encontrado; reparo automático ignorado por segurança.`, ordens.map(item => item.id));
        return;
      }

      const ordem = ordens[0];
      const produto = await buscarProdutoCalcinha(ordem.referencia);
      const corrigida = await aplicarIdentidadeCalcinha(ordem, {
        produtoNome: produto?.nome || ordem.produtoNome || `Calcinha Ref. ${ordem.referencia || ""}`,
        processoPlanejado: "",
        faccaoPlanejada: "",
        planejamentoCalcinhaPendente: true
      });
      await registrarLog(
        "ordem_calcinha_reparo_automatico_137",
        corrigida.id,
        `OP ${OP_REPARO_IMEDIATO} corrigida de Sutiã para Calcinha. Serviço e facção ficaram para definir no envio.`
      );
      toast(`OP ${OP_REPARO_IMEDIATO} corrigida e restaurada em Calcinha.`, "success");
      atualizarTelaDepoisDoReparo();
    } catch (erro) {
      reparo57864Executado = false;
      console.error("[Calcinha 137] Não foi possível reparar a OP 57864.", erro);
    }
  }

  async function salvarOrdemCalcinha(event) {
    const form = event.target;
    if (form?.id !== "formOrdem" || !formularioCalcinhaAtivo()) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (salvando) return;
    salvando = true;

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
      if (processo && !PROCESSOS_CALCINHA.has(processo)) {
        throw new Error("O serviço informado não pertence ao fluxo de calcinha.");
      }
      if (!processo && faccao) {
        throw new Error("Selecione o serviço antes de informar a facção.");
      }

      const produto = await buscarProdutoCalcinha(referencia);
      if (!produto) throw new Error(`Cadastre a referência ${referencia} em Produtos → Calcinha antes de salvar a OP.`);

      const encontradas = (await buscarOrdensPorNumero(numeroOP)).filter(item => item.id !== currentId);
      const calcinhaExistente = encontradas.find(ehCalcinha);
      const incorretas = encontradas.filter(item => !ehCalcinha(item));

      if (calcinhaExistente) {
        throw new Error(`A OP ${numeroOP} já existe corretamente em Calcinha.`);
      }
      if (incorretas.length > 1 || (encontradas.length && incorretas.length !== 1)) {
        throw new Error(`A OP ${numeroOP} possui mais de um registro conflitante. Não alterei nada; confira antes de continuar.`);
      }

      let documentoId = currentId || `calcinha-${safeId(numeroOP)}`;
      let ordemAntiga = {};
      if (incorretas.length === 1) {
        const antiga = incorretas[0];
        const confirmar = window.confirm(
          `A OP ${numeroOP} já existe classificada como Sutiã.\n\nVocê está cadastrando pela aba Calcinha. Deseja corrigir o registro existente para Calcinha usando os dados deste formulário?\n\nNenhuma OP nova será criada.`
        );
        if (!confirmar) return;
        documentoId = antiga.id;
        ordemAntiga = antiga;
      } else if (currentId) {
        try {
          const snap = await fb.getDoc(fb.doc(fb.db, "ordensProducao", currentId));
          if (snap.exists()) ordemAntiga = { id: snap.id, ...snap.data() };
        } catch (_) {}
      }

      const necessidadeTexto = `${dataBR(necessidadeInicio)} a ${dataBR(necessidadeFim)}`;
      const planejamentoCompleto = PROCESSOS_CALCINHA.has(processo) && Boolean(faccao);
      const dados = {
        numeroOP,
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
        faccaoPlanejada: processo ? faccao : "",
        planejamentoCalcinhaPendente: !planejamentoCompleto,
        possuiAlca: false,
        possuiBojo: false,
        possuiRenda: false,
        identidadeCalcinhaConfirmada: true,
        identidadeCalcinhaVersao: VERSION,
        reparoCalcinha137: Boolean(ordemAntiga.id),
        status: ordemAntiga.status || "aberta",
        atualizadoPor: usuario.uid,
        atualizadoEm: fb.serverTimestamp()
      };
      if (!ordemAntiga.criadoEm) {
        dados.criadoPor = usuario.uid;
        dados.criadoEm = fb.serverTimestamp();
      }

      await fb.setDoc(fb.doc(fb.db, "ordensProducao", documentoId), dados, { merge: true });
      await registrarLog(
        ordemAntiga.id ? "ordem_corrigida_para_calcinha_137" : currentId ? "ordem_atualizada" : "ordem_criada",
        documentoId,
        `Calcinha | OP ${numeroOP} | Ref. ${referencia} | ${processo || "SERVIÇO A DEFINIR"} | ${faccao || "FACÇÃO A DEFINIR"}`
      );

      form.reset();
      const idInput = document.getElementById("ordemId");
      const numeroInput = document.getElementById("ordemNumero");
      if (idInput) idInput.value = "";
      if (numeroInput) numeroInput.readOnly = false;
      document.body.dataset.corponuFormType = "calcinha";

      toast(
        ordemAntiga.id
          ? `OP ${numeroOP} corrigida: agora pertence a Calcinha.`
          : `OP ${numeroOP} de calcinha salva corretamente.`,
        "success"
      );
      atualizarTelaDepoisDoReparo();
    } catch (erro) {
      console.error("[Calcinha 137] Falha ao salvar/corrigir OP.", erro);
      toast(erro?.message || "Não foi possível salvar a OP de calcinha.", "error");
    } finally {
      salvando = false;
    }
  }

  // Registrado no window em captura para rodar antes dos listeners antigos do form.
  window.addEventListener("submit", salvarOrdemCalcinha, true);

  firebase().then(fb => {
    fb.onAuthStateChanged(fb.auth, user => {
      if (user) setTimeout(repararOP57864, 900);
    });
    if (fb.auth.currentUser) setTimeout(repararOP57864, 700);
  }).catch(erro => console.error("[Calcinha 137] Firebase não inicializado.", erro));
})();
