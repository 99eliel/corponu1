(() => {
  "use strict";

  const VERSION = "2026-08-25-pagamentos-rollback-233-243";
  const GUARD = "__CORPONU_PAGAMENTOS_ROLLBACK_233_243__";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  // A versão 233 substituía o fluxo nativo de Pagamentos por listeners globais,
  // transações próprias e uma migração automática do histórico. A partir da 243
  // este arquivo fica somente como compatibilidade para clientes que ainda
  // tenham o loader antigo em cache. Nenhuma leitura ou escrita no Firestore é feita aqui.
  window.__CORPONU_RESTANTES_PAGAMENTO_AUTOMATICO_233__ = "disabled-by-243";

  // Remove apenas resíduos visuais que a 233 podia ter criado antes da troca de release.
  document.getElementById("styleCorponuRestantesAutomatico233")?.remove();
  document.querySelectorAll(".corponu-233-valor-manual-restante").forEach(elemento => {
    elemento.classList.remove("corponu-233-valor-manual-restante");
  });

  const valorTotal = document.getElementById("restPagValorTotal");
  if (valorTotal) valorTotal.disabled = false;

  console.info(`[CorpoNu] Camada de Pagamentos 233 desativada; fluxo nativo restaurado: ${VERSION}`);
})();
