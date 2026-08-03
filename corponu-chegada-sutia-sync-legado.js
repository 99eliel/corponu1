(() => {
  "use strict";

  const VERSION = "2026-08-03-hotfix-chegada-sutia-componentes-109";
  const MODAL_PADRAO = "modalChegadaMovimentacao";
  const MODAL_MANUAL = "modalChegadaManualFaccao";
  const FORM_PADRAO = "formChegadaMovimentacao";
  const FORM_MANUAL = "formChegadaManualFaccao";

  if (window.__CORPONU_CHEGADA_SUTIA_SYNC_LEGADO_109__ === VERSION) return;
  window.__CORPONU_CHEGADA_SUTIA_SYNC_LEGADO_109__ = VERSION;

  let observer = null;
  let sincronizando = false;
  let timer = 0;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function estadoPorTexto(valor) {
    const chave = normalizar(valor);
    if (!chave || chave === "SELECIONE" || chave.includes("INFORME A SITUACAO")) return "";
    if (
      chave.includes("NAO INFORMAD") ||
      chave.includes("SEM INFORMACAO") ||
      chave === "INDEFINIDO" ||
      chave === "PENDENTE"
    ) return "nao_informado";
    if (
      chave === "SIM" || chave === "TRUE" || chave === "1" ||
      (chave.includes("PRONTA") && !chave.includes("NAO PRONTA")) ||
      (chave.includes("PRONTO") && !chave.includes("NAO PRONTO")) ||
      (chave.includes("FEITA") && !chave.includes("NAO FEITA")) ||
      (chave.includes("FEITO") && !chave.includes("NAO FEITO"))
    ) return "sim";
    if (
      chave === "NAO" || chave === "FALSE" || chave === "0" ||
      chave.includes("NAO PRONTA") || chave.includes("NAO PRONTO") ||
      chave.includes("NAO FEITA") || chave.includes("NAO FEITO")
    ) return "nao";
    return "";
  }

  function prefixoDoForm(form) {
    return form?.id === FORM_MANUAL ? "sc51m" : "sc51";
  }

  function painelDoForm(form) {
    return document.getElementById(
      form?.id === FORM_MANUAL
        ? "sutCompletoComponentesChegadaManual"
        : "sutCompletoComponentesChegada"
    );
  }

  function modalDoForm(form) {
    return document.getElementById(form?.id === FORM_MANUAL ? MODAL_MANUAL : MODAL_PADRAO);
  }

  function estadoDoPainel(form, componente) {
    const prefixo = prefixoDoForm(form);
    const titulo = componente === "lateral" ? "Lateral" : "Bojo";
    const select = document.getElementById(`${prefixo}${titulo}Situacao`);
    if (select instanceof HTMLSelectElement) {
      const option = select.options?.[select.selectedIndex];
      const estado = estadoPorTexto(`${select.value} ${option?.textContent || ""}`);
      if (estado === "sim" || estado === "nao") return estado;
    }

    const card = painelDoForm(form)?.querySelector(`[data-componente="${componente}"]`);
    if (!(card instanceof HTMLElement)) return "";
    if (card.querySelector(".sc51-pill.sim")) return "sim";
    if (card.querySelector(".sc51-pill.nao")) return "nao";
    const estado = estadoPorTexto(card.textContent);
    return estado === "sim" || estado === "nao" ? estado : "";
  }

  function pertenceAoComponente(elemento, componente) {
    if (!(elemento instanceof Element)) return false;
    const termo = componente === "lateral" ? "LATERAL" : "BOJO";
    const identidade = normalizar([
      elemento.id,
      elemento.getAttribute("name"),
      elemento.getAttribute("aria-label"),
      elemento.getAttribute("title"),
      elemento.getAttribute("placeholder"),
      elemento.dataset?.componente,
      elemento.closest("label")?.textContent,
      elemento.closest("[data-componente]")?.getAttribute("data-componente")
    ].join(" "));
    return identidade.includes(termo);
  }

  function optionParaEstado(select, estado) {
    return [...select.options].find(option =>
      estadoPorTexto(`${option.value} ${option.textContent || ""}`) === estado
    ) || null;
  }

  function aplicarEmSelect(select, estado) {
    if (!(select instanceof HTMLSelectElement) || !estado) return false;
    const option = optionParaEstado(select, estado);
    if (!option) return false;
    if (select.value === option.value) return true;
    select.value = option.value;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function aplicarEmRadio(input, estado) {
    if (!(input instanceof HTMLInputElement) || input.type !== "radio") return false;
    const estadoInput = estadoPorTexto(`${input.value} ${input.closest("label")?.textContent || ""}`);
    if (estadoInput !== estado) return false;
    if (!input.checked) {
      input.checked = true;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return true;
  }

  function sincronizarForm(form) {
    if (!(form instanceof HTMLFormElement) || sincronizando) return false;
    const painel = painelDoForm(form);
    const modal = modalDoForm(form);
    if (!(painel instanceof HTMLElement) || !(modal instanceof HTMLElement)) return false;

    const lateral = estadoDoPainel(form, "lateral");
    const bojo = estadoDoPainel(form, "bojo");
    if (!lateral && !bojo) return false;

    sincronizando = true;
    try {
      const estados = { lateral, bojo };
      Object.entries(estados).forEach(([componente, estado]) => {
        if (!estado) return;

        modal.querySelectorAll("select").forEach(select => {
          if (!pertenceAoComponente(select, componente)) return;
          aplicarEmSelect(select, estado);
        });

        modal.querySelectorAll('input[type="radio"]').forEach(input => {
          if (!pertenceAoComponente(input, componente)) return;
          aplicarEmRadio(input, estado);
        });

        const prefixo = prefixoDoForm(form);
        form.dataset[`cn109${componente === "lateral" ? "Lateral" : "Bojo"}`] = estado;
        painel.dataset[`cn109${componente}`] = estado;

        const selectPrincipal = document.getElementById(
          `${prefixo}${componente === "lateral" ? "Lateral" : "Bojo"}Situacao`
        );
        if (selectPrincipal instanceof HTMLSelectElement) aplicarEmSelect(selectPrincipal, estado);
      });

      form.dataset.cn109ComponentesSincronizados = "1";
      return true;
    } finally {
      sincronizando = false;
    }
  }

  function sincronizarTodos() {
    sincronizarForm(document.getElementById(FORM_PADRAO));
    sincronizarForm(document.getElementById(FORM_MANUAL));
  }

  function agendar(atraso = 0) {
    window.clearTimeout(timer);
    timer = window.setTimeout(sincronizarTodos, atraso);
  }

  function instalarEventos() {
    ["pointerdown", "mousedown", "touchstart", "click"].forEach(tipo => {
      document.addEventListener(tipo, event => {
        const alvo = event.target instanceof Element ? event.target : null;
        const submit = alvo?.closest('button[type="submit"],input[type="submit"]');
        const form = submit?.form;
        if (form?.id === FORM_PADRAO || form?.id === FORM_MANUAL) sincronizarForm(form);
      }, true);
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      const form = event.target instanceof Element ? event.target.closest("form") : null;
      if (form?.id === FORM_PADRAO || form?.id === FORM_MANUAL) sincronizarForm(form);
    }, true);

    document.addEventListener("change", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      const form = alvo?.closest("form");
      if (form?.id === FORM_PADRAO || form?.id === FORM_MANUAL) agendar(0);
    }, true);

    document.addEventListener("submit", event => {
      const form = event.target;
      if (form?.id === FORM_PADRAO || form?.id === FORM_MANUAL) sincronizarForm(form);
    }, true);
  }

  function instalarObserver() {
    if (observer) return;
    observer = new MutationObserver(mudancas => {
      const relevante = mudancas.some(mudanca => {
        const alvo = mudanca.target instanceof Element ? mudanca.target : mudanca.target?.parentElement;
        return alvo?.closest?.(`#${MODAL_PADRAO},#${MODAL_MANUAL}`) ||
          [...mudanca.addedNodes].some(node => node instanceof Element && (
            node.id === "sutCompletoComponentesChegada" ||
            node.id === "sutCompletoComponentesChegadaManual" ||
            node.querySelector?.("#sutCompletoComponentesChegada,#sutCompletoComponentesChegadaManual")
          ));
      });
      if (relevante) agendar(20);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function iniciar() {
    instalarEventos();
    instalarObserver();
    [0, 80, 200, 500, 1000].forEach(atraso => window.setTimeout(sincronizarTodos, atraso));
  }

  window.CorpoNuChegadaSutiaSyncLegado = {
    versao: VERSION,
    sincronizar: sincronizarTodos
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
