(() => {
  "use strict";

  const VERSION = "2026-07-30-faccoes-sem-resumo-processos-28";
  if (window.__CORPONU_FACCOES_SEM_RESUMO_PROCESSOS__ === VERSION) return;
  window.__CORPONU_FACCOES_SEM_RESUMO_PROCESSOS__ = VERSION;

  const normalizar = valor => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  function encontrarBloco() {
    const painel = document.querySelector("#faccoes > .faccoes-operacional-panel");
    if (!painel) return null;

    const titulo = [...painel.querySelectorAll("h2, h3, h4, strong")]
      .find(elemento => normalizar(elemento.textContent) === "PROCESSOS DAS FACCOES");

    if (!titulo) return null;

    const seletorConhecido = titulo.closest(
      ".faccoes-processos-panel, .faccoes-processos-wrap, .processos-faccoes-panel, .processos-faccoes-wrap, section, article"
    );

    if (seletorConhecido && seletorConhecido !== painel) return seletorConhecido;

    let atual = titulo;
    while (atual.parentElement && atual.parentElement !== painel) {
      atual = atual.parentElement;
    }

    return atual !== titulo && atual.parentElement === painel ? atual : titulo.closest("div");
  }

  function removerBloco() {
    const bloco = encontrarBloco();
    if (!bloco) return;

    const texto = normalizar(bloco.textContent);
    const contemMovimentacoes = texto.includes("O QUE ESTA NAS FACCOES");
    const contemGerenciamento = texto.includes("GERENCIAR FACCOES");

    if (contemMovimentacoes || contemGerenciamento) {
      const titulo = [...bloco.querySelectorAll("h2, h3, h4, strong")]
        .find(elemento => normalizar(elemento.textContent) === "PROCESSOS DAS FACCOES");
      const subbloco = titulo?.closest(".panel-subsection, .section-card, .faccoes-processos-panel, .faccoes-processos-wrap, div");
      if (subbloco && subbloco !== bloco) subbloco.remove();
      return;
    }

    bloco.remove();
  }

  function iniciar() {
    removerBloco();

    const observer = new MutationObserver(removerBloco);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
