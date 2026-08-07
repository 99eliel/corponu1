(() => {
  "use strict";

  const VERSION = "2026-08-07-chegada-badge-modulo-unico-154";
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

  // Mantém somente a contenção visual da tabela de Facções.
  carregarScript(
    "./corponu-faccoes-layout-141.js",
    "faccoes-layout-141"
  );

  // 154: um único responsável pela interface de aviso de chegada.
  // O módulo 130 já atende usuário comum e administrador, então o antigo 131
  // deixa de ser carregado para impedir que dois observers disputem a mesma
  // célula e criem avisos amarelos indefinidamente.
  carregarScript(
    "./corponu-chegada-estabilidade-132.js",
    "chegada-estabilidade-132",
    () => carregarScript(
      "./corponu-aviso-chegada-admin-130.js",
      "aviso-chegada-admin-130"
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
