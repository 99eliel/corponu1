(() => {
  "use strict";

  const VERSION = "2026-08-01-fluxo-saida-unico-70";
  window.__CORPONU_PAGAMENTOS_INTERFACE_FIX__ = VERSION;

  function carregar(nome, marcador, mensagemErro) {
    if ([...document.scripts].some(script => String(script.src || "").includes(nome))) return;
    const script = document.createElement("script");
    script.src = `./${nome}?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuModulo = marcador;
    script.onerror = () => console.error(mensagemErro);
    document.head.appendChild(script);
  }

  // Assume o fluxo próprio da aba Facções antes do módulo legado.
  // A saída usa ID determinístico e transação, e a chegada deixa de pedir
  // novamente processo e facção já registrados na saída.
  carregar(
    "corponu-fluxo-faccao-unico.js",
    "fluxo-faccao-unico",
    "Não foi possível ativar o fluxo único de saída e chegada da facção."
  );

  carregar(
    "corponu-saida-antiduplicidade.js",
    "saida-antiduplicidade",
    "Não foi possível ativar a proteção contra saídas duplicadas."
  );

  carregar(
    "corponu-pagamento-manual-antiduplicidade.js",
    "pagamento-manual-antiduplicidade",
    "Não foi possível ativar a verificação cruzada de duplicidade."
  );

  carregar(
    "corponu-financeiro-travas.js",
    "financeiro-travas-bootstrap",
    "Não foi possível ativar as travas financeiras."
  );

  carregar(
    "corponu-auditoria-financeira.js",
    "auditoria-financeira-bootstrap",
    "Não foi possível carregar a Conferência de integridade financeira."
  );
})();
