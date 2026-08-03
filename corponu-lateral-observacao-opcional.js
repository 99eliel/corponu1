(() => {
  "use strict";

  const VERSION = "2026-08-03-lateral-observacao-opcional-104";
  const CAMPO_ID = "chegadaCorteObs";

  if (window.__CORPONU_LATERAL_OBSERVACAO_OPCIONAL__ === VERSION) return;
  window.__CORPONU_LATERAL_OBSERVACAO_OPCIONAL__ = VERSION;

  function tornarOpcional() {
    const campo = document.getElementById(CAMPO_ID);
    if (!campo) return false;

    campo.required = false;
    campo.removeAttribute("required");
    campo.setAttribute("aria-required", "false");
    campo.placeholder = "Opcional";

    const label = campo.closest("label");
    if (label && label.dataset.observacaoOpcional104 !== "1") {
      label.dataset.observacaoOpcional104 = "1";
      const primeiroNo = [...label.childNodes].find(no => no.nodeType === Node.TEXT_NODE && no.textContent.trim());
      if (primeiroNo) primeiroNo.textContent = "Observação (opcional)";
    }

    return true;
  }

  function aplicarDepois(atrasos = [0, 80, 250]) {
    atrasos.forEach(atraso => window.setTimeout(tornarOpcional, atraso));
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo?.closest("[data-chegada-corte], [data-editar-chegada-corte]")) return;
    aplicarDepois();
  }, true);

  document.addEventListener("submit", event => {
    if (event.target?.id !== "formChegadaCorte") return;
    tornarOpcional();
  }, true);

  function iniciar() {
    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      if (tornarOpcional() || tentativas >= 40) window.clearInterval(intervalo);
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
