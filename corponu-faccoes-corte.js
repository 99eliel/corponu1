(() => {
  "use strict";
  const VERSION = "2026-07-30-faccoes-sem-resumo-processos-28";
  if (window.__CORPONU_FACCOES_CORTE_LOADER__ === VERSION) return;
  window.__CORPONU_FACCOES_CORTE_LOADER__ = VERSION;

  const parts = [
    "corponu-faccoes-corte-01.txt",
    "corponu-faccoes-corte-02.txt",
    "corponu-faccoes-corte-03.txt",
    "corponu-faccoes-corte-04.txt",
    "corponu-faccoes-corte-05.txt"
  ];

  function carregarScript(nomeArquivo, marcador, mensagemErro, aoCarregar) {
    const existente = [...document.scripts].find(script => String(script.src || "").includes(nomeArquivo));
    if (existente) {
      aoCarregar?.();
      return existente;
    }

    const script = document.createElement("script");
    script.src = `./${nomeArquivo}?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuModulo = marcador;
    script.onload = () => aoCarregar?.();
    script.onerror = () => console.error(mensagemErro);
    document.head.appendChild(script);
    return script;
  }

  function carregarAjustesFinais() {
    carregarScript(
      "corponu-faccoes-corte-sem-gerenciamento.js",
      "faccoes-corte-sem-gerenciamento",
      "Não foi possível remover o gerenciamento duplicado da aba Corte."
    );

    carregarScript(
      "corponu-faccoes-processos-cadastrados.js",
      "faccoes-processos-cadastrados",
      "Não foi possível carregar os processos cadastrados no registro de saída."
    );

    carregarScript(
      "corponu-faccoes-sem-resumo-processos.js",
      "faccoes-sem-resumo-processos",
      "Não foi possível remover o resumo de processos da tela de Facções."
    );
  }

  function carregarCorrecaoTresAbas() {
    carregarScript(
      "corponu-faccoes-tres-abas-saida.js",
      "faccoes-tres-abas-saida",
      "Não foi possível carregar a correção das três abas de Facções.",
      carregarAjustesFinais
    );
  }

  Promise.all(parts.map(name => fetch(`./${name}?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`, { cache: "no-store" }).then(response => {
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    return response.text();
  }))).then(chunks => {
    const blob = new Blob([chunks.join("")], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const script = document.createElement("script");
    script.src = url;
    script.async = false;
    script.dataset.corponuFaccoesCorte = VERSION;
    script.onload = () => {
      URL.revokeObjectURL(url);
      carregarCorrecaoTresAbas();
    };
    script.onerror = () => {
      URL.revokeObjectURL(url);
      console.error("Não foi possível iniciar a área Corte das facções.");
    };
    document.head.appendChild(script);
  }).catch(error => console.error("Não foi possível carregar a área Corte das facções.", error));
})();
