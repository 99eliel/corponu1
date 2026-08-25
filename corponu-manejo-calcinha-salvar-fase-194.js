(() => {
  "use strict";

  const VERSION = "2026-08-24-fase-calcinha-antipisca-231";
  const DATALIST_FASES_CALCINHA = "manejoFasesListCalcinha";
  const SNAPSHOT_ATTR = "corponuAntipiscaCalcinha231";

  if (window.__CORPONU_MANEJO_CALCINHA_SALVAR_FASE_231__ === VERSION) return;
  window.__CORPONU_MANEJO_CALCINHA_SALVAR_FASE_231__ = VERSION;

  let instalado = false;

  function calcinhaAtiva() {
    return document.querySelector("#manejo .manejo-setor-btn.active")?.dataset?.setor === "calcinha";
  }

  function normalizarComparacao(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function localizarLinha(orderId) {
    const id = String(orderId || "");
    if (!id) return null;

    return [...document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")].find(row => {
      const botao = row.querySelector(".btn-save-manejo");
      const onclick = String(botao?.getAttribute("onclick") || "");
      return onclick.includes(`salvarManejoLinha('${id}')`) || onclick.includes(`salvarManejoLinha(\"${id}\")`);
    }) || null;
  }

  function campoFaseDaLinha(orderId) {
    return localizarLinha(orderId)?.querySelector('input[id$="-fase"]') || null;
  }

  function fasesPermitidasCalcinha() {
    const datalist = document.getElementById(DATALIST_FASES_CALCINHA);
    if (!datalist) return [];

    const mapa = new Map();
    datalist.querySelectorAll("option").forEach(option => {
      const fase = String(option.value || option.textContent || "").trim();
      const chave = normalizarComparacao(fase);
      if (fase && chave && !mapa.has(chave)) mapa.set(chave, fase);
    });
    return [...mapa.entries()].map(([chave, fase]) => ({ chave, fase }));
  }

  function faseOficialDaLinha(orderId) {
    const campo = campoFaseDaLinha(orderId);
    const digitada = String(campo?.value || "").trim();
    const datalist = document.getElementById(DATALIST_FASES_CALCINHA);
    const permitidas = fasesPermitidasCalcinha();

    if (!digitada) {
      return {
        campo,
        digitada: "",
        oficial: "",
        listaDisponivel: Boolean(datalist),
        listaCarregada: permitidas.length > 0
      };
    }

    const chaveDigitada = normalizarComparacao(digitada);
    const encontrada = permitidas.find(item => item.chave === chaveDigitada);

    return {
      campo,
      digitada,
      oficial: encontrada?.fase || "",
      listaDisponivel: Boolean(datalist),
      listaCarregada: permitidas.length > 0
    };
  }

  function mostrarAviso(mensagem) {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = mensagem;
      toast.classList.remove("hidden");
      window.clearTimeout(window.__faseCalcinha231Toast);
      window.__faseCalcinha231Toast = window.setTimeout(() => toast.classList.add("hidden"), 6500);
      return;
    }
    window.alert(mensagem);
  }

  function propagarMarca(destino, origem, nome) {
    if (!origem?.[nome]) return;
    try {
      Object.defineProperty(destino, nome, {
        value: true,
        configurable: false,
        enumerable: false
      });
    } catch (_) {
      try { destino[nome] = true; } catch (_) {}
    }
  }

  function removerIdsEEventosDoClone(clone) {
    [clone, ...clone.querySelectorAll("*")].forEach(elemento => {
      elemento.removeAttribute?.("id");
      elemento.removeAttribute?.("onclick");
      elemento.removeAttribute?.("onchange");
      elemento.removeAttribute?.("oninput");
      elemento.removeAttribute?.("tabindex");
    });
  }

  function tabelaManejoAtual() {
    return document.getElementById("listaManejoInline")?.closest("table") || null;
  }

  function congelarTabelaManejo() {
    const tabela = tabelaManejoAtual();
    if (!(tabela instanceof HTMLElement)) return null;

    const wrapper = tabela.closest(".table-wrap") || tabela.parentElement;
    if (!(wrapper instanceof HTMLElement)) return null;

    wrapper.querySelectorAll(`[data-${SNAPSHOT_ATTR.replace(/[A-Z]/g, letra => `-${letra.toLowerCase()}`)}="1"]`).forEach(item => item.remove());

    const tabelaRect = tabela.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    if (!tabelaRect.width || !tabelaRect.height) return null;

    const clone = tabela.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return null;

    removerIdsEEventosDoClone(clone);
    clone.dataset[SNAPSHOT_ATTR] = "1";
    clone.setAttribute("aria-hidden", "true");

    const posicaoCalculada = window.getComputedStyle(wrapper).position;
    const posicaoInlineAnterior = wrapper.style.position;
    const alterouPosicao = posicaoCalculada === "static";
    if (alterouPosicao) wrapper.style.position = "relative";

    const left = tabelaRect.left - wrapperRect.left + wrapper.scrollLeft;
    const top = tabelaRect.top - wrapperRect.top + wrapper.scrollTop;

    Object.assign(clone.style, {
      position: "absolute",
      left: `${left}px`,
      top: `${top}px`,
      width: `${tabelaRect.width}px`,
      minWidth: `${tabelaRect.width}px`,
      height: `${tabelaRect.height}px`,
      margin: "0",
      pointerEvents: "none",
      userSelect: "none",
      zIndex: "2147482000",
      visibility: "visible"
    });

    const visibilidadeAnterior = tabela.style.visibility;
    tabela.style.visibility = "hidden";
    wrapper.appendChild(clone);

    const esconderTabelaNova = () => {
      const atual = tabelaManejoAtual();
      if (atual instanceof HTMLElement && atual !== clone) {
        atual.style.visibility = "hidden";
      }
    };

    const observador = new MutationObserver(esconderTabelaNova);
    observador.observe(wrapper, { childList: true, subtree: true });

    return {
      wrapper,
      clone,
      tabela,
      visibilidadeAnterior,
      posicaoInlineAnterior,
      alterouPosicao,
      observador
    };
  }

  function esperarQuadrosFinais() {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.setTimeout(resolve, 60);
        });
      });
    });
  }

  async function liberarTabelaManejo(congelamento) {
    if (!congelamento) return;

    await esperarQuadrosFinais();
    congelamento.observador?.disconnect?.();

    const tabelaAtual = tabelaManejoAtual();
    if (tabelaAtual instanceof HTMLElement) {
      tabelaAtual.style.visibility = "";
    }

    if (congelamento.tabela?.isConnected) {
      congelamento.tabela.style.visibility = congelamento.visibilidadeAnterior || "";
    }

    congelamento.clone?.remove?.();

    if (congelamento.alterouPosicao && congelamento.wrapper?.isConnected) {
      congelamento.wrapper.style.position = congelamento.posicaoInlineAnterior || "";
    }
  }

  function instalarProtecao() {
    if (instalado) return true;
    const atual = window.salvarManejoLinha;
    if (typeof atual !== "function") return false;

    if (atual.__corponuFaseCalcinhaValidacaoCoordenada230 === true) {
      instalado = true;
      return true;
    }

    const original = atual;

    async function salvarManejoLinhaComFaseCalcinhaValidada231(orderId) {
      let deveCongelar = false;

      if (calcinhaAtiva()) {
        const validacao = faseOficialDaLinha(orderId);

        if (!validacao.listaDisponivel) {
          mostrarAviso("A lista oficial de fases da Calcinha ainda está carregando. Aguarde um instante e tente salvar novamente.");
          return false;
        }

        if (!validacao.listaCarregada) {
          mostrarAviso("Nenhuma fase oficial está cadastrada para a Calcinha. Peça ao administrador para cadastrar as opções antes de salvar.");
          return false;
        }

        if (!validacao.digitada) {
          mostrarAviso("Selecione uma fase oficial da Calcinha antes de salvar.");
          return false;
        }

        if (!validacao.oficial) {
          mostrarAviso(`A fase \"${String(validacao.digitada).toUpperCase()}\" não pertence à lista oficial da Calcinha. Escolha uma das opções cadastradas pelo administrador.`);
          return false;
        }

        if (validacao.campo) {
          validacao.campo.value = validacao.oficial;
          validacao.campo.setAttribute("list", DATALIST_FASES_CALCINHA);
        }
        deveCongelar = true;
      }

      const congelamento = deveCongelar ? congelarTabelaManejo() : null;
      try {
        // A gravação permanece exatamente no fluxo validado da 230/223.
        // Esta versão apenas mantém uma cópia visual da tabela enquanto os
        // snapshots do Firestore reconstruem o DOM por baixo.
        return await original.apply(this, arguments);
      } finally {
        if (congelamento) await liberarTabelaManejo(congelamento);
      }
    }

    Object.defineProperty(salvarManejoLinhaComFaseCalcinhaValidada231, "__corponuFaseCalcinhaValidacaoCoordenada230", {
      value: true,
      configurable: false,
      enumerable: false
    });
    Object.defineProperty(salvarManejoLinhaComFaseCalcinhaValidada231, "__corponuFaseCalcinhaAntipisca231", {
      value: true,
      configurable: false,
      enumerable: false
    });

    propagarMarca(salvarManejoLinhaComFaseCalcinhaValidada231, original, "__corponuFaseCalcinhaSemPiscar223");
    propagarMarca(salvarManejoLinhaComFaseCalcinhaValidada231, original, "__corponuCalcinhaFluido205");

    window.salvarManejoLinha = salvarManejoLinhaComFaseCalcinhaValidada231;
    instalado = true;
    return true;
  }

  function iniciar() {
    window.setTimeout(instalarProtecao, 2200);
    window.setTimeout(() => {
      if (!instalado) instalarProtecao();
    }, 4200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
