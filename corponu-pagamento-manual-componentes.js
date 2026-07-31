(() => {
  "use strict";

  const VERSION = "2026-07-31-pagamento-manual-componentes-42";
  const FB = "10.12.5";
  const MODAL_ID = "modalPagamentoManualFinanceiro";
  const FORM_ID = "formPagamentoManualFinanceiro";
  const PANEL_ID = "pagManualComponentesOP";
  const OP_INPUT_ID = "pagManualNumeroOP";

  if (window.__CORPONU_PAGAMENTO_MANUAL_COMPONENTES__ === VERSION) return;
  window.__CORPONU_PAGAMENTO_MANUAL_COMPONENTES__ = VERSION;

  let firebasePromise = null;
  let observadorPainel = null;
  let revisandoPainel = false;
  let reenviandoFormulario = false;
  let ultimoNumeroOP = "";

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  function injetarEstilos() {
    if (document.getElementById("stylePagamentoManualComponentes42")) return;
    const style = document.createElement("style");
    style.id = "stylePagamentoManualComponentes42";
    style.textContent = `
      #${MODAL_ID} .pmc42-edicao{grid-column:1/-1;margin-top:9px;padding-top:9px;border-top:1px solid #e2e8f0}
      #${MODAL_ID} .pmc42-edicao-titulo{display:block;margin-bottom:7px;color:#475569;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.035em}
      #${MODAL_ID} .pmc42-opcoes{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      #${MODAL_ID} .pmc42-opcao{min-height:37px;padding:7px 9px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;color:#334155;font-size:11px;font-weight:900;cursor:pointer;transition:border-color .15s ease,background .15s ease,box-shadow .15s ease}
      #${MODAL_ID} .pmc42-opcao:hover{border-color:#a78bfa;background:#faf5ff}
      #${MODAL_ID} .pmc42-opcao[data-valor="sim"].ativo{border-color:#16a34a;background:#ecfdf5;color:#166534;box-shadow:0 0 0 3px rgba(22,163,74,.10)}
      #${MODAL_ID} .pmc42-opcao[data-valor="nao"].ativo{border-color:#ef4444;background:#fef2f2;color:#991b1b;box-shadow:0 0 0 3px rgba(239,68,68,.09)}
      #${MODAL_ID} .pmc42-ajuda{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:7px;color:#64748b;font-size:10px;line-height:1.35}
      #${MODAL_ID} .pmc42-limpar{display:none;flex:0 0 auto;padding:0;border:0;background:transparent;color:#6d28d9;font-size:10px;font-weight:900;text-decoration:underline;cursor:pointer}
      #${MODAL_ID} .pmc42-edicao.escolhido .pmc42-limpar{display:inline}
      #${MODAL_ID} .pmc42-confirmacao{grid-column:1/-1;margin-top:9px;padding:9px 10px;border:1px solid #c4b5fd;border-radius:9px;background:#f5f3ff;color:#5b21b6;font-size:10px;font-weight:800;line-height:1.4}
      #${MODAL_ID} .pag-manual-componente-card.pmc42-editavel{align-items:start}
      #${MODAL_ID} .pag-manual-componente-card.pmc42-editavel>div:last-child{min-width:0}
      #${MODAL_ID} .pag-manual-componente-card.pmc42-escolha-sim{border-color:#86efac;background:#f7fff9}
      #${MODAL_ID} .pag-manual-componente-card.pmc42-escolha-nao{border-color:#fecaca;background:#fffafa}
      @media(max-width:560px){#${MODAL_ID} .pmc42-opcoes{grid-template-columns:1fr}#${MODAL_ID} .pmc42-ajuda{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`)
    ]).then(([appMod, fs, authMod]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      return { fs, db: fs.getFirestore(app), auth: authMod.getAuth(app) };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function procurarOP(numeroOP) {
    const texto = String(numeroOP || "").trim();
    if (!texto) return null;
    const { fs, db } = await firebase();

    if (!texto.includes("/")) {
      try {
        const direto = await fs.getDoc(fs.doc(db, "ordensProducao", texto));
        if (direto.exists()) return { id: direto.id, ...direto.data() };
      } catch (error) {
        console.warn("Busca direta da OP indisponível.", error);
      }
    }

    const consultas = [["numeroOP", texto], ["numeroOPExterno", texto], ["op", texto]];
    const numero = Number(texto);
    if (Number.isFinite(numero)) consultas.splice(1, 0, ["numeroOP", numero]);

    for (const [campo, valor] of consultas) {
      try {
        const snap = await fs.getDocs(fs.query(
          fs.collection(db, "ordensProducao"),
          fs.where(campo, "==", valor),
          fs.limit(1)
        ));
        if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
      } catch (error) {
        console.warn(`Consulta da OP por ${campo} indisponível.`, error);
      }
    }
    return null;
  }

  function encontrarCard(componente) {
    const painel = document.getElementById(PANEL_ID);
    if (!painel) return null;
    return [...painel.querySelectorAll(".pag-manual-componente-card")].find(card =>
      [...card.querySelectorAll("small")].some(item => normalizar(item.textContent) === normalizar(componente))
    ) || null;
  }

  function selectComponente(componente) {
    return document.getElementById(componente === "lateral" ? "pagManualLateral" : "pagManualBojo");
  }

  function atualizarVisualCard(componente) {
    const card = encontrarCard(componente);
    const select = selectComponente(componente);
    if (!card || !select) return;

    const valor = String(select.value || "nao_informado");
    const edicao = card.querySelector(".pmc42-edicao");
    if (!edicao) return;

    card.classList.toggle("pmc42-escolha-sim", valor === "sim");
    card.classList.toggle("pmc42-escolha-nao", valor === "nao");
    edicao.classList.toggle("escolhido", valor === "sim" || valor === "nao");
    edicao.querySelectorAll(".pmc42-opcao").forEach(botao => {
      const ativo = botao.dataset.valor === valor;
      botao.classList.toggle("ativo", ativo);
      botao.setAttribute("aria-pressed", ativo ? "true" : "false");
    });

    const icone = card.querySelector(".pag-manual-componente-icone");
    const titulo = card.querySelector("strong");
    const origem = card.querySelector("div:nth-child(2)>span");
    card.classList.remove("sim", "nao", "indefinido");

    if (valor === "sim") {
      card.classList.add("sim");
      if (icone) icone.textContent = "✓";
      if (titulo) titulo.textContent = "Pronta — definida agora";
      if (origem) origem.textContent = "Será registrada pela confirmação deste lançamento manual";
    } else if (valor === "nao") {
      card.classList.add("nao");
      if (icone) icone.textContent = "×";
      if (titulo) titulo.textContent = "Não pronta — definida agora";
      if (origem) origem.textContent = "Será registrada pela confirmação deste lançamento manual";
    } else {
      card.classList.add("indefinido");
      if (icone) icone.textContent = "?";
      if (titulo) titulo.textContent = "Não informada";
      if (origem) origem.textContent = "Nenhuma informação registrada na OP";
    }
  }

  function escolherComponente(componente, valor) {
    const select = selectComponente(componente);
    if (!select) return;
    select.value = valor;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    atualizarVisualCard(componente);
  }

  function adicionarEdicaoAoCard(componente) {
    const painel = document.getElementById(PANEL_ID);
    const card = encontrarCard(componente);
    const select = selectComponente(componente);
    if (!painel || !card || !select) return;

    const chaveOriginal = componente === "lateral" ? "originalLateral" : "originalBojo";
    const original = String(painel.dataset[chaveOriginal] || select.value || "nao_informado");
    if (original !== "nao_informado") return;
    if (card.querySelector(".pmc42-edicao")) {
      atualizarVisualCard(componente);
      return;
    }

    card.classList.add("pmc42-editavel");
    const edicao = document.createElement("div");
    edicao.className = "pmc42-edicao";
    edicao.dataset.componente = componente;
    edicao.innerHTML = `
      <span class="pmc42-edicao-titulo">Definir nesta chegada e pagamento</span>
      <div class="pmc42-opcoes">
        <button type="button" class="pmc42-opcao" data-valor="sim">Marcar como pronta</button>
        <button type="button" class="pmc42-opcao" data-valor="nao">Marcar como não pronta</button>
      </div>
      <div class="pmc42-ajuda">
        <span>A escolha será usada no cálculo e também ficará registrada na OP.</span>
        <button type="button" class="pmc42-limpar">Limpar escolha</button>
      </div>`;
    edicao.querySelectorAll(".pmc42-opcao").forEach(botao => {
      botao.addEventListener("click", () => escolherComponente(componente, botao.dataset.valor || "nao_informado"));
    });
    edicao.querySelector(".pmc42-limpar")?.addEventListener("click", () => escolherComponente(componente, "nao_informado"));
    card.appendChild(edicao);
    atualizarVisualCard(componente);
  }

  function revisarPainel() {
    if (revisandoPainel) return;
    const painel = document.getElementById(PANEL_ID);
    const numeroOP = String(document.getElementById(OP_INPUT_ID)?.value || "").trim();
    if (!painel || painel.classList.contains("hidden") || !painel.textContent.trim() || !numeroOP) return;

    revisandoPainel = true;
    try {
      const painelFoiReconstruido = !painel.querySelector(".pmc42-edicao");
      if (painel.dataset.pmc42Op !== numeroOP || painelFoiReconstruido) {
        painel.dataset.pmc42Op = numeroOP;
        painel.dataset.originalLateral = String(selectComponente("lateral")?.value || "nao_informado");
        painel.dataset.originalBojo = String(selectComponente("bojo")?.value || "nao_informado");
        ultimoNumeroOP = numeroOP;
      }

      adicionarEdicaoAoCard("lateral");
      adicionarEdicaoAoCard("bojo");

      const editaveis = ["lateral", "bojo"].filter(componente =>
        String(painel.dataset[componente === "lateral" ? "originalLateral" : "originalBojo"]) === "nao_informado"
      );
      const grid = painel.querySelector(".pag-manual-componentes-grid");
      if (grid && editaveis.length && !grid.querySelector(".pmc42-confirmacao")) {
        const aviso = document.createElement("div");
        aviso.className = "pmc42-confirmacao";
        aviso.textContent = "Esta OP está sem informação de lateral e/ou bojo. Defina acima antes de salvar quando essa informação for conhecida.";
        grid.appendChild(aviso);
      }
    } finally {
      revisandoPainel = false;
    }
  }

  function mudancasSelecionadas() {
    const painel = document.getElementById(PANEL_ID);
    if (!painel) return {};
    const mudancas = {};
    ["lateral", "bojo"].forEach(componente => {
      const chave = componente === "lateral" ? "originalLateral" : "originalBojo";
      const original = String(painel.dataset[chave] || "nao_informado");
      const atual = String(selectComponente(componente)?.value || "nao_informado");
      if (original === "nao_informado" && (atual === "sim" || atual === "nao")) mudancas[componente] = atual === "sim";
    });
    return mudancas;
  }

  async function salvarComponentesNaOP(numeroOP, mudancas) {
    const op = await procurarOP(numeroOP);
    if (!op) throw new Error("A OP não foi localizada para registrar lateral e bojo.");

    const { fs, db, auth } = await firebase();
    const usuario = auth.currentUser;
    const referencia = fs.doc(db, "ordensProducao", op.id);
    const campos = {
      "revisaoComponentesConfeccao.ativa": true,
      "revisaoComponentesConfeccao.origemAtualizacao": "pagamento_manual",
      "revisaoComponentesConfeccao.atualizadoEm": fs.serverTimestamp(),
      "revisaoComponentesConfeccao.atualizadoPor": usuario?.uid || "",
      atualizadoEm: fs.serverTimestamp(),
      atualizadoPor: usuario?.uid || ""
    };

    const detalhes = [];
    if (Object.prototype.hasOwnProperty.call(mudancas, "lateral")) {
      campos["revisaoComponentesConfeccao.lateralFeita"] = mudancas.lateral;
      campos.lateralFeitaConfeccao = mudancas.lateral;
      campos.lateralFeitaConfeccaoOrigem = "pagamento_manual";
      detalhes.push(`Lateral: ${mudancas.lateral ? "pronta" : "não pronta"}`);
    }
    if (Object.prototype.hasOwnProperty.call(mudancas, "bojo")) {
      campos["revisaoComponentesConfeccao.bojoFeito"] = mudancas.bojo;
      campos.bojoEncapadoConfeccao = mudancas.bojo;
      campos.bojoProntoConfeccao = mudancas.bojo;
      campos.bojoProntoConfeccaoOrigem = "pagamento_manual";
      detalhes.push(`Bojo: ${mudancas.bojo ? "pronto" : "não pronto"}`);
    }

    await fs.updateDoc(referencia, campos);

    try {
      await fs.addDoc(fs.collection(db, "logsAlteracoes"), {
        acao: "componentes_op_definidos_pagamento_manual",
        tipoAlvo: "ordemProducao",
        alvoId: op.id,
        detalhes: `OP ${numeroOP} | ${detalhes.join(" | ")}`,
        usuarioUid: usuario?.uid || "",
        usuarioEmail: usuario?.email || "",
        criadoEm: fs.serverTimestamp(),
        versao: VERSION
      });
    } catch (errorLog) {
      console.warn("Componentes salvos, mas o log complementar não foi criado.", errorLog);
    }
  }

  function avisar(mensagem) {
    if (typeof window.mostrarAvisoFormulario === "function") window.mostrarAvisoFormulario(mensagem);
    else window.alert(mensagem);
  }

  function instalarSubmit() {
    const form = document.getElementById(FORM_ID);
    if (!form || form.dataset.pmc42Submit) return;
    form.dataset.pmc42Submit = "1";

    form.addEventListener("submit", async event => {
      if (reenviandoFormulario) return;
      const mudancas = mudancasSelecionadas();
      if (!Object.keys(mudancas).length) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const numeroOP = String(document.getElementById(OP_INPUT_ID)?.value || "").trim();
      const botao = document.getElementById("btnSalvarPagamentoManual");
      const textoOriginal = botao?.textContent || "Salvar lançamento manual";
      if (!numeroOP) return avisar("Informe e confirme a OP antes de salvar.");

      try {
        if (botao) {
          botao.disabled = true;
          botao.textContent = "Salvando lateral e bojo...";
        }
        await salvarComponentesNaOP(numeroOP, mudancas);
        if (botao) {
          botao.disabled = false;
          botao.textContent = textoOriginal;
        }
        reenviandoFormulario = true;
        try {
          if (typeof form.requestSubmit === "function") form.requestSubmit();
          else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        } finally {
          reenviandoFormulario = false;
        }
      } catch (error) {
        console.error("Não foi possível registrar lateral/bojo no lançamento manual.", error);
        avisar(error?.message || "Não foi possível registrar lateral e bojo na OP.");
        if (botao) {
          botao.disabled = false;
          botao.textContent = textoOriginal;
        }
      }
    }, true);
  }

  function observarPainel() {
    const painel = document.getElementById(PANEL_ID);
    if (!painel) return false;
    observadorPainel?.disconnect();
    observadorPainel = new MutationObserver(() => {
      if (!revisandoPainel) window.setTimeout(revisarPainel, 0);
    });
    observadorPainel.observe(painel, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    revisarPainel();
    return true;
  }

  function configurar() {
    injetarEstilos();
    instalarSubmit();
    observarPainel();

    const input = document.getElementById(OP_INPUT_ID);
    if (input && !input.dataset.pmc42Input) {
      input.dataset.pmc42Input = "1";
      input.addEventListener("input", () => {
        const painel = document.getElementById(PANEL_ID);
        if (painel && String(input.value || "").trim() !== ultimoNumeroOP) {
          delete painel.dataset.pmc42Op;
          delete painel.dataset.originalLateral;
          delete painel.dataset.originalBojo;
        }
      });
    }
    return Boolean(document.getElementById(FORM_ID) && document.getElementById(PANEL_ID));
  }

  function iniciar() {
    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      if (configurar() || tentativas >= 40) window.clearInterval(intervalo);
    }, 250);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo?.closest("#btnPagamentoManualFinanceiro")) return;
      const painel = document.getElementById(PANEL_ID);
      if (painel) {
        delete painel.dataset.pmc42Op;
        delete painel.dataset.originalLateral;
        delete painel.dataset.originalBojo;
      }
      ultimoNumeroOP = "";
      [0, 120, 350, 700].forEach(atraso => window.setTimeout(configurar, atraso));
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();