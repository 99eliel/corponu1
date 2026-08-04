(() => {
  "use strict";

  const VERSION = "2026-08-04-pendencias-aplicar-valores-cadastrados-116";
  const FIREBASE_VERSION = "10.12.5";
  const MODAL_ID = "modalPendenciasValoresFinanceiro";
  const BANNER_ID = "corponuPendenciasValoresCadastrados116";
  const STYLE_ID = "styleCorponuPendenciasValoresCadastrados116";

  if (window.__CORPONU_PENDENCIAS_VALORES_CADASTRADOS_116__ === VERSION) return;
  window.__CORPONU_PENDENCIAS_VALORES_CADASTRADOS_116__ = VERSION;

  let firebasePromise = null;
  let perfilPromise = null;
  let verificando = false;
  let aplicando = false;
  let timer = 0;
  let observer = null;
  let correspondencias = [];
  let assinatura = "";

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ").replace(/\s+/g, " ").trim().toUpperCase();
  const numero = (valor, padrao = 0) => {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
    const bruto = texto(valor).replace(/R\$/gi, "").replace(/\s+/g, "");
    if (!bruto) return padrao;
    const convertido = Number(bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "")
      : bruto.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(convertido) ? convertido : padrao;
  };
  const arred2 = valor => Math.round((numero(valor) + Number.EPSILON) * 100) / 100;
  const moeda2 = valor => numero(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const moeda4 = valor => `R$ ${numero(valor).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;

  function processoCanonico(valor) {
    const original = texto(valor).toUpperCase();
    const aliases = {
      BOJO: "ENCAPAR BOJO", ENCAPAR: "ENCAPAR BOJO", "ENCAPAR BOJOS": "ENCAPAR BOJO",
      ALCA: "ALÇA", ALCAS: "ALÇA", "MONTAGEM CALCINHA": "CALCINHA MONTAGEM",
      "MONTAR CALCINHA": "CALCINHA MONTAGEM", CALCINHA: "CALCINHA COMPLETA",
      "SUTIA MONTAGEM": "SUTIÃ MONTAGEM", "SUTIA COMPLETO": "SUTIÃ COMPLETO"
    };
    return aliases[normalizar(original)] || original;
  }

  const processoDoItem = item => processoCanonico(
    item?.processo || item?.servicoNome || item?.processoMovimentacao || item?.nome || ""
  );
  const valorDoPreco = item => numero(item?.valorUnitario ?? item?.valor ?? item?.preco);

  function statusBloqueado(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    return item?.pago === true || item?.cancelado === true || item?.excluido === true || [
      "PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA",
      "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
    ].includes(status);
  }

  function aindaSemValor(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    return item?.valorPendente === true || item?.valorManualFinanceiroPendente === true ||
      ["SEM VALOR", "AGUARDANDO VALOR"].includes(status) ||
      !(numero(item?.valorUnitario) > 0) || !(numero(item?.total ?? item?.valorTotal) > 0);
  }

  function modalVisivel() {
    const modal = document.getElementById(MODAL_ID);
    return modal instanceof HTMLElement && !modal.hidden && !modal.classList.contains("hidden") &&
      getComputedStyle(modal).display !== "none";
  }

  function idsVisiveis() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return [];
    const ids = new Set();
    modal.querySelectorAll('[data-acao-pendencia="salvar-unitario"][data-id]').forEach(botao => {
      const id = texto(botao.dataset.id);
      if (id) ids.add(id);
    });
    modal.querySelectorAll('[id^="valorPendencia-"]').forEach(input => {
      const id = texto(input.id).replace(/^valorPendencia-/, "");
      if (id) ids.add(id);
    });
    return [...ids];
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não foi inicializado.");
      const app = appMod.getApp();
      return { fs, db: fs.getFirestore(app), auth: authMod.getAuth(app) };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function obterAcesso(forcar = false) {
    if (forcar) perfilPromise = null;
    if (perfilPromise) return perfilPromise;
    perfilPromise = (async () => {
      const { fs, db, auth } = await firebase();
      for (let i = 0; i < 35 && !auth.currentUser; i += 1) {
        await new Promise(resolve => setTimeout(resolve, 140));
      }
      const usuario = auth.currentUser;
      if (!usuario) return { usuario: null, perfil: null, admin: false };
      const snap = await fs.getDoc(fs.doc(db, "usuarios", usuario.uid));
      const perfil = snap.exists() ? snap.data() : {};
      return {
        usuario,
        perfil,
        admin: perfil.ativo !== false && normalizar(perfil.tipo || perfil.perfil || perfil.role).includes("ADMIN")
      };
    })().catch(error => {
      perfilPromise = null;
      throw error;
    });
    return perfilPromise;
  }

  async function carregarPagamentos(fs, db, ids) {
    const itens = [];
    for (let inicio = 0; inicio < ids.length; inicio += 20) {
      const snaps = await Promise.all(ids.slice(inicio, inicio + 20).map(id =>
        fs.getDoc(fs.doc(db, "entregasPagamento", id))
      ));
      snaps.forEach(snap => {
        if (snap.exists()) itens.push({ id: snap.id, ...snap.data() });
      });
    }
    return itens;
  }

  async function carregarPrecos(fs, db, referencias) {
    const mapa = new Map();
    for (const referencia of referencias) {
      const valores = [texto(referencia)];
      const numerica = Number(referencia);
      if (Number.isFinite(numerica)) valores.push(numerica);
      const unicos = valores.filter((item, indice, lista) =>
        lista.findIndex(outro => `${typeof outro}:${outro}` === `${typeof item}:${item}`) === indice
      );
      for (const valor of unicos) {
        try {
          const snap = await fs.getDocs(fs.query(
            fs.collection(db, "precosReferencia"), fs.where("referencia", "==", valor)
          ));
          snap.docs.forEach(docSnap => mapa.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
        } catch (error) {
          console.warn(`Consulta do valor da referência ${referencia} indisponível.`, error);
        }
      }
    }
    return [...mapa.values()].filter(item => item?.ativo !== false && valorDoPreco(item) > 0);
  }

  function escolherPreco(pagamento, precos) {
    const referencia = normalizar(pagamento?.referencia);
    const processo = normalizar(processoDoItem(pagamento));
    const candidatos = precos.filter(item =>
      normalizar(item?.referencia) === referencia && normalizar(processoDoItem(item)) === processo
    );
    if (!candidatos.length) return null;
    const porValor = new Map();
    candidatos.forEach(item => {
      const valor = valorDoPreco(item);
      if (!(valor > 0)) return;
      const chave = valor.toFixed(6);
      if (!porValor.has(chave)) porValor.set(chave, []);
      porValor.get(chave).push(item);
    });
    if (porValor.size !== 1) return { ambiguo: true };
    const grupo = [...porValor.values()][0];
    const setor = normalizar(pagamento?.setor || pagamento?.area || "");
    const escolhido = grupo.find(item => setor && normalizar(item?.setor || item?.area || "") === setor) || grupo[0];
    return { ambiguo: false, id: escolhido.id, valor: valorDoPreco(escolhido) };
  }

  function injetarEstilos() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BANNER_ID}{margin:12px 18px 4px;padding:14px 15px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid #86efac;border-radius:13px;background:#f0fdf4;color:#14532d}
      #${BANNER_ID}.hidden{display:none!important}#${BANNER_ID} strong{display:block;color:#166534;font-size:13px;font-weight:1000}#${BANNER_ID} p{margin:4px 0 0;color:#166534;font-size:11px;font-weight:750;line-height:1.4}
      #${BANNER_ID} button{min-height:42px;padding:9px 14px;border:1px solid #15803d;border-radius:10px;background:#16a34a;color:#fff;font-size:12px;font-weight:1000;cursor:pointer;white-space:nowrap}#${BANNER_ID} button:disabled{opacity:.65;cursor:wait}
      #${MODAL_ID} .cn116-valor-encontrado,#${MODAL_ID} .cn116-valor-ambiguo{margin-top:7px;padding:7px 9px;border-radius:8px;font-size:10px;font-weight:900;line-height:1.35}
      #${MODAL_ID} .cn116-valor-encontrado{background:#ecfdf5;color:#166534}#${MODAL_ID} .cn116-valor-ambiguo{background:#fff7ed;color:#9a3412}
      @media(max-width:760px){#${BANNER_ID}{margin:10px 12px 4px;grid-template-columns:1fr}#${BANNER_ID} button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function garantirBanner() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return null;
    let banner = document.getElementById(BANNER_ID);
    if (banner) return banner;
    banner = document.createElement("section");
    banner.id = BANNER_ID;
    banner.className = "hidden";
    banner.innerHTML = `<div><strong></strong><p></p></div><button type="button">Aplicar valores cadastrados</button>`;
    const cabecalho = modal.querySelector(".modal-header") || modal.firstElementChild;
    if (cabecalho) cabecalho.insertAdjacentElement("afterend", banner);
    else modal.prepend(banner);
    banner.querySelector("button")?.addEventListener("click", aplicarValores);
    return banner;
  }

  function limparMarcacoes() {
    document.querySelectorAll(`#${MODAL_ID} .cn116-valor-encontrado, #${MODAL_ID} .cn116-valor-ambiguo`)
      .forEach(elemento => elemento.remove());
  }

  function marcarResultado(resultado) {
    const input = document.getElementById(`valorPendencia-${resultado.pagamento.id}`);
    if (!(input instanceof HTMLInputElement)) return;
    input.value = resultado.preco.valor.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    const painel = input.closest("div");
    if (!painel) return;
    const aviso = document.createElement("div");
    aviso.className = "cn116-valor-encontrado";
    aviso.textContent = `Valor já cadastrado: ${moeda4(resultado.preco.valor)} por peça. Aplique pelo botão verde acima.`;
    painel.appendChild(aviso);
  }

  function marcarAmbiguo(pagamento) {
    const input = document.getElementById(`valorPendencia-${pagamento.id}`);
    const painel = input?.closest("div");
    if (!painel) return;
    const aviso = document.createElement("div");
    aviso.className = "cn116-valor-ambiguo";
    aviso.textContent = "Há valores ativos diferentes para esta referência e processo. Revise em Gerenciar valores.";
    painel.appendChild(aviso);
  }

  function totalPrevisto(lista) {
    return arred2(lista.reduce((soma, item) => {
      const quantidade = Math.max(0, numero(item.pagamento?.quantidade ?? item.pagamento?.quantidadeRecebida));
      const desconto = Math.max(0, numero(item.pagamento?.descontoDefeito ?? item.pagamento?.defeito));
      return soma + Math.max(quantidade * item.preco.valor - desconto, 0);
    }, 0));
  }

  function renderizar(resultados, ambiguos) {
    correspondencias = resultados;
    limparMarcacoes();
    resultados.forEach(marcarResultado);
    ambiguos.forEach(marcarAmbiguo);
    const banner = garantirBanner();
    if (!banner) return;
    banner.classList.toggle("hidden", resultados.length === 0);
    if (!resultados.length) return;
    banner.querySelector("strong").textContent = `${resultados.length} lançamento(s) desta lista já possuem valor cadastrado.`;
    banner.querySelector("p").textContent = `Total previsto após aplicar: ${moeda2(totalPrevisto(resultados))}. Nada será alterado até você clicar no botão.`;
  }

  async function verificar() {
    if (verificando || aplicando || !modalVisivel()) return;
    const ids = idsVisiveis();
    const novaAssinatura = ids.slice().sort().join("|");
    if (!ids.length) {
      assinatura = "";
      correspondencias = [];
      garantirBanner()?.classList.add("hidden");
      limparMarcacoes();
      return;
    }
    if (novaAssinatura === assinatura && correspondencias.length) return;
    verificando = true;
    try {
      const acesso = await obterAcesso();
      if (!acesso.admin) return;
      const { fs, db } = await firebase();
      const pagamentos = await carregarPagamentos(fs, db, ids);
      const pendentes = pagamentos.filter(item => !statusBloqueado(item) && aindaSemValor(item));
      const referencias = [...new Set(pendentes.map(item => texto(item.referencia)).filter(Boolean))];
      const precos = await carregarPrecos(fs, db, referencias);
      const resultados = [];
      const ambiguos = [];
      pendentes.forEach(pagamento => {
        const preco = escolherPreco(pagamento, precos);
        if (!preco) return;
        if (preco.ambiguo) ambiguos.push(pagamento);
        else resultados.push({ pagamento, preco });
      });
      assinatura = novaAssinatura;
      renderizar(resultados, ambiguos);
    } catch (error) {
      console.warn("Não foi possível conferir os valores cadastrados.", error);
    } finally {
      verificando = false;
    }
  }

  function toast(mensagem, erro = false) {
    let item = document.getElementById("corponuPendenciasValores116Toast");
    if (!item) {
      item = document.createElement("div");
      item.id = "corponuPendenciasValores116Toast";
      item.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:1000000;max-width:min(470px,calc(100vw - 30px));padding:14px 16px;border-radius:13px;box-shadow:0 18px 48px rgba(15,23,42,.28);color:#fff;font:800 13px/1.45 Arial,sans-serif";
      document.body.appendChild(item);
    }
    item.style.background = erro ? "#991b1b" : "#166534";
    item.textContent = mensagem;
    item.style.opacity = "1";
    clearTimeout(item._timer);
    item._timer = setTimeout(() => { item.style.opacity = "0"; setTimeout(() => item.remove(), 220); }, erro ? 7000 : 5500);
  }

  async function aplicarValores() {
    if (aplicando || !correspondencias.length) return;
    const lista = correspondencias.filter(item => item.pagamento?.id && item.preco?.id && item.preco.valor > 0);
    if (!lista.length) return;
    if (!confirm(
      `Aplicar os valores já cadastrados em ${lista.length} lançamento(s)?\n\n` +
      `Total previsto: ${moeda2(totalPrevisto(lista))}.\n\n` +
      "Pagamentos pagos, cancelados ou com valor conflitante não serão alterados."
    )) return;

    aplicando = true;
    const botao = garantirBanner()?.querySelector("button");
    const original = botao?.textContent || "Aplicar valores cadastrados";
    if (botao) { botao.disabled = true; botao.textContent = "Aplicando..."; }

    try {
      const acesso = await obterAcesso(true);
      if (!acesso.admin || !acesso.usuario) throw new Error("Somente administrador ativo pode aplicar valores.");
      const { fs, db } = await firebase();
      const confirmadas = [];

      for (const item of lista) {
        const snap = await fs.getDoc(fs.doc(db, "entregasPagamento", item.pagamento.id));
        if (!snap.exists()) continue;
        const atual = { id: snap.id, ...snap.data() };
        if (statusBloqueado(atual) || !aindaSemValor(atual)) continue;
        if (normalizar(atual.referencia) !== normalizar(item.pagamento.referencia)) continue;
        if (normalizar(processoDoItem(atual)) !== normalizar(processoDoItem(item.pagamento))) continue;
        confirmadas.push({ atual, preco: item.preco });
      }
      if (!confirmadas.length) throw new Error("Nenhum lançamento pendente permaneceu elegível.");

      let totalAplicado = 0;
      for (let inicio = 0; inicio < confirmadas.length; inicio += 400) {
        const batch = fs.writeBatch(db);
        confirmadas.slice(inicio, inicio + 400).forEach(({ atual, preco }) => {
          const quantidade = Math.max(0, numero(atual.quantidade ?? atual.quantidadeRecebida));
          const desconto = Math.max(0, numero(atual.descontoDefeito ?? atual.defeito));
          const subtotal = arred2(quantidade * preco.valor);
          const total = arred2(Math.max(subtotal - desconto, 0));
          totalAplicado += total;
          batch.set(fs.doc(db, "entregasPagamento", atual.id), {
            precoReferenciaId: preco.id,
            servicoId: preco.id,
            valorUnitario: preco.valor,
            subtotal,
            total,
            valorTotal: total,
            statusPagamento: "pendente",
            valorPendente: false,
            valorManualFinanceiroPendente: false,
            formaValorPagamento: "valor_unitario_base",
            motivoValorPendente: "",
            avisoPagamento: "",
            valorInformadoPor: acesso.usuario.uid,
            valorInformadoEm: fs.serverTimestamp(),
            atualizadoPor: acesso.usuario.uid,
            atualizadoEm: fs.serverTimestamp(),
            origemAtualizacaoValor: "acao_explicita_valor_cadastrado",
            versaoValorFinanceiro: VERSION
          }, { merge: true });
        });
        await batch.commit();
      }

      try {
        await fs.addDoc(fs.collection(db, "logsAlteracoes"), {
          acao: "valores_cadastrados_aplicados_pendencias",
          tipoAlvo: "entregasPagamento",
          alvoId: confirmadas[0]?.atual?.id || "",
          detalhes: `${confirmadas.length} pagamento(s) recalculado(s) | total ${moeda2(arred2(totalAplicado))}`,
          usuarioUid: acesso.usuario.uid,
          usuarioNome: acesso.perfil?.nome || acesso.usuario.displayName || "",
          usuarioEmail: acesso.perfil?.email || acesso.usuario.email || "",
          usuarioTipo: acesso.perfil?.tipo || "admin",
          criadoEm: fs.serverTimestamp(),
          versao: VERSION
        });
      } catch (error) {
        console.warn("Pagamentos atualizados, mas o log complementar falhou.", error);
      }

      toast(`${confirmadas.length} pagamento(s) foram atualizados com os valores cadastrados.`);
      correspondencias = [];
      assinatura = "";
      garantirBanner()?.classList.add("hidden");
      limparMarcacoes();
      setTimeout(() => {
        const modal = document.getElementById(MODAL_ID);
        const atualizar = [...(modal?.querySelectorAll("button") || [])].find(item =>
          normalizar(item.textContent).includes("ATUALIZAR LISTA")
        );
        if (atualizar instanceof HTMLButtonElement && !atualizar.disabled) atualizar.click();
        else document.getElementById("btnAtualizarServidor")?.click();
      }, 250);
    } catch (error) {
      console.error("Não foi possível aplicar os valores cadastrados.", error);
      toast(error?.message || "Não foi possível aplicar os valores cadastrados.", true);
    } finally {
      aplicando = false;
      if (botao && document.contains(botao)) { botao.disabled = false; botao.textContent = original; }
    }
  }

  function agendar(atraso = 450) {
    clearTimeout(timer);
    timer = setTimeout(verificar, atraso);
  }

  function iniciar() {
    injetarEstilos();
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target.closest("button, a") : null;
      if (!alvo) return;
      if (alvo.id === "btnAtualizarConferenciaPagamentoFinal") { assinatura = ""; agendar(900); return; }
      if (alvo.closest(`#${MODAL_ID}`) && normalizar(alvo.textContent).includes("ATUALIZAR LISTA")) {
        assinatura = "";
        agendar(800);
      }
    }, true);

    observer = new MutationObserver(mudancas => {
      if (!modalVisivel()) return;
      const relevante = mudancas.some(mudanca => [...mudanca.addedNodes].some(node =>
        node instanceof Element && (
          node.matches?.('[data-acao-pendencia="salvar-unitario"], [id^="valorPendencia-"]') ||
          node.querySelector?.('[data-acao-pendencia="salvar-unitario"], [id^="valorPendencia-"]')
        )
      ));
      if (relevante) { assinatura = ""; agendar(500); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    if (modalVisivel()) agendar(700);
  }

  window.CorpoNuPendenciasValoresCadastrados = {
    versao: VERSION,
    verificar: () => { assinatura = ""; return verificar(); },
    aplicar: aplicarValores
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
