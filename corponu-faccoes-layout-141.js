(() => {
  "use strict";

  const VERSION = "2026-08-06-faccoes-layout-141";
  if (window.__CORPONU_FACCOES_LAYOUT_141__ === VERSION) return;
  window.__CORPONU_FACCOES_LAYOUT_141__ = VERSION;

  const STYLE_ID = "corponu-faccoes-layout-141-style";

  function instalarEstilos() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      html,
      body {
        max-width: 100%;
        overflow-x: hidden;
      }

      .app-shell {
        width: 100%;
        max-width: 100vw;
        min-width: 0;
        overflow-x: hidden;
      }

      .main {
        flex: 1 1 auto;
        min-width: 0;
        max-width: calc(100vw - 280px);
        overflow-x: hidden;
      }

      .page,
      .page.active,
      .panel {
        min-width: 0;
        max-width: 100%;
      }

      #faccoes {
        width: 100%;
        min-width: 0;
        max-width: 100%;
        overflow-x: hidden;
      }

      #faccoes .faccoes-operacional-panel,
      #faccoes .gerenciar-faccoes-panel,
      #faccoes .panel-subheader,
      #faccoes .processos-filters,
      #faccoes .faccoes-cards {
        min-width: 0;
        max-width: 100%;
      }

      #faccoes .table-wrap {
        display: block;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        overflow-x: auto;
        overflow-y: visible;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
      }

      #faccoes .faccoes-mov-table {
        width: max-content;
        min-width: 100% !important;
        max-width: none;
        table-layout: auto;
      }

      #faccoes .faccoes-mov-table th,
      #faccoes .faccoes-mov-table td {
        white-space: nowrap;
      }

      #faccoes .faccoes-mov-table th:last-child,
      #faccoes .faccoes-mov-table td:last-child {
        min-width: 280px !important;
        width: 320px;
        max-width: 380px;
        white-space: normal !important;
        overflow-wrap: anywhere;
        word-break: normal;
      }

      #faccoes .faccoes-mov-table td:last-child .btn {
        display: inline-flex;
        max-width: 100%;
        margin: 2px;
        white-space: normal;
        text-align: center;
        justify-content: center;
      }

      #faccoes [data-aviso-chegada-badge],
      #faccoes [data-chegada-aviso-131],
      #faccoes [data-aviso-reenvio-badge] {
        max-width: 230px !important;
        white-space: normal !important;
        overflow-wrap: anywhere;
        vertical-align: middle;
        line-height: 1.25;
      }

      #faccoes td.corponu-chegada-badge-principal [data-chegada-aviso-131] {
        display: none !important;
      }

      .app-shell.sidebar-collapsed .main {
        max-width: calc(100vw - 20px);
      }

      @media (max-width: 1920px) {
        .app-shell.sidebar-collapsed .main {
          max-width: calc(100vw - 18px);
        }
      }

      @media (max-width: 1700px) {
        .main {
          max-width: calc(100vw - 210px);
        }

        .app-shell.sidebar-collapsed .main {
          max-width: calc(100vw - 16px);
        }
      }

      @media (max-width: 780px) {
        .main,
        .app-shell.sidebar-collapsed .main {
          max-width: 100vw;
        }

        #faccoes .faccoes-mov-table th:last-child,
        #faccoes .faccoes-mov-table td:last-child {
          min-width: 240px !important;
          width: 260px;
          max-width: 300px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function marcarBadgeDuplicado() {
    const pagina = document.getElementById("faccoes");
    if (!pagina) return;

    pagina.querySelectorAll("td").forEach(celula => {
      const badgePrincipal = celula.querySelector("[data-aviso-chegada-badge]");
      const badgeGuard = celula.querySelector("[data-chegada-aviso-131]");
      celula.classList.toggle(
        "corponu-chegada-badge-principal",
        Boolean(badgePrincipal && badgeGuard)
      );
    });
  }

  let frame = 0;
  function agendarOrganizacao() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      marcarBadgeDuplicado();
    });
  }

  function iniciar() {
    instalarEstilos();
    marcarBadgeDuplicado();

    const pagina = document.getElementById("faccoes");
    if (!pagina) return;

    const observer = new MutationObserver(agendarOrganizacao);
    observer.observe(pagina, {
      childList: true,
      subtree: true
    });

    window.addEventListener("resize", agendarOrganizacao, { passive: true });
  }

  instalarEstilos();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
