(() => {
  "use strict";

  const VERSION = "2026-08-25-manejo-calcinha-rollback-seguro-235";
  const GUARD = "__CORPONU_MANEJO_CALCINHA_ROLLBACK_SEGURO_235__";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  // Compatibilidade com as versões 231/232: este arquivo continua existindo
  // para evitar 404/cache antigo, mas não envolve mais salvarManejoLinha e não
  // bloqueia a renderização do Manejo. O fluxo efetivo volta ao conjunto 223+230,
  // que já havia sido validado antes da introdução das camadas antipisca.
  const lock = window.__CORPONU_MANEJO_CALCINHA_RENDER_LOCK_232__;
  if (lock && typeof lock === "object") {
    lock.ativo = false;
    lock.contador = 0;
    lock.pendente = false;
    lock.inicio = 0;
    if (lock.ordens instanceof Set) lock.ordens.clear();
  }

  // Limpa qualquer resíduo visual deixado pela versão 231 em uma navegação
  // reaproveitada pelo navegador.
  document.querySelectorAll('[data-corponu-antipisca-calcinha231="1"]').forEach(item => item.remove());
  const tabela = document.getElementById("listaManejoInline")?.closest("table");
  if (tabela instanceof HTMLElement && tabela.style.visibility === "hidden") {
    tabela.style.visibility = "";
  }

  console.info(`[CorpoNu] Manejo Calcinha restaurado ao fluxo estável 223+230: ${VERSION}`);
})();
