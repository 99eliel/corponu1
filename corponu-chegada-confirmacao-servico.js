(() => {
  "use strict";

  const VERSION = "2026-08-01-chegada-confirmacao-botoes-73";
  const FB = "10.12.5";
  const MODAL_ID = "modalChegadaMovimentacao";
  const FORM_ID = "formChegadaMovimentacao";
  const CARD_ID = "sf71ConfirmacaoServico";
  const BOTAO_PROCESSO_ID = "sf73ConfirmarProcesso";
  const BOTAO_FACCAO_ID = "sf73ConfirmarFaccao";

  if (window.__CORPONU_CHEGADA_CONFIRMACAO_SEGURA__ === VERSION) return;
  window.__CORPONU_CHEGADA_CONFIRMACAO_SEGURA__ = VERSION;

  let contextoPromise = null;
  let movimentoAtual = null;
  let movimentoPreparadoId = "";
  let preparandoId = "";

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function avisar(mensagem) {
    const toast = document.getElementById("toast");
    if (!toast) {
      window.alert(mensagem);
      return;
    }
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = "#991b1b";
    window.clearTimeout(window.__sf73Toast);
    window.__sf73Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 6500);
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([app, fs]) => {
      if (!app.getApps().length) throw new Error("Firebase ainda não inicializado.");
      return { db: fs.getFirestore(app.getApp()), fs };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  function injetarEstilos() {
    if (document.getElementById("styleChegadaConfirmacaoBotoes73")) return;
    const style = document.createElement("style");
    style.id = "styleChegadaConfirmacaoBotoes73";
    style.textContent = `
      #${CARD_ID}{margin:14px 0;padding:14px;border:1px solid #c4b5fd;border-radius:14px;background:#faf8ff}
      #${CARD_ID}.hidden{display:none!important}
      #${CARD_ID} h4{margin:0;color:#4c1d95;font-size:14px}
      #${CARD_ID}>p{margin:4px 0 12px;color:#64748b;font-size:11px;line-height:1.45}
      #${CARD_ID} .sf73-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      #${CARD_ID} .sf73-item{display:grid;gap:6px}
      #${CARD_ID} .sf73-item>span{color:#334155;font-size:12px;font-weight:900}
      #${CARD_ID} .sf73-confirmar{width:100%;min-height:54px;padding:10px 12px;border:1px solid #c4b5fd;border-radius:11px;background:#fff;color:#0f172a;text-align:left;cursor:pointer;transition:.15s ease}
      #${CARD_ID} .sf73-confirmar:hover{border-color:#7c3aed;background:#f5f3ff}
      #${CARD_ID} .sf73-confirmar strong{display:block;font-size:13px;line-height:1.3}
      #${CARD_ID} .sf73-confirmar small{display:block;margin-top:3px;color:#7c3aed;font-size:10px;font-weight:900}
      #${CARD_ID} .sf73-confirmar.confirmado{border-color:#22c55e;background:#ecfdf5;color:#166534;box-shadow:0 0 0 2px rgba(34,197,94,.10)}
      #${CARD_ID} .sf73-confirmar.confirmado small{color:#166534}
      #${CARD_ID} .sf73-aviso{margin-top:10px;padding:8px 10px;border-radius:9px;background:#ede9fe;color:#5b21b6;font-size:10px;font-weight:800;line-height:1.4}
      @media(max-width:620px){#${CARD_ID} .sf73-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function garantirCard() {
    const form = document.getElementById(FORM_ID);
    if (!form) return null;

    let card = document.getElementById(CARD_ID);
    if (!card) {
      card = document.createElement("section");
      card.id = CARD_ID;
      const info = document.getElementById("chegadaMovimentacaoInfo");
      if (info?.parentElement === form) info.insertAdjacentElement("afterend", card);
      else form.prepend(card);
    }

    if (card.dataset.sf73Versao !== VERSION) {
      card.dataset.sf73Versao = VERSION;
      card.className = "hidden";
      card.innerHTML = `
        <h4>Conferência obrigatória do serviço recebido</h4>
        <p>Confirme o serviço e a facção antes de registrar a chegada. Não há outro salvamento nesta etapa.</p>
        <div class="sf73-grid">
          <div class="sf73-item">
            <span>Serviço / processo recebido</span>
            <button id="${BOTAO_PROCESSO_ID}" class="sf73-confirmar" type="button" data-confirmado="0">
              <strong>Carregando processo...</strong>
              <small>Toque para confirmar</small>
            </button>
          </div>
          <div class="sf73-item">
            <span>Facção responsável</span>
            <button id="${BOTAO_FACCAO_ID}" class="sf73-confirmar" type="button" data-confirmado="0">
              <strong>Carregando facção...</strong>
              <small>Toque para confirmar</small>
            </button>
          </div>
        </div>
        <div class="sf73-aviso">O botão “Confirmar chegada” continua sendo a única gravação. Estes botões apenas confirmam os dados da saída.</div>`;
    }

    return card;
  }

  async function carregarMovimento(id) {
    if (!id) return null;
    const { db, fs } = await contexto();
    const snap = await fs.getDoc(fs.doc(db, "movimentacoesProducao", id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  function prepararBotao(botao, valor, tipo) {
    if (!(botao instanceof HTMLButtonElement)) return;
    const exibicao = texto(valor) || (tipo === "processo" ? "Processo não informado" : "Facção não informada");
    botao.dataset.valorEsperado = valor || "";
    botao.dataset.confirmado = "0";
    botao.classList.remove("confirmado");
    botao.innerHTML = `<strong>${escapar(exibicao)}</strong><small>Toque para confirmar</small>`;
    botao.disabled = !texto(valor);
  }

  function marcarConfirmado(botao) {
    if (!(botao instanceof HTMLButtonElement) || botao.disabled) return;
    botao.dataset.confirmado = "1";
    botao.classList.add("confirmado");
    const strong = botao.querySelector("strong")?.textContent || "Confirmado";
    botao.innerHTML = `<strong>✓ ${escapar(strong)}</strong><small>Confirmado</small>`;
  }

  function limparEstado() {
    movimentoAtual = null;
    movimentoPreparadoId = "";
    preparandoId = "";
    const card = document.getElementById(CARD_ID);
    if (card) card.classList.add("hidden");
  }

  async function prepararConfirmacao(forcar = false) {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.classList.contains("hidden")) return false;

    const id = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    if (!id) return false;
    if (!forcar && movimentoPreparadoId === id && movimentoAtual?.id === id) return true;
    if (preparandoId === id) return false;

    preparandoId = id;
    try {
      const movimento = await carregarMovimento(id);
      if (!movimento) throw new Error("Movimentação não encontrada.");

      const card = garantirCard();
      if (!card) return false;

      movimentoAtual = movimento;
      movimentoPreparadoId = id;
      const ehFaccao = normalizar(movimento.tipoDestino).includes("FACCAO") || Boolean(texto(movimento.destino));
      card.classList.toggle("hidden", !ehFaccao);
      if (!ehFaccao) return true;

      prepararBotao(document.getElementById(BOTAO_PROCESSO_ID), movimento.processo || "", "processo");
      prepararBotao(document.getElementById(BOTAO_FACCAO_ID), movimento.destino || "", "faccao");

      const resumo = document.getElementById("modalChegadaResumo");
      if (resumo) resumo.textContent = "Confirme o serviço e a facção. Depois informe data, falta e desconto por defeito.";
      return true;
    } catch (error) {
      console.error("Não foi possível preparar a confirmação da chegada.", error);
      avisar("Não foi possível carregar os dados da saída. Feche a chegada e tente novamente.");
      return false;
    } finally {
      preparandoId = "";
    }
  }

  function validacaoConfirmacao() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.classList.contains("hidden")) return { ok: true };

    const idAtual = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    if (!movimentoAtual || movimentoAtual.id !== idAtual || movimentoPreparadoId !== idAtual) {
      return { ok: false, mensagem: "Os dados da movimentação ainda não foram carregados. Aguarde um instante e tente novamente." };
    }

    const processo = document.getElementById(BOTAO_PROCESSO_ID);
    const faccao = document.getElementById(BOTAO_FACCAO_ID);
    if (processo?.dataset.confirmado !== "1" || faccao?.dataset.confirmado !== "1") {
      return { ok: false, mensagem: "Confirme o serviço recebido e a facção antes de registrar a chegada." };
    }

    if (normalizar(processo.dataset.valorEsperado) !== normalizar(movimentoAtual.processo) ||
        normalizar(faccao.dataset.valorEsperado) !== normalizar(movimentoAtual.destino)) {
      return { ok: false, mensagem: "A confirmação não corresponde à saída registrada. Feche e abra a chegada novamente." };
    }

    return { ok: true };
  }

  function agendarPreparacao() {
    limparEstado();
    [40, 120, 280, 600].forEach(atraso => window.setTimeout(() => prepararConfirmacao(false), atraso));
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;

    const botaoProcesso = alvo.closest(`#${BOTAO_PROCESSO_ID}`);
    if (botaoProcesso) {
      event.preventDefault();
      marcarConfirmado(botaoProcesso);
      return;
    }

    const botaoFaccao = alvo.closest(`#${BOTAO_FACCAO_ID}`);
    if (botaoFaccao) {
      event.preventDefault();
      marcarConfirmado(botaoFaccao);
      return;
    }

    const botao = alvo.closest("button");
    const textoBotao = normalizar(botao?.textContent);
    if (alvo.closest("[data-chegada], [data-registrar-chegada], button[onclick*='registrarChegadaMovimentacao']") ||
        textoBotao === "CHEGADA" || textoBotao === "REGISTRAR CHEGADA") {
      agendarPreparacao();
      return;
    }

    if (alvo.closest("#btnFecharModalChegada, #btnCancelarModalChegada") ||
        alvo.id === MODAL_ID) {
      limparEstado();
    }
  }, true);

  document.addEventListener("submit", event => {
    if (event.target?.id !== FORM_ID) return;
    const validacao = validacaoConfirmacao();
    if (validacao.ok) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    avisar(validacao.mensagem);
    prepararConfirmacao(false);
  }, true);

  function iniciar() {
    injetarEstilos();
    garantirCard();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
