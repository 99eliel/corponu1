(() => {
  "use strict";

  const VERSION = "2026-08-01-chegada-dados-corretos-78";
  const MODAL_ID = "modalChegadaMovimentacao";
  const FORM_ID = "formChegadaMovimentacao";
  const INFO_ID = "chegadaMovimentacaoInfo";
  const CARD_ID = "corponuConfirmacaoChegada78";
  const PROCESSO_ID = "corponuChegadaProcesso78";
  const RESPONSAVEL_ID = "corponuChegadaResponsavel78";

  if (window.__CORPONU_CHEGADA_CONFIRMACAO_DEFINITIVA__ === VERSION) return;
  window.__CORPONU_CHEGADA_CONFIRMACAO_DEFINITIVA__ = VERSION;
  window.__CORPONU_CHEGADA_CONFIRMACAO__ = VERSION;

  let esperado = null;
  let idPreparado = "";
  let tokenPreparacao = 0;
  let observadorModal = null;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function mostrarAviso(mensagem) {
    const toast = document.getElementById("toast");
    if (!toast) {
      window.alert(mensagem);
      return;
    }

    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = "#991b1b";
    window.clearTimeout(window.__corponuChegada78Toast);
    window.__corponuChegada78Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 5000);
  }

  function removerVersoesAntigas() {
    [
      "sf71ConfirmacaoServico",
      "sf73ConfirmacaoServico",
      "corponuConfirmacaoChegada75",
      "corponuChegadaConfirmacao76",
      "corponuConfirmacaoChegada77"
    ].forEach(id => document.getElementById(id)?.remove());

    [
      "styleChegadaConfirmacaoSegura71",
      "styleChegadaConfirmacaoBotoes73",
      "styleCorponuChegadaConfirmacao75",
      "styleCorponuChegadaConfirmacao76",
      "styleCorponuConfirmacaoChegada77"
    ].forEach(id => document.getElementById(id)?.remove());
  }

  function instalarEstilo() {
    if (document.getElementById("styleCorponuConfirmacaoChegada78")) return;

    const style = document.createElement("style");
    style.id = "styleCorponuConfirmacaoChegada78";
    style.textContent = `
      #${CARD_ID}{margin:14px 0 18px;padding:14px;border:1px solid #c4b5fd;border-radius:16px;background:#faf8ff}
      #${CARD_ID}.hidden{display:none!important}
      #${CARD_ID} .cc78-title{margin:0 0 4px;color:#5b21b6;font-size:14px;font-weight:900}
      #${CARD_ID} .cc78-text{margin:0 0 12px;color:#64748b;font-size:12px;line-height:1.5}
      #${CARD_ID} .cc78-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #${CARD_ID} label{display:block;margin:0;color:#334155;font-size:12px;font-weight:900}
      #${CARD_ID} select{width:100%;min-height:44px;margin-top:6px;padding:0 12px;border:1px solid #c4b5fd;border-radius:12px;background:#fff;color:#111827;font-size:14px;font-weight:800}
      #${CARD_ID} select:disabled{background:#f3f4f6;color:#9ca3af;cursor:not-allowed}
      #${CARD_ID} .cc78-note{margin-top:10px;padding:9px 11px;border-radius:10px;background:#ede9fe;color:#6d28d9;font-size:11px;font-weight:800;line-height:1.45}
      @media(max-width:640px){#${CARD_ID} .cc78-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function limparSelect(select, placeholder, desabilitado = false) {
    if (!(select instanceof HTMLSelectElement)) return;
    select.replaceChildren(new Option(placeholder, ""));
    select.value = "";
    select.disabled = desabilitado;
  }

  function preencherSelect(select, placeholder, valor) {
    if (!(select instanceof HTMLSelectElement)) return;
    const opcoes = [new Option(placeholder, "")];
    if (texto(valor)) opcoes.push(new Option(valor, valor));
    select.replaceChildren(...opcoes);
    select.value = "";
    select.disabled = false;
  }

  function garantirCard() {
    let card = document.getElementById(CARD_ID);
    if (card) return card;

    const form = document.getElementById(FORM_ID);
    if (!form) return null;

    card = document.createElement("section");
    card.id = CARD_ID;
    card.className = "hidden";
    card.innerHTML = `
      <p class="cc78-title">Confirmação obrigatória da chegada</p>
      <p class="cc78-text">Selecione novamente o processo e quem realizou o serviço antes de registrar a chegada.</p>
      <div class="cc78-grid">
        <label>
          Processo realizado
          <select id="${PROCESSO_ID}">
            <option value="">Selecione novamente o processo</option>
          </select>
        </label>
        <label>
          Quem fez / facção
          <select id="${RESPONSAVEL_ID}" disabled>
            <option value="">Selecione o processo primeiro</option>
          </select>
        </label>
      </div>
      <div class="cc78-note">A conferência valida o processo e a facção da saída registrada. Ela não cria outra movimentação.</div>
    `;

    const info = document.getElementById(INFO_ID);
    if (info?.parentElement === form) info.insertAdjacentElement("afterend", card);
    else form.prepend(card);

    card.querySelector(`#${PROCESSO_ID}`)?.addEventListener("change", () => {
      const processoSelecionado = texto(document.getElementById(PROCESSO_ID)?.value);
      const responsavelSelect = document.getElementById(RESPONSAVEL_ID);

      if (!esperado || normalizar(processoSelecionado) !== normalizar(esperado.processo)) {
        limparSelect(responsavelSelect, "Selecione o processo primeiro", true);
        return;
      }

      preencherSelect(responsavelSelect, "Selecione quem realizou", esperado.responsavel);
    });

    return card;
  }

  function modalAberto() {
    const modal = document.getElementById(MODAL_ID);
    return Boolean(modal && !modal.classList.contains("hidden"));
  }

  function chegadaDeFaccao() {
    const titulo = normalizar(document.getElementById("modalChegadaTitulo")?.textContent);
    const grupoDefeito = document.getElementById("grupoChegadaDefeito");
    return titulo.includes("FACCAO") || Boolean(grupoDefeito && !grupoDefeito.classList.contains("hidden"));
  }

  function extrairDadosDoResumo() {
    const info = document.getElementById(INFO_ID);
    if (!info) return null;

    const linhaDestinoProcesso = texto(info.querySelector("span")?.textContent);
    if (!linhaDestinoProcesso) return null;

    const partes = linhaDestinoProcesso
      .split("|")
      .map(texto)
      .filter(Boolean);

    if (partes.length < 2) return null;

    const responsavel = partes[0];
    const processo = partes[1];

    if (!responsavel || !processo || normalizar(processo).startsWith("ENVIADO")) return null;
    return { processo, responsavel };
  }

  function limparCampos() {
    esperado = null;
    idPreparado = "";
    limparSelect(document.getElementById(PROCESSO_ID), "Selecione novamente o processo", false);
    limparSelect(document.getElementById(RESPONSAVEL_ID), "Selecione o processo primeiro", true);
  }

  function esconderParaOutroTipo() {
    limparCampos();
    document.getElementById(CARD_ID)?.classList.add("hidden");
  }

  function aplicarDados(dados, idAtual) {
    const card = garantirCard();
    if (!card) return false;

    esperado = dados;
    idPreparado = idAtual || "sem-id";
    preencherSelect(document.getElementById(PROCESSO_ID), "Selecione novamente o processo", dados.processo);
    limparSelect(document.getElementById(RESPONSAVEL_ID), "Selecione o processo primeiro", true);
    card.classList.remove("hidden");

    const resumo = document.getElementById("modalChegadaResumo");
    if (resumo) resumo.textContent = "Confirme novamente o processo e a facção. Depois informe data, falta e desconto por defeito.";
    return true;
  }

  function prepararUmaVez() {
    if (!modalAberto()) return false;

    garantirCard();
    if (!chegadaDeFaccao()) {
      esconderParaOutroTipo();
      return true;
    }

    const idAtual = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    if (esperado && idPreparado === (idAtual || "sem-id")) {
      document.getElementById(CARD_ID)?.classList.remove("hidden");
      return true;
    }

    const dados = extrairDadosDoResumo();
    if (!dados) return false;
    return aplicarDados(dados, idAtual);
  }

  function iniciarPreparacao() {
    const tokenAtual = ++tokenPreparacao;
    let tentativa = 0;

    const tentar = () => {
      if (tokenAtual !== tokenPreparacao || !modalAberto()) return;
      tentativa += 1;
      if (prepararUmaVez()) return;
      if (tentativa < 10) window.setTimeout(tentar, 40);
    };

    window.setTimeout(tentar, 0);
  }

  function validar() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.classList.contains("hidden")) return { ok: true };

    const processo = texto(document.getElementById(PROCESSO_ID)?.value);
    const responsavel = texto(document.getElementById(RESPONSAVEL_ID)?.value);

    if (!esperado) {
      return { ok: false, mensagem: "A confirmação ainda está sendo preparada. Feche e abra a chegada novamente." };
    }
    if (!processo) {
      return { ok: false, mensagem: "Selecione novamente o processo realizado.", foco: PROCESSO_ID };
    }
    if (normalizar(processo) !== normalizar(esperado.processo)) {
      return { ok: false, mensagem: "O processo selecionado não corresponde à saída registrada.", foco: PROCESSO_ID };
    }
    if (!responsavel) {
      return { ok: false, mensagem: "Selecione quem fez / facção.", foco: RESPONSAVEL_ID };
    }
    if (normalizar(responsavel) !== normalizar(esperado.responsavel)) {
      return { ok: false, mensagem: "A facção selecionada não corresponde à saída registrada.", foco: RESPONSAVEL_ID };
    }

    return { ok: true };
  }

  function instalarEventos() {
    document.addEventListener("submit", event => {
      if (event.target?.id !== FORM_ID) return;
      const resultado = validar();
      if (resultado.ok) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      mostrarAviso(resultado.mensagem);
      if (resultado.foco) document.getElementById(resultado.foco)?.focus();
    }, true);

    document.addEventListener("click", event => {
      const alvo = event.target instanceof Element ? event.target : null;
      if (!alvo) return;

      if (alvo.closest("#btnFecharModalChegada,#btnCancelarModalChegada")) {
        tokenPreparacao += 1;
        limparCampos();
      }
    }, true);
  }

  function observarModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.dataset.corponuChegada78 === "1") return Boolean(modal);

    modal.dataset.corponuChegada78 = "1";
    observadorModal?.disconnect();
    observadorModal = new MutationObserver(() => {
      if (modal.classList.contains("hidden")) {
        tokenPreparacao += 1;
        limparCampos();
      } else {
        iniciarPreparacao();
      }
    });
    observadorModal.observe(modal, { attributes: true, attributeFilter: ["class"] });
    return true;
  }

  function iniciar() {
    removerVersoesAntigas();
    instalarEstilo();
    garantirCard();
    instalarEventos();

    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      const encontrado = observarModal();
      if (encontrado || tentativas >= 40) window.clearInterval(intervalo);
    }, 200);

    window.addEventListener("pageshow", () => {
      observarModal();
      if (modalAberto()) iniciarPreparacao();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
