(() => {
  "use strict";

  // Arquivo de compatibilidade mantido apenas para navegadores que ainda tentem
  // carregar a versão antiga. A confirmação ativa está em
  // corponu-chegada-confirmacao-rapida.js.
  const VERSION = "2026-08-01-chegada-antiga-desativada-82";
  if (window.__CORPONU_CHEGADA_ANTIGA_DESATIVADA__ === VERSION) return;
  window.__CORPONU_CHEGADA_ANTIGA_DESATIVADA__ = VERSION;

  window.__CORPONU_CHEGADA_CORRECAO_79__ = "2026-08-01-chegada-correcao-processo-faccao-79";

  [
    "sf71ConfirmacaoServico",
    "sf73ConfirmacaoServico",
    "corponuConfirmacaoChegada75",
    "corponuChegadaConfirmacao76",
    "corponuConfirmacaoChegada77",
    "corponuConfirmacaoChegada78",
    "corponuConfirmacaoChegada79"
  ].forEach(id => document.getElementById(id)?.remove());
})();
