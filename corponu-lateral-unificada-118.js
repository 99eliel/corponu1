(() => {
  "use strict";

  const VERSION = "2026-08-04-unificar-lateral-118";
  const FIREBASE_VERSION = "10.12.5";
  const MODAL_ID = "modalPendenciasValoresFinanceiro";
  const SETOR_LATERAL = "lateral";

  if (window.__CORPONU_LATERAL_UNIFICADA__ === VERSION) return;
  window.__CORPONU_LATERAL_UNIFICADA__ = VERSION;

  let contextoPromise = null;
  let salvando = false;
  let normalizacaoIniciada = false;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function numero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    const bruto = texto(valor).replace(/R\$/gi, "").replace(/\s+/g, "");
    if (!bruto) return 0;
    const ajustado = bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto;
    const resultado = Number(ajustado.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(resultado) ? resultado : 0;
  }

  function valorPreco(item) {
    for (const campo of ["valor", "valorUnitario", "preco", "valorPorPeca"]) {
      const valor = numero(item?.[campo]);
      if (valor > 0) return valor;
    }
    return 0;
  }

  function processoDoItem(item) {
    return normalizar(
      item?.processo || item?.servicoNome || item?.processoMovimentacao || item?.nomeProcesso || ""
    );
  }

  function ehLateral(itemOuTexto) {
    return normalizar(typeof itemOuTexto === "object" ? processoDoItem(itemOuTexto) : itemOuTexto) === "LATERAL";
  }

  function pagamentoPodeSerCorrigido(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    if (item?.pago === true || item?.cancelado === true || item?.excluido === true) return false;
    return ![
      "PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA",
      "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
    ].includes(status);
  }

  function pagamentoSemValor(item) {
    if (!pagamentoPodeSerCorrigido(item)) return false;
    const status = normalizar(item?.statusPagamento || item?.status || "");
    return item?.valorPendente === true ||
      item?.valorManualFinanceiroPendente === true ||
      ["SEM VALOR", "AGUARDANDO VALOR"].includes(status) ||
      !(numero(item?.valorUnitario) > 0) ||
      !(numero(item?.total ?? item?.valorTotal) > 0);
  }

  function idSeguro(valor) {
    return texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 180) || `lateral-${Date.now()}`;
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
    return auth.currentUser || null;
  }

  async function perfilAdministrador(fs, db, usuario) {
    if (!usuario) return null;
    const snap = await fs.getDoc(fs.doc(db, "usuarios", usuario.uid));
    const perfil = snap.exists() ? snap.data() : {};
    const tipo = normalizar(perfil.tipo || perfil.perfil || perfil.role || "");
    if (!tipo.includes("ADMIN") || perfil.ativo === false) return null;
    return perfil;
  }

  function toast(mensagem, erro = false) {
    let elemento = document.getElementById("corponuLateralUnificadaToast");
    if (!elemento) {
      elemento = document.createElement("div");
      elemento.id = "corponuLateralUnificadaToast";
      elemento.setAttribute("role", "status");
      elemento.style.cssText = [
        "position:fixed", "right:18px", "bottom:18px", "z-index:1000001",
        "max-width:min(460px,calc(100vw - 30px))", "padding:14px 16px",
        "border-radius:13px", "box-shadow:0 18px 48px rgba(15,23,42,.28)",
        "color:#fff", "font:800 13px/1.45 Arial,sans-serif"
      ].join(";");
      document.body.appendChild(elemento);
    }
    elemento.style.background = erro ? "#991b1b" : "#166534";
    elemento.textContent = mensagem;
    elemento.style.opacity = "1";
    clearTimeout(elemento._timer);
    elemento._timer = setTimeout(() => {
      elemento.style.opacity = "0";
      setTimeout(() => elemento.remove(), 220);
    }, erro ? 7000 : 5200);
  }

  async function carregarPrecos(fs, db) {
    const snap = await fs.getDocs(fs.collection(db, "precosReferencia"));
    return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  }

  function agruparLateraisPorReferencia(precos) {
    const grupos = new Map();
    precos.filter(ehLateral).forEach(item => {
      const referencia = normalizar(item?.referencia);
      if (!referencia) return;
      if (!grupos.has(referencia)) grupos.set(referencia, []);
      grupos.get(referencia).push(item);
    });
    return grupos;
  }

  function escolherPrincipal(itens) {
    return [...itens].sort((a, b) => {
      const setorA = texto(a?.setor).toLowerCase() === SETOR_LATERAL ? 0 : 1;
      const setorB = texto(b?.setor).toLowerCase() === SETOR_LATERAL ? 0 : 1;
      if (setorA !== setorB) return setorA - setorB;
      const origemA = normalizar(a?.origemAtualizacao).includes("117") ? 1 : 0;
      const origemB = normalizar(b?.origemAtualizacao).includes("117") ? 1 : 0;
      if (origemA !== origemB) return origemA - origemB;
      return String(a.id).localeCompare(String(b.id), "pt-BR", { numeric: true });
    })[0] || null;
  }

  async function pagamentosQueApontamPara(fs, db, precoId) {
    const encontrados = new Map();
    for (const campo of ["precoReferenciaId", "servicoId"]) {
      try {
        const snap = await fs.getDocs(
          fs.query(fs.collection(db, "entregasPagamento"), fs.where(campo, "==", precoId))
        );
        snap.docs.forEach(docSnap => encontrados.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
      } catch (error) {
        console.warn(`Não foi possível consultar pagamentos por ${campo}.`, error);
      }
    }
    return [...encontrados.values()];
  }

  async function normalizarCadastrosLaterais() {
    if (normalizacaoIniciada) return;
    normalizacaoIniciada = true;

    try {
      const { fs, db, auth } = await contexto();
      const usuario = await aguardarUsuario(auth);
      const perfil = await perfilAdministrador(fs, db, usuario);
      if (!perfil) return;

      const precos = await carregarPrecos(fs, db);
      const grupos = agruparLateraisPorReferencia(precos);
      const agora = fs.serverTimestamp();
      const atualizacoes = [];
      const exclusoes = [];
      const pagamentosParaReapontar = new Map();

      for (const itens of grupos.values()) {
        const principal = escolherPrincipal(itens);
        if (!principal) continue;

        const valores = [...new Set(itens.map(valorPreco).filter(v => v > 0).map(v => v.toFixed(6)))];
        const podeUnirDuplicados = itens.length > 1 && valores.length <= 1;

        atualizacoes.push({
          id: principal.id,
          dados: {
            processo: "LATERAL",
            setor: SETOR_LATERAL,
            setorLabel: "Lateral",
            atualizadoPor: usuario.uid,
            atualizadoEm: agora,
            versaoUnificacaoLateral: VERSION
          }
        });

        for (const item of itens) {
          if (item.id === principal.id) continue;

          if (podeUnirDuplicados) {
            const pagamentos = await pagamentosQueApontamPara(fs, db, item.id);
            pagamentos.forEach(pagamento => pagamentosParaReapontar.set(pagamento.id, {
              id: pagamento.id,
              principalId: principal.id
            }));
            exclusoes.push(item.id);
          } else {
            atualizacoes.push({
              id: item.id,
              dados: {
                processo: "LATERAL",
                setor: SETOR_LATERAL,
                setorLabel: "Lateral",
                atualizadoPor: usuario.uid,
                atualizadoEm: agora,
                versaoUnificacaoLateral: VERSION
              }
            });
          }
        }
      }

      if (!atualizacoes.length && !exclusoes.length && !pagamentosParaReapontar.size) return;

      const batch = fs.writeBatch(db);
      atualizacoes.forEach(item => {
        batch.set(fs.doc(db, "precosReferencia", item.id), item.dados, { merge: true });
      });
      pagamentosParaReapontar.forEach(item => {
        batch.set(fs.doc(db, "entregasPagamento", item.id), {
          precoReferenciaId: item.principalId,
          servicoId: item.principalId,
          atualizadoEm: agora,
          versaoUnificacaoLateral: VERSION
        }, { merge: true });
      });
      exclusoes.forEach(id => batch.delete(fs.doc(db, "precosReferencia", id)));
      await batch.commit();

      try {
        await fs.addDoc(fs.collection(db, "logsAlteracoes"), {
          acao: "cadastros_lateral_unificados",
          entidade: "precosReferencia",
          entidadeId: "LATERAL",
          detalhes: `${atualizacoes.length} valor(es) normalizado(s) e ${exclusoes.length} duplicidade(s) removida(s).`,
          usuarioUid: usuario.uid,
          usuarioEmail: usuario.email || "",
          criadoEm: fs.serverTimestamp(),
          versao: VERSION
        });
      } catch (error) {
        console.warn("LATERAL unificada, mas o log não foi criado.", error);
      }

      toast("Os valores de LATERAL foram reunidos em um único processo.");
    } catch (error) {
      console.error("Não foi possível unificar os cadastros de LATERAL.", error);
    }
  }

  async function buscarPagamentosPendentes(fs, db, pagamentoAtual, referencia) {
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
      console.warn("A consulta agrupada da LATERAL falhou; será usado o lançamento atual.", error);
    }

    return [...encontrados.values()].filter(item =>
      pagamentoSemValor(item) &&
      ehLateral(item) &&
      normalizar(item?.referencia) === normalizar(referencia)
    );
  }

  async function salvarLateral(botao) {
    if (salvando) return;
    const id = texto(botao?.dataset?.id);
    if (!id) return;

    salvando = true;
    const original = botao.textContent || "Salvar valor";
    botao.disabled = true;
    botao.textContent = "Verificando LATERAL...";

    try {
      const { fs, db, auth } = await contexto();
      const usuario = await aguardarUsuario(auth);
      const perfil = await perfilAdministrador(fs, db, usuario);
      if (!perfil) throw Object.assign(new Error("Somente administrador pode corrigir valores."), { code: "permission-denied" });

      const pagamentoSnap = await fs.getDoc(fs.doc(db, "entregasPagamento", id));
      if (!pagamentoSnap.exists()) throw new Error("Lançamento financeiro não encontrado.");
      const pagamento = { id: pagamentoSnap.id, ...pagamentoSnap.data() };
      if (!ehLateral(pagamento)) return;
      if (!pagamentoSemValor(pagamento)) throw new Error("Esse pagamento já possui valor ou está bloqueado.");

      const referencia = texto(pagamento.referencia).toUpperCase();
      const input = document.getElementById(`valorPendencia-${id}`);
      const valorDigitado = numero(input?.value);
      const precos = await carregarPrecos(fs, db);
      const candidatos = precos.filter(item =>
        item?.ativo !== false && ehLateral(item) && normalizar(item?.referencia) === normalizar(referencia)
      );
      const valoresCadastrados = [...new Set(
        candidatos.map(valorPreco).filter(v => v > 0).map(v => v.toFixed(6))
      )].map(Number);
      const valor = valorDigitado > 0
        ? valorDigitado
        : (valoresCadastrados.length === 1 ? valoresCadastrados[0] : 0);

      if (!(valor > 0)) {
        input?.focus();
        throw new Error(valoresCadastrados.length > 1
          ? "Existem valores diferentes para esta referência. Revise em Gerenciar valores."
          : "Informe um valor unitário maior que zero.");
      }

      const principal = escolherPrincipal(candidatos) || null;
      const precoId = principal?.id || idSeguro(`${referencia}-${SETOR_LATERAL}-LATERAL`);
      const pendentes = await buscarPagamentosPendentes(fs, db, pagamento, referencia);
      const agora = fs.serverTimestamp();
      const batch = fs.writeBatch(db);

      batch.set(fs.doc(db, "precosReferencia", precoId), {
        referencia,
        processo: "LATERAL",
        setor: SETOR_LATERAL,
        setorLabel: "Lateral",
        valor,
        valorUnitario: valor,
        preco: valor,
        ativo: true,
        atualizadoPor: usuario.uid,
        atualizadoEm: agora,
        versaoUnificacaoLateral: VERSION,
        ...(!principal ? { criadoPor: usuario.uid, criadoEm: agora } : {})
      }, { merge: true });

      candidatos.forEach(item => {
        batch.set(fs.doc(db, "precosReferencia", item.id), {
          processo: "LATERAL",
          setor: SETOR_LATERAL,
          setorLabel: "Lateral",
          atualizadoPor: usuario.uid,
          atualizadoEm: agora,
          versaoUnificacaoLateral: VERSION
        }, { merge: true });
      });

      pendentes.forEach(item => {
        const quantidade = Math.max(0, Number(item.quantidade ?? item.quantidadeRecebida ?? 0));
        const desconto = Math.max(0, numero(item.descontoDefeito ?? item.defeito ?? 0));
        const subtotal = quantidade * valor;
        batch.set(fs.doc(db, "entregasPagamento", item.id), {
          precoReferenciaId: precoId,
          servicoId: precoId,
          processo: "LATERAL",
          processoMovimentacao: "LATERAL",
          servicoNome: "LATERAL",
          setor: SETOR_LATERAL,
          setorLabel: "Lateral",
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
          versaoUnificacaoLateral: VERSION
        }, { merge: true });
      });

      botao.textContent = "Aplicando...";
      await batch.commit();
      document.getElementById(MODAL_ID)?.classList.add("hidden");
      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
      toast(`LATERAL corrigida. ${pendentes.length} pagamento(s) receberam o valor sem duplicar o processo.`);
      setTimeout(normalizarCadastrosLaterais, 80);
    } catch (error) {
      console.error("Falha ao aplicar valor de LATERAL.", error);
      toast(
        String(error?.code || "").includes("permission-denied")
          ? "Seu usuário não possui permissão para corrigir valores."
          : (error?.message || "Não foi possível aplicar o valor da LATERAL."),
        true
      );
    } finally {
      salvando = false;
      if (document.contains(botao)) {
        botao.disabled = false;
        botao.textContent = original;
      }
    }
  }

  function interceptarLateral(event) {
    const botao = event.target instanceof Element
      ? event.target.closest('[data-acao-pendencia="salvar-unitario"]')
      : null;
    if (!botao || !botao.closest(`#${MODAL_ID}`)) return;

    const id = texto(botao.dataset.id);
    if (!id) return;

    contexto().then(async ({ fs, db }) => {
      const snap = await fs.getDoc(fs.doc(db, "entregasPagamento", id));
      if (!snap.exists() || !ehLateral(snap.data())) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      salvarLateral(botao);
    }).catch(error => console.warn("Não foi possível identificar a pendência de LATERAL.", error));
  }

  window.addEventListener("click", interceptarLateral, true);
  setTimeout(normalizarCadastrosLaterais, 1200);
})();
