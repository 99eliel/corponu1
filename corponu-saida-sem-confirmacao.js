(() => {
  "use strict";

  const VERSION = "2026-08-01-saida-sem-confirmacao-dupla-85";
  const FORM_ID = "s3form";
  const MODAL_ID = "modalSaida3";
  const LOCK_ATTR = "corponuSaida85EmCurso";
  const TEMPO_MAXIMO_TRAVA = 20000;

  if (window.__CORPONU_SAIDA_SEM_CONFIRMACAO__ === VERSION) return;
  window.__CORPONU_SAIDA_SEM_CONFIRMACAO__ = VERSION;

  const confirmacaoOriginal = window.confirm.bind(window);
  window.confirm = mensagem => {
    const texto = String(mensagem ?? "").replace(/\r/g, "");
    const confirmacaoDaSaida =
      texto.startsWith("Confirmar saída?\nAba:") &&
      texto.includes("\nOP ") &&
      texto.includes("\nProcesso:") &&
      texto.includes("\nFacção:") &&
      texto.includes("\nQuantidade:");

    if (confirmacaoDaSaida) return true;
    return confirmacaoOriginal(mensagem);
  };

  function avisar(mensagem) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    window.clearTimeout(window.__corponuSaida85Toast);
    window.__corponuSaida85Toast = window.setTimeout(() => toast.classList.add("hidden"), 3500);
  }

  function liberar(form) {
    if (!(form instanceof HTMLFormElement)) return;
    delete form.dataset[LOCK_ATTR];
    window.clearTimeout(Number(form.dataset.corponuSaida85Timer || 0));
    delete form.dataset.corponuSaida85Timer;
  }

  function instalarObservacaoDoModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.dataset.corponuSaida85Observado === "1") return;

    modal.dataset.corponuSaida85Observado = "1";
    const observer = new MutationObserver(() => {
      if (!modal.classList.contains("hidden")) return;
      liberar(document.getElementById(FORM_ID));
    });
    observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== FORM_ID) return;

    instalarObservacaoDoModal();

    if (form.dataset[LOCK_ATTR] === "1") {
      event.preventDefault();
      event.stopImmediatePropagation();
      avisar("A saída já está sendo processada. Aguarde.");
      return;
    }

    // A trava acontece antes de qualquer consulta ou gravação do módulo original.
    // O primeiro envio continua normalmente; qualquer segundo clique é bloqueado.
    form.dataset[LOCK_ATTR] = "1";
    const timer = window.setTimeout(() => liberar(form), TEMPO_MAXIMO_TRAVA);
    form.dataset.corponuSaida85Timer = String(timer);

    let viuBotaoDesabilitado = false;
    const botao = event.submitter instanceof HTMLButtonElement
      ? event.submitter
      : form.querySelector('button[type="submit"]');

    const acompanhamento = window.setInterval(() => {
      const modal = document.getElementById(MODAL_ID);
      if (modal?.classList.contains("hidden")) {
        window.clearInterval(acompanhamento);
        liberar(form);
        return;
      }

      if (botao?.disabled) viuBotaoDesabilitado = true;
      if (viuBotaoDesabilitado && botao && !botao.disabled) {
        window.clearInterval(acompanhamento);
        liberar(form);
      }
    }, 150);

    window.setTimeout(() => window.clearInterval(acompanhamento), TEMPO_MAXIMO_TRAVA + 500);
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (alvo?.closest("#s3fechar,#s3cancelar")) {
      liberar(document.getElementById(FORM_ID));
    }
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", instalarObservacaoDoModal, { once: true });
  } else {
    instalarObservacaoDoModal();
  }
})();
