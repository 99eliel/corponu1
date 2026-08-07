(() => {
  "use strict";

  const VERSION = "2026-08-07-sutia-completo-envio-sem-componentes-150";
  const PAINEL_ANTIGO_ID = "reenvioSutiaComponentes106";
  const FORM_ID = "formMovimentacaoProducao";

  if (window.__CORPONU_REENVIO_SUTIA_COMPONENTES__ === VERSION) return;
  window.__CORPONU_REENVIO_SUTIA_COMPONENTES__ = VERSION;

  function limparTravaAntiga() {
    // A confirmação de Lateral/Bojo não pertence mais ao momento da saída.
    // Se essas informações ainda não existirem, a chegada do Sutiã Completo
    // ficará responsável por perguntar e registrar o que estiver faltando.
    document.getElementById(PAINEL_ANTIGO_ID)?.remove();

    const form = document.getElementById(FORM_ID);
    if (form) {
      delete form.dataset.reenvioComponentesBypass106;
      form.removeAttribute("data-componentes-pendentes");
      form.removeAttribute("data-componentes-obrigatorios");
    }
  }

  function iniciar() {
    limparTravaAntiga();

    // O modal é reutilizado pelo sistema. Sempre que abrir ou trocar conteúdo,
    // removemos somente vestígios visuais da regra antiga. Nenhum evento de
    // submit é interceptado nesta versão, portanto o envio original segue livre.
    const modal = document.getElementById("modalMovimentacao");
    if (modal) {
      const observer = new MutationObserver(limparTravaAntiga);
      observer.observe(modal, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"]
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
