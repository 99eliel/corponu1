(() => {
  "use strict";

  const VERSION = "2026-08-04-unificar-lateral-118";
  const FIREBASE_VERSION = "10.12.5";
  const MODAL_ID = "modalPendenciasValoresFinanceiro";
  const SETOR = "lateral";

  if (window.__CORPONU_LATERAL_118_SEGURO__ === VERSION) return;
  window.__CORPONU_LATERAL_118_SEGURO__ = VERSION;

  let contextoPromise = null;
  let normalizacaoExecutada = false;
  let salvando = false;

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

  function processo(item) {
    return normalizar(item?.processo || item?.servicoNome || item?.processoMovimentacao || item?.nomeProcesso || "");
  }

  function ehLateral(item) {
    return processo(item) === "LATERAL";
  }

  function valorPreco(item) {
    for (const campo of ["valor", "valorUnitario", "preco", "valorPorPeca"]) {
      const valor = numero(item?.[campo]);
      if (valor > 0) return valor;
    }
    return 0;
  }

  function pagamentoPendente(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    if (item?.pago === true || item?.cancelado === true || item?.excluido === true) return false;
    if (["PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"].includes(status)) return false;
    return item?.valorPendente === true || item?.valorManualFinanceiroPendente === true ||
      ["SEM VALOR", "AGUARDANDO VALOR"].includes(status) ||
      !(numero(item?.valorUnitario) > 0) || !(numero(item?.total ?? item?.valorTotal) > 0);
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

  async function usuarioAdmin(fs, db, auth) {
    for (let i = 0; i < 30 && !auth.currentUser; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    const usuario = auth.currentUser;
    if (!usuario) return null;
    const snap = await fs.getDoc(fs.doc(db, "usuarios", usuario.uid));
    const perfil = snap.exists() ? snap.data() : {};
    const tipo = normalizar(perfil.tipo || perfil.perfil || perfil.role || "");
    return tipo.includes("ADMIN") && perfil.ativo !== false ? { usuario, perfil } : null;
  }

  function toast(mensagem, erro = false) {
    let el = document.getElementById("corponuLateral118Toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "corponuLateral118Toast";
      el.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:1000002;max-width:min(460px,calc(100vw - 30px));padding:14px 16px;border-radius:13px;box-shadow:0 18px 48px rgba(15,23,42,.28);color:#fff;font:800 13px/1.45 Arial,sans-serif";
      document.body.appendChild(el);
    }
    el.style.background = erro ? "#991b1b" : "#166534";
    el.textContent = mensagem;
    el.style.opacity = "1";
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 220);
    }, erro ? 7000 : 5200);
  }

  async function carregarPrecos(fs, db) {
    const snap = await fs.getDocs(fs.collection(db, "precosReferencia"));
    return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  }

  function principalDoGrupo(itens) {
    return [...itens].sort((a, b) => {
      const setorA = texto(a?.setor).toLowerCase() === SETOR ? 0 : 1;
      const setorB = texto(b?.setor).toLowerCase() === SETOR ? 0 : 1;
      if (setorA !== setorB) return setorA - setorB;
      const origemA = normalizar(a?.origemAtualizacao).includes("117") ? 1 : 0;
      const origemB = normalizar(b?.origemAtualizacao).includes("117") ? 1 : 0;
      if (origemA !== origemB) return origemA - origemB;
      return String(a.id).localeCompare(String(b.id), "pt-BR", { numeric: true });
    })[0] || null;
  }

  async function pagamentosDoPreco(fs, db, precoId) {
    const mapa = new Map();
    for (const campo of ["precoReferenciaId", "servicoId"]) {
      try {
        const snap = await fs.getDocs(fs.query(fs.collection(db, "entregasPagamento"), fs.where(campo, "==", precoId)));
        snap.docs.forEach(docSnap => mapa.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
      } catch (error) {
        console.warn(`Consulta por ${campo} não concluída.`, error);
      }
    }
    return [...mapa.values()];
  }

  async function normalizarCadastros() {
    if (normalizacaoExecutada) return;
    normalizacaoExecutada = true;

    try {
      const { fs, db, auth } = await contexto();
      const acesso = await usuarioAdmin(fs, db, auth);
      if (!acesso) return;

      const precos = await carregarPrecos(fs, db);
      const grupos = new Map();
      precos.filter(ehLateral).forEach(item => {
        const ref = normalizar(item?.referencia);
        if (!ref) return;
        if (!grupos.has(ref)) grupos.set(ref, []);
        grupos.get(ref).push(item);
      });

      const agora = fs.serverTimestamp();
      const batch = fs.writeBatch(db);
      let alteracoes = 0;
      let exclusoes = 0;

      for (const itens of grupos.values()) {
        const principal = principalDoGrupo(itens);
        if (!principal) continue;
        const valores = [...new Set(itens.map(valorPreco).filter(v => v > 0).map(v => v.toFixed(6)))];
        const duplicadosIguais = itens.length > 1 && valores.length <= 1;

        batch.set(fs.doc(db, "precosReferencia", principal.id), {
          processo: "LATERAL",
          setor: SETOR,
          setorLabel: "Lateral",
          atualizadoPor: acesso.usuario.uid,
          atualizadoEm: agora,
          versaoUnificacaoLateral: VERSION
        }, { merge: true });
        alteracoes += 1;

        for (const item of itens) {
          if (item.id === principal.id) continue;
          if (duplicadosIguais) {
            const pagamentos = await pagamentosDoPreco(fs, db, item.id);
            pagamentos.forEach(pagamento => {
              batch.set(fs.doc(db, "entregasPagamento", pagamento.id), {
                precoReferenciaId: principal.id,
                servicoId: principal.id,
                atualizadoEm: agora,
                versaoUnificacaoLateral: VERSION
              }, { merge: true });
            });
            batch.delete(fs.doc(db, "precosReferencia", item.id));
            exclusoes += 1;
          } else {
            batch.set(fs.doc(db, "precosReferencia", item.id), {
              processo: "LATERAL",
              setor: SETOR,
              setorLabel: "Lateral",
              atualizadoPor: acesso.usuario.uid,
              atualizadoEm: agora,
              versaoUnificacaoLateral: VERSION
            }, { merge: true });
            alteracoes += 1;
          }
        }
      }

      if (!alteracoes && !exclusoes) return;
      await batch.commit();
      toast(exclusoes
        ? `LATERAL organizada: ${exclusoes} cadastro duplicado foi unido ao cadastro original.`
        : "Os valores de LATERAL foram reunidos em um único processo.");
    } catch (error) {
      console.error("Falha ao organizar cadastros de LATERAL.", error);
    }
  }

  async function pagamentosPendentesDaReferencia(fs, db, atual, referencia) {
    const mapa = new Map([[atual.id, atual]]);
    const valores = [texto(referencia)];
    const numerica = Number(referencia);
    if (Number.isFinite(numerica)) valores.push(numerica);
    const unicos = valores.filter((item, indice, lista) => lista.findIndex(outro => `${typeof outro}:${outro}` === `${typeof item}:${item}`) === indice);

    try {
      const consulta = unicos.length > 1
        ? fs.query(fs.collection(db, "entregasPagamento"), fs.where("referencia", "in", unicos))
        : fs.query(fs.collection(db, "entregasPagamento"), fs.where("referencia", "==", unicos[0]));
      const snap = await fs.getDocs(consulta);
      snap.docs.forEach(docSnap => mapa.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
      console.warn("Consulta agrupada da LATERAL não concluída.", error);
    }

    return [...mapa.values()].filter(item => pagamentoPendente(item) && ehLateral(item) && normalizar(item?.referencia) === normalizar(referencia));
  }

  async function salvarLateral(botao, pagamento, fs, db, auth) {
    if (salvando) return;
    salvando = true;
    const original = botao.textContent || "Salvar valor";
    botao.disabled = true;
    botao.textContent = "Verificando LATERAL...";

    try {
      const acesso = await usuarioAdmin(fs, db, auth);
      if (!acesso) throw Object.assign(new Error("Somente administrador pode corrigir valores."), { code: "permission-denied" });
      if (!pagamentoPendente(pagamento)) throw new Error("Esse pagamento já possui valor ou está bloqueado.");

      const referencia = texto(pagamento.referencia).toUpperCase();
      const input = document.getElementById(`valorPendencia-${pagamento.id}`);
      const digitado = numero(input?.value);
      const precos = await carregarPrecos(fs, db);
      const candidatos = precos.filter(item => item?.ativo !== false && ehLateral(item) && normalizar(item?.referencia) === normalizar(referencia));
      const valores = [...new Set(candidatos.map(valorPreco).filter(v => v > 0).map(v => v.toFixed(6)))].map(Number);
      const valor = digitado > 0 ? digitado : (valores.length === 1 ? valores[0] : 0);

      if (!(valor > 0)) {
        input?.focus();
        throw new Error(valores.length > 1
          ? "Existem valores diferentes para essa referência. Revise em Gerenciar valores."
          : "Informe um valor unitário maior que zero.");
      }

      const principal = principalDoGrupo(candidatos);
      const precoId = principal?.id || idSeguro(`${referencia}-${SETOR}-LATERAL`);
      const pendentes = await pagamentosPendentesDaReferencia(fs, db, pagamento, referencia);
      const agora = fs.serverTimestamp();
      const batch = fs.writeBatch(db);

      batch.set(fs.doc(db, "precosReferencia", precoId), {
        referencia,
        processo: "LATERAL",
        setor: SETOR,
        setorLabel: "Lateral",
        valor,
        valorUnitario: valor,
        preco: valor,
        ativo: true,
        atualizadoPor: acesso.usuario.uid,
        atualizadoEm: agora,
        versaoUnificacaoLateral: VERSION,
        ...(!principal ? { criadoPor: acesso.usuario.uid, criadoEm: agora } : {})
      }, { merge: true });

      candidatos.forEach(item => {
        batch.set(fs.doc(db, "precosReferencia", item.id), {
          processo: "LATERAL",
          setor: SETOR,
          setorLabel: "Lateral",
          atualizadoPor: acesso.usuario.uid,
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
          setor: SETOR,
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
          valorInformadoPor: acesso.usuario.uid,
          valorInformadoEm: agora,
          atualizadoPor: acesso.usuario.uid,
          atualizadoEm: agora,
          versaoUnificacaoLateral: VERSION
        }, { merge: true });
      });

      botao.textContent = "Aplicando...";
      await batch.commit();
      document.getElementById(MODAL_ID)?.classList.add("hidden");
      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
      toast(`LATERAL corrigida. ${pendentes.length} pagamento(s) atualizado(s) sem duplicar o processo.`);
    } catch (error) {
      console.error("Falha ao salvar valor da LATERAL.", error);
      toast(String(error?.code || "").includes("permission-denied")
        ? "Seu usuário não possui permissão para corrigir valores."
        : (error?.message || "Não foi possível corrigir a LATERAL."), true);
    } finally {
      salvando = false;
      if (document.contains(botao)) {
        botao.disabled = false;
        botao.textContent = original;
      }
    }
  }

  function interceptar(event) {
    const botao = event.target instanceof Element ? event.target.closest('[data-acao-pendencia="salvar-unitario"]') : null;
    if (!botao || !botao.closest(`#${MODAL_ID}`)) return;

    if (botao.dataset.corponu118Bypass === "1") {
      delete botao.dataset.corponu118Bypass;
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const id = texto(botao.dataset.id);
    if (!id) return;

    contexto().then(async ({ fs, db, auth }) => {
      const snap = await fs.getDoc(fs.doc(db, "entregasPagamento", id));
      if (!snap.exists()) throw new Error("Lançamento financeiro não encontrado.");
      const pagamento = { id: snap.id, ...snap.data() };

      if (!ehLateral(pagamento)) {
        botao.dataset.corponu118Bypass = "1";
        setTimeout(() => botao.click(), 0);
        return;
      }

      await salvarLateral(botao, pagamento, fs, db, auth);
    }).catch(error => {
      console.error("Não foi possível identificar o pagamento.", error);
      toast(error?.message || "Não foi possível abrir o lançamento financeiro.", true);
    });
  }

  window.addEventListener("click", interceptar, true);
  setTimeout(normalizarCadastros, 1200);
})();
