(() => {
  "use strict";
  const VERSION = "2026-07-30-faccoes-corte-integracao-segura-24";
  if (window.__CORPONU_FACCOES_CORTE_LOADER__ === VERSION) return;
  window.__CORPONU_FACCOES_CORTE_LOADER__ = VERSION;

  const parts = [
    "corponu-faccoes-corte-01.txt",
    "corponu-faccoes-corte-02.txt",
    "corponu-faccoes-corte-03.txt",
    "corponu-faccoes-corte-04.txt",
    "corponu-faccoes-corte-05.txt"
  ];

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
    script.onload = () => URL.revokeObjectURL(url);
    script.onerror = () => {
      URL.revokeObjectURL(url);
      console.error("Não foi possível iniciar a área Corte das facções.");
    };
    document.head.appendChild(script);
  }).catch(error => console.error("Não foi possível carregar a área Corte das facções.", error));
})();
