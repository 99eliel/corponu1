(() => {
  "use strict";

  const VERSION = "2026-07-30-revisao-saida-restaurada-22";
  const PAGINA = "revisaoComponentes";
  const NAV = "revisao-componentes";
  const MODULO = "corponu-revisao-lateral-bojo.js";

  if (window.__CORPONU_FIX_REVISAO_SAIDA__ === VERSION) return;
  window.__CORPONU_FIX_REVISAO_SAIDA__ = VERSION;

  let carregandoModulo = false;
  let moduloCarregadoNestaVersao = false;

  function paginasNormais() {
    return [...document.querySelectorAll("#appShell main.main > .page")]
      .filter(secao => secao.id !== PAGINA);
  }

  function restaurarPaginasNormais() {
    paginasNormais().forEach(secao => {
      secao.classList.remove("hidden");
      secao.hidden = false;
      secao.style.removeProperty("display");
    });
  }

  function esconderPaginaRevisao() {
    const pagina = document.getElementById(PAGINA);
    if (!pagina) return;

    pagina.classList.remove("active");
    pagina.classList.add("hidden");
    pagina.hidden = false;
    pagina.style.removeProperty("display");
  }

  function mostrarAviso(mensagem) {
    const toastPrincipal = document.getElementById("toast");
    if (toastPrincipal) {
      toastPrincipal.textContent = mensagem;
      toastPrincipal.classList.remove("hidden");
      clearTimeout(window.__corponuRevSaidaToast);
      window.__corponuRevSaidaToast = setTimeout(() => toastPrincipal.classList.add("hidden"), 5000);
      return;
    }

    let aviso = document.getElementById("toastRevisaoSaida");
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.id = "toastRevisaoSaida";
      aviso.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:100010;background:#991b1b;color:#fff;padding:12px 14px;border-radius:12px;font:800 13px/1.4 Arial;box-shadow:0 12px 30px #0f172a44";
      document.body.appendChild(aviso);
    }
    aviso.textContent = mensagem;
    clearTimeout(aviso._timer);
    aviso._timer = setTimeout(() => aviso.remove(), 5000);
  }

  function abrirPaginaRevisao() {
    const pagina = document.getElementById(PAGINA);
    if (!pagina) return false;

    restaurarPaginasNormais();

    document.querySelectorAll("#appShell main.main > .page").forEach(secao => {
      secao.classList.remove("active");
    });

    pagina.classList.remove("hidden");
    pagina.classList.add("active");
    pagina.hidden = false;
    pagina.style.removeProperty("display");

    document.querySelectorAll("#appShell .sidebar .nav-btn").forEach(botao => {
      botao.classList.remove("active");
    });
    document.querySelector(`#appShell .sidebar [data-page="${NAV}"]`)?.classList.add("active");

    const titulo = document.getElementById("pageTitle");
    const subtitulo = document.getElementById("pageSubtitle");
    if (titulo) titulo.textContent = "Revisão lateral e bojo";
    if (subtitulo) subtitulo.textContent = "Componentes feitos pela confecção e descontos nos pagamentos pendentes.";

    Promise.resolve(window.CorpoNuRevisaoComponentes?.carregarConfig?.()).catch(() => {});
    setTimeout(() => document.getElementById("revNumeroOP")?.focus(), 50);
    return true;
  }

  function carregarModulo() {
    if (carregandoModulo) return;
    if (moduloCarregadoNestaVersao && document.getElementById(PAGINA)) return;

    carregandoModulo = true;
    moduloCarregadoNestaVersao = true;

    window.__CORPONU_REVISAO_COMPONENTES__ = null;
    delete document.documentElement.dataset.eventosRevisaoComponentes;

    ["formRevisaoComponentes", "formConfigRev", "buscaRevLista", "btnAtualizarRev"].forEach(id => {
      document.getElementById(id)?.removeAttribute("data-rev");
    });

    const script = document.createElement("script");
    script.src = `./${MODULO}?fix=${encodeURIComponent(VERSION)}&t=${Date.now()}`;
    script.async = false;
    script.dataset.corponuRevisaoSaida = VERSION;
    script.onload = () => {
      carregandoModulo = false;
      document.documentElement.dataset.revisaoTelaPronta = VERSION;
      restaurarPaginasNormais();
      if (document.querySelector(`[data-page="${NAV}"]`)?.classList.contains("active")) {
        abrirPaginaRevisao();
      }
    };
    script.onerror = () => {
      carregandoModulo = false;
      moduloCarregadoNestaVersao = false;
      mostrarAviso("Não foi possível carregar a área Revisão lateral e bojo.");
    };
    document.head.appendChild(script);
  }

  function preparar() {
    restaurarPaginasNormais();
    carregarModulo();
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    const botao = alvo?.closest("#appShell .sidebar .nav-btn[data-page]");
    if (!botao) return;

    const paginaDestino = String(botao.dataset.page || "");

    if (paginaDestino === NAV) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (abrirPaginaRevisao()) return;

      carregarModulo();
      let tentativas = 0;
      const espera = setInterval(() => {
        tentativas += 1;
        if (abrirPaginaRevisao() || tentativas >= 30) {
          clearInterval(espera);
          if (tentativas >= 30 && !document.getElementById(PAGINA)) {
            mostrarAviso("A área de revisão não terminou de carregar. Atualize a página e tente novamente.");
          }
        }
      }, 100);
      return;
    }

    // Ao sair da revisão, devolve as páginas antigas ao estado esperado pelo app.js.
    // O menu original continuará o clique normalmente e ativará a tela escolhida.
    restaurarPaginasNormais();
    esconderPaginaRevisao();

    const paginaNormal = document.getElementById(paginaDestino);
    if (paginaNormal) {
      paginaNormal.classList.remove("hidden");
      paginaNormal.hidden = false;
      paginaNormal.style.removeProperty("display");
    }

    // Confirma a restauração depois que todos os outros listeners terminarem.
    setTimeout(() => {
      restaurarPaginasNormais();
      esconderPaginaRevisao();
      const destino = document.getElementById(paginaDestino);
      if (destino) {
        destino.classList.remove("hidden");
        destino.hidden = false;
        destino.style.removeProperty("display");
      }
    }, 0);
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", preparar, { once: true });
  } else {
    preparar();
  }

  window.addEventListener("pageshow", () => {
    const navAtiva = document.querySelector("#appShell .sidebar .nav-btn.active")?.dataset.page;
    if (navAtiva !== NAV) {
      restaurarPaginasNormais();
      esconderPaginaRevisao();
    }
  });
})();