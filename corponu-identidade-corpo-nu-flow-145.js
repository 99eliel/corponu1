(() => {
  "use strict";

  const VERSION = "2026-08-07-corpo-nu-flow-identidade-145";
  const NOME = "Corpo Nu Flow";
  const SUBTITULO = "Sistema Integrado de Gestão da Produção";
  const LOGOS = [
    "https://i.imgur.com/xTyvuMa.png",
    "https://i.imgur.com/xTyvuMa.jpg",
    "https://i.imgur.com/xTyvuMa.jpeg"
  ];

  if (window.__CORPONU_IDENTIDADE_FLOW_145__ === VERSION) return;
  window.__CORPONU_IDENTIDADE_FLOW_145__ = VERSION;

  function configurarLogo(img) {
    if (!(img instanceof HTMLImageElement)) return;

    img.removeAttribute("onerror");
    img.alt = "Logo Corpo Nu Flow";
    img.dataset.corponuLogoFlow = VERSION;

    let indice = Number(img.dataset.corponuLogoTentativa || 0);
    if (!Number.isFinite(indice) || indice < 0 || indice >= LOGOS.length) indice = 0;

    img.onerror = () => {
      const proxima = Number(img.dataset.corponuLogoTentativa || 0) + 1;
      if (proxima >= LOGOS.length) return;
      img.dataset.corponuLogoTentativa = String(proxima);
      img.src = LOGOS[proxima];
    };

    const atual = String(img.currentSrc || img.src || "");
    if (!atual.includes("xTyvuMa")) {
      img.dataset.corponuLogoTentativa = "0";
      img.src = LOGOS[0];
    }
  }

  function configurarFavicon() {
    let link = document.querySelector('link[rel="icon"][data-corponu-flow="145"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.dataset.corponuFlow = "145";
      document.head.appendChild(link);
    }
    link.href = LOGOS[0];
  }

  function aplicarIdentidade() {
    if (document.title !== NOME) document.title = NOME;

    document.querySelectorAll(".brand").forEach(brand => {
      const titulo = brand.querySelector("h1");
      const descricao = brand.querySelector("p");
      const logo = brand.querySelector("img.brand-logo");

      if (titulo && titulo.textContent !== NOME) titulo.textContent = NOME;
      if (descricao && descricao.textContent !== SUBTITULO) descricao.textContent = SUBTITULO;
      configurarLogo(logo);
    });

    configurarFavicon();
  }

  function iniciar() {
    aplicarIdentidade();
    window.addEventListener("pageshow", aplicarIdentidade);

    const observer = new MutationObserver(registros => {
      const precisaReaplicar = registros.some(registro =>
        [...registro.addedNodes].some(node =>
          node instanceof Element && (node.matches?.(".brand") || node.querySelector?.(".brand"))
        )
      );
      if (precisaReaplicar) aplicarIdentidade();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
