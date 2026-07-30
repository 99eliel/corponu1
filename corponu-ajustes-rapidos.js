(() => {
  "use strict";

  if (window.CorpoNuAjustesRapidos) return;

  const ajustes = new Map();
  let observador = null;
  let quadroAgendado = 0;
  let iniciado = false;

  function normalizar(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function paginaAtiva() {
    return document.querySelector(".page.active")?.id || "";
  }

  function executarAjuste(nome) {
    const ajuste = ajustes.get(nome);
    if (!ajuste) return;

    try {
      ajuste.executar(api);
    } catch (error) {
      console.error(`[CorpoNu modo rápido] Falha no ajuste ${nome}.`, error);
    }
  }

  function aplicarTodos() {
    quadroAgendado = 0;
    ajustes.forEach((_, nome) => executarAjuste(nome));
  }

  function agendarAplicacao() {
    if (quadroAgendado) return;
    quadroAgendado = window.requestAnimationFrame(aplicarTodos);
  }

  function precisaObservarDom() {
    return [...ajustes.values()].some(ajuste => ajuste.observarDom === true);
  }

  function atualizarObservador() {
    if (!document.body) return;

    if (!precisaObservarDom()) {
      observador?.disconnect();
      observador = null;
      return;
    }

    if (observador) return;

    observador = new MutationObserver(agendarAplicacao);
    observador.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function registrar(nome, executar, opcoes = {}) {
    const identificador = String(nome || "").trim();
    if (!identificador) throw new Error("O ajuste precisa ter um nome.");
    if (typeof executar !== "function") throw new Error(`O ajuste ${identificador} precisa ser uma função.`);

    ajustes.set(identificador, {
      executar,
      observarDom: opcoes.observarDom === true
    });

    atualizarObservador();
    if (iniciado) agendarAplicacao();

    return () => remover(identificador);
  }

  function remover(nome) {
    ajustes.delete(String(nome || "").trim());
    atualizarObservador();
  }

  function aplicar(nome) {
    executarAjuste(String(nome || "").trim());
  }

  function quandoElemento(seletor, opcoes = {}) {
    const limite = Math.max(100, Number(opcoes.timeout || 5000));
    const inicio = Date.now();

    return new Promise((resolve, reject) => {
      function procurar() {
        const elemento = document.querySelector(seletor);
        if (elemento) {
          resolve(elemento);
          return;
        }

        if (Date.now() - inicio >= limite) {
          reject(new Error(`Elemento não encontrado: ${seletor}`));
          return;
        }

        window.setTimeout(procurar, 80);
      }

      procurar();
    });
  }

  const api = Object.freeze({
    registrar,
    remover,
    aplicar,
    aplicarTodos: agendarAplicacao,
    normalizar,
    paginaAtiva,
    quandoElemento
  });

  window.CorpoNuAjustesRapidos = api;
  document.documentElement.dataset.corponuModoRapido = "ativo";

  function iniciar() {
    iniciado = true;
    atualizarObservador();
    agendarAplicacao();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }

  // ÁREA DE AJUSTES RÁPIDOS
  // As mini mudanças futuras serão registradas abaixo com:
  // api.registrar("nome-do-ajuste", () => { ... }, { observarDom: true });
  // Todo ajuste deve ser idempotente: executá-lo mais de uma vez não pode duplicar elementos ou eventos.
})();
