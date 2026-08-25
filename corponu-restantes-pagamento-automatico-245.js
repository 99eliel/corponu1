(() => {
  "use strict";

  const VERSION = "2026-08-25-pagamentos-eventloop-248";

  // A recuperação estrutural da v247 já cumpriu a função de normalizar os
  // registros que impediam o Pagamentos nativo de renderizar. Na v248 este
  // arquivo permanece apenas por compatibilidade com o carregador antigo.
  // Não há leitura, listener, varredura ou escrita no Firestore.
  const executar = async () => undefined;

  window.CorpoNuPagamentosEstrutura247 = { versao: VERSION, executar };
  window.CorpoNuPagamentosRecuperacao246 = { versao: VERSION, executar };

  console.info("[CorpoNu 248] Recuperação estrutural encerrada; Pagamentos operando sem varredura automática.");
})();
