(() => {
  "use strict";

  const VERSION = "2026-08-08-manejo-filtro-lateral-posicao-170";
  const POPUP_ID = "popupFiltroFaseLateral163";
  const BOTAO_SELECTOR = ".btn-filtro-lateral-163";

  if (window.__CORPONU_MANEJO_FILTRO_LATERAL_POSICAO_170__ === VERSION) return;
  window.__CORPONU_MANEJO_FILTRO_LATERAL_POSICAO_170__ = VERSION;

  let botaoAncora = null;
  let raf = 0;

  function popupAtual() {
    return document.getElementById(POPUP_ID);
  }

  function botaoVisivel(botao) {
    if (!botao || !botao.isConnected) return false;
    const rect = botao.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
  }

  function posicionar() {
    const popup = popupAtual();
    if (!popup) return;

    if (!botaoAncora || !botaoAncora.isConnected) {
      botaoAncora = document.querySelector(`${BOTAO_SELECTOR}:focus`) || document.querySelector(BOTAO_SELECTOR);
    }

    if (!botaoVisivel(botaoAncora)) {
      popup.remove();
      botaoAncora = null;
      return;
    }

    const rect = botaoAncora.getBoundingClientRect();
    const margem = 10;
    const distancia = 7;
    const largura = Math.min(360, Math.max(280, window.innerWidth - (margem * 2)));

    popup.style.setProperty("position", "fixed", "important");
    popup.style.setProperty("width", `${largura}px`, "important");
    popup.style.setProperty("max-width", `calc(100vw - ${margem * 2}px)`, "important");
    popup.style.setProperty("max-height", `calc(100vh - ${margem * 2}px)`, "important");
    popup.style.setProperty("z-index", "100000", "important");
    popup.style.setProperty("transform", "none", "important");

    const altura = Math.min(
      popup.getBoundingClientRect().height || popup.scrollHeight || 360,
      window.innerHeight - (margem * 2)
    );

    let left = rect.right - largura;
    left = Math.max(margem, Math.min(left, window.innerWidth - largura - margem));

    const espacoAbaixo = window.innerHeight - rect.bottom - margem;
    const espacoAcima = rect.top - margem;
    let top;

    if (espacoAbaixo >= altura || espacoAbaixo >= espacoAcima) {
      top = rect.bottom + distancia;
      if (top + altura > window.innerHeight - margem) {
        top = Math.max(margem, window.innerHeight - altura - margem);
      }
    } else {
      top = rect.top - altura - distancia;
      if (top < margem) top = margem;
    }

    popup.style.setProperty("left", `${Math.round(left)}px`, "important");
    popup.style.setProperty("top", `${Math.round(top)}px`, "important");
  }

  function agendarPosicao() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(posicionar);
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    const botao = alvo?.closest(BOTAO_SELECTOR);
    if (!botao) return;
    botaoAncora = botao;
    requestAnimationFrame(() => {
      posicionar();
      setTimeout(posicionar, 30);
    });
  }, true);

  // Captura tanto a rolagem da página quanto a rolagem horizontal da tabela.
  window.addEventListener("scroll", agendarPosicao, true);
  window.addEventListener("resize", agendarPosicao, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("scroll", agendarPosicao, { passive: true });
    window.visualViewport.addEventListener("resize", agendarPosicao, { passive: true });
  }

  const observer = new MutationObserver(() => {
    if (popupAtual()) agendarPosicao();
  });
  observer.observe(document.body, { childList: true });
})();
