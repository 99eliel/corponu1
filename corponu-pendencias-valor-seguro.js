(() => {
  "use strict";

  const VERSION = "2026-08-04-alca-origem-segura-122";
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

  // Corrige a ALÇA no próprio pagamento criado pela chegada, preservando o ID
  // e usando sempre 2 alças de R$ 0,05 por sutiã. Não usa listener do Firestore.
  carregarScript(
    "./corponu-alca-origem-segura-122.js",
    "alca-origem-segura-122"
  );

  // O valor global da ALÇA é salvo por uma rotina isolada que consulta somente
  // pagamentos de ALÇA e não executa a varredura geral que travava o sistema.
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
