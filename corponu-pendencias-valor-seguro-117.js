(() => {
  "use strict";

  const VERSION = "2026-08-04-correcao-lateral-pagamento-117";
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
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    const bruto = texto(valor).replace(/R\$/gi, "").replace(/\s+/g, "");
    if (!bruto) return 0;
    const ajustado = bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto;
    const numero = Number(ajustado.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numero) ? numero : 0;
  }

  function primeiroValorPositivo(item) {
    for (const campo of ["valor", "valorUnitario", "preco", "valorPorPeca"]) {
      const valor = numeroMoeda(item?.[campo]);
      if (valor > 0) return valor;
    }
    return 0;
  }

  function processoCanonico(valor) {
    const chave = normalizar(valor);
    const aliases = {
      BOJO: "ENCAPAR BOJO",
      ENCAPAR: "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      ALCA: "ALÇA",
      ALCAS: "ALÇA",
      "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
      "SUTIA COMPLETO": "SUTIÃ COMPLETO"
    };
    return aliases[chave] || chave;
  }

  function processoDoItem(item) {
    return processoCanonico(
      item?.processo || item?.servicoNome || item?.processoMovimentacao || item?.nomeProcesso || ""
    );
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
    if (item?.pago === true || item?.cancelado === true || item?.excluido === true) return false;
    if ([
      "PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA",
      "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
    ].includes(status)) return false;
    return item?.valorPendente === true ||
      item?.valorManualFinanceiroPendente === true ||
      ["SEM VALOR", "AGUARDANDO VALOR"].includes(status) ||
      !(numeroMoeda(item?.valorUnitario) > 0) ||
      !(numeroMoeda(item?.total ?? item?.valorTotal) > 0);
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
      return { fs, db: fs.getFirestore(app), auth: authMod.getAuth(app) };
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
      throw Object.assign(new Error("Somente administrador ativo pode corrigir valores."), {
        code: "permission-denied"
      });
    }
    return perfil;
  }

  async function carregarPrecos(fs, db) {
    const snap = await fs.getDocs(fs.collection(db, "precosReferencia"));
    return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  }

  function candidatosPreco(precos, referencia, processo) {
    const ref = normalizar(referencia);
    const proc = normalizar(processoCanonico(processo));
    return precos.filter(item =>
      item?.ativo !== false &&
      normalizar(item?.referencia) === ref &&
      normalizar(processoDoItem(item)) === proc
    );
  }

  function valorUnicoDosCandidatos(candidatos) {
    const valores = [...new Set(
      candidatos.map(primeiroValorPositivo).filter(valor => valor > 0).map(valor => valor.toFixed(6))
    )].map(Number);
    return valores.length === 1 ? valores[0] : 0;
  }

  async function buscarPagamentosCorrespondentes(fs, db, pagamentoAtual, referencia, processo) {
    const encontrados = new Map([[pagamentoAtual.id, pagamentoAtual]]);
    const valores = [texto(referencia)];
    const numerica = Number(referencia);
    if (Number.isFinite(numerica)) valores.push(numerica);
    const unicos = valores.filter((item, indice, lista) =>
      lista.findIndex(outro => `${typeof outro}:${outro}` === `${typeof item}:${item}`) === indice
    );

    try {
      const consulta = unicos.length > 1
        ? fs.query(fs.collection(db, "entregasPagamento"), fs.where("referencia", "in", unicos))
        : fs.query(fs.collection(db, "entregasPagamento"), fs.where("referencia", "==", unicos[0]));
      const snap = await fs.getDocs(consulta);
      snap.docs.forEach(docSnap => encontrados.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
      console.warn("A consulta agrupada falhou; será corrigido ao menos o lançamento selecionado.", error);
    }

    return [...encontrados.values()].filter(item =>
      pagamentoAtivoSemValor(item) &&
      normalizar(item?.referencia) === normalizar(referencia) &&
      normalizar(processoDoItem(item)) === normalizar(processo)
    );
  }

  function exibirToast(mensagem, erro = false) {
    let toast = document.getElementById("corponuPendenciaValorSeguroToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "corponuPendenciaValorSeguroToast";
      toast.setAttribute("role", "status");
      toast.style.cssText = [
        "position:fixed", "right:18px", "bottom:18px", "z-index:1000000",
        "max-width:min(460px,calc(100vw - 30px))", "padding:14px 16px",
        "border-radius:13px", "box-shadow:0 18px 48px rgba(15,23,42,.28)",
        "color:#fff", "font:800 13px/1.45 Arial,sans-serif"
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
    }, erro ? 7000 : 5500);
  }

  function fecharCentral() {
    document.getElementById(MODAL_ID)?.classList.add("hidden");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

  async function gravarEmLotes(fs, db, operacoes) {
    for (let inicio = 0; inicio < operacoes.length; inicio += 400) {
      const batch = fs.writeBatch(db);
      operacoes.slice(inicio, inicio + 400).forEach(operacao => {
        batch.set(fs.doc(db, operacao.colecao, operacao.id), operacao.dados, { merge: true });
      });
      await batch.commit();
    }
  }

  async function registrarLog(fs, db, usuario, perfil, referencia, processo, valor, quantidade) {
    try {
      await fs.addDoc(fs.collection(db, "logsAlteracoes"), {
        acao: normalizar(processo) === "LATERAL"
          ? "pendencias_lateral_corrigidas_sem_recarregar_sistema"
          : "valor_unitario_pagamento_definido_central_segura",
        tipoAlvo: "entregasPagamento",
        alvoId: `${referencia}-${processo}`,
        detalhes: `Ref. ${referencia} | ${processo} | R$ ${valor.toFixed(4)} | ${quantidade} pagamento(s)`,
        usuarioUid: usuario.uid,
        usuarioNome: perfil?.nome || usuario.displayName || "",
        usuarioEmail: perfil?.email || usuario.email || "",
        usuarioTipo: perfil?.tipo || "admin",
        criadoEm: fs.serverTimestamp(),
        versao: VERSION
      });
    } catch (error) {
      console.warn("Correção concluída, mas o log complementar não foi criado.", error);
    }
  }

  async function salvarValorUnitario(botao) {
    if (salvando) return;
    const id = texto(botao?.dataset?.id);
    const input = document.getElementById(`valorPendencia-${id}`);
    const valorDigitado = numeroMoeda(input?.value);

    if (!id) return exibirToast("Lançamento não identificado. Atualize a lista.", true);

    salvando = true;
    const textoOriginal = botao.textContent || "Salvar valor";
    botao.disabled = true;
    botao.textContent = "Verificando valor...";

    try {
      const { fs, db, auth } = await contexto();
      const usuario = await aguardarUsuario(auth);
      const perfil = await validarAdministrador(fs, db, usuario);
      const pagamentoSnap = await fs.getDoc(fs.doc(db, "entregasPagamento", id));
      if (!pagamentoSnap.exists()) throw new Error("O lançamento financeiro não foi encontrado.");

      const pagamento = { id: pagamentoSnap.id, ...pagamentoSnap.data() };
      if (!pagamentoAtivoSemValor(pagamento)) {
        throw new Error("Esse lançamento já possui valor ou não pode mais ser alterado.");
      }

      const referencia = texto(pagamento.referencia).toUpperCase();
      const processo = processoDoItem(pagamento);
      const setor = setorDoPagamento(pagamento, processo);
      if (!referencia || !processo) throw new Error("A referência ou o processo não foi identificado.");

      const precos = await carregarPrecos(fs, db);
      const candidatos = candidatosPreco(precos, referencia, processo);
      const valorCadastrado = valorUnicoDosCandidatos(candidatos);
      const valor = valorDigitado > 0 ? valorDigitado : valorCadastrado;

      if (!(valor > 0)) {
        input?.focus();
        if (candidatos.some(item => primeiroValorPositivo(item) > 0)) {
          throw new Error("Existem valores diferentes para esta referência e processo. Revise em Gerenciar valores.");
        }
        throw new Error("Informe um valor unitário maior que zero.");
      }

      const correspondentes = await buscarPagamentosCorrespondentes(
        fs, db, pagamento, referencia, processo
      );
      if (!correspondentes.length) throw new Error("Nenhum lançamento pendente foi encontrado.");

      const agora = fs.serverTimestamp();
      const precoPrincipal = candidatos.find(item => primeiroValorPositivo(item) === valor) || candidatos[0] || null;
      const precoId = precoPrincipal?.id || docIdSeguro(`${referencia}-${setor}-${processo}`);
      const operacoes = [];

      if (normalizar(processo) === "LATERAL") {
        const grupos = new Map();
        precos.filter(item => item?.ativo !== false && normalizar(processoDoItem(item)) === "LATERAL")
          .forEach(item => {
            const ref = normalizar(item?.referencia);
            if (!ref) return;
            if (!grupos.has(ref)) grupos.set(ref, []);
            grupos.get(ref).push(item);
          });

        grupos.forEach((itens, refNormalizada) => {
          const valorGrupo = refNormalizada === normalizar(referencia)
            ? valor
            : valorUnicoDosCandidatos(itens);
          if (!(valorGrupo > 0)) return;
          const referenciaCanonica = texto(itens.find(item => texto(item?.referencia))?.referencia || refNormalizada);
          itens.forEach(item => {
            operacoes.push({
              colecao: "precosReferencia",
              id: item.id,
              dados: {
                referencia: referenciaCanonica,
                processo: "LATERAL",
                valor: valorGrupo,
                valorUnitario: valorGrupo,
                preco: valorGrupo,
                ativo: true,
                atualizadoPor: usuario.uid,
                atualizadoEm: agora,
                origemAtualizacao: "correcao_lateral_117",
                versaoValorFinanceiro: VERSION
              }
            });
          });
        });
      }

      operacoes.push({
        colecao: "precosReferencia",
        id: precoId,
        dados: {
          referencia,
          processo,
          setor,
          setorLabel: labelSetor(setor),
          valor,
          valorUnitario: valor,
          preco: valor,
          ativo: true,
          atualizadoPor: usuario.uid,
          atualizadoEm: agora,
          origemAtualizacao: "central_financeira_segura_117",
          versaoValorFinanceiro: VERSION,
          ...(!precoPrincipal ? { criadoPor: usuario.uid, criadoEm: agora } : {})
        }
      });

      correspondentes.forEach(item => {
        const quantidade = Math.max(0, Number(item.quantidade ?? item.quantidadeRecebida ?? 0));
        const desconto = Math.max(0, numeroMoeda(item.descontoDefeito ?? item.defeito ?? 0));
        const subtotal = quantidade * valor;
        operacoes.push({
          colecao: "entregasPagamento",
          id: item.id,
          dados: {
            precoReferenciaId: precoId,
            servicoId: precoId,
            processo: normalizar(processo) === "LATERAL" ? "LATERAL" : processo,
            processoMovimentacao: normalizar(processo) === "LATERAL" ? "LATERAL" : (item.processoMovimentacao || processo),
            servicoNome: normalizar(processo) === "LATERAL" ? "LATERAL" : processo,
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
            valorInformadoEm: agora,
            atualizadoPor: usuario.uid,
            atualizadoEm: agora,
            versaoValorFinanceiro: VERSION
          }
        });
      });

      botao.textContent = "Aplicando...";
      await gravarEmLotes(fs, db, operacoes);

      fecharCentral();
      exibirToast(
        normalizar(processo) === "LATERAL"
          ? `LATERAL corrigida. ${correspondentes.length} pagamento(s) receberam o valor cadastrado sem recarregar o sistema inteiro.`
          : `Valor aplicado. ${correspondentes.length} pagamento(s) foram recalculados.`
      );
      registrarLog(fs, db, usuario, perfil, referencia, processo, valor, correspondentes.length);
    } catch (error) {
      console.error("Falha na correção segura do valor pendente.", error);
      const permissao = String(error?.code || "").includes("permission-denied");
      exibirToast(
        permissao
          ? "Seu usuário não possui permissão para corrigir valores."
          : (error?.message || "Não foi possível aplicar o valor."),
        true
      );
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
