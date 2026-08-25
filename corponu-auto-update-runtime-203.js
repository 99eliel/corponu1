(() => {
  "use strict";

  const VERSION = "2026-08-25-runtime-compatibilidade-lazy-250";

  if (window.__CORPONU_AUTO_UPDATE_RUNTIME__ === VERSION) return;
  window.__CORPONU_AUTO_UPDATE_RUNTIME__ = VERSION;

  // A homologação do corpunuteste comprovou que o runtime 203 não deve
  // manter uma segunda rotina de atualização nem injetar módulos por conta própria.
  // Toda verificação de release e todo carregamento adicional ficam centralizados
  // em corponu-atualizador.js. Sem timers, sem document.write e sem scripts extras.
  console.info(`[CorpoNu] Runtime 203 em modo compatibilidade: ${VERSION}`);
})();
