(() => {
  "use strict";

  const VERSION = "2026-08-01-chegada-sem-travamento-82";
  const FIREBASE_VERSION = "10.12.5";
  const MODAL_ID = "modalChegadaMovimentacao";
  const FORM_ID = "formChegadaMovimentacao";
  const INFO_ID = "chegadaMovimentacaoInfo";
  const CARD_ID = "cnChegadaEstavel82";
  const PROCESSO_ID = "cnChegadaProcesso82";
  const FACCAO_ID = "cnChegadaFaccao82";
  const ATUAL_ID = "cnChegadaAtual82";

  const PROCESSOS_FACCOES = Object.freeze({
    "ENCAPAR BOJO": ["DIVINA", "GRACIANE", "JESSICA", "LARISSA", "ALINE BATISTA", "DAIANY", "NAGILA", "DELMA", "GIRLAINE"],
    "ALÇA": ["JANAINA", "IVONE", "LUANA", "KARYTA", "SIMEI", "SIMONE"],
    "CALCINHA MONTAGEM": ["ANA FLAVIA", "KAUANE", "LIANA", "DAIANA", "LEIDIANE", "ANDREZA"],
    "CALCINHA COMPLETA": ["LORENA", "JEAN", "SCHENEIDER", "DANIELA", "KAMILA", "LIANDRA", "JUZENI", "THEILLOR", "SILVANY", "LEONARDO", "MATHEUS", "BEATRIZ", "MARILIA", "DARLLEN", "RONEIDIA"],
    "SUTIÃ MONTAGEM": ["LIVIA", "FRACEILDA", "MOCINHA", "NAYARA", "NAGILA", "GIRLAINE", "JHENIFER"],
    "SUTIÃ COMPLETO": ["DANUBIA", "KAKA", "GISLAINY", "ITAMAR", "LUCIA", "GOIANIRA"]
  });

  if (window.__CN_CHEGADA_ESTAVEL_82__ === VERSION) return;
  window.__CN_CHEGADA_ESTAVEL_82__ = VERSION;

  window.__CORPONU_CHEGADA_CORRECAO_79__ = "2026-08-01-chegada-correcao-processo-faccao-79";
  window.__CN_CHEGADA_RAPIDA80__ = "2026-08-01-chegada-correcao-rapida-80";
  window.__CN_CHEGADA_UNICA_81__ = "2026-08-01-chegada-unica-rapida-81";
  window.__CORPONU_CHEGADA_CONFIRMACAO__ = VERSION;
  window.__CORPONU_CHEGADA_CONFIRMACAO_DEFINITIVA__ = VERSION;

  const IDS_ANTIGOS = [
    "sf71ConfirmacaoServico",
    "sf73ConfirmacaoServico",
    "corponuConfirmacaoChegada75",
    "corponuChegadaConfirmacao76",
    "corponuConfirmacaoChegada77",
    "corponuConfirmacaoChegada78",
    "corponuConfirmacaoChegada79",
    "cnChegadaRapida80",
    "cnChegadaUnica81"
  ];

  const ESTILOS_ANTIGOS = [
    "styleChegadaConfirmacaoSegura71",
    "styleChegadaConfirmacaoBotoes73",
    "corponuStyleConfirmacaoChegada75",
    "styleCorponuChegadaConfirmacao75",
    "styleCorponuChegadaConfirmacao76",
    "styleCorponuConfirmacaoChegada77",
    "styleCorponuConfirmacaoChegada78",
    "styleCorponuConfirmacaoChegada79",
    "cnChegadaRapida80Style",
    "cnChegadaUnica81Style"
  ];

  let contextoPromise = null;
  let movimentoAtual = null;
  let idPreparado = "";
  let tokenAbertura = 0;
  let observadorModal = null;
  let eventosInstalados = false;

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

  const PROCESSOS = Object.freeze(unicosOrdenados(Object.keys(PROCESSOS_FACCOES)));
  const FACCOES_POR_PROCESSO = new Map(
    Object.entries(PROCESSOS_FACCOES).map(([processo, faccoes]) => [
      normalizar(processo),
      Object.freeze(unicosOrdenados(faccoes))
    ])
  );

  function avisar(mensagem) {
    const toast = document.getElementById("toast");
    if (!toast) {
      window.alert(mensagem);
      return;
    }
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = "#991b1b";
    window.clearTimeout(window.__cnChegada82Toast);
    window.__cnChegada82Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 5000);
  }

  async function contextoFirebase() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, authMod, firestore]) => {
      const app = appMod.getApp();
      return {
        auth: authMod.getAuth(app),
        db: firestore.getFirestore(app),
        firestore
      };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  function removerVersoesAntigas() {
    IDS_ANTIGOS.forEach(id => document.getElementById(id)?.remove());
    ESTILOS_ANTIGOS.forEach(id => document.getElementById(id)?.remove());

    const form = document.getElementById(FORM_ID);
    if (!form) return;
    [...form.children].forEach(filho => {
      if (filho.id === CARD_ID) return;
      const conteudo = normalizar(filho.textContent);
      if (
        conteudo.includes("CONFIRMACAO OBRIGATORIA DA CHEGADA") ||
        conteudo.includes("CONFERENCIA E CORRECAO OBRIGATORIA DA CHEGADA")
      ) {
        filho.remove();
      }
    });
  }

  function instalarEstilo() {
    if (document.getElementById("cnChegadaEstavel82Style")) return;
    const style = document.createElement("style");
    style.id = "cnChegadaEstavel82Style";
    style.textContent = `
      body.cn-chegada-modal-aberta .toast,
      body.cn-chegada-modal-aberta [id*="toast" i],
      body.cn-chegada-modal-aberta [class*="toast" i]{pointer-events:none!important;user-select:none!important}
      #${CARD_ID}{margin:14px 0 18px;padding:14px;border:1px solid #c4b5fd;border-radius:16px;background:#faf8ff}
      #${CARD_ID}.hidden{display:none!important}
      #${CARD_ID} .cn82-title{margin:0;color:#5b21b6;font-size:14px;font-weight:900}
      #${CARD_ID} .cn82-description{margin:4px 0 10px;color:#64748b;font-size:12px;line-height:1.45}
      #${CARD_ID} .cn82-current{margin:0 0 12px;padding:9px 11px;border:1px solid #ddd6fe;border-radius:10px;background:#fff;color:#475569;font-size:11px;font-weight:800}
      #${CARD_ID} .cn82-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #${CARD_ID} label{margin:0;color:#334155;font-size:12px;font-weight:900}
      #${CARD_ID} select{width:100%;min-height:46px;margin-top:6px;padding:0 12px;border:1px solid #a78bfa;border-radius:12px;background:#fff;font-size:14px;font-weight:800}
      #${CARD_ID} select:disabled{background:#f3f4f6;color:#9ca3af}
      #${CARD_ID} .cn82-note{margin-top:10px;padding:9px 11px;border-radius:10px;background:#ede9fe;color:#6d28d9;font-size:11px;font-weight:800}
      @media(max-width:640px){#${CARD_ID} .cn82-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function preencherSelect(select, placeholder, valores = [], desabilitado = false) {
    if (!(select instanceof HTMLSelectElement)) return;
    const opcoes = [new Option(placeholder, "")];
    valores.forEach(valor => opcoes.push(new Option(valor, valor)));
    select.replaceChildren(...opcoes);
    select.value = "";
    select.disabled = desabilitado;
  }

  function processosDisponiveis() {
    if (!movimentoAtual?.processo || PROCESSOS.some(item => normalizar(item) === normalizar(movimentoAtual.processo))) {
      return PROCESSOS;
    }
    return unicosOrdenados([...PROCESSOS, movimentoAtual.processo]);
  }

  function faccoesDoProcesso(processo) {
    const cadastradas = FACCOES_POR_PROCESSO.get(normalizar(processo)) || [];
    if (
      movimentoAtual?.destino &&
      normalizar(processo) === normalizar(movimentoAtual.processo) &&
      !cadastradas.some(nome => normalizar(nome) === normalizar(movimentoAtual.destino))
    ) {
      return unicosOrdenados([...cadastradas, movimentoAtual.destino]);
    }
    return cadastradas;
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
      <p class="cn82-title">Conferência e correção obrigatória da chegada</p>
      <p class="cn82-description">Escolha o processo que realmente foi feito e depois selecione quem realizou.</p>
      <div class="cn82-current" id="${ATUAL_ID}">Carregando dados registrados...</div>
      <div class="cn82-grid">
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
      <div class="cn82-note">Uma correção feita aqui será salva antes do pagamento ser calculado.</div>
    `;

    const info = document.getElementById(INFO_ID);
    if (info?.parentElement === form) info.insertAdjacentElement("afterend", card);
    else form.prepend(card);

    card.querySelector(`#${PROCESSO_ID}`)?.addEventListener("change", event => {
      const processo = texto(event.currentTarget.value);
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

  function movimentoDoResumo(id) {
    const linha = texto(document.getElementById(INFO_ID)?.querySelector("span")?.textContent);
    const partes = linha.split("|").map(texto).filter(Boolean);
    if (!id || partes.length < 2 || normalizar(partes[1]).startsWith("ENVIADO")) return null;
    return {
      id,
      destino: partes[0],
      processo: partes[1],
      destinoId: "",
      tipoDestino: "faccao",
      origemLocal: true
    };
  }

  function aplicarMovimento(movimento) {
    movimentoAtual = movimento;
    idPreparado = movimento.id;

    const card = garantirCard();
    if (!card) return false;
    card.classList.remove("hidden");

    const atual = document.getElementById(ATUAL_ID);
    if (atual) {
      atual.textContent = `Registrado na saída: ${texto(movimento.processo) || "não informado"} • ${texto(movimento.destino) || "não informado"}`;
    }

    preencherSelect(
      document.getElementById(PROCESSO_ID),
      "Selecione o processo correto",
      processosDisponiveis()
    );
    preencherSelect(document.getElementById(FACCAO_ID), "Selecione o processo primeiro", [], true);

    const resumo = document.getElementById("modalChegadaResumo");
    if (resumo) {
      resumo.textContent = "Confira ou corrija o processo e a facção. Depois informe data, falta e desconto por defeito.";
    }
    return true;
  }

  function limparEstado() {
    movimentoAtual = null;
    idPreparado = "";
    preencherSelect(document.getElementById(PROCESSO_ID), "Selecione o processo correto");
    preencherSelect(document.getElementById(FACCAO_ID), "Selecione o processo primeiro", [], true);
    const atual = document.getElementById(ATUAL_ID);
    if (atual) atual.textContent = "Carregando dados registrados...";
  }

  async function carregarMovimentoComoReserva(id, token) {
    try {
      const { db, firestore } = await contextoFirebase();
      const snap = await firestore.getDoc(firestore.doc(db, "movimentacoesProducao", id));
      if (token !== tokenAbertura || !modalAberto() || !snap.exists()) return;
      aplicarMovimento({ id: snap.id, ...snap.data() });
    } catch (error) {
      console.error("Erro ao carregar a movimentação da chegada.", error);
      avisar("Não foi possível carregar os dados da chegada.");
    }
  }

  function prepararAbertura() {
    const token = ++tokenAbertura;
    let tentativas = 0;

    removerVersoesAntigas();
    garantirCard();
    document.body.classList.add("cn-chegada-modal-aberta");

    const tentar = () => {
      if (token !== tokenAbertura || !modalAberto()) return;

      const id = texto(document.getElementById("chegadaMovimentacaoId")?.value);
      if (!id) {
        tentativas += 1;
        if (tentativas < 6) window.setTimeout(tentar, 25);
        return;
      }

      if (idPreparado === id && movimentoAtual?.id === id) {
        document.getElementById(CARD_ID)?.classList.remove("hidden");
        return;
      }

      const movimentoLocal = movimentoDoResumo(id);
      if (movimentoLocal) aplicarMovimento(movimentoLocal);
      else carregarMovimentoComoReserva(id, token);
    };

    window.setTimeout(tentar, 0);
  }

  function validarSelecao() {
    const processo = texto(document.getElementById(PROCESSO_ID)?.value);
    const faccao = texto(document.getElementById(FACCAO_ID)?.value);

    if (!processo) {
      return { ok: false, mensagem: "Selecione o processo que realmente foi realizado.", foco: PROCESSO_ID };
    }
    if (!faccao) {
      return { ok: false, mensagem: "Selecione quem fez / a facção responsável.", foco: FACCAO_ID };
    }
    if (!faccoesDoProcesso(processo).some(nome => normalizar(nome) === normalizar(faccao))) {
      return { ok: false, mensagem: "A facção escolhida não está vinculada ao processo selecionado.", foco: FACCAO_ID };
    }
    return { ok: true, processo, faccao };
  }

  function houveCorrecao(processo, faccao) {
    return normalizar(processo) !== normalizar(movimentoAtual?.processo) ||
      normalizar(faccao) !== normalizar(movimentoAtual?.destino);
  }

  async function salvarCorrecao(id, processo, faccao) {
    if (!houveCorrecao(processo, faccao)) return false;

    const { auth, db, firestore } = await contextoFirebase();
    let usuario = auth.currentUser;
    for (let tentativa = 0; tentativa < 10 && !usuario; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 50));
      usuario = auth.currentUser;
    }
    if (!usuario) throw new Error("Usuário não autenticado.");

    const mudouFaccao = normalizar(faccao) !== normalizar(movimentoAtual?.destino);
    const dados = {
      processoAnteriorChegada: movimentoAtual?.processoAnteriorChegada || movimentoAtual?.processo || "",
      destinoAnteriorChegada: movimentoAtual?.destinoAnteriorChegada || movimentoAtual?.destino || "",
      destinoIdAnteriorChegada: movimentoAtual?.destinoIdAnteriorChegada || movimentoAtual?.destinoId || "",
      processo,
      destino: faccao,
      correcaoNaChegada: true,
      correcaoChegadaVersao: VERSION,
      correcaoChegadaPor: usuario.uid,
      correcaoChegadaEm: firestore.serverTimestamp(),
      atualizadoPor: usuario.uid,
      atualizadoEm: firestore.serverTimestamp()
    };

    if (mudouFaccao) {
      dados.destinoId = "";
      dados.destinoIdPendenteCorrecao = true;
    }

    await firestore.updateDoc(firestore.doc(db, "movimentacoesProducao", id), dados);
    movimentoAtual.processo = processo;
    movimentoAtual.destino = faccao;
    if (mudouFaccao) movimentoAtual.destinoId = "";
    return mudouFaccao;
  }

  async function sincronizarDestinoIdEmSegundoPlano(id, faccao) {
    try {
      const { db, firestore } = await contextoFirebase();
      const busca = firestore.query(
        firestore.collection(db, "faccoes"),
        firestore.where("nome", "==", faccao),
        firestore.limit(1)
      );
      const snap = await firestore.getDocs(busca);
      if (snap.empty) return;

      const ref = firestore.doc(db, "movimentacoesProducao", id);
      const movimentoSnap = await firestore.getDoc(ref);
      if (!movimentoSnap.exists() || normalizar(movimentoSnap.data().destino) !== normalizar(faccao)) return;

      await firestore.updateDoc(ref, {
        destinoId: snap.docs[0].id,
        destinoIdPendenteCorrecao: false
      });
    } catch (error) {
      console.warn("O ID da facção será sincronizado posteriormente.", error);
    }
  }

  function atualizarResumoVisual(processo, faccao) {
    const span = document.getElementById(INFO_ID)?.querySelector("span");
    if (span) {
      const enviado = texto(span.textContent)
        .split("|")
        .map(texto)
        .find(parte => normalizar(parte).startsWith("ENVIADO")) || "";
      span.textContent = `${faccao} | ${processo}${enviado ? ` | ${enviado}` : ""}`;
    }

    const atual = document.getElementById(ATUAL_ID);
    if (atual) atual.textContent = `Confirmado para a chegada: ${processo} • ${faccao}`;
  }

  function liberarSubmit(form) {
    form.dataset.cnChegada82Liberada = "1";
    form.requestSubmit();
  }

  function instalarEventos() {
    if (eventosInstalados) return;
    eventosInstalados = true;

    document.addEventListener("submit", event => {
      if (event.target?.id !== FORM_ID) return;
      const form = event.target;

      if (form.dataset.cnChegada82Liberada === "1") {
        delete form.dataset.cnChegada82Liberada;
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
      if (!id || !movimentoAtual) {
        avisar("A movimentação da chegada não foi encontrada.");
        return;
      }

      if (!houveCorrecao(validacao.processo, validacao.faccao)) {
        atualizarResumoVisual(validacao.processo, validacao.faccao);
        liberarSubmit(form);
        return;
      }

      const botao = form.querySelector('button[type="submit"]');
      const textoOriginal = botao?.textContent || "Confirmar chegada";
      if (botao) {
        botao.disabled = true;
        botao.textContent = "Salvando correção...";
      }

      salvarCorrecao(id, validacao.processo, validacao.faccao)
        .then(mudouFaccao => {
          atualizarResumoVisual(validacao.processo, validacao.faccao);
          if (botao) {
            botao.disabled = false;
            botao.textContent = textoOriginal;
          }
          liberarSubmit(form);
          if (mudouFaccao) {
            window.setTimeout(() => sincronizarDestinoIdEmSegundoPlano(id, validacao.faccao), 500);
          }
        })
        .catch(error => {
          console.error("Erro ao salvar correção da chegada.", error);
          if (botao) {
            botao.disabled = false;
            botao.textContent = textoOriginal;
          }
          avisar("Não foi possível salvar a correção. A chegada não foi registrada.");
        });
    }, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (alvo?.closest("#btnFecharModalChegada,#btnCancelarModalChegada")) {
        tokenAbertura += 1;
        limparEstado();
        document.body.classList.remove("cn-chegada-modal-aberta");
      }
    }, true);
  }

  function observarModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.dataset.cnChegadaEstavel82 === "1") return Boolean(modal);

    modal.dataset.cnChegadaEstavel82 = "1";
    observadorModal?.disconnect();

    observadorModal = new MutationObserver(() => {
      if (modal.classList.contains("hidden")) {
        tokenAbertura += 1;
        limparEstado();
        document.body.classList.remove("cn-chegada-modal-aberta");
      } else {
        prepararAbertura();
      }
    });

    observadorModal.observe(modal, {
      attributes: true,
      attributeFilter: ["class"]
    });
    return true;
  }

  function iniciar() {
    removerVersoesAntigas();
    instalarEstilo();
    garantirCard();
    instalarEventos();

    window.setTimeout(() => contextoFirebase().catch(() => {}), 300);

    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      if (observarModal() || tentativas >= 30) window.clearInterval(intervalo);
    }, 150);

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
