(() => {
  "use strict";

  const VERSION = "2026-08-02-pagamentos-sem-lancamento-manual-87";
  const BOTAO_ID = "btnPagamentoManualFinanceiro";
  const MODAL_ID = "modalPagamentoManualFinanceiro";
  const FORM_ID = "formPagamentoManualFinanceiro";

  if (window.__CORPONU_REMOVER_LANCAMENTO_MANUAL_PAGAMENTOS__ === VERSION) return;
  window.__CORPONU_REMOVER_LANCAMENTO_MANUAL_PAGAMENTOS__ = VERSION;

  function avisar() {
    const mensagem = "O lançamento manual de pagamento foi desativado. Registre a saída e depois a chegada pela aba Facções.";
    const toast = document.getElementById("toast");
    if (!toast) {
      window.alert(mensagem);
      return;
    }

    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = "#991b1b";
    window.clearTimeout(window.__corponuSemLancamentoManual87Toast);
    window.__corponuSemLancamentoManual87Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 6000);
  }

  function instalarEstilo() {
    if (document.getElementById("styleSemLancamentoManualPagamento87")) return;

    const style = document.createElement("style");
    style.id = "styleSemLancamentoManualPagamento87";
    style.textContent = `
      #${BOTAO_ID},
      #${MODAL_ID} {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function removerElementos() {
    document.getElementById(BOTAO_ID)?.remove();
    document.getElementById(MODAL_ID)?.remove();
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo?.closest(`#${BOTAO_ID}`)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    removerElementos();
    avisar();
  }, true);

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== FORM_ID) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    removerElementos();
    avisar();
  }, true);

  function iniciar() {
    instalarEstilo();
    removerElementos();

    // O módulo antigo pode adicionar o botão alguns instantes depois de carregar.
    // A limpeza é curta e limitada, sem observar continuamente a página.
    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      removerElementos();
      if (tentativas >= 40) window.clearInterval(intervalo);
    }, 250);

    window.addEventListener("pageshow", removerElementos);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
