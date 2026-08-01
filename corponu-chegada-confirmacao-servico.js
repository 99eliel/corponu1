(() => {
  "use strict";

  const VERSION = "2026-08-01-chegada-confirmacao-restaurada-75";
  const FIREBASE_VERSION = "10.12.5";
  const MODAL_ID = "modalChegadaMovimentacao";
  const FORM_ID = "formChegadaMovimentacao";
  const CARD_ID = "corponuConfirmacaoChegada75";
  const PROCESSO_ID = "corponuChegadaProcesso75";
  const RESPONSAVEL_ID = "corponuChegadaResponsavel75";

  if (window.__CORPONU_CHEGADA_CONFIRMACAO__ === VERSION) return;
  window.__CORPONU_CHEGADA_CONFIRMACAO__ = VERSION;

  let contextoPromise = null;
  let movimentoAtual = null;
  let idPreparado = "";
  let carregando = false;
  let observadorModal = null;

  const texto = valor => String(valor ?? "").trim();

  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const escapar = valor => texto(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  function avisar(mensagem) {
    const toast = document.getElementById("toast");
    if (!toast) {
      window.alert(mensagem);
      return;
    }

    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    const fundoAnterior = toast.style.background;
    toast.style.background = "#991b1b";
    window.clearTimeout(window.__corponuToastChegada75);
    window.__corponuToastChegada75 = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = fundoAnterior;
    }, 5500);
  }

  async function obterContextoFirebase() {
    if (contextoPromise) return contextoPromise;

    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([firebaseApp, firestore]) => {
      if (!firebaseApp.getApps().length) {
        throw new Error("Firebase ainda não foi inicializado pelo sistema.");
      }
      return {
        db: firestore.getFirestore(firebaseApp.getApp()),
        firestore
      };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });

    return contextoPromise;
  }

  function injetarEstilos() {
    if (document.getElementById("corponuStyleConfirmacaoChegada75")) return;

    const style = document.createElement("style");
    style.id = "corponuStyleConfirmacaoChegada75";
    style.textContent = `
      #${CARD_ID} {
        margin: 14px 0;
        padding: 14px;
        border: 1px solid #c4b5fd;
        border-radius: 14px;
        background: #faf8ff;
      }
      #${CARD_ID}.hidden { display: none !important; }
      #${CARD_ID} h4 {
        margin: 0;
        color: #4c1d95;
        font-size: 14px;
      }
      #${CARD_ID} > p {
        margin: 5px 0 12px;
        color: #64748b;
        font-size: 12px;
        line-height: 1.45;
      }
      #${CARD_ID} .corponu-chegada-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 11px;
      }
      #${CARD_ID} label {
        margin: 0;
        color: #334155;
        font-size: 12px;
        font-weight: 900;
      }
      #${CARD_ID} select {
        width: 100%;
        min-height: 44px;
        margin-top: 6px;
        border: 1px solid #c4b5fd;
        border-radius: 11px;
        background: #fff;
        color: #0f172a;
        font-weight: 800;
      }
      #${CARD_ID} select:disabled {
        background: #f1f5f9;
        color: #64748b;
        cursor: not-allowed;
      }
      #${CARD_ID} .corponu-chegada-aviso {
        margin-top: 10px;
        padding: 9px 10px;
        border-radius: 9px;
        background: #ede9fe;
        color: #5b21b6;
        font-size: 11px;
        font-weight: 800;
        line-height: 1.4;
      }
      @media (max-width: 620px) {
        #${CARD_ID} .corponu-chegada-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function garantirCard() {
    const form = document.getElementById(FORM_ID);
    if (!form) return null;

    let card = document.getElementById(CARD_ID);
    if (card) return card;

    card = document.createElement("section");
    card.id = CARD_ID;
    card.className = "hidden";
    card.innerHTML = `
      <h4>Confirmação obrigatória da chegada</h4>
      <p>Selecione novamente o processo e quem o realizou para conferir se a chegada está sendo lançada na saída correta.</p>
      <div class="corponu-chegada-grid">
        <label>
          Processo realizado
          <select id="${PROCESSO_ID}" required>
            <option value="">Selecione novamente o processo</option>
          </select>
        </label>
        <label>
          Quem fez / facção
          <select id="${RESPONSAVEL_ID}" required disabled>
            <option value="">Selecione o processo primeiro</option>
          </select>
        </label>
      </div>
      <div class="corponu-chegada-aviso">
        Esta etapa é somente uma conferência. Ela não cria outra saída nem altera a movimentação original.
      </div>
    `;

    const info = document.getElementById("chegadaMovimentacaoInfo");
    if (info?.parentElement === form) {
      info.insertAdjacentElement("afterend", card);
    } else {
      form.prepend(card);
    }

    const processo = card.querySelector(`#${PROCESSO_ID}`);
    processo?.addEventListener("change", liberarResponsavelAposProcesso);
    return card;
  }

  function preencherProcesso(valor) {
    const select = document.getElementById(PROCESSO_ID);
    if (!(select instanceof HTMLSelectElement)) return;

    const processo = texto(valor);
    select.innerHTML = processo
      ? `<option value="">Selecione novamente o processo</option><option value="${escapar(processo)}">${escapar(processo)}</option>`
      : '<option value="">Processo não informado na saída</option>';
    select.value = "";
    select.disabled = !processo;
    select.required = true;
  }

  function prepararResponsavel(valor, liberar = false) {
    const select = document.getElementById(RESPONSAVEL_ID);
    if (!(select instanceof HTMLSelectElement)) return;

    const responsavel = texto(valor);
    select.innerHTML = liberar && responsavel
      ? `<option value="">Selecione novamente quem fez</option><option value="${escapar(responsavel)}">${escapar(responsavel)}</option>`
      : '<option value="">Selecione o processo primeiro</option>';
    select.value = "";
    select.disabled = !(liberar && responsavel);
    select.required = true;
  }

  function liberarResponsavelAposProcesso() {
    const processoSelecionado = texto(document.getElementById(PROCESSO_ID)?.value);
    const processoEsperado = texto(movimentoAtual?.processo);
    const processoCorreto = processoSelecionado && normalizar(processoSelecionado) === normalizar(processoEsperado);
    prepararResponsavel(movimentoAtual?.destino || "", Boolean(processoCorreto));
  }

  async function carregarMovimento(id) {
    const { db, firestore } = await obterContextoFirebase();
    const snap = await firestore.getDoc(firestore.doc(db, "movimentacoesProducao", id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  function ehMovimentoDeFaccao(movimento) {
    return normalizar(movimento?.tipoDestino) === "FACCAO" ||
      normalizar(movimento?.tipoDestinoLabel) === "FACCAO";
  }

  async function prepararConfirmacao(forcar = false) {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.classList.contains("hidden")) return false;

    const card = garantirCard();
    if (!card) return false;

    const id = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    if (!id || carregando) return false;
    if (!forcar && idPreparado === id && movimentoAtual?.id === id) return true;

    carregando = true;
    try {
      const movimento = await carregarMovimento(id);
      if (!movimento) throw new Error("Movimentação não encontrada.");

      movimentoAtual = movimento;
      idPreparado = id;

      const mostrar = ehMovimentoDeFaccao(movimento);
      card.classList.toggle("hidden", !mostrar);
      if (!mostrar) return true;

      preencherProcesso(movimento.processo || "");
      prepararResponsavel(movimento.destino || "", false);

      const resumo = document.getElementById("modalChegadaResumo");
      if (resumo) {
        resumo.textContent = "Confirme novamente o processo e quem fez. Depois informe data, falta e desconto por defeito.";
      }
      return true;
    } catch (error) {
      console.error("Erro ao preparar confirmação da chegada.", error);
      card.classList.add("hidden");
      movimentoAtual = null;
      idPreparado = "";
      avisar("Não foi possível carregar os dados da saída. Feche esta janela e tente novamente.");
      return false;
    } finally {
      carregando = false;
    }
  }

  function limparConfirmacao() {
    movimentoAtual = null;
    idPreparado = "";
    carregando = false;

    const card = document.getElementById(CARD_ID);
    card?.classList.add("hidden");

    const processo = document.getElementById(PROCESSO_ID);
    if (processo instanceof HTMLSelectElement) {
      processo.innerHTML = '<option value="">Selecione novamente o processo</option>';
      processo.value = "";
    }

    prepararResponsavel("", false);
  }

  function validarConfirmacao() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.classList.contains("hidden")) return { ok: true };

    if (carregando || !movimentoAtual) {
      return { ok: false, mensagem: "Aguarde os dados da saída carregarem antes de confirmar a chegada." };
    }

    const processo = texto(document.getElementById(PROCESSO_ID)?.value);
    const responsavel = texto(document.getElementById(RESPONSAVEL_ID)?.value);

    if (!processo) {
      return { ok: false, mensagem: "Selecione novamente o processo realizado." };
    }

    if (!responsavel) {
      return { ok: false, mensagem: "Selecione novamente quem fez o processo." };
    }

    if (normalizar(processo) !== normalizar(movimentoAtual.processo)) {
      return { ok: false, mensagem: "O processo selecionado não corresponde à saída registrada." };
    }

    if (normalizar(responsavel) !== normalizar(movimentoAtual.destino)) {
      return { ok: false, mensagem: "A facção selecionada não corresponde à saída registrada." };
    }

    return { ok: true };
  }

  function aoAbrirModal() {
    limparConfirmacao();
    [0, 80, 220, 500, 1000].forEach(atraso => {
      window.setTimeout(() => prepararConfirmacao(false), atraso);
    });
  }

  function observarModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.dataset.corponuConfirmacao75 === "1") return false;

    modal.dataset.corponuConfirmacao75 = "1";
    observadorModal?.disconnect();
    observadorModal = new MutationObserver(() => {
      if (modal.classList.contains("hidden")) limparConfirmacao();
      else aoAbrirModal();
    });
    observadorModal.observe(modal, { attributes: true, attributeFilter: ["class"] });
    return true;
  }

  document.addEventListener("submit", event => {
    if (event.target?.id !== FORM_ID) return;

    const validacao = validarConfirmacao();
    if (validacao.ok) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    avisar(validacao.mensagem);

    if (!texto(document.getElementById(PROCESSO_ID)?.value)) {
      document.getElementById(PROCESSO_ID)?.focus();
    } else {
      document.getElementById(RESPONSAVEL_ID)?.focus();
    }
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;

    const botao = alvo.closest("button");
    const rotulo = normalizar(botao?.textContent || "");
    const clicouChegada = rotulo === "CHEGADA" ||
      rotulo === "REGISTRAR CHEGADA" ||
      Boolean(alvo.closest("[data-chegada],[data-registrar-chegada],button[onclick*='registrarChegadaMovimentacao']"));

    if (clicouChegada) {
      [40, 120, 300, 700].forEach(atraso => {
        window.setTimeout(() => prepararConfirmacao(false), atraso);
      });
    }
  }, true);

  function iniciar() {
    injetarEstilos();
    garantirCard();
    observarModal();

    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      injetarEstilos();
      garantirCard();
      observarModal();
      if (tentativas >= 40) window.clearInterval(intervalo);
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
