(() => {
  "use strict";

  const VERSION = "2026-08-07-ordens-necessidade-opcional-142";
  const FIREBASE_VERSION = "10.12.5";
  const SOURCE_REPARO_CALCINHA = "./corponu-calcinha-reparo-137.js";
  const VERSION_REPARO_ORIGINAL = "2026-08-06-calcinha-reparo-137";
  const VERSION_VISIBILIDADE = "2026-08-06-calcinha-visibilidade-138";
  const VERSION_IDENTIDADE = "2026-08-06-calcinha-identidade-136";

  if (window.__CORPONU_ORDENS_NECESSIDADE_OPCIONAL_142__ === VERSION) return;
  window.__CORPONU_ORDENS_NECESSIDADE_OPCIONAL_142__ = VERSION;

  let firebasePromise = null;
  let salvandoSutia = false;
  let observer = null;

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

  function toast(mensagem, tipo = "info") {
    const principal = document.getElementById("toast");
    if (principal) {
      principal.textContent = mensagem;
      principal.classList.remove("hidden");
      principal.style.background = tipo === "error" ? "#991b1b" : tipo === "success" ? "#166534" : "";
      clearTimeout(window.__corponuNecessidadeOpcionalToast142);
      window.__corponuNecessidadeOpcionalToast142 = setTimeout(() => {
        principal.classList.add("hidden");
        principal.style.background = "";
      }, 6000);
      return;
    }

    let elemento = document.getElementById("corponuNecessidadeOpcionalToast142");
    if (!elemento) {
      elemento = document.createElement("div");
      elemento.id = "corponuNecessidadeOpcionalToast142";
      Object.assign(elemento.style, {
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: "100400",
        maxWidth: "440px",
        padding: "13px 16px",
        borderRadius: "12px",
        color: "#fff",
        font: "800 13px/1.45 Arial, sans-serif",
        boxShadow: "0 16px 40px rgba(0,0,0,.25)"
      });
      document.body.appendChild(elemento);
    }
    elemento.style.background = tipo === "error" ? "#991b1b" : tipo === "success" ? "#166534" : "#173c69";
    elemento.textContent = mensagem;
    clearTimeout(elemento._timer);
    elemento._timer = setTimeout(() => elemento.remove(), 6000);
  }

  function formularioCalcinhaAtivo() {
    const aba = document.querySelector('.corponu-dual-tabs[data-page="ordens"] .corponu-dual-tab.active');
    const titulo = normalizar(document.querySelector("#formOrdem .panel-header h3")?.textContent);
    const planejamento = document.getElementById("ordemCalcinhaPlanejamento");
    let planejamentoVisivel = false;
    try {
      planejamentoVisivel = Boolean(planejamento && getComputedStyle(planejamento).display !== "none");
    } catch (_) {}

    return document.body.dataset.corponuFormType === "calcinha"
      || aba?.dataset?.type === "calcinha"
      || titulo.includes("CALCINHA")
      || planejamentoVisivel;
  }

  function ehCalcinhaDados(dados) {
    const tipo = normalizar([
      dados?.tipoPeca,
      dados?.tipoPecaPadrao,
      dados?.tipoPecaLabel,
      dados?.setor,
      dados?.setorLabel,
      dados?.processoPlanejado,
      dados?.processo
    ].join(" "));
    return tipo.includes("CALCINHA");
  }

  function trocarRotulo(idCampo, textoNovo) {
    const campo = document.getElementById(idCampo);
    const label = campo?.closest("label");
    if (!label) return;
    const primeiroTexto = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && String(node.textContent || "").trim());
    if (primeiroTexto && String(primeiroTexto.textContent || "").trim() !== textoNovo) {
      primeiroTexto.textContent = `${textoNovo}\n`;
    }
  }

  function ajustarInterface() {
    const necessidade = document.getElementById("ordemNecessidadeTexto");
    if (necessidade) {
      necessidade.removeAttribute("required");
      necessidade.setAttribute("aria-required", "false");
      necessidade.placeholder = "Opcional. Ex: URGENTE, 24/07, 24/07 a 30/07";
      trocarRotulo("ordemNecessidadeTexto", "Necessidade (opcional)");
    }

    const inicio = document.getElementById("ordemCalcinhaNecessidadeInicio");
    const fim = document.getElementById("ordemCalcinhaNecessidadeFim");
    if (inicio) {
      inicio.removeAttribute("required");
      inicio.setAttribute("aria-required", "false");
      trocarRotulo("ordemCalcinhaNecessidadeInicio", "Início da necessidade (opcional)");
    }
    if (fim) {
      fim.removeAttribute("required");
      fim.setAttribute("aria-required", "false");
      trocarRotulo("ordemCalcinhaNecessidadeFim", "Final da necessidade (opcional)");
    }

    if (formularioCalcinhaAtivo()) {
      const titulo = document.querySelector("#formOrdem .panel-header h3");
      const descricao = document.querySelector("#formOrdem .panel-header p");
      if (titulo && normalizar(titulo.textContent).includes("CALCINHA") && descricao) {
        descricao.textContent = "Informe OP, referência, cor e quantidade. Necessidade, serviço e facção são opcionais; Cotton Line/Corpo Nu será preenchido no Manejo.";
      }

      const aviso = document.querySelector("#ordemCalcinhaPlanejamento .notice.small");
      if (aviso) {
        aviso.innerHTML = "<strong>Planejamento da calcinha:</strong> necessidade, serviço e facção são opcionais. O que ficar vazio poderá ser definido depois; Cotton Line/Corpo Nu será informado no Manejo.";
      }
    }
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModule, authModule, firestoreModule]) => {
      const apps = appModule.getApps();
      const app = apps.find(item => item.name === "[DEFAULT]") || apps[0] || appModule.getApp();
      return {
        ...firestoreModule,
        auth: authModule.getAuth(app),
        db: firestoreModule.getFirestore(app)
      };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function buscarProdutoSutia(referencia) {
    const fb = await firebase();
    const encontrados = new Map();

    for (const id of [safeId(referencia), `produto-${safeId(referencia)}`]) {
      try {
        const snap = await fb.getDoc(fb.doc(fb.db, "produtos", id));
        if (snap.exists()) encontrados.set(snap.id, { id: snap.id, ...snap.data() });
      } catch (_) {}
    }

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

    const lista = [...encontrados.values()];
    return lista.find(item => !ehCalcinhaDados(item)) || null;
  }

  async function buscarOrdensPorNumero(numeroOP) {
    const fb = await firebase();
    const encontrados = new Map();
    const numeroTexto = normalizar(numeroOP);

    for (const id of [safeId(numeroTexto), `op-${safeId(numeroTexto)}`, `calcinha-${safeId(numeroTexto)}`]) {
      try {
        const snap = await fb.getDoc(fb.doc(fb.db, "ordensProducao", id));
        if (snap.exists()) encontrados.set(snap.id, { id: snap.id, ...snap.data() });
      } catch (_) {}
    }

    const valores = [numeroTexto];
    const numero = Number(numeroTexto);
    if (Number.isFinite(numero)) valores.push(numero);

    for (const campo of ["numeroOP", "numeroOPExterno", "op"]) {
      for (const valor of valores) {
        try {
          const consulta = fb.query(fb.collection(fb.db, "ordensProducao"), fb.where(campo, "==", valor));
          const snapshot = await fb.getDocs(consulta);
          snapshot.forEach(item => encontrados.set(item.id, { id: item.id, ...item.data() }));
        } catch (_) {}
      }
    }

    return [...encontrados.values()].filter(item => item.excluida !== true && normalizar(item.status) !== "EXCLUIDA");
  }

  async function registrarLog(fb, acao, alvoId, detalhes) {
    try {
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
    } catch (error) {
      console.warn("[Necessidade opcional 142] OP salva, mas o log não foi gravado.", error);
    }
  }

  async function salvarSutiaSemNecessidade(event) {
    const form = event.target;
    if (form?.id !== "formOrdem" || formularioCalcinhaAtivo()) return;

    const necessidade = normalizar(document.getElementById("ordemNecessidadeTexto")?.value || "");
    if (necessidade) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (salvandoSutia) return;
    salvandoSutia = true;

    try {
      const fb = await firebase();
      const usuario = fb.auth.currentUser;
      if (!usuario) throw new Error("Sua sessão expirou. Entre novamente.");

      const currentId = String(document.getElementById("ordemId")?.value || "").trim();
      const numeroOP = normalizar(document.getElementById("ordemNumero")?.value || "");
      const referencia = normalizar(document.getElementById("ordemReferencia")?.value || "");
      const cor = normalizar(document.getElementById("ordemCor")?.value || "");
      const quantidade = Number(document.getElementById("ordemQuantidade")?.value || 0);
      const observacoes = String(document.getElementById("ordemObs")?.value || "").trim();

      if (!numeroOP || !referencia || !cor || !Number.isFinite(quantidade) || quantidade <= 0) {
        throw new Error("Informe OP, referência, cor e quantidade válida.");
      }

      const produto = await buscarProdutoSutia(referencia);
      if (!produto) {
        throw new Error(`Cadastre a referência ${referencia} em Produtos → Sutiã antes de salvar a OP.`);
      }

      const encontradas = (await buscarOrdensPorNumero(numeroOP)).filter(item => String(item.id) !== currentId);
      if (encontradas.length) {
        throw new Error(`A OP ${numeroOP} já existe no sistema. Edite a OP existente ou use o rastreamento.`);
      }

      let antiga = {};
      if (currentId) {
        try {
          const snap = await fb.getDoc(fb.doc(fb.db, "ordensProducao", currentId));
          if (snap.exists()) antiga = { id: snap.id, ...snap.data() };
        } catch (_) {}
      }

      const documentoId = currentId || safeId(numeroOP);
      const dados = {
        numeroOP: antiga.numeroOP || numeroOP,
        referencia,
        cor,
        produtoNome: produto.nome || antiga.produtoNome || `Referência ${referencia}`,
        semana: "",
        mes: "",
        ano: new Date().getFullYear(),
        necessidadeInicio: "",
        necessidadeFim: "",
        necessidade: "",
        necessidadeTexto: "",
        necessidadeManual: false,
        quantidade,
        possuiAlca: Boolean(produto.possuiAlca),
        possuiBojo: Boolean(produto.possuiBojo),
        possuiRenda: Boolean(produto.possuiRenda),
        observacoes,
        atualizadoPor: usuario.uid,
        atualizadoEm: fb.serverTimestamp()
      };

      if (!currentId) {
        dados.status = "aberta";
        dados.criadoPor = usuario.uid;
        dados.criadoEm = fb.serverTimestamp();
      }

      await fb.setDoc(fb.doc(fb.db, "ordensProducao", documentoId), dados, currentId ? { merge: true } : undefined);
      await registrarLog(
        fb,
        currentId ? "ordem_atualizada" : "ordem_criada",
        documentoId,
        `Sutiã | OP ${numeroOP} | Ref. ${referencia} | Cor ${cor} | Qtd. ${quantidade} | necessidade não informada`
      );

      form.reset();
      const idInput = document.getElementById("ordemId");
      const numeroInput = document.getElementById("ordemNumero");
      if (idInput) idInput.value = "";
      if (numeroInput) numeroInput.readOnly = false;
      document.body.dataset.corponuFormType = "sutia";

      toast(`OP ${numeroOP} salva. A necessidade ficou em branco.`, "success");
      setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 250);
    } catch (error) {
      console.error("[Necessidade opcional 142] Falha ao salvar OP de sutiã sem necessidade.", error);
      toast(error?.message || "Não foi possível salvar a OP.", "error");
    } finally {
      salvandoSutia = false;
    }
  }

  function substituirUma(fonte, antigo, novo, descricao) {
    if (!fonte.includes(antigo)) {
      throw new Error(`Trecho não encontrado no reparo da Calcinha: ${descricao}.`);
    }
    return fonte.replace(antigo, novo);
  }

  function aplicarPatchCalcinha(fonteOriginal) {
    let fonte = String(fonteOriginal || "");

    fonte = substituirUma(
      fonte,
      `const VERSION = "${VERSION_REPARO_ORIGINAL}";`,
      `const VERSION = "${VERSION}";`,
      "versão"
    );

    fonte = substituirUma(
      fonte,
      'const necessidadeFim = document.getElementById("ordemCalcinhaNecessidadeFim")?.value || "";\n      const processo = normalizar(document.getElementById("ordemCalcinhaProcesso")?.value);',
      'const necessidadeFim = document.getElementById("ordemCalcinhaNecessidadeFim")?.value || "";\n      const necessidadeLivre = normalizar(document.getElementById("ordemNecessidadeTexto")?.value || "");\n      const processo = normalizar(document.getElementById("ordemCalcinhaProcesso")?.value);',
      "leitura da necessidade livre"
    );

    fonte = substituirUma(
      fonte,
      'if (!necessidadeInicio || !necessidadeFim || necessidadeInicio > necessidadeFim) throw new Error("Informe um intervalo de necessidade válido.");',
      'if (necessidadeInicio && necessidadeFim && necessidadeInicio > necessidadeFim) throw new Error("Confira a necessidade: a data inicial não pode ser maior que a final.");',
      "validação obrigatória da necessidade"
    );

    fonte = substituirUma(
      fonte,
      'const necessidadeTexto = `${dataBR(necessidadeInicio)} a ${dataBR(necessidadeFim)}`;\n      const planejamentoCompleto = PROCESSOS_CALCINHA.has(processo) && Boolean(faccao);',
      'const necessidadeDatas = necessidadeInicio && necessidadeFim\n        ? `${dataBR(necessidadeInicio)} a ${dataBR(necessidadeFim)}`\n        : dataBR(necessidadeInicio || necessidadeFim);\n      const necessidadeTexto = necessidadeLivre || necessidadeDatas || "";\n      const planejamentoCompleto = PROCESSOS_CALCINHA.has(processo) && Boolean(faccao);',
      "montagem da necessidade"
    );

    fonte = substituirUma(
      fonte,
      'ano: Number(necessidadeInicio.slice(0, 4)) || new Date().getFullYear(), necessidadeInicio, necessidadeFim,\n        necessidade: necessidadeTexto, necessidadeTexto, necessidadeManual: true, observacoes,',
      'ano: Number((necessidadeInicio || necessidadeFim).slice(0, 4)) || new Date().getFullYear(), necessidadeInicio, necessidadeFim,\n        necessidade: necessidadeTexto, necessidadeTexto, necessidadeManual: Boolean(necessidadeTexto), observacoes,',
      "gravação da necessidade"
    );

    return fonte;
  }

  async function executarReparoCalcinhaPatched() {
    const resposta = await fetch(`${SOURCE_REPARO_CALCINHA}?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`, { cache: "no-store" });
    if (!resposta.ok) throw new Error(`Falha ao carregar reparo da Calcinha (${resposta.status}).`);
    const fonte = aplicarPatchCalcinha(await resposta.text());

    await new Promise((resolve, reject) => {
      const blob = new Blob([fonte], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const script = document.createElement("script");
      script.src = url;
      script.async = false;
      script.dataset.corponuModulo = "calcinha-reparo-necessidade-opcional-142";
      script.onload = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      script.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Não foi possível executar o reparo da Calcinha com necessidade opcional."));
      };
      document.head.appendChild(script);
    });
  }

  function carregarScript(nomeArquivo, modulo, versao) {
    return new Promise((resolve, reject) => {
      const existente = [...document.scripts].find(script => String(script.src || "").includes(nomeArquivo));
      if (existente) {
        resolve(existente);
        return;
      }
      const script = document.createElement("script");
      script.src = `./${nomeArquivo}?v=${encodeURIComponent(versao)}&t=${Date.now()}`;
      script.async = false;
      script.dataset.corponuModulo = modulo;
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error(`Não foi possível carregar ${nomeArquivo}.`));
      document.head.appendChild(script);
    });
  }

  function observarInterface() {
    ajustarInterface();
    if (observer) return;
    observer = new MutationObserver(() => ajustarInterface());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("click", event => {
      if (event.target?.closest?.('.corponu-dual-tabs[data-page="ordens"]')) {
        setTimeout(ajustarInterface, 0);
        setTimeout(ajustarInterface, 100);
      }
    }, true);
  }

  async function iniciarCalcinha() {
    try {
      await executarReparoCalcinhaPatched();
      await carregarScript("corponu-calcinha-visibilidade-138.js", "calcinha-visibilidade-138", VERSION_VISIBILIDADE);
      await carregarScript("corponu-calcinha-identidade-136.js", "calcinha-identidade-136", VERSION_IDENTIDADE);
    } catch (error) {
      console.error("[Necessidade opcional 142] Não foi possível ativar a proteção da Calcinha.", error);
      toast("A atualização da necessidade opcional da Calcinha não foi carregada. Atualize a página.", "error");
    }
  }

  // Captura antes do listener principal do app apenas quando o Sutiã está com necessidade vazia.
  window.addEventListener("submit", salvarSutiaSemNecessidade, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observarInterface, { once: true });
  } else {
    observarInterface();
  }

  iniciarCalcinha();
})();
