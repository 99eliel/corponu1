(() => {
  "use strict";

  const VERSION = "2026-08-01-faccao-cadastro-recolhido-62";
  const FORM_ID = "formFaccao";
  const BOTAO_ABRIR_ID = "btnAbrirCadastroFaccao";
  const BOTAO_CANCELAR_ID = "btnCancelarFaccao";
  const CLASSE_FECHADO = "cn62-faccao-form-fechado";

  if (window.__CORPONU_FACCAO_CADASTRO_RECOLHIDO__ === VERSION) return;
  window.__CORPONU_FACCAO_CADASTRO_RECOLHIDO__ = VERSION;

  let formularioAberto = false;
  let tentativas = 0;
  let intervalo = null;

  function injetarEstilo() {
    if (document.getElementById("styleFaccaoCadastroRecolhido62")) return;
    const style = document.createElement("style");
    style.id = "styleFaccaoCadastroRecolhido62";
    style.textContent = `
      #${FORM_ID}.${CLASSE_FECHADO}{display:none!important}
      #${FORM_ID}:not(.${CLASSE_FECHADO}){animation:cn62AbrirFaccao .18s ease-out}
      @keyframes cn62AbrirFaccao{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
    `;
    document.head.appendChild(style);
  }

  function formulario() {
    return document.getElementById(FORM_ID);
  }

  function fechar({ limpar = false } = {}) {
    const form = formulario();
    if (!form) return false;
    formularioAberto = false;
    form.classList.add(CLASSE_FECHADO, "hidden");
    form.setAttribute("aria-hidden", "true");
    if (limpar) {
      try { form.reset(); } catch (_) {}
      const id = document.getElementById("faccaoId");
      if (id) id.value = "";
    }
    return true;
  }

  function abrir({ edicao = false } = {}) {
    const form = formulario();
    if (!form) return false;
    formularioAberto = true;
    form.classList.remove(CLASSE_FECHADO, "hidden");
    form.setAttribute("aria-hidden", "false");
    form.dataset.cn62Modo = edicao ? "edicao" : "cadastro";
    window.setTimeout(() => document.getElementById("faccaoNome")?.focus(), 40);
    return true;
  }

  function preparar() {
    injetarEstilo();
    const form = formulario();
    if (!form) return false;

    if (form.dataset.cn62Preparado !== "1") {
      form.dataset.cn62Preparado = "1";
      fechar();

      form.addEventListener("reset", () => {
        window.setTimeout(() => fechar(), 0);
      });

      form.addEventListener("submit", () => {
        // O salvamento principal continua responsável por validar e gravar.
        // Após o fluxo concluir, o formulário volta a ficar recolhido.
        [500, 1200, 2500].forEach(atraso => window.setTimeout(() => {
          const id = String(document.getElementById("faccaoId")?.value || "").trim();
          const nome = String(document.getElementById("faccaoNome")?.value || "").trim();
          if (!id && !nome) fechar();
        }, atraso));
      });
    }

    const abrirCadastro = document.getElementById(BOTAO_ABRIR_ID);
    if (abrirCadastro && abrirCadastro.dataset.cn62Preparado !== "1") {
      abrirCadastro.dataset.cn62Preparado = "1";
      abrirCadastro.addEventListener("click", () => {
        window.setTimeout(() => abrir({ edicao: false }), 0);
      });
    }

    const cancelar = document.getElementById(BOTAO_CANCELAR_ID);
    if (cancelar && cancelar.dataset.cn62Preparado !== "1") {
      cancelar.dataset.cn62Preparado = "1";
      cancelar.addEventListener("click", () => {
        window.setTimeout(() => fechar({ limpar: true }), 0);
      });
    }

    return true;
  }

  function instalarEventosGlobais() {
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      if (alvo.closest(`#${BOTAO_ABRIR_ID}`)) {
        window.setTimeout(() => abrir({ edicao: false }), 0);
        return;
      }

      const editar = alvo.closest('[onclick*="editarFaccao"],[data-editar-faccao]');
      if (editar) {
        window.setTimeout(() => abrir({ edicao: true }), 80);
        return;
      }

      const navegacao = alvo.closest('.nav-btn[data-page]');
      if (navegacao && navegacao.dataset.page !== "faccoes") {
        fechar();
      }
    }, true);

    document.addEventListener("corponu:faccao-salva", () => fechar({ limpar: true }));
  }

  function iniciar() {
    instalarEventosGlobais();
    preparar();

    intervalo = window.setInterval(() => {
      tentativas += 1;
      const pronto = preparar();
      if (pronto || tentativas >= 30) {
        window.clearInterval(intervalo);
        intervalo = null;
      }
    }, 300);

    window.addEventListener("pageshow", () => {
      preparar();
      if (!formularioAberto) fechar();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
