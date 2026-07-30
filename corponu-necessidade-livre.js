(() => {
  "use strict";

  const VERSION = "2026-07-30-necessidade-manejo-texto-livre-14";
  if (window.__CORPONU_NECESSIDADE_LIVRE__ === VERSION) return;
  window.__CORPONU_NECESSIDADE_LIVRE__ = VERSION;

  const SELETOR_CAMPOS = [
    "#ordemNecessidadeTexto",
    "[id^='manejoNec-']"
  ].join(",");

  function copiarAtributosParaInput(origem, destino) {
    [...origem.attributes].forEach(atributo => {
      if (["type", "list", "multiple", "size"].includes(atributo.name)) return;
      destino.setAttribute(atributo.name, atributo.value);
    });
  }

  function converterSelectEmTexto(select) {
    const input = document.createElement("input");
    copiarAtributosParaInput(select, input);
    input.type = "text";
    input.value = select.value || "";
    input.disabled = select.disabled;
    input.required = select.required;
    input.readOnly = select.hasAttribute("readonly");
    input.placeholder = select.getAttribute("placeholder") || "Digite qualquer necessidade...";
    input.autocomplete = "off";
    input.setAttribute("aria-label", select.getAttribute("aria-label") || "Necessidade em texto livre");
    select.replaceWith(input);
    return input;
  }

  function liberarCampo(campo) {
    if (!campo || campo.dataset.necessidadeLivre === VERSION) return;

    let input = campo;
    if (campo.tagName === "SELECT") {
      input = converterSelectEmTexto(campo);
    }

    if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLTextAreaElement)) return;

    if (input instanceof HTMLInputElement) {
      input.type = "text";
      input.removeAttribute("list");
      input.removeAttribute("pattern");
      input.removeAttribute("min");
      input.removeAttribute("max");
      input.removeAttribute("step");
      input.inputMode = "text";
    }

    input.autocomplete = "off";
    input.dataset.necessidadeLivre = VERSION;
    input.title = "Campo livre: digite qualquer necessidade e salve normalmente.";

    if (!input.placeholder || /selecione|sugest/i.test(input.placeholder)) {
      input.placeholder = "Digite qualquer necessidade...";
    }
  }

  function aplicar(root = document) {
    if (root instanceof Element && root.matches(SELETOR_CAMPOS)) {
      liberarCampo(root);
    }

    if (typeof root.querySelectorAll === "function") {
      root.querySelectorAll(SELETOR_CAMPOS).forEach(liberarCampo);
    }
  }

  function iniciar() {
    aplicar(document);

    const observer = new MutationObserver(mutacoes => {
      mutacoes.forEach(mutacao => {
        mutacao.addedNodes.forEach(node => {
          if (node instanceof Element) aplicar(node);
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    document.addEventListener("click", event => {
      const botao = event.target.closest("button, [role='button']");
      if (!botao) return;

      const acao = `${botao.id || ""} ${botao.getAttribute("onclick") || ""} ${botao.textContent || ""}`;
      if (/manejo|editar|salvar/i.test(acao)) {
        setTimeout(() => aplicar(document), 0);
        setTimeout(() => aplicar(document), 120);
      }
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
