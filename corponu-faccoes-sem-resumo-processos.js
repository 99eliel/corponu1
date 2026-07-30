(() => {
  "use strict";

  const VERSION = "2026-07-30-faccoes-sem-bloco-processos-29";
  if (window.__CORPONU_FACCOES_SEM_RESUMO_PROCESSOS__ === VERSION) return;
  window.__CORPONU_FACCOES_SEM_RESUMO_PROCESSOS__ = VERSION;

  const normalizar = valor => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  function painelFaccoes() {
    return document.querySelector("#faccoes > .faccoes-operacional-panel");
  }

  function encontrarCabecalhoMovimentacoes(painel) {
    const pelaBusca = document.getElementById("buscaFaccaoMovimentacoes")?.closest(".panel-subheader");
    if (pelaBusca && painel.contains(pelaBusca)) return pelaBusca;

    const titulo = [...painel.querySelectorAll("h2, h3, h4, strong")]
      .find(elemento => normalizar(elemento.textContent) === "O QUE ESTA NAS FACCOES");

    return titulo?.closest(".panel-subheader") || titulo?.parentElement || null;
  }

  function encontrarCardsResumo(painel) {
    const peloIndicador = document.getElementById("faccoesPecasDefeito")
      ?.closest(".faccoes-cards");

    if (peloIndicador && painel.contains(peloIndicador)) return peloIndicador;
    return painel.querySelector(":scope > .faccoes-cards");
  }

  function removerEntreCardsETabela() {
    const painel = painelFaccoes();
    if (!painel) return false;

    const cards = encontrarCardsResumo(painel);
    const cabecalho = encontrarCabecalhoMovimentacoes(painel);

    if (!cards || !cabecalho || cards.parentElement !== cabecalho.parentElement) return false;

    let atual = cards.nextElementSibling;
    let removeu = false;

    while (atual && atual !== cabecalho) {
      const proximo = atual.nextElementSibling;
      atual.remove();
      atual = proximo;
      removeu = true;
    }

    return removeu;
  }

  function removerPorConteudoComoReserva() {
    const painel = painelFaccoes();
    if (!painel) return;

    const candidatos = [...painel.querySelectorAll("div, section, article")]
      .filter(elemento => {
        const texto = normalizar(elemento.textContent);
        return texto.includes("QUEM REALIZA ESTE PROCESSO") &&
          texto.includes("GERENCIAR FACCOES") &&
          !texto.includes("O QUE ESTA NAS FACCOES");
      })
      .sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length);

    candidatos[0]?.remove();
  }

  function removerBloco() {
    if (!removerEntreCardsETabela()) removerPorConteudoComoReserva();
  }

  function iniciar() {
    removerBloco();
    setTimeout(removerBloco, 100);
    setTimeout(removerBloco, 500);

    const observer = new MutationObserver(removerBloco);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();