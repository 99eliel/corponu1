(() => {
  "use strict";

  const VERSION = "2026-08-01-faccao-edicao-modal-63";
  const FORM_ID = "formFaccao";
  const BOTAO_ABRIR_ID = "btnAbrirCadastroFaccao";
  const BOTAO_CANCELAR_ID = "btnCancelarFaccao";
  const MODAL_ID = "modalCadastroFaccao63";
  const TITULO_ID = "tituloModalFaccao63";
  const SUBTITULO_ID = "subtituloModalFaccao63";
  const CORPO_ID = "corpoModalFaccao63";
  const CLASSE_FECHADO = "cn63-faccao-form-fechado";

  if (window.__CORPONU_FACCAO_EDICAO_MODAL__ === VERSION) return;
  window.__CORPONU_FACCAO_EDICAO_MODAL__ = VERSION;

  let formularioAberto = false;
  let modoAtual = "cadastro";
  let elementoFocoAnterior = null;
  let scrollAntesDeAbrir = 0;
  let tentativas = 0;
  let intervalo = null;

  function injetarEstilo() {
    if (document.getElementById("styleFaccaoEdicaoModal63")) return;
    const style = document.createElement("style");
    style.id = "styleFaccaoEdicaoModal63";
    style.textContent = `
      #${FORM_ID}.${CLASSE_FECHADO}{display:none!important}
      body.cn63-modal-faccao-aberto{overflow:hidden!important}
      #${MODAL_ID}{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px}
      #${MODAL_ID}.hidden{display:none!important}
      #${MODAL_ID} .cn63-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.58);backdrop-filter:blur(2px)}
      #${MODAL_ID} .cn63-card{position:relative;z-index:1;width:min(1060px,calc(100vw - 24px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #d8b4fe;border-radius:20px;background:#fff;box-shadow:0 28px 80px rgba(15,23,42,.35);animation:cn63Abrir .18s ease-out}
      #${MODAL_ID} .cn63-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#faf5ff,#fff)}
      #${MODAL_ID} .cn63-header h3{margin:0;color:#3b0764;font-size:20px;line-height:1.2}
      #${MODAL_ID} .cn63-header p{margin:5px 0 0;color:#64748b;font-size:12px;line-height:1.45}
      #${MODAL_ID} .cn63-fechar{flex:0 0 auto;width:38px;height:38px;border:1px solid #ddd6fe;border-radius:50%;background:#fff;color:#4c1d95;font-size:22px;font-weight:900;line-height:1;cursor:pointer}
      #${MODAL_ID} .cn63-fechar:hover{background:#f3e8ff}
      #${CORPO_ID}{padding:18px 20px 22px;overflow:auto;overscroll-behavior:contain}
      #${CORPO_ID} #${FORM_ID}{display:grid!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;animation:none!important}
      #${CORPO_ID} #${FORM_ID}.hidden:not(.${CLASSE_FECHADO}){display:grid!important}
      #${CORPO_ID} #${FORM_ID} .actions{position:sticky;bottom:-22px;z-index:3;margin:8px -20px -22px;padding:14px 20px;border-top:1px solid #e2e8f0;background:rgba(255,255,255,.96);backdrop-filter:blur(8px)}
      @keyframes cn63Abrir{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
      @media(max-width:760px){
        #${MODAL_ID}{padding:8px;align-items:stretch}
        #${MODAL_ID} .cn63-card{width:100%;max-height:100%;border-radius:15px}
        #${MODAL_ID} .cn63-header{padding:15px}
        #${CORPO_ID}{padding:14px 14px 18px}
        #${CORPO_ID} #${FORM_ID} .actions{bottom:-18px;margin:8px -14px -18px;padding:12px 14px}
      }
    `;
    document.head.appendChild(style);
  }

  function formulario() {
    return document.getElementById(FORM_ID);
  }

  function modal() {
    return document.getElementById(MODAL_ID);
  }

  function criarModal() {
    let existente = modal();
    if (existente) return existente;

    existente = document.createElement("div");
    existente.id = MODAL_ID;
    existente.className = "hidden";
    existente.setAttribute("aria-hidden", "true");
    existente.innerHTML = `
      <div class="cn63-backdrop" data-fechar-modal-faccao63="1"></div>
      <section class="cn63-card" role="dialog" aria-modal="true" aria-labelledby="${TITULO_ID}" aria-describedby="${SUBTITULO_ID}">
        <header class="cn63-header">
          <div>
            <h3 id="${TITULO_ID}">Cadastrar facção</h3>
            <p id="${SUBTITULO_ID}">Preencha os dados, processos e tipos de peça atendidos.</p>
          </div>
          <button type="button" class="cn63-fechar" data-fechar-modal-faccao63="1" aria-label="Fechar">×</button>
        </header>
        <div id="${CORPO_ID}"></div>
      </section>`;
    document.body.appendChild(existente);
    return existente;
  }

  function moverFormularioParaModal() {
    const form = formulario();
    const corpo = document.getElementById(CORPO_ID);
    if (!form || !corpo) return false;
    if (form.parentElement !== corpo) corpo.appendChild(form);
    return true;
  }

  function limparCamposCadastro() {
    const form = formulario();
    if (!form) return;
    [...form.elements].forEach(campo => {
      if (!(campo instanceof HTMLElement)) return;
      if (campo instanceof HTMLInputElement) {
        if (["checkbox", "radio"].includes(campo.type)) campo.checked = false;
        else if (campo.type !== "button" && campo.type !== "submit") campo.value = "";
      } else if (campo instanceof HTMLTextAreaElement) {
        campo.value = "";
      } else if (campo instanceof HTMLSelectElement) {
        campo.selectedIndex = 0;
      }
    });
    const id = document.getElementById("faccaoId");
    if (id) id.value = "";
  }

  function atualizarCabecalho(edicao) {
    const titulo = document.getElementById(TITULO_ID);
    const subtitulo = document.getElementById(SUBTITULO_ID);
    const nome = String(document.getElementById("faccaoNome")?.value || "").trim();

    if (titulo) titulo.textContent = edicao
      ? `Editar facção${nome ? ` — ${nome}` : ""}`
      : "Cadastrar facção";
    if (subtitulo) subtitulo.textContent = edicao
      ? "Faça as correções necessárias e salve sem sair da posição atual da lista."
      : "Preencha os dados, processos e tipos de peça atendidos.";
  }

  function fechar({ limpar = false, restaurarFoco = true } = {}) {
    const form = formulario();
    const caixa = modal();
    if (!form || !caixa) return false;

    formularioAberto = false;
    form.classList.add(CLASSE_FECHADO, "hidden");
    form.setAttribute("aria-hidden", "true");
    caixa.classList.add("hidden");
    caixa.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cn63-modal-faccao-aberto");

    if (limpar) limparCamposCadastro();
    if (restaurarFoco && elementoFocoAnterior instanceof HTMLElement) {
      window.setTimeout(() => elementoFocoAnterior?.focus?.({ preventScroll: true }), 0);
    }
    return true;
  }

  function abrir({ edicao = false, scrollOriginal = null } = {}) {
    const form = formulario();
    const caixa = modal();
    if (!form || !caixa) return false;

    formularioAberto = true;
    modoAtual = edicao ? "edicao" : "cadastro";
    if (Number.isFinite(scrollOriginal)) scrollAntesDeAbrir = scrollOriginal;
    form.classList.remove(CLASSE_FECHADO, "hidden");
    form.setAttribute("aria-hidden", "false");
    form.dataset.cn63Modo = modoAtual;
    caixa.classList.remove("hidden");
    caixa.setAttribute("aria-hidden", "false");
    document.body.classList.add("cn63-modal-faccao-aberto");
    atualizarCabecalho(edicao);

    if (Number.isFinite(scrollAntesDeAbrir)) {
      window.scrollTo({ top: scrollAntesDeAbrir, left: 0, behavior: "auto" });
    }
    window.setTimeout(() => document.getElementById("faccaoNome")?.focus({ preventScroll: true }), 60);
    return true;
  }

  function abrirCadastro() {
    elementoFocoAnterior = document.activeElement;
    scrollAntesDeAbrir = window.scrollY;
    limparCamposCadastro();
    abrir({ edicao: false, scrollOriginal: scrollAntesDeAbrir });
  }

  function abrirEdicaoAposPreenchimento(scrollOriginal) {
    [0, 60, 160].forEach(atraso => window.setTimeout(() => {
      abrir({ edicao: true, scrollOriginal });
      atualizarCabecalho(true);
      window.scrollTo({ top: scrollOriginal, left: 0, behavior: "auto" });
    }, atraso));
  }

  function preparar() {
    injetarEstilo();
    criarModal();
    const form = formulario();
    if (!form || !moverFormularioParaModal()) return false;

    if (form.dataset.cn63Preparado !== "1") {
      form.dataset.cn63Preparado = "1";
      fechar({ restaurarFoco: false });

      form.addEventListener("reset", () => {
        window.setTimeout(() => fechar({ restaurarFoco: true }), 0);
      });

      form.addEventListener("input", event => {
        if (modoAtual === "edicao" && event.target?.id === "faccaoNome") atualizarCabecalho(true);
      });
    }

    return true;
  }

  function instalarEventosGlobais() {
    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      if (alvo.closest(`#${BOTAO_ABRIR_ID}`)) {
        elementoFocoAnterior = alvo.closest("button") || document.activeElement;
        const scrollOriginal = window.scrollY;
        window.setTimeout(() => {
          scrollAntesDeAbrir = scrollOriginal;
          limparCamposCadastro();
          abrir({ edicao: false, scrollOriginal });
        }, 0);
        return;
      }

      const editar = alvo.closest('[onclick*="editarFaccao"],[data-editar-faccao]');
      if (editar) {
        elementoFocoAnterior = editar;
        const scrollOriginal = window.scrollY;
        scrollAntesDeAbrir = scrollOriginal;
        abrirEdicaoAposPreenchimento(scrollOriginal);
        return;
      }

      if (alvo.closest("[data-fechar-modal-faccao63]")) {
        event.preventDefault();
        fechar({ limpar: modoAtual === "cadastro" });
        return;
      }

      if (alvo.closest(`#${BOTAO_CANCELAR_ID}`)) {
        window.setTimeout(() => fechar({ limpar: true }), 0);
        return;
      }

      const navegacao = alvo.closest('.nav-btn[data-page]');
      if (navegacao && navegacao.dataset.page !== "faccoes") fechar({ restaurarFoco: false });
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape" || !formularioAberto) return;
      event.preventDefault();
      fechar({ limpar: modoAtual === "cadastro" });
    });

    document.addEventListener("corponu:faccao-salva", () => fechar({ limpar: true }));
  }

  function iniciar() {
    instalarEventosGlobais();
    preparar();

    intervalo = window.setInterval(() => {
      tentativas += 1;
      const pronto = preparar();
      if (pronto || tentativas >= 30) {
        window.clearInterval(intervalo);
        intervalo = null;
      }
    }, 300);

    window.addEventListener("pageshow", () => {
      preparar();
      if (!formularioAberto) fechar({ restaurarFoco: false });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
