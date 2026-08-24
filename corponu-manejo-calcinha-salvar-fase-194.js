(() => {
  "use strict";

  const VERSION = "2026-08-24-fase-calcinha-validacao-coordenada-230";
  const DATALIST_FASES_CALCINHA = "manejoFasesListCalcinha";

  if (window.__CORPONU_MANEJO_CALCINHA_SALVAR_FASE_230__ === VERSION) return;
  window.__CORPONU_MANEJO_CALCINHA_SALVAR_FASE_230__ = VERSION;

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
      window.clearTimeout(window.__faseCalcinha230Toast);
      window.__faseCalcinha230Toast = window.setTimeout(() => toast.classList.add("hidden"), 6500);
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

  function instalarProtecao() {
    if (instalado) return true;
    const atual = window.salvarManejoLinha;
    if (typeof atual !== "function") return false;

    if (atual.__corponuFaseCalcinhaValidacaoCoordenada230 === true) {
      instalado = true;
      return true;
    }

    const original = atual;

    async function salvarManejoLinhaComFaseCalcinhaValidada230(orderId) {
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
      }

      // Esta camada faz apenas validação/normalização. A gravação normal continua
      // no fluxo existente e a confirmação final autoritativa permanece na 223.
      // Assim eliminamos um updateDoc serial redundante sem alterar o clique.
      return await original.apply(this, arguments);
    }

    Object.defineProperty(salvarManejoLinhaComFaseCalcinhaValidada230, "__corponuFaseCalcinhaValidacaoCoordenada230", {
      value: true,
      configurable: false,
      enumerable: false
    });

    // Muito importante: wrappers antigos se identificam por marcas na função.
    // Ao preservar as marcas da camada interna, evitamos que 205 e 223 a envolvam
    // de novo a cada timer, o que multiplicava confirmações e deixava o salvar lento.
    propagarMarca(salvarManejoLinhaComFaseCalcinhaValidada230, original, "__corponuFaseCalcinhaSemPiscar223");
    propagarMarca(salvarManejoLinhaComFaseCalcinhaValidada230, original, "__corponuCalcinhaFluido205");

    window.salvarManejoLinha = salvarManejoLinhaComFaseCalcinhaValidada230;
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
