(() => {
  "use strict";

  const VERSION = "2026-08-01-antiduplicidade-cruzada-68";
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

  // Carrega primeiro a validação cruzada. Ela precisa interceptar o
  // lançamento manual antes dos módulos que calculam e salvam o pagamento.
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
