(() => {
  "use strict";

  const VERSION = "2026-08-03-sutia-completo-fallbacks-off-107";
  const PROCESSO_COMPLETO = "SUTIÃ COMPLETO";
  const FORM_MANUAL = "formChegadaManualFaccao";

  if (window.__CORPONU_SUTIA_FALLBACKS_OFF_107__ === VERSION) return;
  window.__CORPONU_SUTIA_FALLBACKS_OFF_107__ = VERSION;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function ehSutiaCompleto(form) {
    if (!(form instanceof HTMLFormElement)) return false;
    if (form.id === FORM_MANUAL) {
      return normalizar(document.getElementById("chegadaManualProcesso")?.value) === normalizar(PROCESSO_COMPLETO);
    }
    if (form.id === "formChegadaMovimentacao") {
      return Boolean(document.getElementById("sutCompletoComponentesChegada"));
    }
    return false;
  }

  function garantirLiberacaoChegadaManual() {
    if (window.__CORPONU_REQUEST_SUBMIT_MANUAL_COMPAT_107__) return;
    const anterior = HTMLFormElement.prototype.requestSubmit;
    if (typeof anterior !== "function") return;

    window.__CORPONU_REQUEST_SUBMIT_MANUAL_COMPAT_107__ = true;
    HTMLFormElement.prototype.requestSubmit = function(submitter) {
      if (this.id === FORM_MANUAL && ehSutiaCompleto(this)) {
        this.dataset.cnChegadaManualMov86Liberada = "1";
      }
      return anterior.call(this, submitter);
    };
  }

  function instalarProtecao(event) {
    const form = event.target;
    if (!ehSutiaCompleto(form) || window.CorpoNuSutiaChegadaRapida?.fluxoRapidoAtivo !== true) return;

    const anterior = window.setTimeout;
    let restaurado = false;

    function restaurar() {
      if (restaurado) return;
      restaurado = true;
      if (window.setTimeout === protegido) window.setTimeout = anterior;
    }

    function protegido(callback, atraso, ...args) {
      const fonte = typeof callback === "function" ? Function.prototype.toString.call(callback) : "";
      const tempo = Number(atraso || 0);
      const fallbackManual = tempo >= 6500 && fonte.includes("executarFallback");
      const correcaoEspecial = [250, 750, 1600, 3200].includes(tempo) && fonte.includes("aplicarAssinatura");

      if (fallbackManual || correcaoEspecial) return 0;
      return anterior.call(window, callback, atraso, ...args);
    }

    window.setTimeout = protegido;
    queueMicrotask(restaurar);
  }

  garantirLiberacaoChegadaManual();
  document.addEventListener("submit", instalarProtecao, true);
})();
