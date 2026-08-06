(() => {
  "use strict";

  const VERSION = "2026-08-06-chegada-usuario-guard-131";
  if (window.__CORPONU_PENDENCIAS_VALOR_BOOTSTRAP__ === VERSION) return;
  window.__CORPONU_PENDENCIAS_VALOR_BOOTSTRAP__ = VERSION;

  function carregarScript(src, modulo, aoCarregar) {
    const existente = [...document.scripts].find(script => String(script.src || "").includes(src.replace("./", "")));
    if (existente) {
      aoCarregar?.();
      return existente;
    }
    const script = document.createElement("script");
    script.src = `${src}?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuModulo = modulo;
    script.onload = () => aoCarregar?.();
    script.onerror = () => console.error(`Não foi possível carregar o módulo ${modulo}.`);
    document.head.appendChild(script);
    return script;
  }

  // Rotina principal de aviso operacional, reenvio e confirmação administrativa.
  carregarScript(
    "./corponu-aviso-chegada-admin-130.js",
    "aviso-chegada-admin-130",
    () => carregarScript(
      "./corponu-chegada-usuario-guard-131.js",
      "chegada-usuario-guard-131"
    )
  );

  // Única rotina financeira da ALÇA: corrige somente documentos realmente sem
  // valor e não executa atualização geral de pagamentos.
  carregarScript(
    "./corponu-alca-pendencia-leve-126.js",
    "alca-pendencia-leve-126"
  );

  // LATERAL permanece com a rotina estável já validada.
  carregarScript(
    "./corponu-lateral-unificada-118-seguro.js",
    "lateral-unificada-118",
    () => carregarScript(
      "./corponu-pendencias-valor-seguro-117.js",
      "pendencias-valor-seguro-117"
    )
  );

  // A chegada manual mantém as facções ativas vinculadas ao processo.
  carregarScript(
    "./corponu-chegada-manual-faccoes-processo-119-seguro.js",
    "chegada-manual-faccoes-processo-119"
  );
})();
