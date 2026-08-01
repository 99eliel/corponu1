(() => {
  "use strict";

  const VERSION = "2026-08-01-chegada-confirmacao-botoes-73";
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

  carregar(
    "corponu-fluxo-faccao-unico.js",
    "fluxo-faccao-unico",
    "Não foi possível ativar o fluxo único de saída e chegada da facção."
  );

  carregar(
    "corponu-chegada-confirmacao-servico.js",
    "chegada-confirmacao-servico",
    "Não foi possível carregar os botões de confirmação do serviço recebido."
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
