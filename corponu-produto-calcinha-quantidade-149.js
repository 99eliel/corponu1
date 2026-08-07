(() => {
  "use strict";

  const VERSION = "2026-08-07-produto-calcinha-quantidade-149";
  const FIELD_ID = "produtoCalcinhaQuantidade";
  const WRAP_ID = "produtoCalcinhaQuantidadeWrap149";

  if (window.__CORPONU_PRODUTO_CALCINHA_QUANTIDADE_149__ === VERSION) return;
  window.__CORPONU_PRODUTO_CALCINHA_QUANTIDADE_149__ = VERSION;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function tipoProdutoAtual() {
    const tipoEstado = window.corponuDualMode?.state?.active?.produtos;
    const aba = document.querySelector('.corponu-dual-tabs[data-page="produtos"] .corponu-dual-tab.active')?.dataset?.type;
    const titulo = normalizar(document.querySelector("#formProduto .panel-header h3")?.textContent || "");

    if (tipoEstado === "calcinha" || aba === "calcinha" || titulo.includes("CALCINHA")) return "calcinha";
    return "sutia";
  }

  function protegerScroll(campo) {
    if (!(campo instanceof HTMLInputElement) || campo.dataset.semScroll149 === "1") return;
    campo.dataset.semScroll149 = "1";

    campo.addEventListener("wheel", () => {
      const valorAntes = campo.value;
      if (document.activeElement === campo) campo.blur();
      requestAnimationFrame(() => {
        if (campo.value !== valorAntes) campo.value = valorAntes;
      });
    }, { passive: true });
  }

  function criarCampo() {
    const form = document.getElementById("formProduto");
    if (!form || document.getElementById(WRAP_ID)) return;

    const observacoes = document.getElementById("produtoObs")?.closest("label");
    if (!observacoes) return;

    const label = document.createElement("label");
    label.id = WRAP_ID;
    label.innerHTML = `
      Quantidade
      <input id="${FIELD_ID}" type="number" min="1" step="1" inputmode="numeric" placeholder="Ex: 500" />
    `;

    observacoes.before(label);
    protegerScroll(label.querySelector(`#${FIELD_ID}`));
    atualizarVisibilidade();
  }

  function atualizarVisibilidade() {
    const wrap = document.getElementById(WRAP_ID);
    const campo = document.getElementById(FIELD_ID);
    if (!wrap || !campo) return;

    const calcinha = tipoProdutoAtual() === "calcinha";
    wrap.style.display = calcinha ? "" : "none";
    campo.required = calcinha;
    campo.disabled = !calcinha;

    if (!calcinha) campo.value = "";
  }

  function preencherAoEditar() {
    if (tipoProdutoAtual() !== "calcinha") return;

    const id = String(document.getElementById("produtoId")?.value || "").trim();
    const campo = document.getElementById(FIELD_ID);
    const mapa = window.corponuDualMode?.state?.maps?.produtos;
    if (!id || !campo || !(mapa instanceof Map)) return;

    const produto = mapa.get(id);
    if (!produto) return;

    const quantidade = Number(produto.quantidade ?? produto.quantidadeProduto ?? produto.quantidadeCalcinha ?? 0);
    campo.value = Number.isFinite(quantidade) && quantidade > 0 ? String(quantidade) : "";
  }

  function instalarPatchFirestore() {
    const estado = window.corponuDualMode?.state;
    const firebase = estado?.firebase;
    if (!firebase || typeof firebase.setDoc !== "function") return false;
    if (firebase.setDoc.__corponuProdutoQuantidade149) return true;

    const setDocOriginal = firebase.setDoc;

    const setDocProtegido = function corponuSetDocProdutoQuantidade149(referencia, dados, opcoes) {
      try {
        const path = String(referencia?.path || "");
        const ehProduto = path.startsWith("produtos/");
        const ehCalcinha = normalizar([
          dados?.tipoPeca,
          dados?.tipoPecaPadrao,
          dados?.tipoPecaLabel,
          dados?.setor
        ].join(" ")).includes("CALCINHA");

        if (ehProduto && ehCalcinha && tipoProdutoAtual() === "calcinha") {
          const campo = document.getElementById(FIELD_ID);
          const quantidade = Number(campo?.value || 0);

          if (Number.isFinite(quantidade) && quantidade > 0 && dados && typeof dados === "object") {
            // Muta o mesmo objeto usado pelo modo Sutiã/Calcinha para que o
            // estado local também receba a quantidade sem uma segunda leitura.
            dados.quantidade = quantidade;
            dados.quantidadeProduto = quantidade;
            dados.quantidadeCalcinha = quantidade;
          }
        }
      } catch (error) {
        console.warn("[Produto Calcinha 149] Não foi possível anexar a quantidade ao produto.", error);
      }

      return setDocOriginal.call(this, referencia, dados, opcoes);
    };

    setDocProtegido.__corponuProdutoQuantidade149 = true;
    setDocProtegido.__original = setDocOriginal;
    firebase.setDoc = setDocProtegido;
    return true;
  }

  function instalarEventos() {
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      if (alvo.closest('.corponu-dual-tabs[data-page="produtos"]')) {
        setTimeout(() => {
          atualizarVisibilidade();
          preencherAoEditar();
        }, 0);
        setTimeout(() => {
          atualizarVisibilidade();
          preencherAoEditar();
        }, 120);
      }

      if (alvo.closest('button[onclick*="editarProduto"]')) {
        setTimeout(() => {
          atualizarVisibilidade();
          preencherAoEditar();
        }, 80);
        setTimeout(preencherAoEditar, 250);
      }

      if (alvo.closest("#btnCancelarProduto")) {
        setTimeout(() => {
          const campo = document.getElementById(FIELD_ID);
          if (campo) campo.value = "";
          atualizarVisibilidade();
        }, 0);
      }
    }, true);
  }

  function iniciar() {
    criarCampo();
    atualizarVisibilidade();
    preencherAoEditar();
    instalarEventos();

    let tentativas = 0;
    const timer = setInterval(() => {
      tentativas += 1;
      criarCampo();
      atualizarVisibilidade();
      if (instalarPatchFirestore() || tentativas >= 80) clearInterval(timer);
    }, 125);

    const observer = new MutationObserver(() => {
      criarCampo();
      atualizarVisibilidade();
    });
    observer.observe(document.getElementById("produtos") || document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
