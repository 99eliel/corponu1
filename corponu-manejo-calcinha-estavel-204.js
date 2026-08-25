(() => {
  "use strict";

  const VERSION = "2026-08-25-manejo-calcinha-layout-leve-242";
  const GUARD = "__CORPONU_MANEJO_CALCINHA_LAYOUT_LEVE_242__";
  const STYLE_ID = "corponuManejoCalcinhaLayout242Style";

  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  function calcinhaAtiva() {
    return document.querySelector(".page.active")?.id === "manejo" &&
      document.querySelector('#manejo .manejo-setor-btn.active[data-setor="calcinha"]') instanceof Element;
  }

  function sincronizarModo() {
    if (!document.body) return;
    if (calcinhaAtiva()) document.body.dataset.corponuManejoEstavel = "calcinha";
    else delete document.body.dataset.corponuManejoEstavel;
  }

  function instalarEstilo() {
    ["corponuManejoCalcinhaEstavel204Styles", "corponuManejoCalcinhaFluido205Styles"]
      .forEach(id => document.getElementById(id)?.remove());

    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body[data-corponu-manejo-estavel="calcinha"] #listaManejoInline tr[data-manejo-row="1"] > td:has(.silk-fields),
      body[data-corponu-manejo-estavel="calcinha"] #listaManejoInline tr[data-manejo-row="1"] > td:has(.tecido-fields){
        display:none!important;
        visibility:hidden!important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function iniciar() {
    instalarEstilo();
    sincronizarModo();

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo?.closest('.manejo-setor-btn[data-setor], .nav-btn[data-page]')) return;
      queueMicrotask(sincronizarModo);
    });
    window.addEventListener("pageshow", sincronizarModo);

    console.info(`[CorpoNu] Layout leve do Manejo Calcinha ativo: ${VERSION}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
