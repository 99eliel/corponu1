(() => {
  "use strict";

  const VERSION = "2026-08-01-chegada-confirmacao-estavel-72";
  const FB = "10.12.5";
  const MODAL_ID = "modalChegadaMovimentacao";
  const FORM_ID = "formChegadaMovimentacao";
  const CARD_ID = "sf71ConfirmacaoServico";
  const PROCESSO_ID = "sf71ProcessoConfirmado";
  const FACCAO_ID = "sf71FaccaoConfirmada";

  if (window.__CORPONU_CHEGADA_CONFIRMACAO_SEGURA__ === VERSION) return;
  window.__CORPONU_CHEGADA_CONFIRMACAO_SEGURA__ = VERSION;

  let contextoPromise = null;
  let movimentoAtual = null;
  let movimentoPreparadoId = "";
  let observador = null;
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
    window.clearTimeout(window.__sf72Toast);
    window.__sf72Toast = window.setTimeout(() => {
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
    if (document.getElementById("styleChegadaConfirmacaoSegura71")) return;
    const style = document.createElement("style");
    style.id = "styleChegadaConfirmacaoSegura71";
    style.textContent = `
      #${CARD_ID}{margin:14px 0;padding:14px;border:1px solid #c4b5fd;border-radius:14px;background:#faf8ff}
      #${CARD_ID}.hidden{display:none!important}
      #${CARD_ID} h4{margin:0;color:#4c1d95;font-size:14px}
      #${CARD_ID}>p{margin:4px 0 12px;color:#64748b;font-size:11px;line-height:1.45}
      #${CARD_ID} .sf71-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      #${CARD_ID} label{margin:0;color:#334155;font-size:12px;font-weight:900}
      #${CARD_ID} select{width:100%;min-height:44px;margin-top:6px;border:1px solid #c4b5fd;border-radius:11px;background:#fff;color:#0f172a;font-weight:800}
      #${CARD_ID} .sf71-aviso{margin-top:10px;padding:8px 10px;border-radius:9px;background:#ede9fe;color:#5b21b6;font-size:10px;font-weight:800;line-height:1.4}
      @media(max-width:620px){#${CARD_ID} .sf71-grid{grid-template-columns:1fr}}
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
      <h4>Conferência obrigatória do serviço recebido</h4>
      <p>Selecione novamente o serviço e a facção para confirmar que a chegada está sendo registrada no movimento correto.</p>
      <div class="sf71-grid">
        <label>Serviço / processo recebido
          <select id="${PROCESSO_ID}" required>
            <option value="">Selecione para confirmar</option>
          </select>
        </label>
        <label>Facção responsável
          <select id="${FACCAO_ID}" required>
            <option value="">Selecione para confirmar</option>
          </select>
        </label>
      </div>
      <div class="sf71-aviso">Esta conferência não cria outra movimentação. O botão “Confirmar chegada” continua sendo o único salvamento.</div>`;

    const info = document.getElementById("chegadaMovimentacaoInfo");
    if (info?.parentElement === form) info.insertAdjacentElement("afterend", card);
    else form.prepend(card);
    return card;
  }

  function preencherSelectUmaVez(select, valor, rotulo, movimentoId) {
    if (!(select instanceof HTMLSelectElement)) return;
    if (select.dataset.movimentoId === movimentoId && select.options.length >= 2) return;

    select.innerHTML = `<option value="">Selecione para confirmar</option><option value="${escapar(valor)}">${escapar(rotulo || valor)}</option>`;
    select.value = "";
    select.required = true;
    select.dataset.movimentoId = movimentoId;
  }

  async function carregarMovimento(id) {
    if (!id) return null;
    const { db, fs } = await contexto();
    const snap = await fs.getDoc(fs.doc(db, "movimentacoesProducao", id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  function limparConfirmacao() {
    movimentoAtual = null;
    movimentoPreparadoId = "";
    preparandoId = "";
    const card = document.getElementById(CARD_ID);
    if (card) {
      card.classList.add("hidden");
      delete card.dataset.movimentoId;
    }
    [PROCESSO_ID, FACCAO_ID].forEach(id => {
      const select = document.getElementById(id);
      if (!(select instanceof HTMLSelectElement)) return;
      select.innerHTML = '<option value="">Selecione para confirmar</option>';
      select.value = "";
      delete select.dataset.movimentoId;
    });
  }

  async function prepararConfirmacao() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.classList.contains("hidden")) return false;
    const card = garantirCard();
    if (!card) return false;

    const id = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    if (!id) return false;

    if (movimentoPreparadoId === id && movimentoAtual?.id === id && card.dataset.movimentoId === id) {
      card.classList.remove("hidden");
      return true;
    }
    if (preparandoId === id) return false;

    preparandoId = id;
    try {
      const movimento = await carregarMovimento(id);
      if (!movimento) return false;

      const modalAindaAberto = !modal.classList.contains("hidden");
      const idAindaAtual = texto(document.getElementById("chegadaMovimentacaoId")?.value) === id;
      if (!modalAindaAberto || !idAindaAtual) return false;

      movimentoAtual = movimento;
      movimentoPreparadoId = id;
      card.dataset.movimentoId = id;

      const ehFaccao = normalizar(movimento.tipoDestino).includes("FACCAO") || Boolean(texto(movimento.destino));
      card.classList.toggle("hidden", !ehFaccao);
      if (!ehFaccao) return true;

      preencherSelectUmaVez(
        document.getElementById(PROCESSO_ID),
        movimento.processo || "",
        movimento.processo || "Processo não informado",
        id
      );
      preencherSelectUmaVez(
        document.getElementById(FACCAO_ID),
        movimento.destino || "",
        movimento.destino || "Facção não informada",
        id
      );

      const resumo = document.getElementById("modalChegadaResumo");
      if (resumo) resumo.textContent = "Confira o serviço e a facção. Depois informe data, falta e desconto por defeito.";
      return true;
    } catch (error) {
      console.error("Não foi possível preparar a conferência da chegada.", error);
      avisar("Não foi possível carregar os dados da saída. Feche a chegada e tente novamente.");
      return false;
    } finally {
      if (preparandoId === id) preparandoId = "";
    }
  }

  function validacaoConfirmacao() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.classList.contains("hidden")) return { ok: true };
    if (!movimentoAtual) return { ok: false, mensagem: "Os dados da movimentação ainda não foram carregados." };

    const processo = texto(document.getElementById(PROCESSO_ID)?.value);
    const faccao = texto(document.getElementById(FACCAO_ID)?.value);
    if (!processo || !faccao) {
      return { ok: false, mensagem: "Confirme o serviço recebido e a facção antes de registrar a chegada." };
    }
    if (normalizar(processo) !== normalizar(movimentoAtual.processo) || normalizar(faccao) !== normalizar(movimentoAtual.destino)) {
      return { ok: false, mensagem: "A confirmação não corresponde à saída registrada. Feche e abra a chegada novamente." };
    }
    return { ok: true };
  }

  function observarModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.dataset.sf72Observado === "1") return;
    modal.dataset.sf72Observado = "1";
    observador?.disconnect();
    observador = new MutationObserver(() => {
      if (modal.classList.contains("hidden")) {
        limparConfirmacao();
        return;
      }
      window.setTimeout(prepararConfirmacao, 40);
    });
    observador.observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  document.addEventListener("submit", event => {
    if (event.target?.id !== FORM_ID) return;
    const validacao = validacaoConfirmacao();
    if (validacao.ok) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    avisar(validacao.mensagem);
    document.getElementById(PROCESSO_ID)?.focus();
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;
    if (alvo.closest("[data-chegada], [data-registrar-chegada], button[onclick*='registrarChegadaMovimentacao']")) {
      limparConfirmacao();
      [60, 180, 400].forEach(atraso => window.setTimeout(prepararConfirmacao, atraso));
    }
  }, true);

  function iniciar() {
    injetarEstilos();
    garantirCard();
    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      observarModal();
      if (tentativas >= 35) window.clearInterval(intervalo);
    }, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
