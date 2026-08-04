(() => {
  "use strict";

  const VERSION = "2026-08-04-alca-pagamento-automatico-121";
  if (window.__CORPONU_PENDENCIAS_VALOR_BOOTSTRAP__ === VERSION) return;
  window.__CORPONU_PENDENCIAS_VALOR_BOOTSTRAP__ = VERSION;

  function carregarScript(src, modulo, aoCarregar) {
    const script = document.createElement("script");
    script.src = `${src}?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuModulo = modulo;
    script.onload = () => aoCarregar?.();
    script.onerror = () => console.error(`Não foi possível carregar o módulo ${modulo}.`);
    document.head.appendChild(script);
  }

  // Todo pagamento de ALÇA usa a regra fixa: quantidade de sutiãs × 2 × R$ 0,05.
  // O módulo acompanha somente documentos de ALÇA e corrige o lançamento assim que
  // ele é criado, sem consultar pagamentos de outros processos.
  carregarScript(
    "./corponu-alca-pagamento-automatico-121.js",
    "alca-pagamento-automatico-121"
  );

  // Mantém o painel de cadastro do valor global da ALÇA sem a varredura geral antiga.
  carregarScript(
    "./corponu-alca-valor-seguro-120.js",
    "alca-valor-seguro-120"
  );

  // O módulo específico de LATERAL precisa ser registrado primeiro para
  // impedir que a rotina geral use o setor legado "corte".
  carregarScript(
    "./corponu-lateral-unificada-118-seguro.js",
    "lateral-unificada-118",
    () => carregarScript(
      "./corponu-pendencias-valor-seguro-117.js",
      "pendencias-valor-seguro-117"
    )
  );

  // A chegada manual passa a consultar as mesmas facções ativas por processo
  // usadas na saída manual, sem depender das listas antigas fixas.
  carregarScript(
    "./corponu-chegada-manual-faccoes-processo-119-seguro.js",
    "chegada-manual-faccoes-processo-119"
  );
})();
