(() => {
  "use strict";

  const VERSION = "2026-08-07-calcinha-salvamento-rapido-147";
  const FIREBASE_VERSION = "10.12.5";
  const PROCESSOS_CALCINHA = new Set(["CALCINHA MONTAGEM", "CALCINHA COMPLETA"]);

  if (window.__CORPONU_CALCINHA_SALVAMENTO_RAPIDO_147__ === VERSION) return;
  window.__CORPONU_CALCINHA_SALVAMENTO_RAPIDO_147__ = VERSION;

  let firebasePromise = null;
  let salvando = false;
  let listenerOriginalInterceptado = false;

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
      dados?.setorLabel,
      dados?.processoPlanejado,
      dados?.processo
    ].join(" "));
    return tipo.includes("CALCINHA");
  }

  function formularioCalcinhaAtivo() {
    const aba = document.querySelector('.corponu-dual-tabs[data-page="ordens"] .corponu-dual-tab.active');
    const titulo = normalizar(document.querySelector("#formOrdem .panel-header h3")?.textContent || "");
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

  function toast(mensagem, tipo = "info") {
    const principal = document.getElementById("toast");
    if (principal) {
      principal.textContent = mensagem;
      principal.classList.remove("hidden");
      principal.style.background = tipo === "error" ? "#991b1b" : tipo === "success" ? "#166534" : "";
      clearTimeout(window.__corponuCalcinhaRapidaToast147);
      window.__corponuCalcinhaRapidaToast147 = setTimeout(() => {
        principal.classList.add("hidden");
        principal.style.background = "";
      }, 5500);
      return;
    }
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModule, authModule, fs]) => {
      const apps = appModule.getApps();
      const app = apps.find(item => item.name === "[DEFAULT]") || apps[0] || appModule.getApp();
      return {
        ...fs,
        auth: authModule.getAuth(app),
        db: fs.getFirestore(app)
      };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  function valoresConsulta(valor) {
    const texto = String(valor ?? "").trim();
    const valores = [];
    if (texto) valores.push(texto);
    const numero = Number(texto.replace(",", "."));
    if (texto && Number.isFinite(numero)) valores.push(numero);
    return [...new Set(valores)];
  }

  function buscarProdutoNoEstado(referencia) {
    const mapa = window.corponuDualMode?.state?.maps?.produtos;
    if (!(mapa instanceof Map)) return null;
    const alvo = normalizar(referencia);
    return [...mapa.values()].find(item => normalizar(item?.referencia) === alvo && ehCalcinha(item)) || null;
  }

  async function buscarProdutoCalcinhaRapido(fb, referencia) {
    const cache = buscarProdutoNoEstado(referencia);
    if (cache) return cache;

    const valores = valoresConsulta(referencia);
    const tarefas = [
      fb.getDoc(fb.doc(fb.db, "produtos", `calcinha-${safeId(referencia)}`)).catch(() => null)
    ];

    if (valores.length) {
      const filtro = valores.length === 1
        ? fb.where("referencia", "==", valores[0])
        : fb.where("referencia", "in", valores);
      tarefas.push(
        fb.getDocs(fb.query(fb.collection(fb.db, "produtos"), filtro)).catch(() => null)
      );
    }

    const resultados = await Promise.all(tarefas);
    const encontrados = new Map();
    const direto = resultados[0];
    if (direto?.exists?.()) encontrados.set(direto.id, { id: direto.id, ...direto.data() });
    const consulta = resultados[1];
    consulta?.docs?.forEach(item => encontrados.set(item.id, { id: item.id, ...item.data() }));
    return [...encontrados.values()].find(ehCalcinha) || null;
  }

  async function buscarOrdensPorNumeroRapido(fb, numeroOP, currentId = "") {
    const numeroTexto = normalizar(numeroOP);
    const valores = valoresConsulta(numeroTexto);
    const ids = [...new Set([
      safeId(numeroTexto),
      `calcinha-${safeId(numeroTexto)}`,
      `op-${safeId(numeroTexto)}`,
      currentId
    ].filter(Boolean))];

    const tarefas = ids.map(id =>
      fb.getDoc(fb.doc(fb.db, "ordensProducao", id)).catch(() => null)
    );

    if (valores.length) {
      for (const campo of ["numeroOP", "numeroOPExterno"]) {
        const filtro = valores.length === 1
          ? fb.where(campo, "==", valores[0])
          : fb.where(campo, "in", valores);
        tarefas.push(
          fb.getDocs(fb.query(fb.collection(fb.db, "ordensProducao"), filtro)).catch(() => null)
        );
      }
    }

    const resultados = await Promise.all(tarefas);
    const encontrados = new Map();

    resultados.forEach(resultado => {
      if (!resultado) return;
      if (typeof resultado.exists === "function") {
        if (resultado.exists()) encontrados.set(resultado.id, { id: resultado.id, ...resultado.data() });
        return;
      }
      resultado.docs?.forEach(item => encontrados.set(item.id, { id: item.id, ...item.data() }));
    });

    return [...encontrados.values()].filter(item => {
      if (item.excluida === true || normalizar(item.status) === "EXCLUIDA") return false;
      const numeroItem = normalizar(item.numeroOP || item.numeroOPExterno || item.id.replace(/^calcinha-|^op-/i, ""));
      return numeroItem === numeroTexto;
    });
  }

  function registrarLogAssincrono(fb, acao, alvoId, detalhes) {
    const usuario = fb.auth.currentUser;
    if (!usuario) return;
    fb.addDoc(fb.collection(fb.db, "logsAlteracoes"), {
      acao,
      tipoAlvo: "ordemProducao",
      alvoId: String(alvoId || ""),
      detalhes: String(detalhes || ""),
      usuarioUid: usuario.uid,
      usuarioEmail: usuario.email || "",
      criadoEm: fb.serverTimestamp()
    }).catch(error => console.warn("[Calcinha 147] OP salva, mas o log não foi gravado.", error));
  }

  function sincronizarEstadoLocal(documentoId, dados) {
    const dual = window.corponuDualMode;
    const mapa = dual?.state?.maps?.ordens;
    if (mapa instanceof Map) {
      const anterior = mapa.get(String(documentoId)) || {};
      mapa.set(String(documentoId), { ...anterior, ...dados, id: String(documentoId) });
    }
  }

  function atualizarTelaSemBloquear(numeroOP) {
    [40, 180, 420].forEach((atraso, indice) => {
      window.setTimeout(() => {
        if (indice === 0) document.getElementById("btnAtualizarServidor")?.click();
        const aba = document.querySelector('.corponu-dual-tabs[data-page="ordens"] [data-type="calcinha"]');
        if (document.body.dataset.corponuFormType === "calcinha") aba?.click();

        const alvo = normalizar(numeroOP);
        document.querySelectorAll("#listaOrdens tr").forEach(linha => {
          if (normalizar(linha.cells?.[0]?.textContent || "") === alvo) {
            linha.classList.remove("corponu-dual-hidden");
          }
        });
      }, atraso);
    });
  }

  async function salvarOrdemCalcinhaRapida147(event) {
    const form = event.target;
    if (form?.id !== "formOrdem" || !formularioCalcinhaAtivo()) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (salvando) return;
    salvando = true;

    const botaoSalvar = form.querySelector('button[type="submit"]');
    const textoBotao = botaoSalvar?.textContent || "Salvar OP";
    if (botaoSalvar) {
      botaoSalvar.disabled = true;
      botaoSalvar.textContent = "Salvando...";
    }

    try {
      const fb = await firebase();
      const usuario = fb.auth.currentUser;
      if (!usuario) throw new Error("Sua sessão expirou. Entre novamente.");

      const currentId = String(document.getElementById("ordemId")?.value || "").trim();
      const numeroOP = normalizar(document.getElementById("ordemNumero")?.value || "");
      const referencia = normalizar(document.getElementById("ordemReferencia")?.value || "");
      const cor = normalizar(document.getElementById("ordemCor")?.value || "");
      const quantidade = Number(document.getElementById("ordemQuantidade")?.value || 0);
      const necessidadeLivre = String(document.getElementById("ordemNecessidadeTexto")?.value || "").trim();
      const necessidadeInicio = document.getElementById("ordemCalcinhaNecessidadeInicio")?.value || "";
      const necessidadeFim = document.getElementById("ordemCalcinhaNecessidadeFim")?.value || "";
      const processo = normalizar(document.getElementById("ordemCalcinhaProcesso")?.value || "");
      const faccao = normalizar(document.getElementById("ordemCalcinhaFaccao")?.value || "");
      const observacoes = String(document.getElementById("ordemObs")?.value || "").trim();

      if (!numeroOP || !referencia || !cor || !Number.isFinite(quantidade) || quantidade <= 0) {
        throw new Error("Informe OP, referência, cor e quantidade válida.");
      }
      if (necessidadeInicio && necessidadeFim && necessidadeInicio > necessidadeFim) {
        throw new Error("Confira a necessidade: a data inicial não pode ser maior que a final.");
      }
      if (processo && !PROCESSOS_CALCINHA.has(processo)) {
        throw new Error("O serviço informado não pertence ao fluxo de calcinha.");
      }
      if (!processo && faccao) {
        throw new Error("Selecione o serviço antes de informar a facção.");
      }

      // Produto e duplicidade não dependem um do outro: as duas verificações
      // são executadas em paralelo, em vez de vários awaits sequenciais.
      const [produto, ordensEncontradas] = await Promise.all([
        buscarProdutoCalcinhaRapido(fb, referencia),
        buscarOrdensPorNumeroRapido(fb, numeroOP, currentId)
      ]);

      if (!produto) {
        throw new Error(`Cadastre a referência ${referencia} em Produtos → Calcinha antes de salvar a OP.`);
      }

      const encontradas = ordensEncontradas.filter(item => String(item.id) !== currentId);
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
          `A OP ${numeroOP} já existe classificada como Sutiã.\n\n` +
          `Você está cadastrando pela aba Calcinha. Deseja corrigir o registro existente para Calcinha usando os dados deste formulário?\n\n` +
          `Nenhuma OP nova será criada.`
        );
        if (!confirmar) return;
        documentoId = antiga.id;
        ordemAntiga = antiga;
      } else if (currentId) {
        ordemAntiga = ordensEncontradas.find(item => String(item.id) === currentId) || {};
      }

      const necessidadeDatas = necessidadeInicio && necessidadeFim
        ? `${dataBR(necessidadeInicio)} a ${dataBR(necessidadeFim)}`
        : dataBR(necessidadeInicio || necessidadeFim);
      const necessidadeTexto = necessidadeLivre || necessidadeDatas || "";
      const planejamentoCompleto = PROCESSOS_CALCINHA.has(processo) && Boolean(faccao);

      const dados = {
        numeroOP,
        referencia,
        cor,
        produtoNome: produto.nome || `Calcinha Ref. ${referencia}`,
        quantidade,
        ano: Number((necessidadeInicio || necessidadeFim).slice(0, 4)) || new Date().getFullYear(),
        necessidadeInicio,
        necessidadeFim,
        necessidade: necessidadeTexto,
        necessidadeTexto,
        necessidadeManual: Boolean(necessidadeTexto),
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

      // A partir daqui o salvamento principal terminou. Não esperamos log nem
      // uma nova leitura do Firestore para liberar o formulário.
      sincronizarEstadoLocal(documentoId, dados);
      registrarLogAssincrono(
        fb,
        ordemAntiga.id ? "ordem_corrigida_para_calcinha_147" : currentId ? "ordem_atualizada" : "ordem_criada",
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
      atualizarTelaSemBloquear(numeroOP);
    } catch (error) {
      console.error("[Calcinha 147] Falha ao salvar/corrigir OP.", error);
      toast(error?.message || "Não foi possível salvar a OP de calcinha.", "error");
    } finally {
      salvando = false;
      if (botaoSalvar) {
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = textoBotao;
      }
    }
  }

  function interceptarListenerOriginal137() {
    const addOriginal = window.addEventListener;

    window.addEventListener = function corponuAddEventListener147(tipo, listener, opcoes) {
      const ehSalvar137 = !listenerOriginalInterceptado
        && tipo === "submit"
        && typeof listener === "function"
        && listener.name === "salvarOrdemCalcinha";

      if (!ehSalvar137) {
        return addOriginal.call(this, tipo, listener, opcoes);
      }

      listenerOriginalInterceptado = true;
      window.addEventListener = addOriginal;
      return addOriginal.call(this, tipo, salvarOrdemCalcinhaRapida147, opcoes);
    };

    // Segurança: não deixa o monkeypatch global preso se a 137 não carregar.
    window.setTimeout(() => {
      if (window.addEventListener !== addOriginal && !listenerOriginalInterceptado) {
        window.addEventListener = addOriginal;
      }
    }, 12000);
  }

  interceptarListenerOriginal137();
})();
