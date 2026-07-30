(() => {
  "use strict";

  const VERSION = "2026-07-30-revisao-lateral-bojo-18";
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

  function normalizarPesquisa(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  }

  function injetarCorrecaoPesquisaFiltros() {
    if (document.getElementById("corponuCorrecaoPesquisaFiltrosManejo")) return;

    const style = document.createElement("style");
    style.id = "corponuCorrecaoPesquisaFiltrosManejo";
    style.textContent = `
      .popup-filtro-excel-manejo .filtro-excel-opcao[hidden],
      .popup-filtro-excel-manejo .filtro-excel-opcao.filtro-excel-pesquisa-oculta {
        display: none !important;
      }
      .popup-filtro-excel-manejo .filtro-excel-vazio-pesquisa {
        padding: 18px 10px;
        text-align: center;
        color: #64748b;
        font-size: 13px;
      }
    `;
    document.head.appendChild(style);
  }

  function atualizarSelecionarTudoPesquisa(popup) {
    const caixasVisiveis = [...popup.querySelectorAll('.filtro-excel-opcao input[type="checkbox"]')]
      .filter(input => !input.closest(".filtro-excel-opcao")?.hidden);
    const selecionarTudo = popup.querySelector("#filtroExcelSelecionarTodos");
    if (!selecionarTudo) return;

    const marcadas = caixasVisiveis.filter(input => input.checked).length;
    selecionarTudo.checked = caixasVisiveis.length > 0 && marcadas === caixasVisiveis.length;
    selecionarTudo.indeterminate = marcadas > 0 && marcadas < caixasVisiveis.length;
  }

  function filtrarOpcoesDoPopup(campoBusca) {
    const popup = campoBusca.closest("#popupFiltroExcelManejo, .popup-filtro-excel-manejo");
    if (!popup) return;

    const termo = normalizarPesquisa(campoBusca.value);
    const opcoes = [...popup.querySelectorAll(".filtro-excel-opcao")];
    let quantidadeVisivel = 0;

    opcoes.forEach(opcao => {
      const texto = normalizarPesquisa(opcao.dataset.valor || opcao.textContent);
      const ocultar = Boolean(termo && !texto.includes(termo));
      opcao.hidden = ocultar;
      opcao.classList.toggle("filtro-excel-pesquisa-oculta", ocultar);
      if (!ocultar) quantidadeVisivel += 1;
    });

    const lista = popup.querySelector(".filtro-excel-lista");
    if (lista) {
      let aviso = lista.querySelector(".filtro-excel-vazio-pesquisa");
      if (termo && quantidadeVisivel === 0) {
        if (!aviso) {
          aviso = document.createElement("div");
          aviso.className = "filtro-excel-vazio-pesquisa";
          aviso.textContent = "Nenhuma opção encontrada para esta pesquisa.";
          lista.appendChild(aviso);
        }
        aviso.hidden = false;
      } else if (aviso) {
        aviso.hidden = true;
      }
    }

    atualizarSelecionarTudoPesquisa(popup);
  }

  function aplicar(root = document) {
    if (root instanceof Element && root.matches(SELETOR_CAMPOS)) {
      liberarCampo(root);
    }

    if (typeof root.querySelectorAll === "function") {
      root.querySelectorAll(SELETOR_CAMPOS).forEach(liberarCampo);
    }
  }

  function carregarRevisaoLateralBojo() {
    if (document.querySelector('script[data-corponu-revisao-lateral-bojo="1"]')) return;
    const script = document.createElement("script");
    script.src = `./corponu-revisao-lateral-bojo.js?v=${encodeURIComponent(VERSION)}`;
    script.dataset.corponuRevisaoLateralBojo = "1";
    script.async = false;
    document.head.appendChild(script);
  }

  function iniciar() {
    carregarRevisaoLateralBojo();
    injetarCorrecaoPesquisaFiltros();
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

    document.addEventListener("input", event => {
      if (!(event.target instanceof Element)) return;
      if (event.target.matches(".filtro-excel-busca")) {
        filtrarOpcoesDoPopup(event.target);
      }
    }, true);

    document.addEventListener("click", event => {
      if (!(event.target instanceof Element)) return;
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
