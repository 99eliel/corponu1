(() => {
  "use strict";

  const VERSION = "2026-08-04-reconciliar-valores-pendentes-114";
  const FIREBASE_VERSION = "10.12.5";
  const MODAL_ID = "modalPendenciasValoresFinanceiro";
  const CACHE_PRECOS_MS = 15_000;

  if (window.__CORPONU_PENDENCIAS_AUTO_VALORES__ === VERSION) return;
  window.__CORPONU_PENDENCIAS_AUTO_VALORES__ = VERSION;

  let contextoPromise = null;
  let executando = false;
  let timer = 0;
  let observer = null;
  let atualizandoListaPeloModulo = false;
  let cachePrecos = { expiraEm: 0, tabela: new Map(), ambiguos: new Set() };

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function numero(valor, padrao = 0) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
    const bruto = texto(valor).replace(/R\$/gi, "").replace(/\s+/g, "");
    if (!bruto) return padrao;
    const convertido = Number(bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "")
      : bruto.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(convertido) ? convertido : padrao;
  }

  function processoCanonico(valor) {
    const original = texto(valor).toUpperCase();
    const chave = normalizar(original);
    const aliases = {
      BOJO: "ENCAPAR BOJO",
      ENCAPAR: "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      ALCA: "ALÇA",
      ALCAS: "ALÇA",
      "MONTAGEM CALCINHA": "CALCINHA MONTAGEM",
      "MONTAR CALCINHA": "CALCINHA MONTAGEM",
      CALCINHA: "CALCINHA COMPLETA",
      "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
      "SUTIA COMPLETO": "SUTIÃ COMPLETO"
    };
    return aliases[chave] || original;
  }

  function processoDoItem(item) {
    return processoCanonico(
      item?.processo || item?.servicoNome || item?.processoMovimentacao || item?.nome || ""
    );
  }

  function chaveReferenciaProcesso(referencia, processo) {
    return `${normalizar(referencia)}|${normalizar(processoCanonico(processo))}`;
  }

  function pagamentoAtivoSemValor(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    if (item?.cancelado === true || item?.excluido === true) return false;
    if ([
      "PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA",
      "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
    ].includes(status)) return false;

    return item?.valorPendente === true ||
      item?.valorManualFinanceiroPendente === true ||
      ["SEM VALOR", "AGUARDANDO VALOR"].includes(status) ||
      !(numero(item?.valorUnitario) > 0) ||
      !(numero(item?.total) > 0);
  }

  function valorDoPreco(item) {
    return numero(item?.valorUnitario ?? item?.valor ?? item?.preco);
  }

  function timestampMillis(valor) {
    if (!valor) return 0;
    if (typeof valor?.toMillis === "function") return valor.toMillis();
    if (typeof valor?.seconds === "number") return valor.seconds * 1000;
    const data = new Date(valor);
    return Number.isFinite(data.getTime()) ? data.getTime() : 0;
  }

  function modalVisivel() {
    const modal = document.getElementById(MODAL_ID);
    if (!(modal instanceof HTMLElement)) return false;
    if (modal.hidden || modal.classList.contains("hidden")) return false;
    return getComputedStyle(modal).display !== "none";
  }

  function idsPendentesVisiveis() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return [];
    return [...new Set(
      [...modal.querySelectorAll('[data-acao-pendencia="salvar-unitario"][data-id]')]
        .map(botao => texto(botao.dataset.id))
        .filter(Boolean)
    )];
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
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

  async function usuarioPodeReconciliar(fs, db, usuario) {
    if (!usuario) return false;
    const snap = await fs.getDoc(fs.doc(db, "usuarios", usuario.uid));
    if (!snap.exists()) return false;
    const perfil = snap.data() || {};
    const tipo = normalizar(perfil.tipo || perfil.perfil || perfil.role || "");
    return perfil.ativo !== false && tipo.includes("ADMIN");
  }

  async function carregarTabelaPrecos(fs, db, forcar = false) {
    if (!forcar && cachePrecos.expiraEm > Date.now()) return cachePrecos;

    const snap = await fs.getDocs(fs.collection(db, "precosReferencia"));
    const grupos = new Map();

    snap.docs.forEach(docSnap => {
      const item = { id: docSnap.id, ...docSnap.data() };
      const referencia = texto(item?.referencia);
      const processo = processoDoItem(item);
      const valor = valorDoPreco(item);
      if (!referencia || !processo || !(valor > 0) || item?.ativo === false) return;

      const chave = chaveReferenciaProcesso(referencia, processo);
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push({
        id: item.id,
        referencia,
        processo,
        valor,
        atualizadoEm: timestampMillis(item?.atualizadoEm || item?.criadoEm)
      });
    });

    const tabela = new Map();
    const ambiguos = new Set();

    grupos.forEach((itens, chave) => {
      const valoresDistintos = new Set(itens.map(item => numero(item.valor).toFixed(6)));
      if (valoresDistintos.size > 1) {
        ambiguos.add(chave);
        return;
      }
      itens.sort((a, b) => b.atualizadoEm - a.atualizadoEm || a.id.localeCompare(b.id));
      tabela.set(chave, itens[0]);
    });

    cachePrecos = {
      expiraEm: Date.now() + CACHE_PRECOS_MS,
      tabela,
      ambiguos
    };
    return cachePrecos;
  }

  async function carregarPagamentosVisiveis(fs, db, ids) {
    const resultados = [];
    for (let inicio = 0; inicio < ids.length; inicio += 20) {
      const bloco = ids.slice(inicio, inicio + 20);
      const snaps = await Promise.all(
        bloco.map(id => fs.getDoc(fs.doc(db, "entregasPagamento", id)))
      );
      snaps.forEach(snap => {
        if (snap.exists()) resultados.push({ id: snap.id, ...snap.data() });
      });
    }
    return resultados;
  }

  function exibirToast(mensagem, erro = false) {
    let toast = document.getElementById("corponuPendenciasAutoValoresToast114");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "corponuPendenciasAutoValoresToast114";
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
    }, erro ? 7000 : 5200);
  }

  function botaoAtualizarLista() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return null;
    return [...modal.querySelectorAll("button")].find(botao =>
      normalizar(botao.textContent).includes("ATUALIZAR LISTA")
    ) || null;
  }

  function atualizarListaDepois() {
    window.setTimeout(() => {
      const botao = botaoAtualizarLista();
      if (botao && !botao.disabled) {
        atualizandoListaPeloModulo = true;
        botao.click();
        window.setTimeout(() => { atualizandoListaPeloModulo = false; }, 900);
        return;
      }

      try {
        if (typeof window.atualizarDadosServidorAgora === "function") {
          Promise.resolve(window.atualizarDadosServidorAgora()).catch(error => console.warn(error));
        } else if (typeof window.renderPagamentos === "function") {
          window.renderPagamentos();
        }
      } catch (error) {
        console.warn("Valores reconciliados, mas a lista não foi atualizada automaticamente.", error);
      }
    }, 180);
  }

  async function reconciliar(forcarPrecos = false) {
    if (executando || !modalVisivel()) return { atualizados: 0, ambiguos: 0 };
    const ids = idsPendentesVisiveis();
    if (!ids.length) return { atualizados: 0, ambiguos: 0 };

    executando = true;
    try {
      const { fs, db, auth } = await contexto();
      const usuario = await aguardarUsuario(auth);
      if (!(await usuarioPodeReconciliar(fs, db, usuario))) {
        return { atualizados: 0, ambiguos: 0 };
      }

      const [{ tabela, ambiguos }, pagamentos] = await Promise.all([
        carregarTabelaPrecos(fs, db, forcarPrecos),
        carregarPagamentosVisiveis(fs, db, ids)
      ]);

      const alteracoes = [];
      let totalAmbiguos = 0;

      pagamentos.forEach(item => {
        if (!pagamentoAtivoSemValor(item)) return;
        const referencia = texto(item?.referencia);
        const processo = processoDoItem(item);
        if (!referencia || !processo) return;

        const chave = chaveReferenciaProcesso(referencia, processo);
        if (ambiguos.has(chave)) {
          totalAmbiguos += 1;
          return;
        }

        const preco = tabela.get(chave);
        if (!preco || !(preco.valor > 0)) return;

        const quantidade = Math.max(0, numero(item?.quantidade ?? item?.quantidadeRecebida));
        if (!(quantidade > 0)) return;
        const desconto = Math.max(0, numero(item?.descontoDefeito ?? item?.defeito));
        const subtotal = quantidade * preco.valor;

        alteracoes.push({
          id: item.id,
          dados: {
            precoReferenciaId: preco.id,
            servicoId: preco.id,
            valorUnitario: preco.valor,
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
            origemAtualizacaoValor: "reconciliacao_automatica_tabela",
            versaoValorFinanceiro: VERSION
          }
        });
      });

      if (!alteracoes.length) return { atualizados: 0, ambiguos: totalAmbiguos };

      for (let inicio = 0; inicio < alteracoes.length; inicio += 400) {
        const batch = fs.writeBatch(db);
        alteracoes.slice(inicio, inicio + 400).forEach(alteracao => {
          batch.set(
            fs.doc(db, "entregasPagamento", alteracao.id),
            alteracao.dados,
            { merge: true }
          );
        });
        await batch.commit();
      }

      exibirToast(
        `${alteracoes.length} pendência(s) atualizada(s) com os valores já cadastrados em Gerenciar valores.`
      );
      atualizarListaDepois();
      return { atualizados: alteracoes.length, ambiguos: totalAmbiguos };
    } catch (error) {
      console.error("Não foi possível reconciliar os valores pendentes.", error);
      const permissao = String(error?.code || "").includes("permission-denied");
      exibirToast(
        permissao
          ? "Seu usuário não possui permissão para atualizar os pagamentos pendentes."
          : "Não foi possível aplicar automaticamente os valores cadastrados. Atualize a lista e tente novamente.",
        true
      );
      return { atualizados: 0, ambiguos: 0, erro: error };
    } finally {
      executando = false;
    }
  }

  function agendar(forcarPrecos = false, atraso = 420) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => reconciliar(forcarPrecos), atraso);
  }

  function instalarEventos() {
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target.closest("button, a") : null;
      if (!alvo) return;

      if (alvo.id === "btnAtualizarConferenciaPagamentoFinal") {
        cachePrecos.expiraEm = 0;
        agendar(true, 850);
        return;
      }

      if (alvo.closest(`#${MODAL_ID}`) && normalizar(alvo.textContent).includes("ATUALIZAR LISTA")) {
        if (atualizandoListaPeloModulo) return;
        cachePrecos.expiraEm = 0;
        agendar(true, 700);
      }
    }, true);
  }

  function instalarObserver() {
    if (observer) return;
    observer = new MutationObserver(mudancas => {
      const modal = document.getElementById(MODAL_ID);
      if (!modal || !modalVisivel()) return;
      const relevante = mudancas.some(mudanca =>
        mudanca.target === modal ||
        (mudanca.target instanceof Node && modal.contains(mudanca.target))
      );
      if (relevante) agendar(false, 500);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden", "style"]
    });
  }

  function iniciar() {
    instalarEventos();
    instalarObserver();
    if (modalVisivel()) agendar(true, 700);
  }

  window.CorpoNuPendenciasAutoValores = {
    versao: VERSION,
    reconciliar: () => {
      cachePrecos.expiraEm = 0;
      return reconciliar(true);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
