(() => {
  "use strict";

  const VERSION = "2026-07-31-faccoes-label-lateral-48";

  if (window.__CORPONU_FACCOES_LABEL_LATERAL__ === VERSION) return;
  window.__CORPONU_FACCOES_LABEL_LATERAL__ = VERSION;

  const IDS_ALVOS = [
    "abaFaccaoCorte",
    "painelFaccoesCorte",
    "modalSaidaCorte",
    "modalChegadaCorte",
    "modalSelecionarChegadaCorte",
    "s3titulo"
  ];

  function trocarTextoVisivel(raiz) {
    if (!raiz) return;

    const walker = document.createTreeWalker(
      raiz,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(no) {
          const pai = no.parentElement;
          if (!pai) return NodeFilter.FILTER_REJECT;
          if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "OPTION"].includes(pai.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          return /\bCORTE\b|\bCorte\b/.test(no.nodeValue || "")
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const encontrados = [];
    while (walker.nextNode()) encontrados.push(walker.currentNode);

    encontrados.forEach(no => {
      no.nodeValue = String(no.nodeValue || "")
        .replace(/\bCORTE\b/g, "LATERAL")
        .replace(/\bCorte\b/g, "Lateral");
    });
  }

  function aplicarNomeLateral() {
    IDS_ALVOS.forEach(id => trocarTextoVisivel(document.getElementById(id)));

    document
      .querySelectorAll('#faccoes [data-area-faccoes="corte"]')
      .forEach(trocarTextoVisivel);
  }

  document.addEventListener("click", () => {
    window.setTimeout(aplicarNomeLateral, 0);
    window.setTimeout(aplicarNomeLateral, 120);
  }, true);

  let tentativas = 0;
  const intervalo = window.setInterval(() => {
    tentativas += 1;
    aplicarNomeLateral();
    if (tentativas >= 30) window.clearInterval(intervalo);
  }, 250);

  window.addEventListener("pageshow", aplicarNomeLateral);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aplicarNomeLateral, { once: true });
  } else {
    aplicarNomeLateral();
  }
})();
