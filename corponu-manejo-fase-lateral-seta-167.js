(() => {
  "use strict";

  const VERSION = "2026-08-08-manejo-fase-lateral-seta-167";
  const STYLE_ID = "corponuManejoFaseLateralSeta167Style";
  const POPUP_ID = "corponuManejoFaseLateralSeta167Popup";

  if (window.__CORPONU_MANEJO_FASE_LATERAL_SETA_167__ === VERSION) return;
  window.__CORPONU_MANEJO_FASE_LATERAL_SETA_167__ = VERSION;

  let observer = null;
  let popup = null;
  let campoAtivo = null;

  function injetarEstilos() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #manejo .fase-lateral-seletor-167{
        position:relative!important;
        width:100%!important;
        min-width:0!important;
      }
      #manejo .fase-lateral-seletor-167 .fase-lateral-campo-163{
        width:100%!important;
        min-width:0!important;
        padding-right:34px!important;
        box-sizing:border-box!important;
      }
      #manejo .btn-fase-lateral-seta-167{
        position:absolute!important;
        right:3px!important;
        top:50%!important;
        transform:translateY(-50%)!important;
        width:28px!important;
        height:28px!important;
        min-width:28px!important;
        padding:0!important;
        border:0!important;
        border-left:1px solid #d7deea!important;
        border-radius:0 9px 9px 0!important;
        background:transparent!important;
        color:#111827!important;
        font-size:12px!important;
        font-weight:900!important;
        cursor:pointer!important;
        z-index:2!important;
      }
      #manejo .btn-fase-lateral-seta-167:hover{
        background:#f1f5f9!important;
      }
      #${POPUP_ID}{
        position:fixed;
        z-index:120000;
        min-width:170px;
        max-width:min(320px,calc(100vw - 24px));
        max-height:280px;
        overflow:auto;
        padding:6px;
        background:#fff;
        border:1px solid #cbd5e1;
        border-radius:12px;
        box-shadow:0 16px 40px rgba(15,23,42,.22);
      }
      #${POPUP_ID} .opcao-fase-lateral-167{
        width:100%;
        border:0;
        background:transparent;
        text-align:left;
        padding:9px 10px;
        border-radius:8px;
        font-size:13px;
        font-weight:700;
        color:#1f2937;
        cursor:pointer;
      }
      #${POPUP_ID} .opcao-fase-lateral-167:hover,
      #${POPUP_ID} .opcao-fase-lateral-167:focus-visible{
        background:#eef2ff;
        outline:none;
      }
      #${POPUP_ID} .vazio-fase-lateral-167{
        padding:10px;
        color:#64748b;
        font-size:12px;
        text-align:center;
      }
    `;
    document.head.appendChild(style);
  }

  function opcoesAtuais() {
    return [...document.querySelectorAll("#manejoFasesLateralList option")]
      .map(option => String(option.value || option.textContent || "").trim())
      .filter(Boolean);
  }

  function fecharPopup() {
    popup?.remove();
    popup = null;
    campoAtivo = null;
  }

  function posicionarPopup(input) {
    if (!popup || !input) return;
    const rect = input.getBoundingClientRect();
    const largura = Math.max(170, rect.width);
    let esquerda = rect.left;
    esquerda = Math.max(8, Math.min(esquerda, window.innerWidth - largura - 8));
    let topo = rect.bottom + 5;
    const altura = Math.min(280, popup.scrollHeight || 220);
    if (topo + altura > window.innerHeight - 8 && rect.top > altura + 12) {
      topo = rect.top - altura - 5;
    }
    popup.style.left = `${esquerda}px`;
    popup.style.top = `${Math.max(8, topo)}px`;
    popup.style.width = `${largura}px`;
  }

  function selecionarOpcao(input, valor) {
    input.value = valor;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    fecharPopup();
    input.focus();
  }

  function abrirPopup(input) {
    fecharPopup();
    campoAtivo = input;
    const opcoes = opcoesAtuais();
    popup = document.createElement("div");
    popup.id = POPUP_ID;
    popup.setAttribute("role", "listbox");
    popup.setAttribute("aria-label", "Sugestões de Fase Lateral");

    if (!opcoes.length) {
      popup.innerHTML = '<div class="vazio-fase-lateral-167">Nenhuma sugestão de Fase Lateral cadastrada.</div>';
    } else {
      popup.innerHTML = opcoes.map(opcao => {
        const seguro = opcao
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
        return `<button type="button" class="opcao-fase-lateral-167" role="option" data-valor="${seguro}">${seguro}</button>`;
      }).join("");
    }

    document.body.appendChild(popup);
    posicionarPopup(input);

    popup.addEventListener("click", event => {
      const botao = event.target instanceof Element ? event.target.closest(".opcao-fase-lateral-167") : null;
      if (!botao) return;
      selecionarOpcao(input, botao.dataset.valor || botao.textContent || "");
    });
  }

  function prepararCampo(input) {
    if (!(input instanceof HTMLInputElement)) return;
    if (input.dataset.setaFaseLateral167 === "1") return;
    input.dataset.setaFaseLateral167 = "1";

    let wrapper = input.closest(".fase-lateral-seletor-167");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "fase-lateral-seletor-167";
      input.parentNode?.insertBefore(wrapper, input);
      wrapper.appendChild(input);
    }

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn-fase-lateral-seta-167";
    botao.setAttribute("aria-label", "Abrir sugestões de Fase Lateral");
    botao.title = "Abrir sugestões de Fase Lateral";
    botao.textContent = "▼";
    wrapper.appendChild(botao);

    botao.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (popup && campoAtivo === input) fecharPopup();
      else abrirPopup(input);
    });
  }

  function aplicar() {
    injetarEstilos();
    document.querySelectorAll("#manejo .fase-lateral-campo-163").forEach(prepararCampo);
  }

  function iniciar() {
    aplicar();

    const alvo = document.getElementById("listaManejoInline") || document.getElementById("manejo");
    if (alvo && !observer) {
      observer = new MutationObserver(() => requestAnimationFrame(aplicar));
      observer.observe(alvo, { childList: true, subtree: true });
    }

    document.addEventListener("pointerdown", event => {
      if (!popup) return;
      if (popup.contains(event.target)) return;
      if (event.target instanceof Element && event.target.closest(".btn-fase-lateral-seta-167")) return;
      fecharPopup();
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") fecharPopup();
    }, true);

    window.addEventListener("resize", () => {
      if (popup && campoAtivo) posicionarPopup(campoAtivo);
    });
    window.addEventListener("scroll", () => {
      if (popup && campoAtivo) posicionarPopup(campoAtivo);
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
