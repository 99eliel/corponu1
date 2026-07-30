(() => {
  "use strict";
  const VERSION = "2026-07-30-faccoes-tres-abas-saida-25";
  if (window.__CORPONU_FACCOES_CORTE_LOADER__ === VERSION) return;
  window.__CORPONU_FACCOES_CORTE_LOADER__ = VERSION;

  const parts = [
    "corponu-faccoes-corte-01.txt",
    "corponu-faccoes-corte-02.txt",
    "corponu-faccoes-corte-03.txt",
    "corponu-faccoes-corte-04.txt",
    "corponu-faccoes-corte-05.txt"
  ];

  function carregarCorrecaoTresAbas() {
    if ([...document.scripts].some(script => String(script.src || "").includes("corponu-faccoes-tres-abas-saida.js"))) return;
    const script = document.createElement("script");
    script.src = `./corponu-faccoes-tres-abas-saida.js?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuFaccoesTresAbas = VERSION;
    script.onerror = () => console.error("Não foi possível carregar a correção das três abas de Facções.");
    document.head.appendChild(script);
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