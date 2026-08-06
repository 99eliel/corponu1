(() => {
  "use strict";

  const VERSION = "2026-08-06-duplicidade-sem-data-133";
  if (window.__CORPONU_DUPLICIDADE_FILTROS_LOADER_133__ === VERSION) return;
  window.__CORPONU_DUPLICIDADE_FILTROS_LOADER_133__ = VERSION;

  document.getElementById("alertaPagamentosDuplicadosFiltrado113")?.remove();
  document.getElementById("stylePagamentosDuplicadosFiltrado113")?.remove();
  document.getElementById("corponuDuplicidadeFiltro127")?.remove();
  document.getElementById("corponuDuplicidadeFiltroStyle127")?.remove();

  function carregarScript(src, modulo, aoCarregar) {
    const existente = [...document.scripts].find(script =>
      String(script.src || "").includes(src.replace("./", ""))
    );
    if (existente) {
      aoCarregar?.();
      return;
    }
    const script = document.createElement("script");
    script.src = `${src}?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuModulo = modulo;
    script.onload = () => aoCarregar?.();
    script.onerror = () => console.error(`Não foi possível carregar o módulo ${modulo}.`);
    document.head.appendChild(script);
  }

  const restaurarObserver = () => {
    const restaurar = window.__restaurarMutationObserverDuplicidade133;
    if (typeof restaurar === "function") restaurar();
  };

  carregarScript(
    "./corponu-duplicidade-estabilidade-133.js",
    "duplicidade-estabilidade-133",
    () => carregarScript(
      "./corponu-pagamentos-duplicidade-sem-data-133.js",
      "pagamentos-duplicidade-sem-data-133",
      () => {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => setTimeout(restaurarObserver, 0), { once: true });
        } else {
          setTimeout(restaurarObserver, 0);
        }
      }
    )
  );
})();