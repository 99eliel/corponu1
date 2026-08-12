(() => {
  "use strict";

  const VERSION = "2026-08-12-interlock-ui-182";
  if (window.__CORPONU_INTERLOCK_UI_182__ === VERSION) return;
  window.__CORPONU_INTERLOCK_UI_182__ = VERSION;

  let observerFormulario = null;
  let formularioObservado = null;
  let observerSaida = null;
  let saidaObservada = null;
  let agendamentoFormulario = 0;
  let agendamentoSaida = 0;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  function agendarFormulario(atraso = 0) {
    window.clearTimeout(agendamentoFormulario);
    agendamentoFormulario = window.setTimeout(garantirInterlockFormularioFaccao, atraso);
  }

  function agendarSaida(atraso = 0) {
    window.clearTimeout(agendamentoSaida);
    agendamentoSaida = window.setTimeout(garantirInterlockSaida, atraso);
  }

  function garantirInterlockFormularioFaccao() {
    const destino = document.getElementById("gfp43FormGrupos");
    if (!destino) return;

    if (formularioObservado !== destino) {
      observerFormulario?.disconnect();
      formularioObservado = destino;
      observerFormulario = new MutationObserver(() => agendarFormulario(0));
      observerFormulario.observe(destino, { childList: true, subtree: true });
    }

    const existente = [...destino.querySelectorAll("[data-gfp43-processo]")]
      .find(input => normalizar(input.dataset.gfp43Processo) === "INTERLOCK");
    if (existente) return;

    const grupos = [...destino.querySelectorAll(".gfp43-form-grupo")];
    let grupoGerais = grupos.find(grupo =>
      normalizar(grupo.querySelector(":scope > strong")?.textContent) === "GERAIS"
    );

    if (!grupoGerais) {
      grupoGerais = document.createElement("div");
      grupoGerais.className = "gfp43-form-grupo";
      grupoGerais.innerHTML = '<strong>Gerais</strong><div class="gfp43-form-checks"></div>';
      destino.appendChild(grupoGerais);
    }

    const lista = grupoGerais.querySelector(".gfp43-form-checks") || grupoGerais;
    const label = document.createElement("label");
    label.className = "gfp43-form-check";
    label.innerHTML = '<input type="checkbox" data-gfp43-processo="INTERLOCK"><span>INTERLOCK</span>';
    lista.appendChild(label);
  }

  function tituloSaidaPermiteInterlock() {
    const titulo = normalizar(document.getElementById("s3titulo")?.textContent);
    if (!titulo) return true;
    return titulo.includes("SUTIA") || titulo.includes("CALCINHA");
  }

  function inserirOpcaoOrdenada(select) {
    if ([...select.options].some(option => normalizar(option.value || option.textContent) === "INTERLOCK")) return;

    const option = document.createElement("option");
    option.value = "INTERLOCK";
    option.textContent = "INTERLOCK";

    const candidatas = [...select.options].filter(item => String(item.value || "").trim());
    const antes = candidatas.find(item =>
      "INTERLOCK".localeCompare(String(item.textContent || item.value || ""), "pt-BR", { numeric: true }) < 0
    );
    if (antes) select.insertBefore(option, antes);
    else select.appendChild(option);
  }

  function garantirInterlockSaida() {
    const select = document.getElementById("s3processo");
    if (!(select instanceof HTMLSelectElement)) return;

    if (saidaObservada !== select) {
      observerSaida?.disconnect();
      saidaObservada = select;
      observerSaida = new MutationObserver(() => agendarSaida(0));
      observerSaida.observe(select, { childList: true });
    }

    if (!tituloSaidaPermiteInterlock()) return;
    inserirOpcaoOrdenada(select);
  }

  function prepararTudo() {
    garantirInterlockFormularioFaccao();
    garantirInterlockSaida();
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;

    const botaoEditar = alvo.closest("button[onclick*='editarFaccao'], [data-editar-faccao]");
    if (botaoEditar) {
      [0, 80, 220, 500, 900].forEach(atraso => window.setTimeout(garantirInterlockFormularioFaccao, atraso));
    }

    if (alvo.closest("#btnSaidaAbas, #s3buscar")) {
      [0, 80, 220, 500, 900, 1400].forEach(atraso => window.setTimeout(garantirInterlockSaida, atraso));
    }
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", prepararTudo, { once: true });
  } else {
    prepararTudo();
  }

  let tentativas = 0;
  const inicializador = window.setInterval(() => {
    prepararTudo();
    tentativas += 1;
    if (tentativas >= 24) window.clearInterval(inicializador);
  }, 250);
})();
