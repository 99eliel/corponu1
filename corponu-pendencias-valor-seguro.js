(() => {
  "use strict";

  const VERSION = "2026-08-04-alca-botao-direto-124";
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

  // Assume exclusivamente o botão e o valor fixo da ALÇA. O botão deixa de
  // submeter o formulário antigo e aplica R$ 0,05 diretamente nos pagamentos.
  carregarScript(
    "./corponu-alca-botao-direto-124.js",
    "alca-botao-direto-124"
  );

  // Mantém a chegada normal de ALÇA já gravando o pagamento correto.
  carregarScript(
    "./corponu-alca-chegada-direta-123.js",
    "alca-chegada-direta-123"
  );

  // Mantém a recuperação segura para chegadas manuais e pendências anteriores.
  carregarScript(
    "./corponu-alca-origem-segura-122.js",
    "alca-origem-segura-122"
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
