(() => {
  "use strict";

  const VERSION = "2026-08-03-pendencias-valor-seguro-105";
  const FIREBASE_VERSION = "10.12.5";
  const MODAL_ID = "modalPendenciasValoresFinanceiro";

  if (window.__CORPONU_PENDENCIAS_VALOR_SEGURO__ === VERSION) return;
  window.__CORPONU_PENDENCIAS_VALOR_SEGURO__ = VERSION;

  let contextoPromise = null;
  let salvando = false;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function numeroMoeda(valor) {
    const bruto = texto(valor).replace(/R\$/gi, "").replace(/\s+/g, "");
    if (!bruto) return 0;
    const normalizado = bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto;
    const numero = Number(normalizado.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numero) ? numero : 0;
  }

  function processoCanonico(valor) {
    const chave = normalizar(valor);
    const aliases = {
      "BOJO": "ENCAPAR BOJO",
      "ENCAPAR": "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      "ALCA": "ALÇA",
      "ALCAS": "ALÇA",
      "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
      "SUTIA COMPLETO": "SUTIÃ COMPLETO"
    };
    return aliases[chave] || texto(valor).toUpperCase();
  }

  function processoDoPagamento(item) {
    return processoCanonico(item?.processo || item?.servicoNome || item?.processoMovimentacao || "");
  }

  function setorDoPagamento(item, processo) {
    const salvo = texto(item?.setor || item?.area).toLowerCase();
    if (salvo) return salvo;
    const chave = normalizar(processo);
    if (chave === "LATERAL") return "corte";
    if (chave.includes("BOJO")) return "bojo";
    if (chave.includes("ALCA")) return "alca";
    if (chave.includes("CALCINHA")) return "calcinha";
    if (chave.includes("SUTIA")) return "sutia";
    return "producao";
  }

  function labelSetor(setor) {
    const mapa = {
      corte: "Lateral",
      lateral: "Lateral",
      bojo: "Bojo",
      alca: "Alça",
      calcinha: "Calcinha",
      sutia: "Sutiã"
    };
    return mapa[texto(setor).toLowerCase()] || "Produção";
  }

  function docIdSeguro(valor) {
    return texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 180) || `valor-${Date.now()}`;
  }

  function pagamentoAtivoSemValor(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    if (item?.cancelado === true || item?.excluido === true) return false;
    if (["PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA"].includes(status)) return false;
    return item?.valorPendente === true ||
      item?.valorManualFinanceiroPendente === true ||
      ["SEM VALOR", "AGUARDANDO VALOR"].includes(status) ||
      !(Number(item?.valorUnitario || 0) > 0) ||
      !(Number(item?.total || 0) > 0);
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não foi inicializado.");
      const app = appMod.getApp();
      return {
        fs,
        db: fs.getFirestore(app),
        auth: authMod.getAuth(app)
      };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  async function aguardarUsuario(auth) {
    for (let tentativa = 0; tentativa < 30 && !auth.currentUser; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 150));
    }
    if (!auth.currentUser) throw new Error("Usuário ainda não autenticado.");
    return auth.currentUser;
  }

  async function validarAdministrador(fs, db, usuario) {
    const snap = await fs.getDoc(fs.doc(db, "usuarios", usuario.uid));
    const perfil = snap.exists() ? snap.data() : {};
    const tipo = normalizar(perfil.tipo || perfil.perfil || perfil.role || "");
    if (!tipo.includes("ADMIN") || perfil.ativo === false) {
      throw Object.assign(
        new Error("Somente administrador ativo pode cadastrar valores por referência."),
        { code: "permission-denied" }
      );
    }
    return perfil;
  }

  async function buscarPrecoExistente(fs, db, referencia, processo, setor) {
    const encontrados = new Map();
    const numeroReferencia = Number(referencia);
    const valores = [referencia];
    if (Number.isFinite(numeroReferencia) && !valores.includes(numeroReferencia)) valores.push(numeroReferencia);

    try {
      const consulta = valores.length > 1
        ? fs.query(fs.collection(db, "precosReferencia"), fs.where("referencia", "in", valores))
        : fs.query(fs.collection(db, "precosReferencia"), fs.where("referencia", "==", referencia));
      const snap = await fs.getDocs(consulta);
      snap.docs.forEach(docSnap => encontrados.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
      console.warn("Consulta do valor cadastrado indisponível; será usado o identificador seguro.", error);
    }

    return [...encontrados.values()].find(item =>
      normalizar(processoDoPagamento(item)) === normalizar(processo) &&
      (!texto(item.setor) || texto(item.setor).toLowerCase() === texto(setor).toLowerCase())
    ) || [...encontrados.values()].find(item =>
      normalizar(processoDoPagamento(item)) === normalizar(processo)
    ) || null;
  }

  async function buscarPagamentosCorrespondentes(fs, db, pagamentoAtual, referencia, processo) {
    const encontrados = new Map([[pagamentoAtual.id, pagamentoAtual]]);
    const numeroReferencia = Number(referencia);
    const valores = [referencia];
    if (Number.isFinite(numeroReferencia) && !valores.includes(numeroReferencia)) valores.push(numeroReferencia);

    try {
      const consulta = valores.length > 1
        ? fs.query(fs.collection(db, "entregasPagamento"), fs.where("referencia", "in", valores))
        : fs.query(fs.collection(db, "entregasPagamento"), fs.where("referencia", "==", referencia));
      const snap = await fs.getDocs(consulta);
      snap.docs.forEach(docSnap => encontrados.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
      console.warn("Não foi possível consultar todas as pendências da referência; o lançamento selecionado será atualizado.", error);
    }

    return [...encontrados.values()].filter(item =>
      pagamentoAtivoSemValor(item) &&
      normalizar(item?.referencia) === normalizar(referencia) &&
      normalizar(processoDoPagamento(item)) === normalizar(processo)
    );
  }

  function exibirToast(mensagem, erro = false) {
    let toast = document.getElementById("corponuPendenciaValorSeguroToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "corponuPendenciaValorSeguroToast";
      toast.setAttribute("role", "status");
      toast.style.cssText = [
        "position:fixed",
        "right:18px",
        "bottom:18px",
        "z-index:1000000",
        "max-width:min(430px,calc(100vw - 30px))",
        "padding:14px 16px",
        "border-radius:13px",
        "box-shadow:0 18px 48px rgba(15,23,42,.28)",
        "color:#fff",
        "font:800 13px/1.45 Arial,sans-serif"
      ].join(";");
      document.body.appendChild(toast);
    }
    toast.style.background = erro ? "#991b1b" : "#166534";
    toast.textContent = mensagem;
    toast.style.opacity = "1";
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(() => {
      toast.style.opacity = "0";
      window.setTimeout(() => toast.remove(), 220);
    }, erro ? 7000 : 5200);
  }

  function fecharCentral() {
    document.getElementById(MODAL_ID)?.classList.add("hidden");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

  function atualizarTelaEmSegundoPlano() {
    window.setTimeout(() => {
      try {
        if (typeof window.atualizarDadosServidorAgora === "function") {
          Promise.resolve(window.atualizarDadosServidorAgora()).catch(error => console.warn(error));
        } else if (typeof window.renderPagamentos === "function") {
          window.renderPagamentos();
        }
      } catch (error) {
        console.warn("Valor salvo, mas a atualização visual posterior não foi concluída.", error);
      }
    }, 250);
  }

  async function registrarLog(fs, db, usuario, perfil, precoId, referencia, processo, valor, quantidade) {
    try {
      await fs.addDoc(fs.collection(db, "logsAlteracoes"), {
        acao: "valor_unitario_pagamento_definido_central_segura",
        tipoAlvo: "precoReferencia",
        alvoId: precoId,
        detalhes: `Ref. ${referencia} | ${processo} | R$ ${valor.toFixed(4)} por peça | ${quantidade} pagamento(s) recalculado(s)`,
        usuarioUid: usuario.uid,
        usuarioNome: perfil?.nome || usuario.displayName || "",
        usuarioEmail: perfil?.email || usuario.email || "",
        usuarioTipo: perfil?.tipo || "admin",
        criadoEm: fs.serverTimestamp(),
        versao: VERSION
      });
    } catch (error) {
      console.warn("Valor e pagamentos foram salvos, mas o log complementar não foi criado.", error);
    }
  }

  async function salvarValorUnitario(botao) {
    if (salvando) return;
    const id = texto(botao?.dataset?.id);
    const input = document.getElementById(`valorPendencia-${id}`);
    const valor = numeroMoeda(input?.value);

    if (!id) return exibirToast("Lançamento não identificado. Atualize a lista.", true);
    if (!(valor > 0)) {
      input?.focus();
      return exibirToast("Informe um valor unitário maior que zero.", true);
    }

    salvando = true;
    const textoOriginal = botao.textContent || "Salvar valor";
    botao.disabled = true;
    botao.textContent = "Salvando e recalculando...";
    let precoSalvo = false;

    try {
      const { fs, db, auth } = await contexto();
      const usuario = await aguardarUsuario(auth);
      const perfil = await validarAdministrador(fs, db, usuario);
      const pagamentoRef = fs.doc(db, "entregasPagamento", id);
      const pagamentoSnap = await fs.getDoc(pagamentoRef);
      if (!pagamentoSnap.exists()) throw new Error("O lançamento financeiro não foi encontrado.");

      const pagamento = { id: pagamentoSnap.id, ...pagamentoSnap.data() };
      const status = normalizar(pagamento.statusPagamento || pagamento.status || "");
      if (["PAGO", "PAGA", "QUITADO", "QUITADA"].includes(status)) {
        throw new Error("Esse pagamento já foi confirmado e não pode ser recalculado por esta tela.");
      }

      const referencia = texto(pagamento.referencia).toUpperCase();
      const processo = processoDoPagamento(pagamento);
      const setor = setorDoPagamento(pagamento, processo);
      if (!referencia || !processo) throw new Error("A referência ou o processo não foi identificado.");

      const existente = await buscarPrecoExistente(fs, db, referencia, processo, setor);
      const precoId = existente?.id || docIdSeguro(`${referencia}-${setor}-${processo}`);
      const precoRef = fs.doc(db, "precosReferencia", precoId);
      const agora = fs.serverTimestamp();
      const preco = {
        referencia,
        processo,
        setor,
        setorLabel: labelSetor(setor),
        valor,
        valorUnitario: valor,
        preco: valor,
        ativo: true,
        origemAtualizacao: "central_financeira_pendencias",
        atualizadoPor: usuario.uid,
        atualizadoEm: agora,
        versaoValorFinanceiro: VERSION
      };
      if (!existente) {
        preco.criadoPor = usuario.uid;
        preco.criadoEm = agora;
      }
      await fs.setDoc(precoRef, preco, { merge: true });
      precoSalvo = true;

      const correspondentes = await buscarPagamentosCorrespondentes(
        fs,
        db,
        pagamento,
        referencia,
        processo
      );
      if (!correspondentes.length) throw new Error("Nenhum lançamento pendente foi encontrado para recalcular.");

      let atualizados = 0;
      for (let inicio = 0; inicio < correspondentes.length; inicio += 400) {
        const batch = fs.writeBatch(db);
        correspondentes.slice(inicio, inicio + 400).forEach(item => {
          const quantidade = Math.max(0, Number(item.quantidade ?? item.quantidadeRecebida ?? 0));
          const desconto = Math.max(0, Number(item.descontoDefeito ?? item.defeito ?? 0));
          const subtotal = quantidade * valor;
          batch.set(fs.doc(db, "entregasPagamento", item.id), {
            precoReferenciaId: precoId,
            servicoId: precoId,
            valorUnitario: valor,
            subtotal,
            total: Math.max(subtotal - desconto, 0),
            statusPagamento: "pendente",
            valorPendente: false,
            valorManualFinanceiroPendente: false,
            formaValorPagamento: "valor_unitario_base",
            motivoValorPendente: "",
            avisoPagamento: "",
            valorInformadoPor: usuario.uid,
            valorInformadoEm: fs.serverTimestamp(),
            atualizadoPor: usuario.uid,
            atualizadoEm: fs.serverTimestamp(),
            versaoValorFinanceiro: VERSION
          }, { merge: true });
          atualizados += 1;
        });
        await batch.commit();
      }

      fecharCentral();
      exibirToast(
        `Valor de ${referencia} + ${processo} cadastrado. ${atualizados} pagamento(s) foram recalculados.`
      );
      registrarLog(fs, db, usuario, perfil, precoId, referencia, processo, valor, atualizados);
      atualizarTelaEmSegundoPlano();
    } catch (error) {
      console.error("Falha no salvamento seguro do valor pendente.", error);
      const permissao = String(error?.code || "").includes("permission-denied");
      const mensagem = permissao
        ? "Seu usuário não possui permissão para cadastrar valores por referência."
        : precoSalvo
          ? "O valor foi cadastrado, mas o recálculo não terminou. Clique novamente depois de conferir a conexão."
          : (error?.message || "Não foi possível salvar e recalcular o valor.");
      exibirToast(mensagem, true);
    } finally {
      salvando = false;
      if (document.contains(botao)) {
        botao.disabled = false;
        botao.textContent = textoOriginal;
      }
    }
  }

  function interceptarClique(event) {
    const alvo = event.target instanceof Element
      ? event.target.closest('[data-acao-pendencia="salvar-unitario"]')
      : null;
    if (!alvo || !alvo.closest(`#${MODAL_ID}`)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    salvarValorUnitario(alvo);
  }

  window.addEventListener("click", interceptarClique, true);
})();
