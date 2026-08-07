(() => {
  "use strict";

  const VERSION = "2026-08-07-faccoes-sem-bipar-156";
  const STYLE_ID = "corponu-faccoes-sem-bipar-156-style";

  if (window.__CORPONU_FACCOES_SEM_BIPAR_156__ === VERSION) return;
  window.__CORPONU_FACCOES_SEM_BIPAR_156__ = VERSION;

  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #faccoes button[onclick*="biparMovimentacao"],
    #faccoes .btn-bipado {
      display: none !important;
    }
  `;

  document.head.appendChild(style);
})();
