(() => {
  "use strict";

  const VERSION = "2026-08-01-chegada-restaurada-74";
  const CARD_ID = "sf71ConfirmacaoServico";
  const ESTILOS = [
    "styleChegadaConfirmacaoSegura71",
    "styleChegadaConfirmacaoBotoes73"
  ];

  if (window.__CORPONU_CHEGADA_RESTAURADA__ === VERSION) return;
  window.__CORPONU_CHEGADA_RESTAURADA__ = VERSION;
  window.__CORPONU_CHEGADA_CONFIRMACAO_SEGURA__ = VERSION;

  function restaurarModal() {
    document.getElementById(CARD_ID)?.remove();
    ESTILOS.forEach(id => document.getElementById(id)?.remove());

    const resumo = document.getElementById("modalChegadaResumo");
    if (resumo) {
      resumo.textContent = "Informe a data, a falta e o desconto por defeito. O processo e a facção já vêm da saída registrada.";
    }

    const form = document.getElementById("formChegadaMovimentacao");
    if (form) {
      form.querySelectorAll("#sf71ProcessoConfirmado,#sf71FaccaoConfirmada,#sf73ConfirmarProcesso,#sf73ConfirmarFaccao")
        .forEach(elemento => elemento.remove());
    }
  }

  function iniciar() {
    restaurarModal();
    [100, 350, 800, 1600].forEach(atraso => window.setTimeout(restaurarModal, atraso));
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;
    const botao = alvo.closest("button");
    const texto = String(botao?.textContent || "").trim().toUpperCase();
    if (texto === "CHEGADA" || texto === "REGISTRAR CHEGADA" || alvo.closest("[data-chegada],[data-registrar-chegada]")) {
      [40, 120, 300].forEach(atraso => window.setTimeout(restaurarModal, atraso));
    }
  }, true);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
