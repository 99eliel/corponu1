(() => {
  "use strict";

  const VERSION = "2026-08-07-faccoes-sem-bipar-156";
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

  // 156 remove somente o botão Bipar da aba Facções por CSS. Não usa observer,
  // não altera movimentações e não interfere na bipagem disponível em outras telas.
  carregarScript(
    "./corponu-faccoes-sem-bipar-156.js",
    "faccoes-sem-bipar-156"
  );

  // Um único responsável pela interface e dados do aviso de chegada.
  // Depois dele, a 155 apenas restaura o rótulo "Informar chegada" e protege
  // cliques em linhas que ainda tenham nascido com o botão legado "Chegada".
  // A 155 não usa MutationObserver, intervalo nem recriação de elementos.
  carregarScript(
    "./corponu-chegada-estabilidade-132.js",
    "chegada-estabilidade-132",
    () => carregarScript(
      "./corponu-aviso-chegada-admin-130.js",
      "aviso-chegada-admin-130",
      () => carregarScript(
        "./corponu-chegada-informar-155.js",
        "informar-chegada-estavel-155"
      )
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
