(() => {
  "use strict";

  const VERSION = "2026-08-01-chegada-sem-componentes-duplicados-58";
  const MODAL_ID = "modalChegadaMovimentacao";
  const PAINEL_CORRETO_ID = "sutCompletoComponentesChegada";
  const CLASSE_OCULTA = "cn58-componentes-duplicados";

  if (window.__CORPONU_CHEGADA_SEM_COMPONENTES_DUPLICADOS__ === VERSION) return;
  window.__CORPONU_CHEGADA_SEM_COMPONENTES_DUPLICADOS__ = VERSION;

  let observadorModal = null;
  let sincronizando = false;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function injetarEstilo() {
    if (document.getElementById("styleChegadaSemDuplicidade58")) return;
    const style = document.createElement("style");
    style.id = "styleChegadaSemDuplicidade58";
    style.textContent = `
      #${MODAL_ID} .${CLASSE_OCULTA}{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function estadoPorTexto(valor) {
    const texto = normalizar(valor);
    if (!texto || texto === "SELECIONE" || texto.includes("INFORME A SITUACAO")) return "";

    if (
      texto === "SIM" ||
      texto === "TRUE" ||
      texto === "1" ||
      (texto.includes("PRONTA") && !texto.includes("NAO PRONTA")) ||
      (texto.includes("FEITA") && !texto.includes("NAO FEITA"))
    ) return "sim";

    if (
      texto === "NAO" ||
      texto === "FALSE" ||
      texto === "0" ||
      texto.includes("NAO PRONTA") ||
      texto.includes("NAO FEITA")
    ) return "nao";

    return "";
  }

  function estadoDoPainelCorreto(tipo) {
    const nome = tipo === "lateral" ? "Lateral" : "Bojo";
    const select = document.getElementById(`sc51${nome}Situacao`);
    if (select instanceof HTMLSelectElement) {
      const option = select.options?.[select.selectedIndex];
      const estado = estadoPorTexto(`${select.value} ${option?.textContent || ""}`);
      if (estado) return estado;
    }

    const painel = document.getElementById(PAINEL_CORRETO_ID);
    const card = painel?.querySelector(`.sc51-componente[data-componente="${tipo}"]`);
    if (!card) return "";

    if (card.querySelector(".sc51-pill.sim")) return "sim";
    if (card.querySelector(".sc51-pill.nao")) return "nao";
    return estadoPorTexto(card.textContent);
  }

  function localizarTituloDuplicado(modal) {
    const candidatos = [...modal.querySelectorAll("h1,h2,h3,h4,h5,strong,b,span,div")]
      .filter(elemento => normalizar(elemento.textContent).includes("CONFIRME OS COMPONENTES DO SUTIA"));

    candidatos.sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length);
    return candidatos[0] || null;
  }

  function localizarBlocoDuplicado(modal) {
    const titulo = localizarTituloDuplicado(modal);
    if (!titulo) return null;

    let atual = titulo;
    for (let nivel = 0; atual && atual !== modal && nivel < 7; nivel += 1, atual = atual.parentElement) {
      const texto = normalizar(atual.textContent);
      const temLateral = texto.includes("LATERAL FOI PRONTA");
      const temBojo = texto.includes("BOJO FOI PRONTO");
      const selects = atual.querySelectorAll("select");
      if (temLateral && temBojo && selects.length >= 2) return atual;
    }

    return titulo.parentElement;
  }

  function selectDoComponente(bloco, tipo) {
    const trecho = tipo === "lateral" ? "LATERAL FOI PRONTA" : "BOJO FOI PRONTO";
    const label = [...bloco.querySelectorAll("label")]
      .find(item => normalizar(item.textContent).includes(trecho));
    if (label?.querySelector("select")) return label.querySelector("select");

    const selects = [...bloco.querySelectorAll("select")];
    return tipo === "lateral" ? (selects[0] || null) : (selects[1] || null);
  }

  function aplicarEstadoNoSelect(select, estado) {
    if (!(select instanceof HTMLSelectElement) || !estado) return;

    const correspondente = [...select.options].find(option => {
      const opcao = estadoPorTexto(`${option.value} ${option.textContent || ""}`);
      return opcao === estado;
    });

    if (!correspondente || select.value === correspondente.value) return;
    select.value = correspondente.value;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function prepararBlocoDuplicado() {
    if (sincronizando) return false;
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return false;

    const bloco = localizarBlocoDuplicado(modal);
    if (!bloco) return false;

    sincronizando = true;
    try {
      const lateral = selectDoComponente(bloco, "lateral");
      const bojo = selectDoComponente(bloco, "bojo");

      aplicarEstadoNoSelect(lateral, estadoDoPainelCorreto("lateral"));
      aplicarEstadoNoSelect(bojo, estadoDoPainelCorreto("bojo"));

      bloco.classList.add(CLASSE_OCULTA);
      bloco.setAttribute("aria-hidden", "true");
      bloco.querySelectorAll("select,input,button,textarea").forEach(campo => {
        campo.required = false;
        campo.removeAttribute("required");
        campo.tabIndex = -1;
      });
      return true;
    } finally {
      sincronizando = false;
    }
  }

  function sincronizarSemRecriar() {
    const modal = document.getElementById(MODAL_ID);
    const bloco = modal ? localizarBlocoDuplicado(modal) : null;
    if (!bloco) return prepararBlocoDuplicado();

    sincronizando = true;
    try {
      aplicarEstadoNoSelect(selectDoComponente(bloco, "lateral"), estadoDoPainelCorreto("lateral"));
      aplicarEstadoNoSelect(selectDoComponente(bloco, "bojo"), estadoDoPainelCorreto("bojo"));
      bloco.classList.add(CLASSE_OCULTA);
      return true;
    } finally {
      sincronizando = false;
    }
  }

  function observarModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.dataset.semDuplicidade58 === "1") return Boolean(modal);

    modal.dataset.semDuplicidade58 = "1";
    observadorModal?.disconnect();
    observadorModal = new MutationObserver(() => {
      if (sincronizando || modal.classList.contains("hidden")) return;
      window.setTimeout(prepararBlocoDuplicado, 0);
    });
    observadorModal.observe(modal, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
    return true;
  }

  function instalarEventos() {
    document.addEventListener("change", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      if (alvo.matches("#sc51LateralSituacao,#sc51BojoSituacao") || alvo.closest(`#${PAINEL_CORRETO_ID}`)) {
        window.setTimeout(sincronizarSemRecriar, 0);
      }
    }, true);

    document.addEventListener("input", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (alvo?.matches("#sc51LateralSituacao,#sc51BojoSituacao")) {
        window.setTimeout(sincronizarSemRecriar, 0);
      }
    }, true);

    document.addEventListener("submit", event => {
      if (event.target?.id !== "formChegadaMovimentacao") return;
      sincronizarSemRecriar();
    }, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;
      const abreChegada = alvo.closest('[onclick*="registrarChegadaMovimentacao"],button[data-chegada],button[data-registrar-chegada]');
      if (!abreChegada) return;
      [60, 180, 450, 900].forEach(atraso => window.setTimeout(prepararBlocoDuplicado, atraso));
    }, true);
  }

  function iniciar() {
    injetarEstilo();
    instalarEventos();

    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      observarModal();
      prepararBlocoDuplicado();
      if (tentativas >= 30) window.clearInterval(intervalo);
    }, 300);

    window.addEventListener("pageshow", () => {
      observarModal();
      prepararBlocoDuplicado();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
