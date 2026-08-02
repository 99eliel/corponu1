(() => {
  "use strict";

  const VERSION = "2026-08-01-chegada-correcao-processo-faccao-79";
  const FIREBASE_VERSION = "10.12.5";
  const MODAL_ID = "modalChegadaMovimentacao";
  const FORM_ID = "formChegadaMovimentacao";
  const INFO_ID = "chegadaMovimentacaoInfo";
  const CARD_ID = "corponuConfirmacaoChegada79";
  const PROCESSO_ID = "corponuChegadaProcesso79";
  const FACCAO_ID = "corponuChegadaFaccao79";
  const ATUAL_ID = "corponuChegadaAtual79";

  const PROCESSOS_PADRAO = [
    "ENCAPAR BOJO",
    "ALÇA",
    "CALCINHA MONTAGEM",
    "CALCINHA COMPLETA",
    "SUTIÃ MONTAGEM",
    "SUTIÃ COMPLETO"
  ];

  const FACCOES_PADRAO = Object.freeze({
    "ENCAPAR BOJO": ["DIVINA", "GRACIANE", "JESSICA", "LARISSA", "ALINE BATISTA", "DAIANY", "NAGILA", "DELMA", "GIRLAINE"],
    "ALÇA": ["JANAINA", "IVONE", "LUANA", "KARYTA", "SIMEI", "SIMONE"],
    "CALCINHA MONTAGEM": ["ANA FLAVIA", "KAUANE", "LIANA", "DAIANA", "LEIDIANE", "ANDREZA"],
    "CALCINHA COMPLETA": ["LORENA", "JEAN", "SCHENEIDER", "DANIELA", "KAMILA", "LIANDRA", "JUZENI", "THEILLOR", "SILVANY", "LEONARDO", "MATHEUS", "BEATRIZ", "MARILIA", "DARLLEN", "RONEIDIA"],
    "SUTIÃ MONTAGEM": ["LIVIA", "FRACEILDA", "MOCINHA", "NAYARA", "NAGILA", "GIRLAINE", "JHENIFER"],
    "SUTIÃ COMPLETO": ["DANUBIA", "KAKA", "GISLAINY", "ITAMAR", "LUCIA", "GOIANIRA"]
  });

  if (window.__CORPONU_CHEGADA_CORRECAO_79__ === VERSION) return;
  window.__CORPONU_CHEGADA_CORRECAO_79__ = VERSION;
  window.__CORPONU_CHEGADA_CONFIRMACAO_DEFINITIVA__ = VERSION;
  window.__CORPONU_CHEGADA_CONFIRMACAO__ = VERSION;

  let contextoPromise = null;
  let movimentoAtual = null;
  let idPreparado = "";
  let tokenAbertura = 0;
  let observadorModal = null;
  let cacheFaccoes = { em: 0, itens: [] };

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const unicosOrdenados = valores => [...new Map(
    (Array.isArray(valores) ? valores : [])
      .map(texto)
      .filter(Boolean)
      .map(valor => [normalizar(valor), valor])
  ).values()].sort((a, b) => a.localeCompare(b, "pt-BR"));

  function avisar(mensagem, erro = true) {
    const toast = document.getElementById("toast");
    if (!toast) {
      window.alert(mensagem);
      return;
    }
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = erro ? "#991b1b" : "#166534";
    window.clearTimeout(window.__corponuChegada79Toast);
    window.__corponuChegada79Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 5500);
  }

  async function contextoFirebase() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      return { auth: authMod.getAuth(app), db: fs.getFirestore(app), fs };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  async function aguardarUsuario(auth) {
    for (let tentativa = 0; tentativa < 40 && !auth.currentUser; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }
    return auth.currentUser;
  }

  function removerVersoesAntigas() {
    [
      "sf71ConfirmacaoServico",
      "sf73ConfirmacaoServico",
      "corponuConfirmacaoChegada75",
      "corponuChegadaConfirmacao76",
      "corponuConfirmacaoChegada77",
      "corponuConfirmacaoChegada78"
    ].forEach(id => document.getElementById(id)?.remove());

    [
      "styleChegadaConfirmacaoSegura71",
      "styleChegadaConfirmacaoBotoes73",
      "corponuStyleConfirmacaoChegada75",
      "styleCorponuChegadaConfirmacao75",
      "styleCorponuChegadaConfirmacao76",
      "styleCorponuConfirmacaoChegada77",
      "styleCorponuConfirmacaoChegada78"
    ].forEach(id => document.getElementById(id)?.remove());
  }

  function instalarEstilo() {
    if (document.getElementById("styleCorponuConfirmacaoChegada79")) return;
    const style = document.createElement("style");
    style.id = "styleCorponuConfirmacaoChegada79";
    style.textContent = `
      #${CARD_ID}{margin:14px 0 18px;padding:14px;border:1px solid #c4b5fd;border-radius:16px;background:#faf8ff}
      #${CARD_ID}.hidden{display:none!important}
      #${CARD_ID} .cc79-title{margin:0;color:#5b21b6;font-size:14px;font-weight:900}
      #${CARD_ID} .cc79-text{margin:4px 0 10px;color:#64748b;font-size:12px;line-height:1.5}
      #${CARD_ID} .cc79-current{margin:0 0 12px;padding:9px 11px;border-radius:10px;background:#fff;border:1px solid #ddd6fe;color:#475569;font-size:11px;font-weight:800;line-height:1.45}
      #${CARD_ID} .cc79-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #${CARD_ID} label{display:block;margin:0;color:#334155;font-size:12px;font-weight:900}
      #${CARD_ID} select{width:100%;min-height:46px;margin-top:6px;padding:0 12px;border:1px solid #a78bfa;border-radius:12px;background:#fff;color:#111827;font-size:14px;font-weight:800}
      #${CARD_ID} select:disabled{background:#f3f4f6;color:#9ca3af;cursor:not-allowed}
      #${CARD_ID} .cc79-note{margin-top:10px;padding:9px 11px;border-radius:10px;background:#ede9fe;color:#6d28d9;font-size:11px;font-weight:800;line-height:1.45}
      #${CARD_ID} .cc79-note strong{color:#4c1d95}
      @media(max-width:640px){#${CARD_ID} .cc79-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function preencherSelect(select, placeholder, valores, desabilitado = false) {
    if (!(select instanceof HTMLSelectElement)) return;
    const opcoes = [new Option(placeholder, "")];
    unicosOrdenados(valores).forEach(valor => opcoes.push(new Option(valor, valor)));
    select.replaceChildren(...opcoes);
    select.value = "";
    select.disabled = desabilitado;
  }

  function processosDisponiveis() {
    let processos = [];
    try {
      if (typeof getNomesProcessosFaccoesAtivos === "function") {
        processos = getNomesProcessosFaccoesAtivos();
      }
    } catch (error) {
      console.warn("Não foi possível usar a lista dinâmica de processos.", error);
    }

    processos = Array.isArray(processos) && processos.length ? processos : PROCESSOS_PADRAO;
    if (movimentoAtual?.processo) processos = [...processos, movimentoAtual.processo];
    return unicosOrdenados(processos);
  }

  function faccoesDoProcesso(processo) {
    let faccoes = [];
    try {
      if (typeof getFaccoesGerenciadasPorProcesso === "function") {
        faccoes = getFaccoesGerenciadasPorProcesso(processo);
      }
    } catch (error) {
      console.warn("Não foi possível usar a lista dinâmica de facções.", error);
    }

    if (!Array.isArray(faccoes) || !faccoes.length) {
      const chave = Object.keys(FACCOES_PADRAO)
        .find(nome => normalizar(nome) === normalizar(processo));
      faccoes = chave ? FACCOES_PADRAO[chave] : [];
    }

    if (
      movimentoAtual?.destino &&
      normalizar(processo) === normalizar(movimentoAtual.processo)
    ) {
      faccoes = [...faccoes, movimentoAtual.destino];
    }

    return unicosOrdenados(faccoes);
  }

  function garantirCard() {
    let card = document.getElementById(CARD_ID);
    if (card) return card;

    const form = document.getElementById(FORM_ID);
    if (!form) return null;

    card = document.createElement("section");
    card.id = CARD_ID;
    card.className = "hidden";
    card.innerHTML = `
      <p class="cc79-title">Conferência e correção obrigatória da chegada</p>
      <p class="cc79-text">Escolha o processo que realmente foi feito e depois selecione quem realizou. Você pode corrigir um lançamento feito errado na saída.</p>
      <div class="cc79-current" id="${ATUAL_ID}">Carregando dados registrados...</div>
      <div class="cc79-grid">
        <label>
          Processo realizado
          <select id="${PROCESSO_ID}" required>
            <option value="">Selecione o processo correto</option>
          </select>
        </label>
        <label>
          Quem fez / facção
          <select id="${FACCAO_ID}" required disabled>
            <option value="">Selecione o processo primeiro</option>
          </select>
        </label>
      </div>
      <div class="cc79-note"><strong>Importante:</strong> os dados escolhidos aqui substituem processo e facção incorretos antes de o pagamento ser calculado.</div>
    `;

    const info = document.getElementById(INFO_ID);
    if (info?.parentElement === form) info.insertAdjacentElement("afterend", card);
    else form.prepend(card);

    card.querySelector(`#${PROCESSO_ID}`)?.addEventListener("change", () => {
      const processo = texto(document.getElementById(PROCESSO_ID)?.value);
      const faccaoSelect = document.getElementById(FACCAO_ID);
      if (!processo) {
        preencherSelect(faccaoSelect, "Selecione o processo primeiro", [], true);
        return;
      }

      const faccoes = faccoesDoProcesso(processo);
      preencherSelect(
        faccaoSelect,
        faccoes.length ? "Selecione quem realizou" : "Nenhuma facção vinculada",
        faccoes,
        !faccoes.length
      );
    });

    return card;
  }

  function modalAberto() {
    const modal = document.getElementById(MODAL_ID);
    return Boolean(modal && !modal.classList.contains("hidden"));
  }

  function ehChegadaFaccao(movimento) {
    const tipo = normalizar(movimento?.tipoDestino || movimento?.tipoDestinoLabel);
    const titulo = normalizar(document.getElementById("modalChegadaTitulo")?.textContent);
    return tipo.includes("FACCAO") || titulo.includes("FACCAO");
  }

  async function carregarMovimento(id) {
    const { db, fs } = await contextoFirebase();
    const snap = await fs.getDoc(fs.doc(db, "movimentacoesProducao", id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  function limparCampos() {
    movimentoAtual = null;
    idPreparado = "";
    preencherSelect(document.getElementById(PROCESSO_ID), "Selecione o processo correto", [], false);
    preencherSelect(document.getElementById(FACCAO_ID), "Selecione o processo primeiro", [], true);
    const atual = document.getElementById(ATUAL_ID);
    if (atual) atual.textContent = "Carregando dados registrados...";
  }

  function aplicarMovimento(movimento) {
    movimentoAtual = movimento;
    idPreparado = movimento.id;

    const card = garantirCard();
    if (!card) return false;
    card.classList.toggle("hidden", !ehChegadaFaccao(movimento));
    if (card.classList.contains("hidden")) return true;

    const atual = document.getElementById(ATUAL_ID);
    if (atual) {
      atual.textContent = `Registrado na saída: ${texto(movimento.processo) || "não informado"} • ${texto(movimento.destino) || "não informado"}`;
    }

    preencherSelect(
      document.getElementById(PROCESSO_ID),
      "Selecione o processo correto",
      processosDisponiveis(),
      false
    );
    preencherSelect(document.getElementById(FACCAO_ID), "Selecione o processo primeiro", [], true);

    const resumo = document.getElementById("modalChegadaResumo");
    if (resumo) resumo.textContent = "Confira ou corrija o processo e a facção. Depois informe data, falta e desconto por defeito.";
    return true;
  }

  function prepararAbertura() {
    const token = ++tokenAbertura;
    let tentativas = 0;

    const tentar = async () => {
      if (token !== tokenAbertura || !modalAberto()) return;
      tentativas += 1;

      const id = texto(document.getElementById("chegadaMovimentacaoId")?.value);
      if (!id) {
        if (tentativas < 12) window.setTimeout(tentar, 50);
        return;
      }

      if (idPreparado === id && movimentoAtual?.id === id) {
        document.getElementById(CARD_ID)?.classList.remove("hidden");
        return;
      }

      try {
        const movimento = await carregarMovimento(id);
        if (token !== tokenAbertura || !modalAberto()) return;
        if (!movimento) throw new Error("Movimentação não encontrada.");
        aplicarMovimento(movimento);
      } catch (error) {
        console.error("Erro ao preparar correção da chegada.", error);
        if (tentativas < 5) {
          window.setTimeout(tentar, 120);
          return;
        }
        avisar("Não foi possível carregar os processos e facções. Feche e abra a chegada novamente.");
      }
    };

    window.setTimeout(tentar, 0);
  }

  async function listarFaccoesCadastradas() {
    if (cacheFaccoes.itens.length && Date.now() - cacheFaccoes.em < 60000) {
      return cacheFaccoes.itens;
    }
    const { db, fs } = await contextoFirebase();
    const snap = await fs.getDocs(fs.collection(db, "faccoes"));
    const itens = snap.docs.map(item => ({ id: item.id, ...item.data() }));
    cacheFaccoes = { em: Date.now(), itens };
    return itens;
  }

  async function salvarCorrecaoAntesDaChegada(id, processo, faccao) {
    const { auth, db, fs } = await contextoFirebase();
    const usuario = await aguardarUsuario(auth);
    if (!usuario) throw new Error("Usuário não autenticado.");

    const faccoes = await listarFaccoesCadastradas().catch(() => []);
    const cadastroFaccao = faccoes.find(item =>
      normalizar(item.nome || item.nomeFaccao || item.razaoSocial) === normalizar(faccao)
    );

    const ref = fs.doc(db, "movimentacoesProducao", id);
    let alterou = false;

    await fs.runTransaction(db, async transaction => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error("Movimentação não encontrada.");
      const atual = snap.data();

      alterou = normalizar(atual.processo) !== normalizar(processo) ||
        normalizar(atual.destino) !== normalizar(faccao);

      if (!alterou) return;

      transaction.update(ref, {
        processoAnteriorChegada: atual.processoAnteriorChegada || atual.processo || "",
        destinoAnteriorChegada: atual.destinoAnteriorChegada || atual.destino || "",
        destinoIdAnteriorChegada: atual.destinoIdAnteriorChegada || atual.destinoId || "",
        processo,
        destino: faccao,
        destinoId: cadastroFaccao?.id || atual.destinoId || "",
        correcaoNaChegada: true,
        correcaoChegadaVersao: VERSION,
        correcaoChegadaPor: usuario.uid,
        correcaoChegadaEm: fs.serverTimestamp(),
        atualizadoPor: usuario.uid,
        atualizadoEm: fs.serverTimestamp()
      });
    });

    if (alterou && movimentoAtual) {
      movimentoAtual.processo = processo;
      movimentoAtual.destino = faccao;
      movimentoAtual.destinoId = cadastroFaccao?.id || movimentoAtual.destinoId || "";
    }

    return alterou;
  }

  function atualizarResumoVisual(processo, faccao) {
    const info = document.getElementById(INFO_ID);
    const span = info?.querySelector("span");
    if (span) {
      const partes = texto(span.textContent).split("|").map(texto).filter(Boolean);
      const enviado = partes.find(parte => normalizar(parte).startsWith("ENVIADO")) || "";
      span.textContent = `${faccao} | ${processo}${enviado ? ` | ${enviado}` : ""}`;
    }
    const atual = document.getElementById(ATUAL_ID);
    if (atual) atual.textContent = `Confirmado para a chegada: ${processo} • ${faccao}`;
  }

  function validarSelecao() {
    const processo = texto(document.getElementById(PROCESSO_ID)?.value);
    const faccao = texto(document.getElementById(FACCAO_ID)?.value);

    if (!processo) return { ok: false, mensagem: "Selecione o processo que realmente foi realizado.", foco: PROCESSO_ID };
    if (!faccao) return { ok: false, mensagem: "Selecione quem fez / a facção responsável.", foco: FACCAO_ID };

    const permitidas = faccoesDoProcesso(processo);
    const valida = permitidas.some(nome => normalizar(nome) === normalizar(faccao));
    if (!valida) {
      return { ok: false, mensagem: "A facção escolhida não está vinculada ao processo selecionado.", foco: FACCAO_ID };
    }

    return { ok: true, processo, faccao };
  }

  function instalarEventos() {
    document.addEventListener("submit", event => {
      if (event.target?.id !== FORM_ID) return;
      const form = event.target;

      if (form.dataset.corponuChegada79Liberada === "1") {
        delete form.dataset.corponuChegada79Liberada;
        return;
      }

      const card = document.getElementById(CARD_ID);
      if (!card || card.classList.contains("hidden")) return;

      const validacao = validarSelecao();
      event.preventDefault();
      event.stopImmediatePropagation();

      if (!validacao.ok) {
        avisar(validacao.mensagem);
        document.getElementById(validacao.foco)?.focus();
        return;
      }

      const id = texto(document.getElementById("chegadaMovimentacaoId")?.value);
      if (!id) {
        avisar("A movimentação da chegada não foi encontrada.");
        return;
      }

      const botao = form.querySelector('button[type="submit"]');
      const textoBotao = botao?.textContent || "Confirmar chegada";
      if (botao) {
        botao.disabled = true;
        botao.textContent = "Conferindo e salvando...";
      }

      salvarCorrecaoAntesDaChegada(id, validacao.processo, validacao.faccao)
        .then(async alterou => {
          atualizarResumoVisual(validacao.processo, validacao.faccao);

          if (alterou) {
            document.getElementById("btnAtualizarServidor")?.click();
            await new Promise(resolve => window.setTimeout(resolve, 180));
          }

          if (botao) {
            botao.disabled = false;
            botao.textContent = textoBotao;
          }
          form.dataset.corponuChegada79Liberada = "1";
          form.requestSubmit();
        })
        .catch(error => {
          console.error("Erro ao corrigir processo/facção antes da chegada.", error);
          if (botao) {
            botao.disabled = false;
            botao.textContent = textoBotao;
          }
          avisar("Não foi possível salvar a correção do processo e da facção. A chegada não foi registrada.");
        });
    }, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.closest("#btnFecharModalChegada,#btnCancelarModalChegada")) {
        tokenAbertura += 1;
        limparCampos();
      }
    }, true);
  }

  function observarModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.dataset.corponuChegada79 === "1") return Boolean(modal);

    modal.dataset.corponuChegada79 = "1";
    observadorModal?.disconnect();
    observadorModal = new MutationObserver(() => {
      if (modal.classList.contains("hidden")) {
        tokenAbertura += 1;
        limparCampos();
      } else {
        prepararAbertura();
      }
    });
    observadorModal.observe(modal, { attributes: true, attributeFilter: ["class"] });
    return true;
  }

  function iniciar() {
    removerVersoesAntigas();
    instalarEstilo();
    garantirCard();
    instalarEventos();

    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      if (observarModal() || tentativas >= 40) window.clearInterval(intervalo);
    }, 200);

    window.addEventListener("pageshow", () => {
      observarModal();
      if (modalAberto()) prepararAbertura();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
